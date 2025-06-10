// src/components/Notifications/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { messaging } from '../../firebaseConfig'; // Adjust path as necessary
import { onMessage } from 'firebase/messaging';

const Notifications = () => {
  const [notification, setNotification] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // This replaces the onMessage listener in main.jsx if you want to centralize it.
    // Or, you can keep both if main.jsx handles very basic alerts and this one handles richer UI.
    // For this example, we assume this is the primary foreground message handler.
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received in Notifications component: ', payload);

      // Extract title and body from the nested notification object
      const title = payload.notification?.title || 'New Notification';
      const body = payload.notification?.body || 'You have a new message.';

      setNotification({ title, body });
      setOpen(true);
    });

    // Request permission when component mounts, if not already handled in main.jsx
    // This is a good place if you want to tie permission requests to a specific UI element later
    // For now, main.jsx handles the initial request.
    // Notification.requestPermission().then(permission => {
    //   if (permission === 'granted') {
    //     console.log('Notification permission already granted.');
    //   }
    // });

    return () => {
      unsubscribe(); // Unsubscribe when component unmounts
    };
  }, []);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    setNotification(null);
  };

  if (!notification) {
    return null;
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert onClose={handleClose} severity="info" sx={{ width: '100%' }}>
        <strong>{notification.title}</strong><br />
        {notification.body}
      </Alert>
    </Snackbar>
  );
};

export default Notifications;
