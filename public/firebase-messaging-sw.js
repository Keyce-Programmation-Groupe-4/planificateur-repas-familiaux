// public/firebase-messaging-sw.js

// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker

const firebaseConfig = {
  apiKey: "AIzaSyDFgmRQKx4M3Gr36ab9S9bxPXknawWb-Sc",
  authDomain: "planificateur-repas-familiaux.firebaseapp.com",
  projectId: "planificateur-repas-familiaux",
  storageBucket: "planificateur-repas-familiaux.firebasestorage.app",
  messagingSenderId: "1085846539126",
  appId: "1:1085846539126:web:6e377351bdf4a186b24857",
  measurementId: "G-7134J2SZSJ",
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
