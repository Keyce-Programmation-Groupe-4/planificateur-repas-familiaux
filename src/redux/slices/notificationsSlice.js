import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  title: null,
  body: null,
  severity: 'info', // 'info', 'success', 'warning', 'error'
  open: false,
  key: null, // Pour forcer le re-render du Snackbar si le message est identique
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    showNotification: (state, action) => {
      state.title = action.payload.title;
      state.body = action.payload.body;
      state.severity = action.payload.severity || 'info';
      state.open = true;
      state.key = new Date().getTime(); // Unique key
    },
    hideNotification: (state) => {
      state.open = false;
      // Optionnel: réinitialiser title/body ici ou laisser jusqu'à la prochaine notif
      // state.title = null;
      // state.body = null;
    },
  },
});

export const { showNotification, hideNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
