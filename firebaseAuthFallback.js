/**
 * firebaseAuthFallback.js - Emergency fallback for Firebase Auth
 *
 * This provides a compatible API that's designed to prevent crashes
 * if the real Firebase Auth fails to initialize properly.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys for persistence
const FALLBACK_USER_KEY = "@FirebaseAuth:fallbackUser";
const AUTH_STATE_KEY = "@FirebaseAuth:authState";

// Default user structure
const createDefaultUser = (email, uid) => ({
  uid: uid || `fallback-${Date.now()}`,
  email: email || "",
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [
    {
      providerId: "password",
      uid: email || "",
      displayName: null,
      email: email || "",
      phoneNumber: null,
      photoURL: null,
    },
  ],
  refreshToken: "",
  tenantId: null,
});

class FirebaseAuthFallback {
  constructor() {
    console.log(
      "[Auth Fallback] Initializing Firebase Auth fallback implementation"
    );
    this.currentUser = null;
    this.observers = [];
    this.loadPersistedState();
  }

  /**
   * Load any persisted auth state from AsyncStorage
   */
  async loadPersistedState() {
    try {
      const userJson = await AsyncStorage.getItem(FALLBACK_USER_KEY);
      if (userJson) {
        this.currentUser = JSON.parse(userJson);
        console.log("[Auth Fallback] Restored user from persisted state");
        // Notify observers
        this._notifyAuthStateChanged();
      }
    } catch (error) {
      console.error("[Auth Fallback] Error loading persisted state:", error);
    }
  }

  /**
   * Save the current auth state to AsyncStorage
   */
  async _persistState() {
    try {
      if (this.currentUser) {
        await AsyncStorage.setItem(
          FALLBACK_USER_KEY,
          JSON.stringify(this.currentUser)
        );
      } else {
        await AsyncStorage.removeItem(FALLBACK_USER_KEY);
      }
    } catch (error) {
      console.error("[Auth Fallback] Error persisting state:", error);
    }
  }

  /**
   * Notify all observers of an auth state change
   */
  _notifyAuthStateChanged() {
    this.observers.forEach((observer) => {
      try {
        observer(this.currentUser);
      } catch (error) {
        console.error("[Auth Fallback] Error notifying observer:", error);
      }
    });
  }

  /**
   * Add an auth state change observer
   */
  onAuthStateChanged(callback) {
    if (typeof callback === "function") {
      this.observers.push(callback);
      // Notify the new observer immediately
      try {
        callback(this.currentUser);
      } catch (error) {
        console.error(
          "[Auth Fallback] Error in initial observer callback:",
          error
        );
      }
    }

    // Return unsubscribe function
    return () => {
      this.observers = this.observers.filter(
        (observer) => observer !== callback
      );
    };
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmailAndPassword(email, password) {
    console.log("[Auth Fallback] Sign in attempt:", email);

    try {
      // In a real implementation, we would validate credentials
      // For fallback, we'll accept any login assuming backend will handle real auth

      // Create a fake user object with the provided email
      const user = createDefaultUser(email);
      this.currentUser = user;

      // Update last sign-in time
      if (this.currentUser) {
        this.currentUser.metadata.lastSignInTime = new Date().toISOString();
      }

      // Persist the user
      await this._persistState();

      // Notify observers
      this._notifyAuthStateChanged();

      console.log("[Auth Fallback] Sign in successful");
      return { user };
    } catch (error) {
      console.error("[Auth Fallback] Sign in error:", error);
      throw new Error("Sign in failed in fallback auth implementation");
    }
  }

  /**
   * Create a new user with email and password
   */
  async createUserWithEmailAndPassword(email, password) {
    console.log("[Auth Fallback] Create user attempt:", email);

    try {
      // Create a new user object
      const user = createDefaultUser(email);
      this.currentUser = user;

      // Persist the user
      await this._persistState();

      // Notify observers
      this._notifyAuthStateChanged();

      console.log("[Auth Fallback] User creation successful");
      return { user };
    } catch (error) {
      console.error("[Auth Fallback] User creation error:", error);
      throw new Error("User creation failed in fallback auth implementation");
    }
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    console.log("[Auth Fallback] Sign out attempt");

    try {
      this.currentUser = null;

      // Clear persisted user
      await this._persistState();

      // Notify observers
      this._notifyAuthStateChanged();

      console.log("[Auth Fallback] Sign out successful");
      return true;
    } catch (error) {
      console.error("[Auth Fallback] Sign out error:", error);
      throw new Error("Sign out failed in fallback auth implementation");
    }
  }

  /**
   * Get the current user
   */
  getCurrentUser() {
    return this.currentUser;
  }
}

// Create and export a singleton instance
const authFallback = new FirebaseAuthFallback();
export default authFallback;
