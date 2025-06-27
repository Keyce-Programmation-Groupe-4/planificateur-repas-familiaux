// public/firebase-messaging-sw.js

// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker

const firebaseConfig = {
// insert your firebaseconfig
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title || 'New Message';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new message.',
    icon: '/Logo1.png' // Optional: Path to your app's logo
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
