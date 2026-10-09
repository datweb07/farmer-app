/*
 * FCM sends data-only messages from /api/salinity-push. The browser dispatches
 * those as PushEvents even in the background; no Firebase secret/config is
 * needed in this worker.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { data: { body: event.data.text() } };
  }

  const data = payload.data || payload;
  const title = data.title || "Cảnh báo độ mặn";
  const options = {
    body: data.body || "Dữ liệu độ mặn mới đã vượt ngưỡng bạn cài đặt.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url || "/" },
    tag: data.tag || "champ-manh-salinity",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === target);
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    }),
  );
});
