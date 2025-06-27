// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx'; // Assuming AuthProvider is needed for now, will be refactored
import { Provider } from 'react-redux'; // Import Redux Provider
import store from './redux/store'; // Import the Redux store
import { messaging } from './firebaseConfig.js'; // <<< ADD THIS
import { getToken, onMessage } from 'firebase/messaging'; // <<< ADD THIS

// Function to request notification permission and get token
async function requestNotificationPermission() {
  console.log('Requesting notification permission...');
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      // Get token
      // You'll need to replace 'YOUR_VAPID_KEY_HERE' with the VAPID key you obtained in Step 1
          const currentToken = await getToken(messaging, { vapidKey: 'BG8mUrc9uXPAvGildndS__arh0iZnGIBY4tpg8MgION-0pqHaLTUxt9DNVzuF8Hoh1eWXuIIFnqtkyfA5z119nU' }); // Ensure your VAPID key is here
      if (currentToken) {
        console.log('FCM Token:', currentToken);
            localStorage.setItem('fcmToken', currentToken); // <<< ADD THIS LINE
        // Send this token to your server to send notifications to this device
        // e.g., save it to Firestore associated with the user
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Unable to get permission to notify.');
    }
  } catch (error) {
    console.error('An error occurred while requesting notification permission: ', error);
  }
}

requestNotificationPermission();

// Handle foreground messages
onMessage(messaging, (payload) => {
  console.log('Message received in foreground: ', payload);
  // Customize notification handling here (e.g., display a toast or update UI)
  // For now, we'll just log it. You'll build a proper UI for this in a later step.
  alert(`Foreground Message: ${payload.notification.title}
${payload.notification.body}`);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}> {/* Wrap with Redux Provider */}
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider> {/* This will be refactored or removed later */}
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
);
