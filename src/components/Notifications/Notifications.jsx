// src/components/Notifications/Notifications.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Snackbar, Alert } from '@mui/material';
import { messaging } from '../../firebaseConfig'; // Adjust path as necessary
import { onMessage } from 'firebase/messaging';
import { showNotification, hideNotification } from '../../redux/slices/notificationsSlice';

const Notifications = () => {
  const dispatch = useDispatch();
  const { title, body, severity, open, key } = useSelector((state) => state.notifications);

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received in Notifications component: ', payload);

      const notifTitle = payload.notification?.title || 'Nouvelle Notification';
      const notifBody = payload.notification?.body || 'Vous avez un nouveau message.';
      // Vous pourriez vouloir mapper payload.data.severity à une valeur de sévérité MUI si disponible
      const notifSeverity = payload.data?.severity || 'info';

      dispatch(showNotification({ title: notifTitle, body: notifBody, severity: notifSeverity }));
    });

    return () => {
      unsubscribe(); // Unsubscribe when component unmounts
    };
  }, [dispatch]);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch(hideNotification());
  };

  if (!title && !body) { // Ne rien rendre si aucun titre ou corps (même si open est true par erreur)
    return null;
  }

  return (
    <Snackbar
      key={key} // Important pour re-déclencher l'animation si le message est le même
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }} variant="filled">
        <strong>{title}</strong><br />
        {body}
      </Alert>
    </Snackbar>
  );
};

export default Notifications;
