/**
 * clearFirebaseCache.js - Utility to clear Firebase cache and perform diagnostics
 * Run with: node clearFirebaseCache.js
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const clearFirebaseCache = async () => {
  try {
    console.log("Starting Firebase cache cleanup...");

    // Get all keys
    const keys = await AsyncStorage.getAllKeys();

    // Filter Firebase related keys
    const firebaseKeys = keys.filter(
      (key) =>
        key.startsWith("@firebase:") ||
        key.startsWith("firebase:") ||
        key.includes("firebaseLocalStorage") ||
        key.includes("MockFirebaseAuth")
    );

    console.log(`Found ${firebaseKeys.length} Firebase related keys:`);
    firebaseKeys.forEach((key) => console.log(` - ${key}`));

    // Clear Firebase keys
    if (firebaseKeys.length > 0) {
      await AsyncStorage.multiRemove(firebaseKeys);
      console.log("Firebase cache cleared successfully");
    } else {
      console.log("No Firebase cache to clear");
    }

    console.log("Cleanup completed!");
  } catch (error) {
    console.error("Error clearing Firebase cache:", error);
  }
};

// Run the cleanup
clearFirebaseCache();
