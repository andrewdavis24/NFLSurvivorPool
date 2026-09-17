const cron = require("node-cron");
const { autoAssignPicks } = require("./autoPick");
const { getNFLGames } = require("./espn");
const { syncNFLGames } = require("./gameSync");
const { scoreWeek } = require("./scoring");

let cachedWeek = null;
let lastWeekCheck = 0;

function startScheduler() {
  cron.schedule("* * * * *", async () => {
    try {
      const currentWeek = await getCurrentNFLWeek();

      if (!currentWeek) {
        return;
      }

      // Keep the current week's games up to date.
      await syncNFLGames(currentWeek);

      // Score any completed games.
      const scored = await scoreWeek(currentWeek);

      if (scored > 0) {
        console.log(
          `Scored ${scored} pick(s) for Week ${currentWeek}`
        );
      }

      // Automatically assign picks after the deadline.
      try {
        const assignedPicks =
          await autoAssignPicks(currentWeek);

        if (assignedPicks.length > 0) {
          console.log(
            `Automatically assigned ${assignedPicks.length} pick(s) for Week ${currentWeek}`
          );
        }
      } catch (error) {
        // This is expected before the weekly deadline.
        if (error.message !== "Picks are still open") {
          console.error(
            "Auto-pick error:",
            error.message
          );
        }
      }
    } catch (error) {
      console.error(
        "Scheduler error:",
        error.message
      );
    }
  });

  console.log("Pick scheduler started");
}

async function getCurrentNFLWeek() {
  const now = Date.now();

  if (
    cachedWeek &&
    now - lastWeekCheck < 10 * 60 * 1000
  ) {
    return cachedWeek;
  }

  for (let week = 1; week <= 18; week++) {
    const games = await getNFLGames(week);

    if (games.length === 0) {
      continue;
    }

    const hasUncompletedGames = games.some(
      (game) => !game.completed
    );

    if (hasUncompletedGames) {
      cachedWeek = week;
      lastWeekCheck = now;

      return week;
    }
  }

  return null;
}

module.exports = {
  startScheduler,
  getCurrentNFLWeek,
};