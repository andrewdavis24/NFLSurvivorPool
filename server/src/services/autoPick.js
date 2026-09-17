const prisma = require("../lib/prisma");

const NFL_TEAMS = [
  "ARI",
  "ATL",
  "BAL",
  "BUF",
  "CAR",
  "CHI",
  "CIN",
  "CLE",
  "DAL",
  "DEN",
  "DET",
  "GB",
  "HOU",
  "IND",
  "JAX",
  "KC",
  "LV",
  "LAC",
  "LAR",
  "MIA",
  "MIN",
  "NE",
  "NO",
  "NYG",
  "NYJ",
  "PHI",
  "PIT",
  "SF",
  "SEA",
  "TB",
  "TEN",
  "WAS",
];

async function autoAssignPicks(week) {
  const weekRecord = await prisma.week.findUnique({
    where: {
      week: Number(week),
    },
    include: {
      games: true,
    },
  });

  if (!weekRecord) {
    throw new Error("Week not found");
  }

  const deadline = weekRecord.games
    .filter((game) => game.startTime)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() -
        new Date(b.startTime).getTime()
    )[0]?.startTime;

  if (!deadline) {
    throw new Error("Pick deadline is not available");
  }

  if (new Date() < new Date(deadline)) {
    throw new Error("Picks are still open");
  }

  const users = await prisma.user.findMany();

  const assignedPicks = [];

  for (const user of users) {
    const existingPick = await prisma.pick.findUnique({
      where: {
        userId_weekId: {
          userId: user.id,
          weekId: weekRecord.id,
        },
      },
    });

    if (existingPick) {
      continue;
    }

    const previousPicks = await prisma.pick.findMany({
      where: {
        userId: user.id,
      },
      select: {
        team: true,
      },
    });

    const previouslyUsedTeams = new Set(
      previousPicks.map((pick) => pick.team)
    );

    const teamsPlayingThisWeek = new Set();

    for (const game of weekRecord.games) {
      if (game.homeTeam) {
        teamsPlayingThisWeek.add(game.homeTeam);
      }

      if (game.awayTeam) {
        teamsPlayingThisWeek.add(game.awayTeam);
      }
    }

    const availableTeams = NFL_TEAMS.filter(
      (team) =>
        teamsPlayingThisWeek.has(team) &&
        !previouslyUsedTeams.has(team)
    );

    if (availableTeams.length === 0) {
      throw new Error(
        `No available teams for automatic pick for ${user.name}`
      );
    }

    const randomTeam =
      availableTeams[Math.floor(Math.random() * availableTeams.length)];

    const pick = await prisma.pick.create({
      data: {
        userId: user.id,
        weekId: weekRecord.id,
        team: randomTeam,
      },
      include: {
        user: true,
        week: true,
      },
    });

    assignedPicks.push(pick);
  }

  return assignedPicks;
}

module.exports = {
  autoAssignPicks,
};