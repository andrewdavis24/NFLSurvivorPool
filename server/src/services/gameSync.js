const prisma = require("../lib/prisma");
const { getNFLGames } = require("./espn");

async function syncNFLGames(week) {
  const games = await getNFLGames(week);

  const weekRecord = await prisma.week.upsert({
    where: {
      week: Number(week),
    },
    update: {},
    create: {
      week: Number(week),
    },
  });

  for (const game of games) {
    await prisma.game.upsert({
      where: {
        espnId: game.espnId,
      },
      update: {
        weekId: weekRecord.id,
        startTime: new Date(game.startTime),
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status,
        completed: game.completed,
        winner: game.winner,
      },
      create: {
        espnId: game.espnId,
        startTime: new Date(game.startTime),
        weekId: weekRecord.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status,
        completed: game.completed,
        winner: game.winner,
      },
    });
  }

  return games.length;
}

module.exports = {
  syncNFLGames,
};