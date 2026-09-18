const express = require("express");
const prisma = require("../lib/prisma");
const {
  authenticateToken,
} = require("../middleware/auth");
const {
  sendPushNotification,
} = require("../services/push");

const router = express.Router();

router.get(
  "/public-key",
  authenticateToken,
  (req, res) => {
    const publicKey =
      process.env.VAPID_PUBLIC_KEY;

    if (!publicKey) {
      return res.status(500).json({
        error:
          "Push notifications are not configured",
      });
    }

    res.json({
      publicKey,
    });
  }
);

router.post(
  "/subscribe",
  authenticateToken,
  async (req, res) => {
    try {
      const { endpoint, keys } =
        req.body;

      if (
        !endpoint ||
        !keys ||
        !keys.p256dh ||
        !keys.auth
      ) {
        return res.status(400).json({
          error:
            "Invalid push subscription",
        });
      }

      await prisma.pushSubscription.upsert({
        where: {
          endpoint,
        },
        update: {
          userId:
            req.user.userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        create: {
          userId:
            req.user.userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });

      res.json({
        success: true,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Failed to save push subscription",
      });
    }
  }
);

router.delete(
  "/subscribe",
  authenticateToken,
  async (req, res) => {
    try {
      const { endpoint } =
        req.body;

      if (endpoint) {
        await prisma.pushSubscription.deleteMany(
          {
            where: {
              userId:
                req.user.userId,
              endpoint,
            },
          }
        );
      }

      res.json({
        success: true,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Failed to remove push subscription",
      });
    }
  }
);

/*
 * Temporary test notification.
 */
router.post(
  "/test",
  authenticateToken,
  async (req, res) => {
    try {
      await sendPushNotification(
        req.user.userId,
        {
          title:
            "🏈 NFL Survivor Pool",
          body:
            "Push notifications are working! Time to hate watch your roommates.",
          url:
            process.env.APP_URL ||
            "http://localhost:5173",
        }
      );

      res.json({
        success: true,
        message:
          "Test notification sent.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Failed to send test notification",
      });
    }
  }
);

module.exports = router;