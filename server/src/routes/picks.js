const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

const NFL_TEAMS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC", 
  "LV", "LAC", "LAR", "MIA", "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SF", "SEA", "TB", "TEN", "WAS",
];

// POST /api/picks
router.post("/", async (req, res) => {
  try {
    const { userId, week, team } = req.body;

    if (!userId || !week || !team) {
      return res.status(400).json({
        error: "userId, week, and team are required",
      });
    }

    if (!NFL_TEAMS.includes(team)) {
      return res.status(400).json({
        error: "Invalid NFL team",
      });
    }

    const numericUserId = Number(userId);
    const numericWeek = Number(week);

    const user = await prisma.user.findUnique({
      where: {
        id: numericUserId,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const weekRecord = await prisma.week.findUnique({
      where: {
        week: numericWeek,
      },
      include: {
        games: true,
      },
    });

    if (!weekRecord) {
      return res.status(404).json({
        error: "Week not found",
      });
    }

    if (weekRecord.games.length === 0) {
      return res.status(400).json({
        error: "Games have not been synced for this week",
      });
    }

    // The first NFL game of the week is the pick deadline.
    const deadline = weekRecord.games
      .filter((game) => game.startTime)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() -
          new Date(b.startTime).getTime()
      )[0]?.startTime;

    if (!deadline) {
      return res.status(400).json({
        error: "Pick deadline is not available",
      });
    }

    if (new Date() >= new Date(deadline)) {
      return res.status(400).json({
        error: "Picks are closed for this week",
      });
    }

    // Only teams that actually play this week can be picked.
    const teamsPlayingThisWeek = new Set();

    for (const game of weekRecord.games) {
      if (game.homeTeam) {
        teamsPlayingThisWeek.add(game.homeTeam);
      }

      if (game.awayTeam) {
        teamsPlayingThisWeek.add(game.awayTeam);
      }
    }

    if (!teamsPlayingThisWeek.has(team)) {
      return res.status(400).json({
        error: `${team} does not play this week`,
      });
    }

    const existingWeekPick = await prisma.pick.findUnique({
      where: {
        userId_weekId: {
          userId: numericUserId,
          weekId: weekRecord.id,
        },
      },
    });

    // If changing an existing pick, make sure the new team
    // wasn't already used by this user in another week.
    const previousTeamPick = await prisma.pick.findFirst({
      where: {
        userId: numericUserId,
        team,
        NOT: existingWeekPick
          ? {
              id: existingWeekPick.id,
            }
          : undefined,
      },
    });

    if (previousTeamPick) {
      return res.status(400).json({
        error: `You have already picked ${team} this season`,
      });
    }

    let pick;

    if (existingWeekPick) {
      // Change the existing pick.
      pick = await prisma.pick.update({
        where: {
          id: existingWeekPick.id,
        },
        data: {
          team,
          result: null,
          points: 0,
        },
        include: {
          user: true,
          week: true,
        },
      });
    } else {
      // Create the first pick for this week.
      pick = await prisma.pick.create({
        data: {
          userId: numericUserId,
          weekId: weekRecord.id,
          team,
        },
        include: {
          user: true,
          week: true,
        },
      });
    }

    res.status(201).json(pick);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to save pick",
    });
  }
});


// GET /api/picks/:userId
router.get("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const picks = await prisma.pick.findMany({
      where: {
        userId,
      },
      include: {
        week: true,
      },
      orderBy: {
        week: {
          week: "asc",
        },
      },
    });

    res.json(picks);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch picks",
    });
  }
});

module.exports = router;