const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch users",
    });
  }
});

module.exports = router;