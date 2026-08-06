self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'IDDA CRM';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon/favicon-96x96.png',
    badge: data.badge || '/favicon/favicon-96x96.png',
    data: { actionUrl: data.actionUrl || '/notifications' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const actionUrl = event.notification.data?.actionUrl || '/notifications';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            client.url.includes(self.location.origin) &&
            'focus' in client
          ) {
            client.focus();
            client.navigate(actionUrl);
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(actionUrl);
      }),
  );
});
