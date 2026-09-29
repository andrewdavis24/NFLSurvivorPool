const prisma = require("../lib/prisma");

async function scoreWeek(week) {
  const weekRecord = await prisma.week.findUnique({
    where: {
      week: Number(week),
    },
  });

  if (!weekRecord) {
    throw new Error("Week not found");
  }

  const picks = await prisma.pick.findMany({
    where: {
      weekId: weekRecord.id,
      result: null,
    },
  });

  const games = await prisma.game.findMany({
    where: {
      weekId: weekRecord.id,
      completed: true,
    },
  });

  let scored = 0;

  for (const pick of picks) {
    const game = games.find(
      (game) =>
        game.homeTeam === pick.team ||
        game.awayTeam === pick.team
    );

    /*
     * No matching game means we cannot score this pick yet.
     */
    if (!game) {
      continue;
    }

    /*
     * Do not score a game until ESPN has actually provided
     * a winner.
     */
    if (!game.winner) {
      console.log(
        `Skipping Week ${week} pick ${pick.team}: game is completed but winner is not available yet.`
      );

      continue;
    }

    const won = game.winner === pick.team;

    await prisma.pick.update({
      where: {
        id: pick.id,
      },
      data: {
        result: won ? "WIN" : "LOSS",
        points: won ? 1 : 0,
      },
    });

    scored++;
  }

  return scored;
}

module.exports = {
  scoreWeek,
};