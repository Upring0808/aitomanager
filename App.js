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
// Import BackHandler conditionally based on platform
let BackHandler;
if (Platform.OS !== "web") {
  BackHandler = require("react-native").BackHandler;
} else {
  // Create a mock BackHandler for web to prevent errors
  BackHandler = {
    addEventListener: () => ({ remove: () => {} }),
    remove: () => {},
  };
}

import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as SplashScreen from "expo-splash-screen";
// Remove BackHandler import as it's not needed and causes errors on web

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

// Import Dashboard screens for nested navigation
import Home from "./screens/Auth/Dashboard/User/Home";
import Fines from "./screens/Auth/Dashboard/User/Fines";
import People from "./screens/Auth/Dashboard/User/People";
import Profile from "./screens/Auth/Dashboard/User/Profile";
import Events from "./screens/Auth/Dashboard/User/Events";

// Import Admin Dashboard screens for nested navigation
import AdminHome from "./screens/Auth/Dashboard/Admin/AdminHome";
import AdminFines from "./screens/Auth/Dashboard/Admin/AdminFines";
import AdminPeople from "./screens/Auth/Dashboard/Admin/AdminPeople";
import AdminProfile from "./screens/Auth/Dashboard/Admin/AdminProfile";
import AdminEvents from "./screens/Auth/Dashboard/Admin/AdminEvents";

// Override default Text component to use system fonts
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = { fontFamily: undefined };

const Stack = createStackNavigator();

// Create navigators for Dashboard and AdminDashboard
const DashboardNavigator = () => {
  const DashboardStack = createStackNavigator();
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardMain" component={Dashboard} />
      <DashboardStack.Screen name="Home" component={Home} />
      <DashboardStack.Screen name="Fines" component={Fines} />
      <DashboardStack.Screen name="People" component={People} />
      <DashboardStack.Screen name="Profile" component={Profile} />
      <DashboardStack.Screen name="Events" component={Events} />
    </DashboardStack.Navigator>
  );
};

// Create AdminDashboard navigator
const AdminDashboardNavigator = () => {
  const AdminDashboardStack = createStackNavigator();
  return (
    <AdminDashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminDashboardStack.Screen
        name="AdminDashboardMain"
        component={AdminDashboard}
      />
      <AdminDashboardStack.Screen name="AdminHome" component={AdminHome} />
      <AdminDashboardStack.Screen name="AdminFines" component={AdminFines} />
      <AdminDashboardStack.Screen name="AdminPeople" component={AdminPeople} />
      <AdminDashboardStack.Screen
        name="AdminProfile"
        component={AdminProfile}
      />
      <AdminDashboardStack.Screen name="AdminEvents" component={AdminEvents} />
    </AdminDashboardStack.Navigator>
  );
};

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

  const appState = useRef(AppState.currentState);
  const navigationRef = useRef(null);

  // Auth state management functions

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

            // Ensure navigation is reset to Index when user logs out
            if (navigationRef.current && !initializing) {
              try {
                console.log("[App] Resetting navigation to Index after logout");
                // Use the correct route name that exists in the navigator
                navigationRef.current.navigate("Index");
                // Reset the navigation stack to have only Index
                setTimeout(() => {
                  navigationRef.current.reset({
                    index: 0,
                    routes: [{ name: "Index" }],
                  });
                }, 100);
              } catch (error) {
                console.error("[App] Navigation reset error:", error);
              }
            }
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

      {/* App content */}

      <NavigationContainer
        ref={navigationRef}
        onStateChange={() => {
          // Update status whenever navigation changes (tab switches etc)
          if (userLoggedIn) {
            console.log("[App] Navigation changed, updating status");
            userPresenceService.forceOnlineUpdate();
          }
        }}
        onReady={() => {
          // Set up navigation reference when ready
          console.log("[App] Navigation container is ready");
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
          {/* Always include Index and auth screens */}
          <Stack.Screen name="Index" component={Index} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="AdminLogin" component={AdminLogin} />
          <Stack.Screen name="RegisterAdmin" component={RegisterAdmin} />

          {/* Only render Dashboard screens if user is logged in */}
          {user && (
            <>
              <Stack.Screen
                name="Dashboard"
                component={DashboardNavigator}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="AdminDashboard"
                component={AdminDashboardNavigator}
                options={{ gestureEnabled: false }}
              />
            </>
          )}
        </Stack.Navigator>
        <Toast />
      </NavigationContainer>
    </FontLoader>
  );
};

export default App;
