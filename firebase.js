/**
 * firebase.js - Centralized Firebase configuration
 * Complete fixed version maintaining all original functionality
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

// Mock Firebase Auth for development/testing
const MockAuth = {
  currentUser: null,
  onAuthStateChanged: (callback) => {
    // Mock implementation
    return () => {}; // unsubscribe function
  },
  signInWithEmailAndPassword: async (email, password) => {
    console.log("[MockAuth] Sign in attempt:", email);
    return { user: { uid: "mock-uid", email } };
  },
  createUserWithEmailAndPassword: async (email, password) => {
    console.log("[MockAuth] Create user attempt:", email);
    return { user: { uid: "mock-uid", email } };
  },
  signOut: async () => {
    console.log("[MockAuth] Sign out");
    return Promise.resolve();
  },
  getCurrentUser: () => {
    return MockAuth.currentUser;
  },
  _getRecaptchaConfig: () => null,
};

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDybYc6pC-yt7NxWCJ6zztGzfp0GIVhNho",
  authDomain: "aito-manage.firebaseapp.com",
  projectId: "aito-manage",
  storageBucket: "aito-manage.appspot.com",
  messagingSenderId: "689997147601",
  appId: "1:689997147601:web:8b1fd5eda3ea5e17d3c4f0",
  measurementId: "G-VYNN9XMGFR",
  databaseURL: "https://aito-manage-default-rtdb.asia-southeast1.firebasedatabase.app",
};

// Detect Expo Go environment
const isExpoGo = !!(global.__expo || global.__turboModuleProxy);
console.log("[Firebase] Running in Expo Go:", isExpoGo);

// Add at the very top
console.log("[Firebase] firebase.js loaded");

// Initialize Firebase App
let app;
if (getApps().length === 0) {
  console.log("[Firebase] Initializing Firebase app");
  app = initializeApp(firebaseConfig);
} else {
  console.log("[Firebase] Using existing Firebase app");
  app = getApp();
}

// Initialize Auth with proper fallback handling
let auth;
if (isExpoGo) {
  console.log("[Firebase] Using mock auth for Expo Go");
  auth = MockAuth;
  console.log("[Firebase] auth set to MockAuth:", auth);
} else {
  try {
    // Try to use initializeAuth with persistence (React Native only)
    try {
      console.log("[Firebase] Trying initializeAuth with persistence");
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
      console.log("[Firebase] auth set to initialized Auth (with persistence):", auth);
    } catch (initError) {
      console.warn("[Firebase] initializeAuth failed, falling back to getFirebaseAuth:", initError.message);
      auth = getFirebaseAuth(app);
      console.log("[Firebase] auth set to getFirebaseAuth(app):", auth);
    }
    // Ensure Recaptcha config method exists
    if (!auth._getRecaptchaConfig) {
      auth._getRecaptchaConfig = () => null;
    }
  } catch (error) {
    console.error("[Firebase] Error initializing Auth:", error.message);
      console.log("[Firebase] Falling back to mock auth");
      auth = MockAuth;
    console.log("[Firebase] auth set to MockAuth (fallback):", auth);
  }
}
console.log("[Firebase] Final auth object:", auth);

// Initialize other Firebase services with lazy loading
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
      console.error("[Firebase] Failed to initialize Firestore:", error.message);
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
const getAuth = () => {
  console.log("[Firebase] getAuth() called, current value:", auth);
  if (!auth || typeof auth.onAuthStateChanged !== "function") {
    console.error("[Firebase] getAuth() returned an invalid auth object:", auth);
    throw new Error("[Firebase] getAuth() did not return a valid Auth instance");
  }
  return auth;
};

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
const db = getDb();
const storage = getStorageInstance();
const database = getDatabaseInstance();

// Export Firebase services directly
export {
  app,
  auth,
  db,
  storage,
  database,
  getAuth,
  getCurrentUser,
  getDb,
  getStorageInstance as getStorage,
  getDatabaseInstance as getDatabase,
};

// Default export
export default {
  app,
  auth,
  db,
  storage,
  database,
  getAuth,
  getDb,
  getStorage: getStorageInstance,
  getDatabase: getDatabaseInstance,
  getCurrentUser,
}