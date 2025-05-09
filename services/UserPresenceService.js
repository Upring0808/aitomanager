import { getAuth } from "../firebase";
import {
  ref,
  onValue,
  set,
  update,
  serverTimestamp,
  onDisconnect,
  get,
  getDatabase,
} from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

// Firebase service cache is no longer needed as we use direct imports

/**
 * UserPresenceService: Handles real-time user presence tracking
 * using Firebase web SDK (compatible with Expo Go)
 */
class UserPresenceService {
  constructor() {
    this.initialized = false;
    this.userStatusDBRef = null;
    this.connectedRef = null;
    this.disconnectHandler = null;
    this.presenceInterval = null;

    // No need to pass services or validate config here
    // @react-native-firebase ensures initialization
  }

  /**
   * Validate Firebase Realtime Database configuration (Optional Check)
   */
  async validateDatabaseConfig() {
    try {
      const connectedRef = ref(getDatabase(), ".info/connected");
      const connectedSnap = await get(connectedRef);
      console.log(
        "[Presence] Database connection check:",
        connectedSnap.val() ? "Connected" : "Disconnected"
      );
    } catch (error) {
      // Handle the error silently to prevent app crashes
      console.log("[Presence] Database validation skipped");
    }
  }

  /**
   * Gets user's unique ID or null if not logged in
   */
  getUserId() {
    return getAuth().currentUser ? getAuth().currentUser.uid : null;
  }

  /**
   * Initialize the presence service for the current user
   */
  async initialize() {
    const uid = this.getUserId();
    if (!uid) {
      console.log("[Presence] No user logged in, cannot initialize presence");
      return;
    }

    if (this.initialized) {
      console.log("[Presence] Already initialized, forcing update");
      await this.forceOnlineUpdate();
      return;
    }

    console.log("[Presence] Initializing presence for user:", uid);

    try {
      // Get a reference to the user's status node
      this.userStatusDBRef = ref(getDatabase(), `/status/${uid}`);

      // Get a reference to the connection status
      this.connectedRef = ref(getDatabase(), ".info/connected");

      // Set up the listener for connection changes
      onValue(this.connectedRef, (snapshot) => {
        if (snapshot.val() === false) {
          // We are likely disconnected, but onDisconnect handles the offline state
          console.log("[Presence] Firebase connection lost");
          return;
        }

        console.log("[Presence] Firebase connection established/restored");

        // When connected or reconnected, set up the onDisconnect handler
        // This ensures that if the connection drops, Firebase server updates the status
        onDisconnect(this.userStatusDBRef)
          .set({
            state: "offline",
            last_active: serverTimestamp(),
          })
          .then(() => {
            console.log("[Presence] onDisconnect handler set successfully");
            // Connection is established, so set the user's state to online
            set(this.userStatusDBRef, {
              state: "online",
              last_active: serverTimestamp(),
            });
          })
          .catch((error) => {
            console.error(
              "[Presence] Error setting onDisconnect handler:",
              error
            );
          });
      });

      // Set up a heartbeat to periodically update last_active
      this.setupHeartbeat();

      this.initialized = true;
      console.log("[Presence] Presence service initialized for user:", uid);

      // Perform an initial validation check (optional)
      this.validateDatabaseConfig();
    } catch (error) {
      console.error("[Presence] Failed to initialize presence service:", error);
      this.initialized = false;
    }
  }

  /**
   * Sets up a heartbeat to keep the user online
   */
  setupHeartbeat() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }
    this.presenceInterval = setInterval(() => {
      if (this.getUserId()) {
        this.forceOnlineUpdate();
      } else {
        this.cleanup();
      }
    }, 15000); // Every 15 seconds
    console.log("[Presence] Started presence heartbeat (15s intervals)");
  }

  /**
   * Manually update user's last active timestamp and ensures online status
   */
  async updateLastActive() {
    const uid = this.getUserId();
    if (!uid || !this.userStatusDBRef) return;
    try {
      await update(this.userStatusDBRef, {
        last_active: serverTimestamp(),
      });
    } catch (error) {
      console.error("[Presence] Error updating last active timestamp:", error);
    }
  }

  /**
   * Force an update to online status - used for manual updates and heartbeat
   */
  async forceOnlineUpdate() {
    const uid = this.getUserId();
    if (!uid || !this.userStatusDBRef) return;
    try {
      // Use update to only change specific fields, preserving others if needed
      await update(this.userStatusDBRef, {
        state: "online",
        last_active: serverTimestamp(),
      });
    } catch (error) {
      console.error("[Presence] Error forcing online status:", error);
    }
  }

  /**
   * Get a user's current presence state directly from the database
   * @param {string} userId - The user ID to check
   * @returns {Promise<Object>} - User presence data: {state, last_active}
   */
  async getUserPresence(userId) {
    if (!userId) {
      console.warn("[Presence] Cannot get presence for undefined userId");
      return { state: "offline", last_active: null };
    }

    const currentUid = this.getUserId();
    if (currentUid && userId === currentUid) {
      return { state: "online", last_active: Date.now() };
    }

    try {
      const userStatusRef = ref(getDatabase(), `/status/${userId}`);
      const snapshot = await get(userStatusRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log(`[Presence] User ${userId} presence:`, data);
        return data;
      }
      console.log(`[Presence] No presence data for user ${userId}`);
    } catch (error) {
      console.error(
        `[Presence] Error getting presence for user ${userId}:`,
        error
      );
    }
    return { state: "offline", last_active: null };
  }

  /**
   * Format the user's last active time as a readable string
   * @param {number} timestamp - Firebase timestamp
   * @returns {string} - Formatted string (e.g. "2 minutes ago", "Just now")
   */
  formatLastSeen(timestamp) {
    if (!timestamp) return "Never";
    try {
      const now = new Date();
      const lastActive = new Date(timestamp);
      const diffMinutes = Math.floor((now - lastActive) / (60 * 1000));
      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60)
        return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24)
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } catch (error) {
      console.error("[Presence] Error formatting last seen timestamp:", error);
      return "Unknown";
    }
  }

  /**
   * Clean up listeners when logging out or component unmounting
   */
  async cleanup() {
    console.log(
      "[Presence] Cleaning up presence service for user:",
      this.getUserId() || "none"
    );

    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
      console.log("[Presence] Cleared heartbeat interval");
    }

    // Try to set offline status before cleaning up references
    if (this.userStatusDBRef) {
      try {
        const uid = this.getUserId();
        if (uid) {
          // Use set instead of update to ensure complete replacement
          await set(this.userStatusDBRef, {
            state: "offline",
            last_active: serverTimestamp(),
          });
          console.log("[Presence] Set user status to offline");
        }
      } catch (error) {
        console.error("[Presence] Error updating offline status:", error);
      }
    }

    // Safely remove listeners - no need to use 'off' with Firebase Web SDK v9+
    // The Firebase Web SDK v9+ uses a different pattern for cleanup
    // References will be garbage collected when nullified
    try {
      // With the modular SDK, we don't need to manually call 'off'
      // Just release references to allow garbage collection
      if (this.connectedRef) {
        console.log("[Presence] Releasing connected ref listener");
        // No explicit removal needed with Firebase v9+
      }
    } catch (error) {
      console.error("[Presence] Error during listener cleanup:", error);
    }

    // Reset all references
    this.userStatusDBRef = null;
    this.connectedRef = null;
    this.initialized = false;
    console.log("[Presence] Presence service cleanup complete");
  }
}

// Export a singleton instance
const userPresenceService = new UserPresenceService();
export default userPresenceService;
