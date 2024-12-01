// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken } from "firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

const firebaseConfig = {
  apiKey: "AIzaSyDybYc6pC-yt7NxWCJ6zztGzfp0GIVhNho",
  authDomain: "aito-manage.firebaseapp.com",
  projectId: "aito-manage",
  storageBucket: "aito-manage.appspot.com",
  messagingSenderId: "689997147601",
  appId: "1:689997147601:web:8b1fd5eda3ea5e17d3c4f0",
  measurementId: "G-VYNN9XMGFR",
};

// Initialize Firebase App
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Initialize Firebase Auth with AsyncStorage
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  console.log("Auth already initialized", error);
  auth = getAuth(app);
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Function to register device for push notifications
export async function registerForPushNotifications() {
  let token;

  if (!Device.isDevice) {
    console.log("Must use physical device for Push Notifications");
    return;
  }

  // Check if we have permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push token for push notification!");
    return;
  }

  // Get the token
  token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId,
    })
  ).data;

  // Store the token in Firestore
  if (token && auth.currentUser) {
    const userTokenRef = doc(db, "userTokens", auth.currentUser.uid);
    await setDoc(
      userTokenRef,
      {
        token,
        userId: auth.currentUser.uid,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  return token;
}

// Function to send push notification
export async function sendPushNotification(userIds, notification) {
  try {
    // Get tokens for all specified users
    const tokenSnapshots = await Promise.all(
      userIds.map((userId) => getDoc(doc(db, "userTokens", userId)))
    );

    const tokens = tokenSnapshots
      .filter((snap) => snap.exists())
      .map((snap) => snap.data().token);

    // Send to all tokens
    await Promise.all(
      tokens.map((token) =>
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: token,
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
          }),
        })
      )
    );
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw error;
  }
}

export { auth, db, storage };
