const prisma = require("../lib/prisma");
const {
  sendPushNotification,
} = require("./push");

const APP_URL =
  process.env.APP_URL ||
  "http://localhost:5173";

async function processPushReminders(week) {
  const weekRecord = await prisma.week.findUnique({
    where: {
      week: Number(week),
    },
    include: {
      games: true,
    },
  });

  if (!weekRecord) {
    return;
  }

  const gamesWithStartTimes = weekRecord.games.filter(
    (game) => game.startTime
  );

  if (gamesWithStartTimes.length === 0) {
    return;
  }

  const deadline = gamesWithStartTimes.reduce(
    (earliest, game) => {
      if (!earliest) {
        return game.startTime;
      }

      return new Date(game.startTime) <
        new Date(earliest)
        ? game.startTime
        : earliest;
    },
    null
  );

  if (!deadline) {
    return;
  }

  const now = new Date();
  const deadlineTime = new Date(deadline);

  const millisecondsRemaining =
    deadlineTime.getTime() - now.getTime();

  const hoursRemaining =
    millisecondsRemaining / (1000 * 60 * 60);

  // Don't send anything after the deadline.
  if (hoursRemaining <= 0) {
    return;
  }

  let reminderType = null;

  if (hoursRemaining <= 2) {
    reminderType = "2_HOURS";
  } else if (hoursRemaining <= 24) {
    reminderType = "24_HOURS";
  }

  if (!reminderType) {
    return;
  }

  const users = await prisma.user.findMany({
    include: {
      picks: {
        where: {
          weekId: weekRecord.id,
        },
      },
      pushSubscriptions: true,
    },
  });

  for (const user of users) {
    // Already picked — no reminder.
    if (user.picks.length > 0) {
      continue;
    }

    // No device subscribed.
    if (user.pushSubscriptions.length === 0) {
      continue;
    }

    const existingReminder =
      await prisma.pushReminder.findUnique({
        where: {
          userId_weekId_type: {
            userId: user.id,
            weekId: weekRecord.id,
            type: reminderType,
          },
        },
      });

    // Already sent.
    if (existingReminder) {
      continue;
    }

    const deadlineFormatted =
      deadlineTime.toLocaleString("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      });

    const payload = {
      title:
        reminderType === "2_HOURS"
          ? "🚨 NFL Pick Due Soon"
          : "🏈 NFL Survivor Pool",

      body:
        reminderType === "2_HOURS"
          ? `You still haven't made your Week ${week} pick. Picks lock at ${deadlineFormatted}.`
          : `You haven't made your Week ${week} pick yet. Picks lock at ${deadlineFormatted}.`,

      url: APP_URL,
    };

    await sendPushNotification(
      user.id,
      payload
    );

    await prisma.pushReminder.create({
      data: {
        userId: user.id,
        weekId: weekRecord.id,
        type: reminderType,
      },
    });

    console.log(
      `Sent ${reminderType} push reminder to ${user.name} for Week ${week}`
    );
  }
}

module.exports = {
  processPushReminders,
};