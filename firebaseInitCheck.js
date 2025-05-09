/**
 * Utility to check if Firebase Auth has been properly initialized
 */

import { getFirebaseServices } from "./firebaseModule";

export const checkFirebaseInit = () => {
  const { auth, isInitialized } = getFirebaseServices();
  console.log(
    "[Firebase Check] Firebase initialized:",
    isInitialized ? "YES" : "NO"
  );
  console.log("[Firebase Check] Auth initialized:", auth ? "YES" : "NO");

  if (auth) {
    console.log("[Firebase Check] Auth object:", Object.keys(auth));
    return true;
  }
  return false;
};

// Run check automatically when imported
setTimeout(() => {
  try {
    const result = checkFirebaseInit();
    console.log("[Firebase Check] Initialization check result:", result);
  } catch (error) {
    console.error("[Firebase Check] Error checking initialization:", error);
  }
}, 1000);

export default checkFirebaseInit;
