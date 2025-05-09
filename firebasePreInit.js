/**
 * Firebase Pre-initialization - Loaded before anything else
 * This ensures Firebase modules are registered properly before they're accessed
 */

console.log("[Firebase Pre-Init] Starting Firebase pre-initialization");

// Import AsyncStorage early to ensure it's available for Firebase Auth
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Manually register Firebase modules early in the loading process
if (global.firebase) {
  console.log("[Firebase Pre-Init] Firebase already exists in global scope");
} else {
  console.log(
    "[Firebase Pre-Init] Creating Firebase placeholders in global scope"
  );
  // Create empty placeholders to ensure modules are registered
  global.firebase = {
    auth: {},
    app: {},
    firestore: {},
    database: {},
    storage: {},
  };
}

// Explicitly register AsyncStorage
if (!global.AsyncStorage && AsyncStorage) {
  console.log("[Firebase Pre-Init] Registering AsyncStorage globally");
  global.AsyncStorage = AsyncStorage;
}

// If running on React Native (not web), patch the Firebase persistence layer
if (Platform.OS !== "web") {
  console.log("[Firebase Pre-Init] Setting up React Native specific patches");

  // Ensure AsyncStorage is available to Firebase Auth
  if (AsyncStorage) {
    console.log(
      "[Firebase Pre-Init] AsyncStorage is available for Auth persistence"
    );

    // Perform additional setup for React Native environment if needed
    try {
      // Pre-initialize the storage mechanism
      AsyncStorage.getItem("firebase:auth:Test")
        .then(() => {
          console.log("[Firebase Pre-Init] AsyncStorage test successful");
        })
        .catch((error) => {
          console.warn(
            "[Firebase Pre-Init] AsyncStorage test failed:",
            error.message
          );
        });
    } catch (error) {
      console.warn(
        "[Firebase Pre-Init] Error during AsyncStorage setup:",
        error.message
      );
    }
  } else {
    console.warn(
      "[Firebase Pre-Init] AsyncStorage not available - Auth persistence may fail"
    );
  }
}

// For Expo SDK 53, we need extra polyfills for Firebase to work correctly
if (Platform.OS !== "web") {
  console.log("[Firebase Pre-Init] Setting up Expo SDK 53 specific polyfills");

  // Polyfill global.auth
  if (!global.auth) {
    global.auth = {};
  }

  // Some builds of React Native may need this polyfill
  if (!global.btoa) {
    global.btoa = function (str) {
      let buffer = str;
      if (typeof str === "string") {
        buffer = Buffer.from(str, "binary");
      }
      return buffer.toString("base64");
    };
  }

  if (!global.atob) {
    global.atob = function (b64Encoded) {
      return Buffer.from(b64Encoded, "base64").toString("binary");
    };
  }
}

console.log("[Firebase Pre-Init] Pre-initialization complete");

export default {
  preInitialized: true,
};
