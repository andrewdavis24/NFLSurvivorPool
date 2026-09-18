const webpush = require("web-push");
const prisma = require("../lib/prisma");

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject =
  process.env.VAPID_SUBJECT || "mailto:nflsurvivorpool@example.com";

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    subject,
    publicKey,
    privateKey
  );
}

async function sendPushNotification(userId, payload) {
  if (!publicKey || !privateKey) {
    console.warn("VAPID keys are not configured.");
    return;
  }

  const subscriptions =
    await prisma.pushSubscription.findMany({
      where: {
        userId,
      },
    });

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload)
      );
    } catch (error) {
      console.error(
        `Push notification failed for subscription ${subscription.id}:`,
        error.statusCode || error.message
      );

      // Subscription is no longer valid.
      if (
        error.statusCode === 404 ||
        error.statusCode === 410
      ) {
        await prisma.pushSubscription.delete({
          where: {
            id: subscription.id,
          },
        });
      }
    }
  }
}

module.exports = {
  sendPushNotification,
};