const express = require("express");
const prisma = require("../lib/prisma");
const { syncNFLGames } = require("../services/gameSync");
const { getCurrentNFLWeek } = require("../services/scheduler");

const router = express.Router();

/*
 * Get the current NFL week and make sure
 * the games are synced.
 */
router.get("/current-week", async (req, res) => {
  try {
    const currentWeek = await getCurrentNFLWeek();

    if (!currentWeek) {
      return res.status(404).json({
        error: "Current NFL week could not be determined",
      });
    }

    await syncNFLGames(currentWeek);

    const weekRecord = await prisma.week.findUnique({
      where: {
        week: currentWeek,
      },
    });

    if (!weekRecord) {
      return res.status(404).json({
        error: "Current week was not found",
      });
    }

    const games = await prisma.game.findMany({
      where: {
        weekId: weekRecord.id,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    res.json({
      week: currentWeek,
      games,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to determine current NFL week",
    });
  }
});

/*
 * Manually sync a specific NFL week.
 */
router.post("/sync/:week", async (req, res) => {
  try {
    const week = Number(req.params.week);

    if (!Number.isInteger(week) || week < 1 || week > 18) {
      return res.status(400).json({
        error: "Invalid NFL week",
      });
    }

    const count = await syncNFLGames(week);

    res.json({
      success: true,
      week,
      gamesSynced: count,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to sync NFL games",
    });
  }
});

/*
 * Get games for a specific week.
 */
router.get("/:week", async (req, res) => {
  try {
    const week = Number(req.params.week);

    if (!Number.isInteger(week) || week < 1 || week > 18) {
      return res.status(400).json({
        error: "Invalid NFL week",
      });
    }

    const weekRecord = await prisma.week.findUnique({
      where: {
        week,
      },
    });

    if (!weekRecord) {
      return res.json([]);
    }

    const games = await prisma.game.findMany({
      where: {
        weekId: weekRecord.id,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    res.json(games);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch games",
    });
  }
});

/*
 * Automatically assign picks after the deadline.
 */
router.post("/auto-pick/:week", async (req, res) => {
  try {
    const week = Number(req.params.week);

    if (!Number.isInteger(week) || week < 1 || week > 18) {
      return res.status(400).json({
        error: "Invalid NFL week",
      });
    }

    const { autoAssignPicks } = require("../services/autoPick");

    const picks = await autoAssignPicks(week);

    res.json({
      success: true,
      week,
      picksAssigned: picks.length,
      picks,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
});

module.exports = router;