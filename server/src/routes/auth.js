const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const {
  authenticateToken,
} = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        name: {
          equals: username.trim(),
          mode: "insensitive",
        },
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        error: "Invalid username or password",
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return res.status(401).json({
        error: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to log in",
    });
  }
});

router.get(
  "/me",
  authenticateToken,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      res.json({
        id: user.id,
        name: user.name,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to fetch user",
      });
    }
  }
);

module.exports = router;