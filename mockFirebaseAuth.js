/**
 * mockFirebaseAuth.js
 * A mock implementation of Firebase Auth for use in Expo Go
 * This is used when the real Firebase Auth can't be initialized
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys
const AUTH_USER_KEY = "@MockFirebaseAuth:currentUser";
const AUTH_USERS_KEY = "@MockFirebaseAuth:users";

// Initialize state
let currentUser = null;
let isInitialized = false;
let authStateListeners = [];

// Load initial state from AsyncStorage
const initialize = async () => {
  if (isInitialized) return;

  try {
    // Load current user from storage
    const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      console.log("[MockAuth] Loaded user from storage:", currentUser.email);
    }

    isInitialized = true;
    console.log("[MockAuth] Mock Auth initialized successfully");

    // Notify listeners about current state
    if (currentUser) {
      notifyAuthStateChanged(currentUser);
    } else {
      notifyAuthStateChanged(null);
    }
  } catch (error) {
    console.error("[MockAuth] Error initializing:", error);
  }
};

// Initialize right away
initialize();

// Notify all listeners of auth state change
const notifyAuthStateChanged = (user) => {
  authStateListeners.forEach((callback) => {
    try {
      callback(user);
    } catch (error) {
      console.error("[MockAuth] Error in auth state listener:", error);
    }
  });
};

// Mock auth state changed listener
const onAuthStateChanged = (callback) => {
  authStateListeners.push(callback);

  // Call immediately with current state
  if (currentUser) {
    callback(currentUser);
  } else {
    callback(null);
  }

  // Return unsubscribe function
  return () => {
    const index = authStateListeners.indexOf(callback);
    if (index !== -1) {
      authStateListeners.splice(index, 1);
    }
  };
};

// Mock sign in
const signInWithEmailAndPassword = async (email, password) => {
  try {
    // Load users from storage
    const storedUsers = await AsyncStorage.getItem(AUTH_USERS_KEY);
    const users = storedUsers ? JSON.parse(storedUsers) : {};

    if (!users[email]) {
      throw new Error("auth/user-not-found");
    }

    if (users[email].password !== password) {
      throw new Error("auth/wrong-password");
    }

    // Create user object
    const user = {
      uid: users[email].uid,
      email,
      emailVerified: true,
      displayName: users[email].displayName || null,
      photoURL: null,
      phoneNumber: null,
      isAnonymous: false,
      metadata: {
        creationTime: users[email].creationTime,
        lastSignInTime: new Date().toISOString(),
      },
      providerData: [
        {
          providerId: "password",
          uid: email,
          displayName: users[email].displayName || null,
          email,
          phoneNumber: null,
          photoURL: null,
        },
      ],
    };

    // Update current user
    currentUser = user;
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    // Notify listeners
    notifyAuthStateChanged(user);

    return { user };
  } catch (error) {
    console.error("[MockAuth] Sign in error:", error.message);
    throw {
      code: error.message,
      message: "Invalid email or password",
    };
  }
};

// Mock create user
const createUserWithEmailAndPassword = async (email, password) => {
  try {
    // Load users from storage
    const storedUsers = await AsyncStorage.getItem(AUTH_USERS_KEY);
    const users = storedUsers ? JSON.parse(storedUsers) : {};

    if (users[email]) {
      throw new Error("auth/email-already-in-use");
    }

    // Generate random UID
    const uid = "mock_" + Math.random().toString(36).substring(2, 15);
    const creationTime = new Date().toISOString();

    // Store user
    users[email] = {
      uid,
      password,
      creationTime,
      displayName: null,
    };

    await AsyncStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));

    // Create user object
    const user = {
      uid,
      email,
      emailVerified: false,
      displayName: null,
      photoURL: null,
      phoneNumber: null,
      isAnonymous: false,
      metadata: {
        creationTime,
        lastSignInTime: creationTime,
      },
      providerData: [
        {
          providerId: "password",
          uid: email,
          displayName: null,
          email,
          phoneNumber: null,
          photoURL: null,
        },
      ],
    };

    // Update current user
    currentUser = user;
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    // Notify listeners
    notifyAuthStateChanged(user);

    return { user };
  } catch (error) {
    console.error("[MockAuth] Create user error:", error.message);
    throw {
      code: error.message,
      message: "Could not create user",
    };
  }
};

// Mock sign out
const signOut = async () => {
  currentUser = null;
  await AsyncStorage.removeItem(AUTH_USER_KEY);

  // Notify listeners
  notifyAuthStateChanged(null);
};

// Mock send password reset email
const sendPasswordResetEmail = async (email) => {
  try {
    // Load users from storage
    const storedUsers = await AsyncStorage.getItem(AUTH_USERS_KEY);
    const users = storedUsers ? JSON.parse(storedUsers) : {};

    if (!users[email]) {
      throw new Error("auth/user-not-found");
    }

    console.log("[MockAuth] Password reset email sent (mock)");
    return true;
  } catch (error) {
    console.error("[MockAuth] Password reset error:", error.message);
    throw {
      code: error.message,
      message: "Could not send password reset email",
    };
  }
};

// Get current user
const getCurrentUser = () => currentUser;

// Mock getAuth function
const getAuth = () => ({
  currentUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
});

// Add Recaptcha config method to fix auth issues
const _getRecaptchaConfig = () => {
  console.log("[MockAuth] Mock _getRecaptchaConfig called");
  return null;
};

// Export mock auth methods
export {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getCurrentUser,
  _getRecaptchaConfig,
};

export default {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getCurrentUser,
};
