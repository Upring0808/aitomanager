import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { getDatabase, ref, onValue, off, get } from "firebase/database";
import userPresenceService from "../services/UserPresenceService";
import { getAuth } from "../firebase";

// Create context
const OnlineStatusContext = createContext({
  isOnline: false, // Overall online status
  isFirebaseConnected: false, // Firebase Realtime Database connection status
  isNetworkConnected: false, // Device network connection status
  lastOnlineAt: null, // When user was last online (timestamp)
  onlineUsers: {}, // Map of online users (userId -> presence data)
  offlineSince: null, // How long user has been offline
  pendingSyncs: 0, // Count of operations waiting to sync
  refreshStatus: () => {}, // Manual refresh function
  getIsUserOnline: () => false, // Check if a specific user is online
});

// Custom provider component
export const OnlineStatusProvider = ({ children }) => {
  const [state, setState] = useState({
    isOnline: false,
    isFirebaseConnected: false,
    isNetworkConnected: false,
    lastOnlineAt: null,
    onlineUsers: {},
    offlineSince: null,
    pendingSyncs: 0,
  });

  // Local variable to track connection state changes to prevent race conditions
  const connectionState = React.useRef({
    isNetworkConnected: false,
    isFirebaseConnected: false,
  });

  // Add debounce timer reference to avoid flickering
  const offlineTimerRef = React.useRef(null);

  const refreshFirebaseStatus = useCallback(async () => {
    // Check if the user is logged in before making Firebase calls
    if (!getAuth().currentUser) {
      return false;
    }

    try {
      // Check Firebase connection
      const connectedRef = ref(getDatabase(), ".info/connected");
      const snapshot = await get(connectedRef).catch(() => ({
        val: () => false,
      }));

      const isFirebaseConnected = snapshot.val() === true;
      connectionState.current.isFirebaseConnected = isFirebaseConnected;

      // Get online users if connected and user is authenticated
      let onlineUsers = {};
      if (isFirebaseConnected && getAuth().currentUser) {
        try {
          onlineUsers = await userPresenceService.getOnlineUsers();
        } catch (error) {
          // Only log non-permission errors
          if (
            !error.message?.includes("permission_denied") &&
            !error.message?.includes("Permission denied")
          ) {
            console.warn("[OnlineStatus] Error fetching online users:", error);
          }
        }
      }

      setState((currentState) => ({
        ...currentState,
        isFirebaseConnected,
        onlineUsers,
        isOnline: currentState.isNetworkConnected && isFirebaseConnected,
        lastOnlineAt: isFirebaseConnected
          ? Date.now()
          : currentState.lastOnlineAt,
        offlineSince: isFirebaseConnected
          ? null
          : currentState.offlineSince || Date.now(),
      }));

      return isFirebaseConnected;
    } catch (error) {
      console.error(
        "[OnlineStatus] Error checking Firebase connection:",
        error
      );

      setState((currentState) => ({
        ...currentState,
        isFirebaseConnected: false,
        isOnline: false,
        offlineSince: currentState.offlineSince || Date.now(),
      }));

      return false;
    }
  }, []);

  const refreshNetworkStatus = useCallback(async () => {
    try {
      const networkState = await NetInfo.fetch();
      const isNetworkConnected =
        networkState.isConnected &&
        (networkState.isInternetReachable === true ||
          networkState.isInternetReachable === null);

      connectionState.current.isNetworkConnected = isNetworkConnected;

      setState((currentState) => ({
        ...currentState,
        isNetworkConnected,
        isOnline: isNetworkConnected && currentState.isFirebaseConnected,
        offlineSince: isNetworkConnected
          ? currentState.offlineSince
          : currentState.offlineSince || Date.now(),
      }));

      return isNetworkConnected;
    } catch (error) {
      console.error("[OnlineStatus] Error checking network status:", error);

      setState((currentState) => ({
        ...currentState,
        isNetworkConnected: false,
        isOnline: false,
        offlineSince: currentState.offlineSince || Date.now(),
      }));

      return false;
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    // Only proceed if user is authenticated
    if (!getAuth().currentUser) {
      return;
    }

    // Clear any pending offline timer
    if (offlineTimerRef.current) {
      clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }

    const networkConnected = await refreshNetworkStatus();
    if (networkConnected) {
      await refreshFirebaseStatus();
    }

    // Force online update if we appear to be online and are authenticated
    if (
      networkConnected &&
      connectionState.current.isFirebaseConnected &&
      getAuth().currentUser
    ) {
      userPresenceService.forceOnlineUpdate().catch((err) => {
        // Only log non-permission errors
        if (
          !err.message?.includes("permission_denied") &&
          !err.message?.includes("Permission denied")
        ) {
          console.warn("[OnlineStatus] Error forcing online update:", err);
        }
      });
    }
  }, [refreshNetworkStatus, refreshFirebaseStatus]);

  // Force connection check - use this when user triggers manual refresh
  const forceConnectionCheck = useCallback(async () => {
    try {
      console.log("[OnlineStatus] Forcing connection check");
      // First check network status directly
      const networkState = await NetInfo.fetch();

      if (!networkState.isConnected) {
        console.log("[OnlineStatus] Network is definitely offline");
        setState((current) => ({
          ...current,
          isNetworkConnected: false,
          isFirebaseConnected: false,
          isOnline: false,
        }));
        return false;
      }

      // Then check Firebase connection with a direct Firebase ping
      // Fix the invalid path issue by using the standard .info/connected path
      const db = getDatabase();
      const connectedRef = ref(db, ".info/connected");

      // Try multiple times if needed
      for (let i = 0; i < 2; i++) {
        try {
          console.log(
            "[OnlineStatus] Checking Firebase connection attempt",
            i + 1
          );
          const snapshot = await get(connectedRef);
          const isConnected = snapshot.val() === true;

          if (isConnected) {
            console.log(
              "[OnlineStatus] Connection confirmed on attempt",
              i + 1
            );
            setState((current) => ({
              ...current,
              isNetworkConnected: true,
              isFirebaseConnected: true,
              isOnline: true,
              offlineSince: null,
            }));

            // Update presence if user is authenticated
            if (getAuth().currentUser) {
              await userPresenceService.forceOnlineUpdate();
            }
            return true;
          }

          // Short wait between attempts
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.warn(
            "[OnlineStatus] Error during attempt",
            i + 1,
            error.message || error
          );
        }
      }

      console.log("[OnlineStatus] Failed to confirm connection after attempts");
      return false;
    } catch (error) {
      console.error(
        "[OnlineStatus] Error during force connection check:",
        error.message || error
      );
      return false;
    }
  }, []);

  // Check if a specific user is online
  const getIsUserOnline = useCallback(
    async (userId) => {
      // Validate inputs
      if (!userId) return false;

      // Current user is always shown as online to themselves
      if (getAuth().currentUser && userId === getAuth().currentUser.uid) {
        return true;
      }

      // Check our cached online users first for quick response
      if (state.onlineUsers[userId]) {
        return true;
      }

      // If not in cache, check directly with Firebase for the most up-to-date status
      try {
        const presenceData = await userPresenceService.getUserPresence(userId);
        return presenceData && presenceData.state === "online";
      } catch (error) {
        console.warn("[OnlineStatus] Error checking user status:", error);
        // Default to false if there's an error
        return false;
      }
    },
    [state.onlineUsers]
  );

  // Set up network listeners
  useEffect(() => {
    let isMounted = true;
    let unsubscribeNetInfo = () => {};
    let connectionListener = null;
    let refreshInterval = null;
    let appStateListener = null;
    let unregisterCallbacks = () => {};

    const setupListeners = async () => {
      // Initial check
      await refreshStatus();

      // Store connection status for comparison in the listener
      let wasConnected = connectionState.current.isNetworkConnected;

      // Set up network listener
      unsubscribeNetInfo = NetInfo.addEventListener((networkState) => {
        if (!isMounted) return;

        const isConnected =
          networkState.isConnected &&
          (networkState.isInternetReachable === true ||
            networkState.isInternetReachable === null);

        // Only update if connection state has changed
        if (wasConnected !== isConnected) {
          console.log(
            "[OnlineStatus] Network state changed:",
            isConnected ? "CONNECTED" : "DISCONNECTED"
          );

          connectionState.current.isNetworkConnected = isConnected;

          // If disconnected, set a timer before declaring offline state
          // This helps prevent flickering when connection briefly drops
          if (!isConnected) {
            if (offlineTimerRef.current) {
              clearTimeout(offlineTimerRef.current);
            }

            offlineTimerRef.current = setTimeout(() => {
              if (isMounted) {
                console.log("[OnlineStatus] Setting offline state after delay");
                setState((currentState) => ({
                  ...currentState,
                  isNetworkConnected: false,
                  isOnline: false,
                }));
              }
              offlineTimerRef.current = null;
            }, 2000); // 2 second debounce
          } else {
            // Clear any pending offline timer
            if (offlineTimerRef.current) {
              clearTimeout(offlineTimerRef.current);
              offlineTimerRef.current = null;
            }

            setState((currentState) => ({
              ...currentState,
              isNetworkConnected: isConnected,
              isOnline: isConnected && currentState.isFirebaseConnected,
            }));

            // If we just got connected, try to refresh Firebase status
            setTimeout(() => {
              if (isMounted && getAuth().currentUser) {
                refreshFirebaseStatus().catch((e) =>
                  console.warn(
                    "[OnlineStatus] Error refreshing Firebase status:",
                    e
                  )
                );
              }
            }, 1000); // Increased delay to allow network to stabilize
          }
        }

        // Update stored state for next comparison
        wasConnected = isConnected;
      });

      // Only set up Firebase listeners if user is authenticated
      if (getAuth().currentUser) {
        // Set up connection listener with Firebase
        const connectedRef = ref(getDatabase(), ".info/connected");
        connectionListener = onValue(connectedRef, (snapshot) => {
          if (!isMounted) return;

          const isConnected = snapshot.val() === true;

          // Log connection change
          console.log(
            "[OnlineStatus] Firebase connection changed:",
            isConnected ? "CONNECTED" : "DISCONNECTED"
          );

          connectionState.current.isFirebaseConnected = isConnected;

          // If now connected, clear any pending offline timer
          if (isConnected && offlineTimerRef.current) {
            clearTimeout(offlineTimerRef.current);
            offlineTimerRef.current = null;
          }

          setState((currentState) => ({
            ...currentState,
            isFirebaseConnected: isConnected,
            isOnline: isConnected && currentState.isNetworkConnected,
            lastOnlineAt: isConnected ? Date.now() : currentState.lastOnlineAt,
            offlineSince: isConnected
              ? null
              : currentState.offlineSince || Date.now(),
          }));

          // Update online users when connection changes
          if (isConnected && getAuth().currentUser) {
            userPresenceService
              .getOnlineUsers()
              .then((users) => {
                if (isMounted) {
                  setState((currentState) => ({
                    ...currentState,
                    onlineUsers: users,
                  }));
                }
              })
              .catch((error) => {
                // Silently handle permission errors
                if (
                  !error.message?.includes("Permission denied") &&
                  !error.message?.includes("permission_denied")
                ) {
                  console.warn(
                    "[OnlineStatus] Error getting online users:",
                    error
                  );
                }
              });
          }
        });

        // Register for presence service callbacks
        unregisterCallbacks = userPresenceService.registerConnectionCallbacks({
          onOnline: () => {
            if (!isMounted) return;
            console.log("[OnlineStatus] Firebase reported online status");

            // Clear any pending offline timer
            if (offlineTimerRef.current) {
              clearTimeout(offlineTimerRef.current);
              offlineTimerRef.current = null;
            }

            refreshFirebaseStatus().catch((e) =>
              console.warn(
                "[OnlineStatus] Error refreshing Firebase status:",
                e
              )
            );
          },
          onOffline: () => {
            if (!isMounted) return;
            console.log("[OnlineStatus] Firebase reported offline status");

            // Set a timer before declaring offline state
            if (offlineTimerRef.current) {
              clearTimeout(offlineTimerRef.current);
            }

            offlineTimerRef.current = setTimeout(() => {
              if (isMounted) {
                setState((currentState) => ({
                  ...currentState,
                  isFirebaseConnected: false,
                  isOnline: false,
                  offlineSince: currentState.offlineSince || Date.now(),
                }));
              }
              offlineTimerRef.current = null;
            }, 3000); // 3 second debounce
          },
        });

        // Set up a periodic refresh of online users
        refreshInterval = setInterval(() => {
          if (!isMounted) return;

          if (
            connectionState.current.isNetworkConnected &&
            connectionState.current.isFirebaseConnected &&
            getAuth().currentUser
          ) {
            userPresenceService
              .getOnlineUsers()
              .then((users) => {
                if (isMounted) {
                  setState((currentState) => ({
                    ...currentState,
                    onlineUsers: users,
                  }));
                }
              })
              .catch((error) => {
                // Silently handle permission errors
                if (
                  !error.message?.includes("Permission denied") &&
                  !error.message?.includes("permission_denied")
                ) {
                  console.warn(
                    "[OnlineStatus] Error refreshing online users:",
                    error
                  );
                }
              });
          }
        }, 30000); // Refresh every 30 seconds
      }

      // Set up app state listener to refresh when app comes to foreground
      if (Platform.OS !== "web") {
        const { AppState } = require("react-native");

        appStateListener = AppState.addEventListener(
          "change",
          (nextAppState) => {
            if (!isMounted) return;

            if (nextAppState === "active" && getAuth().currentUser) {
              console.log(
                "[OnlineStatus] App came to foreground, refreshing status"
              );
              refreshStatus().catch((e) =>
                console.warn("[OnlineStatus] Error refreshing status:", e)
              );

              // Force an additional connection check after a short delay
              setTimeout(() => {
                if (isMounted) {
                  forceConnectionCheck();
                }
              }, 1000);
            }
          }
        );
      }
    };

    // Set up initial listeners
    setupListeners();

    // Set up auth state listener to re-initialize when auth state changes
    const authInstance = getAuth();
    let unsubscribeAuth = null;
    if (authInstance && typeof authInstance.onAuthStateChanged === "function") {
      unsubscribeAuth = authInstance.onAuthStateChanged((user) => {
        if (user) {
          // User signed in, set up listeners
          setupListeners();
        } else {
          // User signed out, clean up listeners
          if (connectionListener) {
            off(ref(getDatabase(), ".info/connected"), connectionListener);
            connectionListener = null;
          }
          if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
          }
          unregisterCallbacks();

          // Reset state for signed out user
          setState({
            isOnline: false,
            isFirebaseConnected: false,
            isNetworkConnected: connectionState.current.isNetworkConnected,
            lastOnlineAt: null,
            onlineUsers: {},
            offlineSince: null,
            pendingSyncs: 0,
          });
        }
      });
    } else {
      console.error("[Auth] onAuthStateChanged is not a function on auth instance", authInstance);
    }

    // Clear offline timer on cleanup
    if (offlineTimerRef.current) {
      clearTimeout(offlineTimerRef.current);
    }

    // Clean up all listeners
    return () => {
      isMounted = false;
      unsubscribeNetInfo();
      if (connectionListener) {
        off(ref(getDatabase(), ".info/connected"), connectionListener);
      }
      unregisterCallbacks();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (appStateListener) {
        appStateListener.remove();
      }
      unsubscribeAuth();

      // Clear any pending timers
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
    };
  }, [refreshStatus, refreshFirebaseStatus, forceConnectionCheck]);

  // Update the context value
  return (
    <OnlineStatusContext.Provider
      value={{
        isOnline: state.isOnline,
        isFirebaseConnected: state.isFirebaseConnected,
        isNetworkConnected: state.isNetworkConnected,
        lastOnlineAt: state.lastOnlineAt,
        onlineUsers: state.onlineUsers,
        offlineSince: state.offlineSince,
        pendingSyncs: state.pendingSyncs,
        refreshStatus,
        getIsUserOnline,
        forceConnectionCheck,
      }}
    >
      {children}
    </OnlineStatusContext.Provider>
  );
};

// Custom hook for consuming the context
export const useOnlineStatus = () => useContext(OnlineStatusContext);

// Default export for the context
export default OnlineStatusContext;
