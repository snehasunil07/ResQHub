/**
 * ResQHub Web Push Manager Utility
 * 
 * Handles Service Worker registration, browser notification permissions,
 * VAPID key exchange, and push subscription lifecycle.
 */
import { apiUrl } from "../config/api";

/**
 * Check if the current browser supports Web Push notifications
 * @returns {boolean}
 */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Convert a URL-safe Base64 string to a Uint8Array (required for applicationServerKey)
 * @param {string} base64String 
 * @returns {Uint8Array}
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register the Web Push Service Worker
 * @returns {Promise<ServiceWorkerRegistration>}
 */
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workers are not supported in this browser.");
  }
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;
  return registration;
}

/**
 * Subscribe the current volunteer to Web Push notifications
 * @param {string} token - Volunteer JWT Bearer token
 * @returns {Promise<{ success: boolean, subscription: object }>}
 */
export async function subscribeUserToPush(token) {
  if (!isPushSupported()) {
    throw new Error("Web Push notifications are not supported by this browser.");
  }

  // 1. Request browser notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notification permission was denied. Please allow notifications in your browser site settings."
        : "Notification permission was dismissed."
    );
  }

  // 2. Ensure Service Worker is registered and ready
  const registration = await registerServiceWorker();

  // 3. Fetch server's public VAPID key
  const vapidRes = await fetch(apiUrl("/api/notifications/vapid-public-key"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const vapidData = await vapidRes.json();
  if (!vapidRes.ok || !vapidData.publicKey) {
    throw new Error(vapidData.message || "Failed to retrieve VAPID public key from server.");
  }

  // 4. Create or retrieve browser PushSubscription
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const convertedVapidKey = urlBase64ToUint8Array(vapidData.publicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
  }

  // 5. Save the subscription on the backend
  const subJson = subscription.toJSON();
  const saveRes = await fetch(apiUrl("/api/notifications/subscribe"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      subscription: subJson,
    }),
  });

  const saveData = await saveRes.json();
  if (!saveRes.ok) {
    throw new Error(saveData.message || "Failed to save push subscription on server.");
  }

  return {
    success: true,
    subscription,
  };
}

/**
 * Unsubscribe the volunteer from Web Push notifications
 * @param {string} token - Volunteer JWT Bearer token
 * @returns {Promise<boolean>}
 */
export async function unsubscribeUserFromPush(token) {
  if (!isPushSupported()) return true;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    let endpoint = null;
    if (subscription) {
      endpoint = subscription.endpoint;
      await subscription.unsubscribe();
    }

    if (token) {
      await fetch(apiUrl("/api/notifications/subscribe"), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint }),
      });
    }

    return true;
  } catch (err) {
    console.error("[WebPush] Error during unsubscribe:", err);
    throw err;
  }
}

/**
 * Check current push subscription status for this browser and account
 * @param {string} token - Volunteer JWT Bearer token
 * @returns {Promise<{ supported: boolean, permission: string, isSubscribed: boolean }>}
 */
export async function checkSubscriptionStatus(token) {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: "unsupported",
      isSubscribed: false,
    };
  }

  const permission = Notification.permission;
  if (permission !== "granted") {
    return {
      supported: true,
      permission,
      isSubscribed: false,
    };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    // Verify with server if token is available
    let serverSubscribed = false;
    if (token) {
      const res = await fetch(apiUrl("/api/notifications/status"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        serverSubscribed = Boolean(data.isSubscribed);
      }
    }

    return {
      supported: true,
      permission,
      isSubscribed: Boolean(subscription) || serverSubscribed,
    };
  } catch (_e) {
    return {
      supported: true,
      permission,
      isSubscribed: false,
    };
  }
}

/**
 * Send an immediate test notification to this device
 * @param {string} token - Volunteer JWT Bearer token
 */
export async function sendTestNotification(token) {
  const res = await fetch(apiUrl("/api/notifications/test"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to send test notification.");
  }
  return data;
}

export default {
  isPushSupported,
  urlBase64ToUint8Array,
  registerServiceWorker,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  checkSubscriptionStatus,
  sendTestNotification,
};
