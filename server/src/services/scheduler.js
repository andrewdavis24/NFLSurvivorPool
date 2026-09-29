const cron = require("node-cron");

const { autoAssignPicks } = require("./autoPick");
const { getNFLGames } = require("./espn");
const { syncNFLGames } = require("./gameSync");
const { scoreWeek } = require("./scoring");
const { processPushReminders } = require("./pushScheduler");

let cachedWeek = null;
let lastWeekCheck = 0;

function startScheduler() {
  cron.schedule("* * * * *", async () => {
    try {
      const currentWeek = await getCurrentNFLWeek();

      if (!currentWeek) {
        return;
      }

      /*
       * Always sync the current week.
       */
      await syncNFLGames(currentWeek);

      /*
       * IMPORTANT:
       * Also sync the previous week.
       *
       * This prevents a previous week's final game from being
       * missed if the scheduler advances to the next week before
       * ESPN's final result was captured.
       */
      if (currentWeek > 1) {
        await syncNFLGames(currentWeek - 1);
      }

      /*
       * Score the previous week first.
       *
       * scoreWeek() only processes picks where result === null,
       * so running it repeatedly is safe.
       */
      if (currentWeek > 1) {
        const previousWeekScored =
          await scoreWeek(currentWeek - 1);

        if (previousWeekScored > 0) {
          console.log(
            `Scored ${previousWeekScored} pick(s) for Week ${
              currentWeek - 1
            }`
          );
        }
      }

      /*
       * Process reminders for the current week.
       */
      await processPushReminders(currentWeek);

      /*
       * Score any completed games in the current week.
       */
      const currentWeekScored =
        await scoreWeek(currentWeek);

      if (currentWeekScored > 0) {
        console.log(
          `Scored ${currentWeekScored} pick(s) for Week ${currentWeek}`
        );
      }

      /*
       * Automatically assign missing picks after the deadline.
       */
      try {
        const assignedPicks =
          await autoAssignPicks(currentWeek);

        if (assignedPicks.length > 0) {
          console.log(
            `Automatically assigned ${assignedPicks.length} pick(s) for Week ${currentWeek}`
          );
        }
      } catch (error) {
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
    try {
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
    } catch (error) {
      console.error(
        `Failed to check NFL Week ${week}:`,
        error.message
      );
    }
  }

  return null;
}

module.exports = {
  startScheduler,
  getCurrentNFLWeek,
};