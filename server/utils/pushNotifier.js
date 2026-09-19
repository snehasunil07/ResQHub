import webpush from "../config/webPush.js";
import PushSubscription from "../models/PushSubscription.js";
import User from "../models/User.js";
import { calculateMatch } from "./smartMatcher.js";

/**
 * Send Web Push notifications to matching volunteers for a new emergency request
 * 
 * Flow:
 * 1. Find all registered volunteers.
 * 2. Evaluate each volunteer's registered Areas of Interest using existing calculateMatch.
 * 3. Filter only matching volunteers (isRecommended === true).
 * 4. Fetch their active push subscriptions.
 * 5. Send Web Push notifications in parallel.
 * 6. Clean up any expired/invalid subscriptions (HTTP 410 / 404).
 * 
 * Safety: Any failure in push notification delivery is caught and logged.
 * Emergency request creation will NEVER fail due to push errors.
 * 
 * @param {object} emergencyRequest - Newly created emergency request document
 * @returns {Promise<{ sent: number, failed: number, matchedVolunteers: number }>}
 */
export async function sendEmergencyPushNotifications(emergencyRequest) {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn("[WebPush] Skipping push notification: VAPID keys not configured.");
      return { sent: 0, failed: 0, matchedVolunteers: 0 };
    }

    if (!emergencyRequest || !emergencyRequest._id) {
      return { sent: 0, failed: 0, matchedVolunteers: 0 };
    }

    // Step 1: Find all volunteers
    const volunteers = await User.find({ role: "volunteer" }).select("_id name interests email");

    if (!volunteers || volunteers.length === 0) {
      console.log("[WebPush] No volunteers registered in the system.");
      return { sent: 0, failed: 0, matchedVolunteers: 0 };
    }

    // Step 2 & 3: Run existing Smart Matching engine to identify matching volunteers
    const plainRequest = emergencyRequest.toObject ? emergencyRequest.toObject() : emergencyRequest;
    const matchingVolunteers = volunteers.filter((volunteer) => {
      const match = calculateMatch(plainRequest, volunteer.interests || []);
      return match.isRecommended;
    });

    if (matchingVolunteers.length === 0) {
      console.log(
        `[WebPush] No volunteers matched interests for ${plainRequest.category} emergency: "${plainRequest.title}".`
      );
      return { sent: 0, failed: 0, matchedVolunteers: 0 };
    }

    const matchingVolunteerIds = matchingVolunteers.map((v) => v._id);
    console.log(
      `[WebPush] Smart Matching matched ${matchingVolunteerIds.length} volunteer(s) for ${plainRequest.category} emergency.`
    );

    // Step 4: Find active push subscriptions for matching volunteers
    const subscriptions = await PushSubscription.find({
      user: { $in: matchingVolunteerIds },
      isActive: true,
    });

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[WebPush] Matching volunteers do not have active push subscriptions registered.");
      return { sent: 0, failed: 0, matchedVolunteers: matchingVolunteers.length };
    }

    // Step 5: Construct standard Web Push payload
    const categoryName = plainRequest.category || "Emergency";
    const payload = JSON.stringify({
      title: `🚨 New ${categoryName} Emergency`,
      body: `A new ${categoryName} Emergency matches your volunteer interests. Tap to view and accept.`,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: `emergency-${plainRequest._id}`,
      data: {
        requestId: String(plainRequest._id),
        url: `/volunteer?requestId=${plainRequest._id}`,
        category: plainRequest.category,
        urgency: plainRequest.urgency,
        location: plainRequest.location,
        createdAt: plainRequest.createdAt || new Date().toISOString(),
      },
    });

    // Step 6: Send push notifications in parallel
    let sentCount = 0;
    let failedCount = 0;
    const staleSubscriptionIds = [];

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscriptionObject = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscriptionObject, payload);
        sentCount++;
      } catch (err) {
        failedCount++;
        const statusCode = err.statusCode || err.code;
        console.warn(
          `[WebPush] Push delivery failed for subscription ${sub._id} (Status ${statusCode}): ${err.message}`
        );

        // 404 Not Found or 410 Gone indicates subscription has expired or unsubscribed on browser side
        if (statusCode === 404 || statusCode === 410) {
          staleSubscriptionIds.push(sub._id);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    // Clean up stale/expired subscriptions
    if (staleSubscriptionIds.length > 0) {
      try {
        await PushSubscription.deleteMany({ _id: { $in: staleSubscriptionIds } });
        console.log(`[WebPush] Cleaned up ${staleSubscriptionIds.length} expired push subscription(s).`);
      } catch (cleanErr) {
        console.error("[WebPush] Error cleaning up stale subscriptions:", cleanErr.message);
      }
    }

    console.log(
      `[WebPush] Dispatch completed: ${sentCount} sent, ${failedCount} failed for emergency ${plainRequest._id}.`
    );

    return {
      sent: sentCount,
      failed: failedCount,
      matchedVolunteers: matchingVolunteers.length,
    };
  } catch (outerError) {
    // Safety net: Never throw an unhandled error back to caller
    console.error("[WebPush] Unexpected error in sendEmergencyPushNotifications:", outerError);
    return { sent: 0, failed: 0, matchedVolunteers: 0 };
  }
}

export default {
  sendEmergencyPushNotifications,
};
