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

// Direct import for firebase/auth to avoid the modular instance error
import {
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import Firebase services with newer approach
import { getAuth, getDatabase, getDb, getStorage } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// Import services
import userPresenceService from "./services/UserPresenceService";
import FontLoader from "./FontLoader";

// Import context providers
import { OnlineStatusProvider } from "./contexts/OnlineStatusContext";
import { AuthProvider } from "./context/AuthContext";

// Import font patches
try {
  require("./patchFonts");
} catch (e) {
  console.warn("Error loading font patches:", e);
}

// Import screens
import Index from "./components/Index";
import LandingScreen from "./screens/LandingScreen";
import LoginScreen from "./screens/LoginScreen";
import Register from "./screens/Auth/Register";
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
import AdminAttendance from "./screens/Auth/Dashboard/Admin/AdminAttendance";
import EventQR from "./screens/Auth/Dashboard/Admin/EventQR";
import EventAttendance from "./screens/Auth/Dashboard/Admin/EventAttendance";
import ActivityHistory from "./screens/Auth/Dashboard/Admin/ActivityHistory";
import AdminReports from "./screens/Auth/Dashboard/Admin/AdminReports";
import StudentOverview from "./screens/Auth/Dashboard/Admin/StudentOverview";
import CreateOrganizationScreen from "./screens/CreateOrganizationScreen";
import OrgCodeVerificationScreen from "./screens/OrgCodeVerificationScreen";
import EntryScreen from "./screens/EntryScreen";
import QRLoginScreen from "./screens/QRLoginScreen";

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
      <AdminDashboardStack.Screen
        name="AdminAttendance"
        component={AdminAttendance}
      />
      <AdminDashboardStack.Screen name="EventQR" component={EventQR} />
      <AdminDashboardStack.Screen
        name="EventAttendance"
        component={EventAttendance}
      />
      <AdminDashboardStack.Screen
        name="ActivityHistory"
        component={ActivityHistory}
      />
      <AdminDashboardStack.Screen name="Reports" component={AdminReports} />
      <AdminDashboardStack.Screen
        name="StudentOverview"
        component={StudentOverview}
      />
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

// Create LoadingScreen component
const LoadingScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={{ marginTop: 20 }}>Initializing application...</Text>
    </View>
  );
};

const App = () => {
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const appState = useRef(AppState.currentState);
  const navigationRef = useRef(null);
  const authInitialized = useRef(false);
  const navigationInitialized = useRef(false);

  // Handle navigation ready
  const handleNavigationReady = () => {
    console.log("[App] Navigation container is ready");
    setIsNavigationReady(true);
    navigationInitialized.current = true;
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
      setFirebaseReady(true);
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

          // If we're in the middle of a reset, don't process auth changes
          if (isResetting) {
            console.log("[App] Skipping auth change during navigation reset");
            return;
          }

          setUser(currentUser);
          setUserLoggedIn(!!currentUser);

          if (currentUser) {
            try {
              // Check if user is an admin
              const db = getDb();
              const adminQuery = query(
                collection(db, "admin"),
                where("uid", "==", currentUser.uid)
              );
              const adminSnapshot = await getDocs(adminQuery);
              const isAdminUser = !adminSnapshot.empty;
              setIsAdmin(isAdminUser);

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
            setIsAdmin(false);
          }

          if (initializing) {
            setInitializing(false);
            setFirebaseReady(true);
            authInitialized.current = true;
          }
        }
      );

      return unsubscribe; // unsubscribe on unmount
    } catch (error) {
      console.error("[App] Error setting up auth listener:", error);
      setInitializing(false);
      setFirebaseReady(true);
      return () => {};
    }
  }, [initializing, isResetting]);

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

  // Main navigation structure with better conditional rendering
  const renderNavigationContent = () => {
    // Show loading screen while Firebase initializes
    if (initializing || !firebaseReady) {
      return (
        <Stack.Screen
          name="Loading"
          component={LoadingScreen}
          options={{ gestureEnabled: false }}
        />
      );
    }

    return (
      <>
        <Stack.Screen name="EntryScreen" component={EntryScreen} />
        <Stack.Screen name="LandingScreen" component={LandingScreen} />
        <Stack.Screen
          name="OrgCodeVerification"
          component={OrgCodeVerificationScreen}
        />
        <Stack.Screen name="QRLoginScreen" component={QRLoginScreen} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="RegisterAdmin" component={RegisterAdmin} />
        <Stack.Screen name="AdminLogin" component={AdminLogin} />
        <Stack.Screen name="Dashboard" component={DashboardNavigator} />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardNavigator}
        />
        <Stack.Screen name="EventAttendance" component={EventAttendance} />
        <Stack.Screen
          name="CreateOrganization"
          component={CreateOrganizationScreen}
        />
      </>
    );
  };

  // Show loading screen while Firebase initializes auth state
  if (initializing || !firebaseReady) {
    return <LoadingScreen />;
  }

  // Wrap the app content with FontLoader
  return (
    <AuthProvider>
      <OnlineStatusProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={handleNavigationReady}
          fallback={<LoadingScreen />}
        >
          <StatusBar
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent={true}
          />
          <FontLoader>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                gestureEnabled: true,
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
              initialRouteName="EntryScreen"
            >
              {renderNavigationContent()}
            </Stack.Navigator>
          </FontLoader>
          <Toast />
        </NavigationContainer>
      </OnlineStatusProvider>
    </AuthProvider>
  );
};

export default App;
