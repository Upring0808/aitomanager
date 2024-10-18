import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
const storage = getStorage(app); // Added Firebase Storage

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

// Export the instances
export { auth, db, storage }; // Added storage export
