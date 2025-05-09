/**
 * config/firebaseconfig.js - Firebase configuration compatibility layer
 * Ensures backward compatibility with existing imports
 */

import {
  getAuth,
  getDb,
  getStorage,
  getDatabase,
  app,
  db,
  storage,
  database,
} from "../firebase";

// Get the auth instance
const auth = getAuth();

// Ensure _getRecaptchaConfig is available on the auth object
if (typeof auth._getRecaptchaConfig !== "function") {
  console.log(
    "[FirebaseConfig] Adding missing _getRecaptchaConfig method to auth"
  );
  auth._getRecaptchaConfig = () => {
    console.log("[FirebaseConfig] _getRecaptchaConfig called");
    return null;
  };
}

// Re-export everything for backward compatibility
export { app, auth, db, storage, database };
