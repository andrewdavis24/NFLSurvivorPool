const ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

async function getNFLGames(week) {
  const url = `${ESPN_URL}?season=2026&seasontype=2&week=${week}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`ESPN API returned ${response.status}`);
  }

  const data = await response.json();

  return data.events.map((event) => {
    const competition = event.competitions[0];

    const homeTeam = competition.competitors.find(
      (team) => team.homeAway === "home"
    );

    const awayTeam = competition.competitors.find(
      (team) => team.homeAway === "away"
    );

    return {
      espnId: event.id,
      startTime: event.date,
      homeTeam: homeTeam.team.abbreviation,
      awayTeam: awayTeam.team.abbreviation,
      homeScore: homeTeam.score
        ? Number(homeTeam.score)
        : null,
      awayScore: awayTeam.score
        ? Number(awayTeam.score)
        : null,
      status: competition.status.type.description,
      completed: competition.status.type.completed,
      winner:
        competition.status.type.completed
          ? competition.competitors.find((team) => team.winner)?.team
              .abbreviation || null
          : null,
    };
  });
}

module.exports = {
  getNFLGames,
};