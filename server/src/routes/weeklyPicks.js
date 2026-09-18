const express = require("express");
const prisma = require("../lib/prisma");
const {
  authenticateToken,
} = require("../middleware/auth");

const router = express.Router();

router.get(
  "/:week",
  authenticateToken,
  async (req, res) => {
    try {
      const weekNumber =
        Number(req.params.week);

      const week =
        await prisma.week.findUnique({
          where: {
            week: weekNumber,
          },
          include: {
            games: true,
          },
        });

      if (!week) {
        return res.status(404).json({
          error: "Week not found",
        });
      }

      const deadline = week.games
        .filter(
          (game) => game.startTime
        )
        .reduce(
          (earliest, game) => {
            if (!earliest) {
              return game.startTime;
            }

            return new Date(
              game.startTime
            ) <
              new Date(earliest)
              ? game.startTime
              : earliest;
          },
          null
        );

      if (!deadline) {
        return res.status(400).json({
          error: "Pick deadline unavailable",
        });
      }

      const locked =
        new Date() >=
        new Date(deadline);

      if (!locked) {
        const myPick =
          await prisma.pick.findUnique({
            where: {
              userId_weekId: {
                userId:
                  req.user.userId,
                weekId: week.id,
              },
            },
          });

        return res.json({
          locked: false,
          picks: myPick
            ? [
                {
                  userId:
                    req.user.userId,
                  team: myPick.team,
                  result:
                    myPick.result,
                  points:
                    myPick.points,
                },
              ]
            : [],
        });
      }

      const picks =
        await prisma.pick.findMany({
          where: {
            weekId: week.id,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
        });

      return res.json({
        locked: true,
        picks: picks.map((pick) => ({
          userId: pick.user.id,
          name: pick.user.name,
          team: pick.team,
          result: pick.result,
          points: pick.points,
        })),
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to fetch weekly picks",
      });
    }
  }
);

module.exports = router;