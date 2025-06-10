// src/utils/notificationUtils.js
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions as functionsInstance } from '../firebaseConfig'; // Ensure this path is correct

/**
 * Calls the 'sendPushNotification' Firebase Function.
 *
 * @param {string} token - The FCM registration token of the target device.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body of the notification.
 * @param {object} [data] - Optional data payload for the notification.
 * @returns {Promise<any>} The result from the Firebase Function.
 */
export const triggerSendNotification = async (token, title, body, data) => {
  if (!token || !title || !body) {
    console.error("Token, title, and body are required to send a notification.");
    return { success: false, error: "Missing required fields." };
  }

  // If you haven't passed the initialized functions instance from firebaseConfig,
  // you might need to initialize it here:
  // const functions = getFunctions();
  // However, it's better to use the instance from firebaseConfig.js

  const sendNotificationFunction = httpsCallable(functionsInstance, 'sendPushNotification');

  try {
    console.log(`Attempting to send notification: Token: ${token}, Title: ${title}, Body: ${body}`);
    const result = await sendNotificationFunction({
      token,
      title,
      body,
      data, // Optional: e.g., { url: '/some-path' }
    });
    console.log("Notification function called successfully, result:", result.data);
    return result.data;
  } catch (error) {
    console.error("Error calling sendPushNotification function:", error);
    // To make the error structure consistent with the success case of the cloud function
    return { success: false, error: error.message };
  }
};

// Example Usage (you can run this in your browser's developer console if you import this function):
/*
import { triggerSendNotification } from './utils/notificationUtils'; // Adjust path
const fcmToken = "YOUR_DEVICE_FCM_TOKEN_HERE"; // Get this from your app's console log after permission
if (fcmToken) {
  triggerSendNotification(fcmToken, "Test Title from Client", "Hello, this is a test notification!", { customKey: 'customValue' })
    .then(response => console.log("Test response:", response))
    .catch(error => console.error("Test error:", error));
} else {
  console.error("FCM Token not available. Make sure permission is granted and token is logged.");
}
*/
