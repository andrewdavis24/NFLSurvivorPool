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

    // Validate required fields
    if (!userId || !week || !team) {
      return res.status(400).json({
        error: "userId, week, and team are required",
      });
    }

    // Validate NFL team
    if (!NFL_TEAMS.includes(team)) {
      return res.status(400).json({
        error: "Invalid NFL team",
      });
    }

    // Check that the user exists
    const user = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Find or create the requested week
    const weekRecord = await prisma.week.upsert({
      where: {
        week: Number(week),
      },
      update: {},
      create: {
        week: Number(week),
      },
    });

    // Check if the user already picked a team this week
    const existingWeekPick = await prisma.pick.findUnique({
      where: {
        userId_weekId: {
          userId: Number(userId),
          weekId: weekRecord.id,
        },
      },
    });

    if (existingWeekPick) {
      return res.status(400).json({
        error: "You have already made a pick for this week",
      });
    }

    // Check if the user has already picked this team
    const previousTeamPick = await prisma.pick.findFirst({
      where: {
        userId: Number(userId),
        team,
      },
    });

    if (previousTeamPick) {
      return res.status(400).json({
        error: `You have already picked ${team} this season`,
      });
    }

    // Create the pick
    const pick = await prisma.pick.create({
      data: {
        userId: Number(userId),
        weekId: weekRecord.id,
        team,
      },
      include: {
        user: true,
        week: true,
      },
    });

    res.status(201).json(pick);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to create pick",
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