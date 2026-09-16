const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

// GET /api/leaderboard
router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        picks: {
          select: {
            points: true,
          },
        },
      },
    });

    const leaderboard = users
      .map((user) => ({
        userId: user.id,
        name: user.name,
        points: user.picks.reduce(
          (total, pick) => total + pick.points,
          0
        ),
      }))
      .sort((a, b) => b.points - a.points);

    res.json(leaderboard);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch leaderboard",
    });
  }
});

module.exports = router;