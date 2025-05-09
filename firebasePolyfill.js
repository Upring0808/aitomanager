/**
 * Firebase polyfill for React Native
 * This provides compatibility layer for Firebase initialization
 */

console.log("[Firebase Polyfill] Setting up Firebase compatibility layer");

// Create a safe Firebase Auth mock without modifying NativeModules
const createAuthMock = () => {
  console.log("[Firebase Polyfill] Creating Auth compatibility layer");
  return {
    initialized: true,
    currentUser: null,
  };
};

// Create a safe Firebase App mock
const createAppMock = () => {
  console.log("[Firebase Polyfill] Creating App compatibility layer");
  return {
    initialized: true,
    name: "[DEFAULT]",
  };
};

// Export the mocks for use in other files
export const authMock = createAuthMock();
export const appMock = createAppMock();

export default {
  installed: true,
  version: "compatibility-layer",
};
 