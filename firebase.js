/**
 * firebase.js - Centralized Firebase configuration
 * Uses the recommended approach for Expo SDK 53 to avoid Firebase Auth issues
 */

import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth as getFirebaseAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MockAuth from "./mockFirebaseAuth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDybYc6pC-yt7NxWCJ6zztGzfp0GIVhNho",
  authDomain: "aito-manage.firebaseapp.com",
  projectId: "aito-manage",
  storageBucket: "aito-manage.appspot.com",
  messagingSenderId: "689997147601",
  appId: "1:689997147601:web:8b1fd5eda3ea5e17d3c4f0",
  measurementId: "G-VYNN9XMGFR",
  databaseURL:
    "https://aito-manage-default-rtdb.asia-southeast1.firebasedatabase.app",
};

// Detect Expo Go environment
const isExpoGo = !!(global.__expo || global.__turboModuleProxy);
console.log("[Firebase] Running in Expo Go:", isExpoGo);

// Initialize Firebase
let app;
if (getApps().length === 0) {
  console.log("[Firebase] Initializing Firebase app");
  app = initializeApp(firebaseConfig);
} else {
  console.log("[Firebase] Using existing Firebase app");
  app = getApp();
}

// Initialize Auth with AsyncStorage persistence
let auth;
if (isExpoGo) {
  console.log("[Firebase] Using mock auth for Expo Go");
  auth = MockAuth;
  // Add missing Recaptcha config method to mock auth
  auth._getRecaptchaConfig = () => null;
} else {
  try {
    console.log("[Firebase] Initializing Firebase Auth with persistence");
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    console.log("[Firebase] Auth initialized successfully");
    // Ensure Recaptcha config method exists
    if (!auth._getRecaptchaConfig) {
      auth._getRecaptchaConfig = () => null;
    }
  } catch (error) {
    console.warn(
      "[Firebase] Failed to initialize with persistence:",
      error.message
    );
    try {
      console.log("[Firebase] Trying getAuth() fallback");
      auth = getFirebaseAuth(app);
      console.log("[Firebase] Auth initialized without persistence");
      // Ensure Recaptcha config method exists
      if (!auth._getRecaptchaConfig) {
        auth._getRecaptchaConfig = () => null;
      }
    } catch (innerError) {
      console.error("[Firebase] Error with getAuth():", innerError.message);
      console.log("[Firebase] Falling back to mock auth");
      auth = MockAuth;
      // Add missing Recaptcha config method to mock auth
      auth._getRecaptchaConfig = () => null;
    }
  }
}

// Initialize other Firebase services (will be lazy loaded)
let _db = null;
let _storage = null;
let _database = null;

/**
 * Get Firestore instance
 */
const getDb = () => {
  if (!_db) {
    try {
      _db = getFirestore(app);
      console.log("[Firebase] Firestore initialized");
    } catch (error) {
      console.error(
        "[Firebase] Failed to initialize Firestore:",
        error.message
      );
    }
  }
  return _db;
};

/**
 * Get Storage instance
 */
const getStorageInstance = () => {
  if (!_storage) {
    try {
      _storage = getStorage(app);
      console.log("[Firebase] Storage initialized");
    } catch (error) {
      console.error("[Firebase] Failed to initialize Storage:", error.message);
    }
  }
  return _storage;
};

/**
 * Get Realtime Database instance
 */
const getDatabaseInstance = () => {
  if (!_database) {
    try {
      _database = getDatabase(app);
      console.log("[Firebase] Realtime Database initialized");
    } catch (error) {
      console.error("[Firebase] Failed to initialize Database:", error.message);
    }
  }
  return _database;
};

/**
 * Get Auth instance
 */
const getAuth = () => auth;

/**
 * Get current user
 */
const getCurrentUser = () => {
  if (isExpoGo) {
    return MockAuth.getCurrentUser();
  }
  return auth?.currentUser;
};

// Initialize services immediately
getDb();
getStorageInstance();
getDatabaseInstance();

// Export Firebase services directly
export {
  app,
  auth,
  getAuth,
  getCurrentUser,
  getDb,
  getStorageInstance as getStorage,
  getDatabaseInstance as getDatabase,
};

// Re-export initialized references for direct access
export { _db as db, _storage as storage, _database as database };

// Default export
export default {
  app,
  auth,
  getAuth,
  getDb,
  getStorage: getStorageInstance,
  getDatabase: getDatabaseInstance,
  getCurrentUser,
};
