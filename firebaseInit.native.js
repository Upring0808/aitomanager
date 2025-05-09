/**
 * firebaseInit.native.js - React Native specific Firebase initialization
 * This file re-exports Firebase services from the central firebaseModule
 */

console.log(
  "[firebaseInit.native] Re-exporting from centralized firebaseModule"
);

// Import from the centralized module
import { app, auth, db, storage, database, initialize } from "./firebaseModule";

// Ensure Firebase is initialized
initialize();

// Re-export services
export { app, auth, db, storage, database };
export default { app, auth, db, storage, database };
