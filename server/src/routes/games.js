const express = require("express");
const prisma = require("../lib/prisma");
const { syncNFLGames } = require("../services/gameSync");

const router = express.Router();

// POST /api/games/sync/:week
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

// GET /api/games/:week
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
        id: "asc",
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

// POST /api/games/auto-pick/:week
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