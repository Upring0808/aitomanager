import "react-native-gesture-handler";
import React, { useState, useEffect, useRef } from "react";
import {
  StatusBar,
  AppState,
  Platform,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as SplashScreen from "expo-splash-screen";

// Direct import for firebase/auth to avoid the modular instance error
import {
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import Firebase services with newer approach
import { getAuth, getDatabase, getDb, getStorage } from "./firebase";

// Import services
import userPresenceService from "./services/UserPresenceService";
import FontLoader from "./FontLoader";

// Import font patches
try {
  require("./patchFonts");
} catch (e) {
  console.warn("Error loading font patches:", e);
}

// Import screens
import Index from "./components/Index";
import Register from "./screens/Auth/Register";
import Login from "./screens/Auth/Login";
import RegisterAdmin from "./screens/Auth/RegisterAdmin";
import AdminLogin from "./screens/Auth/AdminLogin";
import Dashboard from "./components/Dashboard";
import AdminDashboard from "./components/AdminDashboard";
import Toast from "react-native-toast-message";

// Override default Text component to use system fonts
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = { fontFamily: undefined };

const Stack = createStackNavigator();

// Utility function to clear Firebase storage
const clearFirebaseStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const firebaseKeys = keys.filter(
      (key) =>
        key.startsWith("@firebase:") ||
        key.startsWith("@FirebaseAuth:") ||
        key.startsWith("@MockFirebaseAuth:") ||
        key.includes("firebaseLocalStorage")
    );

    if (firebaseKeys.length > 0) {
      console.log("[App] Clearing Firebase storage keys:", firebaseKeys);
      await AsyncStorage.multiRemove(firebaseKeys);
    }
  } catch (error) {
    console.error("[App] Error clearing Firebase storage:", error);
  }
};

const App = () => {
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [debugVisible, setDebugVisible] = useState(__DEV__); // Only show in development

  const appState = useRef(AppState.currentState);
  const navigationRef = useRef(null);

  // Function to force sign out
  const handleForceSignOut = async () => {
    try {
      console.log("[App] Force signing out user");
      const auth = getAuth();
      if (auth) {
        try {
          await firebaseSignOut(auth);
        } catch (error) {
          console.error("[App] Error signing out:", error);
        }
      }

      // Clear all Firebase storage
      await clearFirebaseStorage();

      // Reset state
      setUser(null);
      setUserLoggedIn(false);

      // Refresh the app
      setInitializing(true);
      setTimeout(() => setInitializing(false), 500);

      Toast.show({
        type: "success",
        text1: "Signed out successfully",
        text2: "All stored credentials cleared",
      });
    } catch (error) {
      console.error("[App] Error in force sign out:", error);
      Toast.show({
        type: "error",
        text1: "Error signing out",
        text2: error.message,
      });
    }
  };

  // Handle user state changes using Firebase web SDK
  useEffect(() => {
    // Check if auth is initialized
    const auth = getAuth();
    if (!auth) {
      console.error(
        "[App] Auth is not initialized yet, cannot subscribe to auth changes"
      );
      setInitializing(false);
      return () => {};
    }

    console.log("[App] Setting up auth state listener");

    try {
      // Use direct import of onAuthStateChanged
      const unsubscribe = firebaseOnAuthStateChanged(
        auth,
        async (currentUser) => {
          console.log(
            "[App] Auth state changed, user:",
            currentUser ? currentUser.uid : null
          );
          setUser(currentUser);
          setUserLoggedIn(!!currentUser);

          if (currentUser) {
            try {
              // Initialize presence service for logged-in user
              console.log("[App] Initializing presence service for new login");
              await userPresenceService.initialize();

              // Force multiple updates to ensure it registers
              console.log("[App] Forcing multiple online status updates");
              userPresenceService.forceOnlineUpdate();
              setTimeout(() => userPresenceService.forceOnlineUpdate(), 1000);
              setTimeout(() => userPresenceService.forceOnlineUpdate(), 3000);
            } catch (error) {
              console.error("[App] Error initializing presence:", error);
            }
          } else {
            // User logged out, cleanup presence
            console.log(
              "[App] Cleaning up presence service for logged out user"
            );
            await userPresenceService.cleanup();
          }

          if (initializing) {
            setInitializing(false);
            setFirebaseReady(true);
          }
        }
      );

      return unsubscribe; // unsubscribe on unmount
    } catch (error) {
      console.error("[App] Error setting up auth listener:", error);
      setInitializing(false);
      return () => {};
    }
  }, [initializing]);

  // Handle app state changes (background, active, inactive)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log(
        "[App] App state changed from",
        appState.current,
        "to",
        nextAppState
      );

      // App came back to foreground from background
      if (appState.current === "background" && nextAppState === "active") {
        if (userLoggedIn) {
          console.log("[App] App came to foreground, refreshing online status");
          userPresenceService.forceOnlineUpdate();
        }
      }

      // App is going to background - ensure we have disconnect handler setup
      if (appState.current === "active" && nextAppState === "background") {
        if (userLoggedIn) {
          console.log(
            "[App] App going to background, ensuring disconnect handler is set"
          );
          // Web SDK handles disconnect through onDisconnect
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [userLoggedIn]);

  // Force presence update on an interval
  useEffect(() => {
    if (!userLoggedIn) return;

    const updatePresence = () => {
      console.log("[App] Forcing presence update from interval");
      userPresenceService.forceOnlineUpdate();
    };

    // Update status immediately
    updatePresence();

    // Then set interval for regular updates
    const interval = setInterval(updatePresence, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [userLoggedIn]);

  // Show loading screen while Firebase initializes auth state
  if (initializing || !firebaseReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 20 }}>Initializing application...</Text>
      </View>
    );
  }

  // Wrap the app content with FontLoader
  return (
    <FontLoader>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle="dark-content"
      />

      {/* Debug button for development */}
      {debugVisible && (
        <View
          style={{
            position: "absolute",
            top: 40,
            right: 10,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: 10,
            borderRadius: 5,
          }}
        >
          <TouchableOpacity onPress={handleForceSignOut}>
            <Text style={{ color: "white" }}>Force Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <NavigationContainer
        ref={navigationRef}
        onStateChange={() => {
          // Update status whenever navigation changes (tab switches etc)
          if (userLoggedIn) {
            console.log("[App] Navigation changed, updating status");
            userPresenceService.forceOnlineUpdate();
          }
        }}
      >
        <Stack.Navigator
          initialRouteName="Index"
          screenOptions={{
            headerShown: false,
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              };
            },
          }}
        >
          {/* Conditionally render screens based on user login state */}
          {user ? (
            <>
              <Stack.Screen
                name="Dashboard"
                component={Dashboard}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="AdminDashboard"
                component={AdminDashboard}
                options={{ gestureEnabled: false }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Index" component={Index} />
              <Stack.Screen name="Register" component={Register} />
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="AdminLogin" component={AdminLogin} />
              <Stack.Screen name="RegisterAdmin" component={RegisterAdmin} />
            </>
          )}
        </Stack.Navigator>
        <Toast />
      </NavigationContainer>
    </FontLoader>
  );
};

export default App;
