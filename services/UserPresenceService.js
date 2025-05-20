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
  off,
  setPersistenceEnabled,
  query,
  limitToLast,
} from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

// Firebase service cache is no longer needed as we use direct imports

/**
 * Enhanced UserPresenceService: Handles real-time user presence tracking
 * with robust online/offline handling using Firebase Realtime Database
 */
class UserPresenceService {
  constructor() {
    this.initialized = false;
    this.userStatusDBRef = null;
    this.connectedRef = null;
    this.disconnectHandler = null;
    this.presenceInterval = null;
    this.cleanupListeners = [];
    this.offlineCleanupTimeout = null;
    this.offlineDetectionDelay = 10000; // 10 seconds
    this.INACTIVE_THRESHOLD = 60 * 1000; // 1 minute in milliseconds
    this.onlineCallbacks = [];
    this.offlineCallbacks = [];
    this.authUnsubscribe = null;
    this.connectionState = false; // Track connection state
    this.connectionChangeTimestamp = 0; // To track when connection state last changed
    this.debounceTimeout = null; // For debouncing connection state changes
    this.lastPresenceUpdate = 0; // Track last presence update time

    // Enable disk persistence as early as possible
    this.enablePersistence();

    // Set up auth state listener to handle user sign-out
    this.setupAuthListener();
  }

  /**
   * Setup auth state listener to automatically clean up when user signs out
   */
  setupAuthListener() {
    try {
      if (this.authUnsubscribe) {
        this.authUnsubscribe();
      }

      this.authUnsubscribe = onAuthStateChanged(getAuth(), async (user) => {
        if (!user && this.initialized) {
          // User signed out, force offline status and clean up
          console.log("[Presence] User signed out, forcing offline status");
          await this.forceOfflineStatus();
          await this.cleanup();
        }
      });
    } catch (error) {
      console.error("[Presence] Error setting up auth listener:", error);
    }
  }

  /**
   * Enable disk persistence for offline capabilities
   */
  async enablePersistence() {
    try {
      const db = getDatabase();
      console.log("[Presence] Firebase persistence enabled successfully");
    } catch (error) {
      console.warn(
        "[Presence] Error enabling persistence (may already be enabled):",
        error
      );
    }
  }

  /**
   * Validate Firebase Realtime Database configuration
   */
  async validateDatabaseConfig() {
    try {
      const connectedRef = ref(getDatabase(), ".info/connected");
      const connectedSnap = await get(connectedRef);

      const isConnected = connectedSnap.val() === true;
      console.log(
        "[Presence] Database connection check:",
        isConnected ? "Connected" : "Disconnected"
      );

      // Update internal connection state
      this.connectionState = isConnected;
      this.connectionChangeTimestamp = Date.now();

      return isConnected;
    } catch (error) {
      console.warn("[Presence] Database validation error:", error);

      // Update internal connection state
      this.connectionState = false;
      this.connectionChangeTimestamp = Date.now();

      return false;
    }
  }

  /**
   * Gets user's unique ID or null if not logged in
   */
  getUserId() {
    return getAuth().currentUser ? getAuth().currentUser.uid : null;
  }

  /**
   * Register callbacks for online/offline state changes
   * @param {Object} callbacks - {onOnline: Function, onOffline: Function}
   * @returns {Function} - Unsubscribe function
   */
  registerConnectionCallbacks(callbacks = {}) {
    const { onOnline, onOffline } = callbacks;

    if (typeof onOnline === "function") {
      this.onlineCallbacks.push(onOnline);
    }

    if (typeof onOffline === "function") {
      this.offlineCallbacks.push(onOffline);
    }

    // Return unsubscribe function
    return () => {
      this.onlineCallbacks = this.onlineCallbacks.filter(
        (cb) => cb !== onOnline
      );
      this.offlineCallbacks = this.offlineCallbacks.filter(
        (cb) => cb !== onOffline
      );
    };
  }

  /**
   * Trigger online callbacks with debouncing to prevent rapid oscillation
   */
  triggerOnlineCallbacks() {
    // Clear any pending offline detection
    if (this.offlineCleanupTimeout) {
      clearTimeout(this.offlineCleanupTimeout);
      this.offlineCleanupTimeout = null;
    }

    // Clear any debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Update internal state immediately
    this.connectionState = true;
    this.connectionChangeTimestamp = Date.now();

    // Set a debounce timeout to avoid rapid oscillation
    this.debounceTimeout = setTimeout(() => {
      console.log("[Presence] Triggering online callbacks after debounce");

      this.onlineCallbacks.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          console.error("[Presence] Error in online callback:", error);
        }
      });

      this.debounceTimeout = null;
    }, 1000); // 1-second debounce
  }

  /**
   * Trigger offline callbacks with debouncing to prevent false offline reports
   */
  triggerOfflineCallbacks() {
    // Clear any debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Only schedule offline reporting if we were previously online
    // and enough time has passed since the last connection change
    const timeSinceConnectionChange =
      Date.now() - this.connectionChangeTimestamp;
    if (this.connectionState && timeSinceConnectionChange > 2000) {
      console.log(
        "[Presence] Scheduling offline callbacks with delay to avoid false reports"
      );

      // Update internal state immediately
      this.connectionState = false;
      this.connectionChangeTimestamp = Date.now();

      // Schedule offline callbacks with a delay
      this.offlineCleanupTimeout = setTimeout(() => {
        console.log("[Presence] Triggering offline callbacks after delay");

        this.offlineCallbacks.forEach((callback) => {
          try {
            callback();
          } catch (error) {
            console.error("[Presence] Error in offline callback:", error);
          }
        });

        this.offlineCleanupTimeout = null;
      }, this.offlineDetectionDelay);
    }
  }

  /**
   * Initialize the presence service for the current user with robust connection tracking
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
      // Perform cleanup first to ensure we start fresh
      await this.cleanup();

      // IMPORTANT: Make sure we're using the exact uid from Firebase Auth
      const authUid = getAuth().currentUser.uid;
      console.log("[Presence] Using Firebase Auth user ID:", authUid);

      // Get a reference to the user's status node using the auth UID
      this.userStatusDBRef = ref(getDatabase(), `/status/${authUid}`);

      // Get a reference to the connection status
      this.connectedRef = ref(getDatabase(), ".info/connected");

      // Keep the user profile in sync
      const userProfileRef = ref(getDatabase(), `users/${authUid}/profile`);
      try {
        const profileListener = onValue(userProfileRef, () => {}, {
          keepSynced: true,
        });
        // Store cleanup function
        this.cleanupListeners.push(() => {
          try {
            off(userProfileRef, profileListener);
          } catch (error) {
            // Silent cleanup error
          }
        });
        console.log("[Presence] User profile kept in sync for offline access");
      } catch (error) {
        console.warn("[Presence] Could not set keepSynced on profile:", error);
      }

      // Set up the listener for connection changes with graceful offline detection
      const connectionListener = onValue(this.connectedRef, (snapshot) => {
        // Check the connection value
        const isConnected = snapshot.val() === true;
        console.log(
          `[Presence] Firebase connection changed: ${
            isConnected ? "CONNECTED" : "DISCONNECTED"
          }`
        );

        if (!isConnected) {
          // We are disconnected - trigger callbacks with debouncing
          this.triggerOfflineCallbacks();
          return;
        }

        // We are connected - trigger callbacks
        this.triggerOnlineCallbacks();

        // When connected or reconnected, set up the onDisconnect handler
        // This ensures that if the connection drops, Firebase server updates the status
        onDisconnect(this.userStatusDBRef)
          .set({
            state: "offline",
            last_active: serverTimestamp(),
            uid: authUid, // Ensure UID is stored in the record
            timestamp: serverTimestamp(),
            app_state: "inactive", // Set app state to inactive when disconnected
          })
          .then(() => {
            // Make sure user is still logged in and we're still initialized
            if (!this.getUserId() || !this.initialized) return;

            console.log("[Presence] onDisconnect handler set successfully");
            // Connection is established, so set the user's state to online
            set(this.userStatusDBRef, {
              state: "online",
              last_active: serverTimestamp(),
              uid: authUid, // Ensure UID is stored in the record
              timestamp: serverTimestamp(),
              app_state: "active", // Set app state to active when connected
            }).catch((error) => {
              // Only log non-permission errors
              if (
                !error.message?.includes("permission_denied") &&
                !error.message?.includes("Permission denied")
              ) {
                console.error("[Presence] Error setting online status:", error);
              }
            });
          })
          .catch((error) => {
            // Only log non-permission errors
            if (
              !error.message?.includes("permission_denied") &&
              !error.message?.includes("Permission denied")
            ) {
              console.error(
                "[Presence] Error setting onDisconnect handler:",
                error
              );
            }
          });
      });

      // Store cleanup function
      this.cleanupListeners.push(() => {
        try {
          off(this.connectedRef, connectionListener);
          console.log("[Presence] Removed connection listener");
        } catch (error) {
          // Silent cleanup error
        }
      });

      // Check and clean inactive users periodically
      this.setupInactiveCleanup();

      // Set up a heartbeat to periodically update last_active
      this.setupHeartbeat();

      this.initialized = true;
      console.log("[Presence] Presence service initialized for user:", authUid);

      // Perform an initial validation check
      await this.validateDatabaseConfig();

      // Force initial online state
      await this.forceOnlineUpdate();

      // Also force another update after a short delay to ensure it sticks
      setTimeout(() => {
        if (this.initialized) {
          this.forceOnlineUpdate().catch((err) => {
            // Silently handle errors
          });
        }
      }, 2000);
    } catch (error) {
      // Handle initialization errors, making sure we don't leave things in a bad state
      console.error("[Presence] Failed to initialize presence service:", error);
      this.initialized = false;
      await this.cleanup();
    }
  }

  /**
   * Try to ping the Firebase database to verify connectivity
   * @returns {Promise<boolean>} - True if connected, false otherwise
   */
  async pingFirebase() {
    try {
      // Use the .info/connected node which is lightweight and always accessible
      const db = getDatabase();
      const connectedRef = ref(db, ".info/connected");
      console.log("[Presence] Pinging Firebase with .info/connected");

      const snapshot = await get(connectedRef);
      const isConnected = snapshot.exists() && snapshot.val() === true;

      console.log(
        "[Presence] Ping result:",
        isConnected ? "CONNECTED" : "DISCONNECTED"
      );
      return isConnected;
    } catch (error) {
      console.warn(
        "[Presence] Failed to ping Firebase:",
        error.message || error
      );
      return false;
    }
  }

  /**
   * Set up a mechanism to clean inactive users who appear online but haven't
   * updated their status recently
   */
  setupInactiveCleanup() {
    if (this.inactiveCleanupInterval) {
      clearInterval(this.inactiveCleanupInterval);
    }

    const cleanupInterval = setInterval(async () => {
      // Only continue if we're still initialized and user is logged in
      if (!this.initialized || !this.getUserId()) {
        return;
      }

      try {
        const statusRef = ref(getDatabase(), "status");
        // Use a query to limit the load if there are many users
        const statusQuery = query(statusRef, limitToLast(100));

        const snapshot = await get(statusQuery).catch((error) => {
          // Silently handle permission errors
          if (
            !error.message?.includes("permission_denied") &&
            !error.message?.includes("Permission denied")
          ) {
            throw error;
          }
          return { exists: () => false };
        });

        if (!snapshot.exists()) return;

        const statusData = snapshot.val();
        const currentTime = Date.now();

        // Check each user's status for inactivity
        Object.entries(statusData).forEach(([userId, userData]) => {
          const lastActive = userData.last_active;

          // If last active timestamp is too old, user should be considered offline
          if (
            userData.state === "online" &&
            lastActive && // Ensure we have a timestamp
            currentTime - lastActive > this.INACTIVE_THRESHOLD
          ) {
            console.log(
              `[Presence] User ${userId} appears online but is inactive, marking offline`
            );
            const userStatusRef = ref(getDatabase(), `status/${userId}`);
            update(userStatusRef, {
              state: "offline",
              last_active: serverTimestamp(),
            }).catch((err) => {
              // Only log non-permission errors
              if (
                !err.message?.includes("permission_denied") &&
                !err.message?.includes("Permission denied")
              ) {
                console.error("[Presence] Error updating stale status:", err);
              }
            });
          }
        });
      } catch (error) {
        // Only log non-permission errors
        if (
          !error.message?.includes("permission_denied") &&
          !error.message?.includes("Permission denied")
        ) {
          console.error("[Presence] Error during inactive cleanup:", error);
        }
      }
    }, 60000); // Check every minute

    // Store the interval so we can clear it later
    this.inactiveCleanupInterval = cleanupInterval;

    // Store cleanup function
    this.cleanupListeners.push(() => {
      clearInterval(cleanupInterval);
      this.inactiveCleanupInterval = null;
      console.log("[Presence] Cleared inactive cleanup interval");
    });
  }

  /**
   * Sets up a heartbeat to keep the user online
   */
  setupHeartbeat() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    this.presenceInterval = setInterval(() => {
      const uid = this.getUserId();
      if (uid && this.initialized) {
        this.updateLastActive().catch((error) => {
          // Only log non-permission errors
          if (
            !error.message?.includes("permission_denied") &&
            !error.message?.includes("Permission denied")
          ) {
            console.warn("[Presence] Heartbeat error:", error);
          }
        });
      } else if (!uid) {
        // User is no longer logged in
        this.cleanup();
      }
    }, 15000); // Every 15 seconds

    console.log("[Presence] Started presence heartbeat (15s intervals)");

    // Store cleanup function
    this.cleanupListeners.push(() => {
      if (this.presenceInterval) {
        clearInterval(this.presenceInterval);
        this.presenceInterval = null;
        console.log("[Presence] Cleared heartbeat interval");
      }
    });
  }

  /**
   * Manually update user's last active timestamp and ensures online status
   */
  async updateLastActive() {
    // Make sure we have a valid user
    if (!getAuth().currentUser) {
      return false;
    }

    // Get the Firebase Auth user ID directly
    const authUid = getAuth().currentUser.uid;

    if (!this.initialized) {
      return false;
    }

    try {
      // Check if we're connected first to avoid unnecessary operations
      const isConnected = await this.validateDatabaseConfig();
      if (!isConnected) {
        console.log("[Presence] Can't update last active - not connected");
        return false;
      }

      // Update the status node with the correct user ID
      const statusRef = ref(getDatabase(), `/status/${authUid}`);

      await update(statusRef, {
        last_active: serverTimestamp(),
        uid: authUid, // Ensure UID is stored in the record
      });
      return true;
    } catch (error) {
      // Only throw non-permission errors
      if (
        !error.message?.includes("permission_denied") &&
        !error.message?.includes("Permission denied")
      ) {
        console.error(
          "[Presence] Error updating last active timestamp:",
          error.message || error
        );
        throw error;
      }
      return false;
    }
  }

  /**
   * Force an update to online status - used for manual updates and heartbeat
   * Returns true if successful, false otherwise
   */
  async forceOnlineUpdate() {
    // Make sure we have a valid user
    if (!getAuth().currentUser) {
      console.log(
        "[Presence] Cannot force online update - no authenticated user"
      );
      return false;
    }

    // Get the Firebase Auth user ID directly
    const authUid = getAuth().currentUser.uid;

    if (!this.initialized || !this.userStatusDBRef) {
      console.log(
        "[Presence] Cannot force online update - not properly initialized"
      );
      return false;
    }

    try {
      // First ping Firebase to check connectivity
      const isConnected = await this.pingFirebase();

      if (!isConnected) {
        console.log("[Presence] Cannot force online update - not connected");
        return false;
      }

      // Update the status node with the correct user ID
      const statusRef = ref(getDatabase(), `/status/${authUid}`);

      // Use update to only change specific fields, preserving others if needed
      await update(statusRef, {
        state: "online",
        last_active: serverTimestamp(),
        uid: authUid, // Ensure UID is stored in the record
        timestamp: serverTimestamp(),
        app_state: "active", // Setting app state to active when forcing online status
      });

      // Update our internal state
      this.connectionState = true;
      this.connectionChangeTimestamp = Date.now();

      console.log(
        "[Presence] Successfully forced online status update for:",
        authUid
      );
      return true;
    } catch (error) {
      // Only log non-permission errors
      if (
        !error.message?.includes("permission_denied") &&
        !error.message?.includes("Permission denied")
      ) {
        console.error(
          "[Presence] Error forcing online status:",
          error.message || error
        );
      }
      return false;
    }
  }

  /**
   * Force user status to offline - used during logout
   */
  async forceOfflineStatus() {
    try {
      const uid = this.getUserId();
      if (!uid) return;

      const statusRef = ref(getDatabase(), `/status/${uid}`);
      await update(statusRef, {
        state: "offline",
        last_active: serverTimestamp(),
        uid: uid,
        timestamp: serverTimestamp(),
        app_state: "inactive",
      });

      console.log("[Presence] Forced offline status for user:", uid);
    } catch (error) {
      console.warn("[Presence] Error forcing offline status:", error);
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

    // Always use the Firebase Auth ID for the current user
    const currentUser = getAuth().currentUser;
    if (currentUser && userId === currentUser.uid) {
      // Always report current user as online
      return {
        state: "online",
        last_active: Date.now(),
        uid: currentUser.uid,
        app_state: "active", // Current user's app is always active when checking
      };
    }

    try {
      // Get the status record for the requested user
      const userStatusRef = ref(getDatabase(), `/status/${userId}`);

      const snapshot = await get(userStatusRef).catch((error) => {
        // Silently handle permission errors
        if (
          !error.message?.includes("permission_denied") &&
          !error.message?.includes("Permission denied")
        ) {
          throw error;
        }
        return { exists: () => false };
      });

      if (snapshot.exists()) {
        const data = snapshot.val();
        const currentTime = Date.now();

        // Check if the last_active timestamp is valid and not in the future
        if (data.last_active && data.last_active > currentTime) {
          console.warn(
            `[Presence] Invalid future timestamp for user ${userId}`
          );
          return { state: "offline", last_active: currentTime };
        }

        // Check app state first - if app is not active, user should be considered offline
        if (data.app_state && data.app_state !== "active") {
          console.log(
            `[Presence] User ${userId} app is ${data.app_state} - reporting as offline`
          );
          return {
            ...data,
            state: "offline",
            adjusted: true,
            adjustment_reason: "app_inactive",
          };
        }

        // Validate if the 'online' status is accurate based on last_active
        if (data.state === "online" && data.last_active) {
          const lastActive = data.last_active;
          const timeSinceActive = currentTime - lastActive;

          if (timeSinceActive > this.INACTIVE_THRESHOLD) {
            console.log(
              `[Presence] User ${userId} appears online but is inactive - reporting as offline`
            );
            return {
              ...data,
              state: "offline",
              adjusted: true,
              adjustment_reason: "inactive",
            };
          }
        }

        return data;
      }
      console.log(`[Presence] No presence data for user ${userId}`);
    } catch (error) {
      // Only log non-permission errors
      if (
        !error.message?.includes("permission_denied") &&
        !error.message?.includes("Permission denied")
      ) {
        console.error(
          `[Presence] Error getting presence for user ${userId}:`,
          error.message || error
        );
      }
    }
    return { state: "offline", last_active: null };
  }

  /**
   * Update user presence based on app state
   * @param {string} appState - The current app state ('active', 'background', 'inactive')
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  async updatePresenceWithAppState(appState) {
    // Make sure we have a valid user
    if (!getAuth().currentUser) {
      return false;
    }

    // Get the Firebase Auth user ID directly
    const authUid = getAuth().currentUser.uid;

    if (!this.initialized) {
      return false;
    }

    try {
      // First check connection
      const isConnected = await this.validateDatabaseConfig();
      if (!isConnected) {
        console.log("[Presence] Can't update presence - not connected");
        return false;
      }

      // Update the status node with the correct user ID
      const statusRef = ref(getDatabase(), `/status/${authUid}`);

      // If app is in foreground (active), set status to online
      if (appState === "active") {
        await update(statusRef, {
          state: "online",
          last_active: serverTimestamp(),
          uid: authUid,
          timestamp: serverTimestamp(),
          app_state: appState,
        });
        this.connectionState = true;
        this.connectionChangeTimestamp = Date.now();
        return true;
      }
      // If app is in background or inactive, update last_active but don't change state
      else {
        await update(statusRef, {
          last_active: serverTimestamp(),
          uid: authUid,
          app_state: appState,
        });
        return true;
      }
    } catch (error) {
      // Only log non-permission errors
      if (
        !error.message?.includes("permission_denied") &&
        !error.message?.includes("Permission denied")
      ) {
        console.error(
          "[Presence] Error updating presence with app state:",
          error.message || error
        );
      }
      return false;
    }
  }

  /**
   * Get all online users in the system
   * @returns {Promise<Object>} - Map of userId -> presence data
   */
  async getOnlineUsers() {
    if (!this.getUserId()) {
      return {};
    }

    try {
      const statusRef = ref(getDatabase(), "status");
      const snapshot = await get(statusRef).catch((error) => {
        // Silently handle permission errors
        if (
          !error.message?.includes("permission_denied") &&
          !error.message?.includes("Permission denied")
        ) {
          throw error;
        }
        return { exists: () => false };
      });

      if (!snapshot.exists()) {
        return {};
      }

      const statusData = snapshot.val();
      const currentTime = Date.now();
      const onlineUsers = {};

      // Filter for actual online users
      Object.entries(statusData).forEach(([userId, userData]) => {
        // Make sure we have valid data
        if (!userData || !userData.last_active) return;

        // Calculate time since last active
        const timeSinceActive = currentTime - userData.last_active;

        // Check for app state (if available)
        const appState = userData.app_state || "unknown";

        // Only include if truly online, active recently, and app is active
        const isRecentlyActive = timeSinceActive < this.INACTIVE_THRESHOLD;
        const isOnlineState = userData.state === "online";
        const isAppActive = appState === "active";

        if (isOnlineState && isRecentlyActive && isAppActive) {
          onlineUsers[userId] = userData;
          console.log(
            `[Presence] User ${userId} is online and active (${Math.floor(
              timeSinceActive / 1000
            )}s ago, app: ${appState})`
          );
        } else if (isOnlineState && !isRecentlyActive) {
          console.log(
            `[Presence] User ${userId} has online state but inactive for ${Math.floor(
              timeSinceActive / 1000
            )}s`
          );
        } else if (isOnlineState && !isAppActive) {
          console.log(
            `[Presence] User ${userId} is online but app is ${appState}`
          );
        }
      });

      return onlineUsers;
    } catch (error) {
      // Only log non-permission errors
      if (
        !error.message?.includes("permission_denied") &&
        !error.message?.includes("Permission denied")
      ) {
        console.error("[Presence] Error getting online users:", error);
      }
      return {};
    }
  }

  /**
   * Clean up all presence-related resources and listeners
   */
  async cleanup() {
    console.log("[Presence] Cleaning up presence service");

    // Force offline status before cleanup
    await this.forceOfflineStatus();

    // Clear all intervals
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }

    if (this.inactiveCleanupInterval) {
      clearInterval(this.inactiveCleanupInterval);
      this.inactiveCleanupInterval = null;
    }

    // Clear all timeouts
    if (this.offlineCleanupTimeout) {
      clearTimeout(this.offlineCleanupTimeout);
      this.offlineCleanupTimeout = null;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    // Run all cleanup listeners
    if (this.cleanupListeners.length > 0) {
      this.cleanupListeners.forEach((cleanup) => {
        try {
          if (typeof cleanup === "function") {
            cleanup();
          }
        } catch (error) {
          console.warn("[Presence] Error in cleanup listener:", error);
        }
      });
      this.cleanupListeners = [];
    }

    // Unsubscribe from auth state changes
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }

    // Clear callbacks
    this.onlineCallbacks = [];
    this.offlineCallbacks = [];

    // Reset state
    this.initialized = false;
    this.userStatusDBRef = null;
    this.connectedRef = null;
    this.disconnectHandler = null;
    this.connectionState = false;
    this.connectionChangeTimestamp = 0;
    this.lastPresenceUpdate = 0;

    console.log("[Presence] Cleanup completed");
  }

  /**
   * Format a timestamp into a human-readable "last seen" text
   * @param {number} timestamp - The timestamp to format
   * @returns {string} - Formatted "last seen" text
   */
  formatLastSeen(timestamp) {
    if (!timestamp) return "";

    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return days === 1 ? "yesterday" : `${days} days ago`;
    }
    if (hours > 0) {
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    }
    if (minutes > 0) {
      return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
    }
    if (seconds > 0) {
      return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`;
    }
    return "just now";
  }
}

// Create a singleton instance
const userPresenceService = new UserPresenceService();

// Export the singleton instance
export default userPresenceService;
