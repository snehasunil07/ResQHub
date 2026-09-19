import webpush from "../config/webPush.js";
import PushSubscription from "../models/PushSubscription.js";

/**
 * @desc    Get VAPID Public Key for client-side subscription
 * @route   GET /api/notifications/vapid-public-key
 * @access  Private (Authenticated users)
 */
export const getVapidPublicKey = async (req, res, next) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({
        success: false,
        message: "VAPID public key is not configured on the server.",
      });
    }

    return res.status(200).json({
      success: true,
      publicKey,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save or update Web Push subscription for authenticated volunteer
 * @route   POST /api/notifications/subscribe
 * @access  Private (Authenticated users & volunteers)
 */
export const subscribe = async (req, res, next) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: "Invalid push subscription object. Endpoint and keys are required.",
      });
    }

    const { endpoint, keys } = subscription;
    if (!keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription keys. Both p256dh and auth are required.",
      });
    }

    const userAgent = req.headers["user-agent"] || "";

    // Upsert subscription: associate endpoint with current authenticated user
    // This prevents duplicate registrations for the same device/browser
    const savedSub = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: req.user._id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent,
        isActive: true,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Push notification subscription saved successfully.",
      subscriptionId: savedSub._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unsubscribe / remove Web Push subscription
 * @route   DELETE /api/notifications/subscribe
 * @access  Private (Authenticated users & volunteers)
 */
export const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    let query = { user: req.user._id };
    if (endpoint) {
      query.endpoint = endpoint;
    }

    const result = await PushSubscription.deleteMany(query);

    return res.status(200).json({
      success: true,
      message: "Push notification subscription removed successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subscription status for current authenticated volunteer
 * @route   GET /api/notifications/status
 * @access  Private (Authenticated users & volunteers)
 */
export const getSubscriptionStatus = async (req, res, next) => {
  try {
    const count = await PushSubscription.countDocuments({
      user: req.user._id,
      isActive: true,
    });

    return res.status(200).json({
      success: true,
      isSubscribed: count > 0,
      subscriptionCount: count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send immediate test notification to the authenticated volunteer
 * @route   POST /api/notifications/test
 * @access  Private (Authenticated users & volunteers)
 */
export const sendTestNotification = async (req, res, next) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        message: "VAPID keys not configured on server.",
      });
    }

    const subscriptions = await PushSubscription.find({
      user: req.user._id,
      isActive: true,
    });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active push subscription found for your account on this device.",
      });
    }

    const payload = JSON.stringify({
      title: "🚨 ResQHub Emergency Alert Test",
      body: "Emergency push notifications are enabled and functioning properly on this device!",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: "test-alert",
      data: {
        url: "/volunteer",
        type: "test",
      },
    });

    let sent = 0;
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          payload
        );
        sent++;
      } catch (err) {
        console.warn(`[WebPush] Test notification failed for sub ${sub._id}:`, err.message);
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return res.status(200).json({
      success: true,
      message: `Test notification sent to ${sent} active device(s).`,
      sent,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  getSubscriptionStatus,
  sendTestNotification,
};
