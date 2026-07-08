// AetherTrack PWA Service Worker for Mobile Notifications
self.addEventListener('push', function(event) {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : "Don't forget to track your habits today!" };
  }

  const title = payload.title || "AetherTrack Notification";
  const options = {
    body: payload.body || "Log your habits now to secure your streak! ⚡",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    vibrate: [200, 100, 200],
    data: {
      url: "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || "/")
  );
});
