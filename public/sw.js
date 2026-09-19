/**
 * ResQHub Web Push Service Worker
 * 
 * Handles incoming push events in the background even when the website/tab is closed.
 * Displays native system notifications and navigates to the emergency request upon click.
 */

// Install Event: Activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate Event: Claim all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push Event: Handle background push message from server
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "🚨 ResQHub Emergency Alert";
  const options = {
    body: data.body || "An emergency matching your volunteer interests has been reported.",
    icon: data.icon || "/favicon.svg",
    badge: data.badge || "/favicon.svg",
    tag: data.tag || "resqhub-emergency",
    renotify: true,
    data: data.data || { url: "/volunteer" },
    vibrate: [200, 100, 200],
    actions: [
      {
        action: "view",
        title: "👁️ View Emergency",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event: Focus existing tab or open ResQHub to emergency details
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = event.notification.data?.url || "/volunteer";
  const fullTargetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 1. Check if a ResQHub tab is already open
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(fullTargetUrl);
          }
          return;
        }
      }

      // 2. If no tab is open, open a new browser window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullTargetUrl);
      }
    })
  );
});
