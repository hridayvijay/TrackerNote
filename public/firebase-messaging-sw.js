importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  "projectId": "personal-task-tracker-9e489",
  "appId": "1:725900951855:web:a31139931a79ef15a5a1da",
  "apiKey": "AIzaSyBBXJiPI3bIQkHwDXURD6rM37YqmUX2jDc",
  "authDomain": "personal-task-tracker-9e489.firebaseapp.com",
  "messagingSenderId": "725900951855",
  "storageBucket": "personal-task-tracker-9e489.firebasestorage.app",
  "measurementId": "G-6DMKW82PTP"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.data?.title || payload.notification?.title || 'Reminder';
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body || '',
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
