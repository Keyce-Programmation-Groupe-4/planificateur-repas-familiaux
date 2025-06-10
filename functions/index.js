// functions/index.js (or index.ts)
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK if not already done
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * HTTP-triggered function to send a push notification.
 *
 * @param {object} data - The data passed to the function.
 * @param {string} data.token - The FCM registration token of the target device.
 * @param {string} data.title - The title of the notification.
 * @param {string} data.body - The body of the notification.
 * @param {object} [data.data] - Optional data payload for the notification.
 * @param {object} context - The context of the function call.
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  // Optional: Authenticate the user calling this function
  // if (!context.auth) {
  //   throw new functions.https.HttpsError(
  //     "unauthenticated",
  //     "The function must be called while authenticated."
  //   );
  // }
  // const uid = context.auth.uid;
  // console.log(`Notification request from UID: ${uid}`);

  const { token, title, body, data: customData } = data;

  if (!token || !title || !body) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with arguments \"token\", \"title\", and \"body\"."
    );
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token, // FCM registration token
  };

  if (customData) {
    message.data = customData; // Optional data payload
  }

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending message:", error);
    // It's good practice to throw an HttpsError for client-callable functions
    // throw new functions.https.HttpsError("unknown", "Error sending notification", error.message);
    // However, to provide more specific feedback or allow graceful handling on client:
    return { success: false, error: error.message };
  }
});

// Example of how to call this function from your client-side React app:
/*
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(); // Use your initialized functions instance
const sendNotification = httpsCallable(functions, 'sendPushNotification');

sendNotification({
  token: "DEVICE_FCM_TOKEN_HERE",
  title: "My Notification Title",
  body: "Hello from Firebase Functions!",
  data: { key: "value" } // Optional
})
.then((result) => {
  console.log("Notification sent successfully:", result.data);
})
.catch((error) => {
  console.error("Error sending notification:", error);
});
*/
