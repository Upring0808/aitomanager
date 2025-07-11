import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  Platform,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Conditionally import BackHandler to prevent errors on web
let BackHandler;
if (Platform.OS !== "web") {
  BackHandler = require("react-native").BackHandler;
} else {
  // Create a mock BackHandler for web to prevent errors
  BackHandler = {
    addEventListener: () => ({ remove: () => {} }),
    removeEventListener: () => {},
  };
}
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { dashboardServices } from "../services/dashboardServices";
import userPresenceService from "../services/UserPresenceService";
import { auth, db } from "../config/firebaseconfig";
import Logout from "../components/Logout";

import { constants, dashboardStyles } from "../styles/dashboardStyles";
import Header from "./Header";
import { ADMIN_TABS } from "./adminTabs";
import Home from "../screens/Auth/Dashboard/User/Home";
import Fines from "../screens/Auth/Dashboard/User/Fines";
import People from "../screens/Auth/Dashboard/User/People";
import Profile from "../screens/Auth/Dashboard/User/Profile";
import Events from "../screens/Auth/Dashboard/User/Events";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

// Create a stack navigator for nested screens
const DashboardStack = createStackNavigator();

// Add styles object before the Dashboard component
const styles = StyleSheet.create({
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(248, 249, 250, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingOverlayDark: {
    backgroundColor: "rgba(18, 18, 18, 0.95)",
  },
  loadingContent: {
    alignItems: "center",
    padding: 20,
  },
  loadingTextNeutral: {
    marginTop: 15,
    fontSize: 16,
    color: "#203562",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  loadingTextDark: {
    color: "#FFFFFF",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#203562",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  sessionExpiredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  sessionExpiredText: {
    fontSize: 16,
    color: "#203562",
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: "#3652AD",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  tabIndicator: {
    height: 2,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    padding: 10,
  },
  notificationBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    padding: 2,
  },
  notificationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  statusBarBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 44 : StatusBar.currentHeight,
    zIndex: 1,
  },
});

// Main Dashboard component that contains the nested navigator
const Dashboard = ({ navigation, route }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Home");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [translateX] = useState(new Animated.Value(0));
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const insets = useSafeAreaInsets();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [notifications, setNotifications] = useState({
    Home: 0,
    Fines: 0,
    People: 0,
    Events: 0,
    Profile: 0,
  });
  // Animation and loading state for smooth tab transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [lastViewed, setLastViewed] = useState({
    Fines: new Date(0),
    Events: new Date(0),
  });

  // Data storage - using refs to prevent rerenders
  const dashboardData = useRef({
    user: null,
    events: [],
    fines: [],
    people: {
      officers: [],
      students: [],
    },
  });

  // Control refs
  const lastNavigationScreen = useRef(null);
  const unsubscribersRef = useRef({
    fines: null,
    events: null,
    avatar: null,
  });

  // Memoize the theme to prevent re-renders
  const theme = useMemo(
    () => ({
      background: isDarkMode ? "#121212" : "#FFFFFF",
      text: isDarkMode ? "#FFFFFF" : "#000000",
      tabBackground: isDarkMode ? "#1E1E1E" : "#F8F8F8",
      tabActiveColor: "#3652AD",
      tabInactiveColor: isDarkMode ? "#888888" : "#AAAAAA",
    }),
    [isDarkMode]
  );

  // Get screen width and calculate tab dimensions
  const screenWidth = Dimensions.get("window").width;
  const tabWidth = screenWidth / 5;
  const underlineWidth = tabWidth * 0.8; // Make underline 80% of tab width
  const underlineOffset = (tabWidth - underlineWidth) / 2; // Center the underline

  // Add this mapping at the top of the Dashboard component (after useState declarations)
  const statusBarConfig = {
    Home: { barStyle: "dark-content", backgroundColor: "#fff" },
    Events: { barStyle: "dark-content", backgroundColor: "#fff" },
    Fines: { barStyle: "dark-content", backgroundColor: "#fff" },
    People: { barStyle: "dark-content", backgroundColor: "#fff" },
    Profile: { barStyle: "light-content", backgroundColor: "transparent" },
  };

  // Check if navigation is ready
  useEffect(() => {
    if (navigation) {
      setIsNavigationReady(true);
    }
  }, [navigation]);

  // Initialize dashboard with preloaded data
  useEffect(() => {
    if (!user) return;

    const setupRealtimeListeners = async (userId) => {
      try {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) {
          console.error("[Dashboard] No orgId found in AsyncStorage");
          return;
        }
        // Set up fines listener
        const finesQuery = query(
          collection(db, "organizations", orgId, "fines"),
          orderBy("dueDate", "asc")
        );
        unsubscribersRef.current.fines = onSnapshot(finesQuery, (snapshot) => {
          const updatedFines = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate(),
          }));
          dashboardData.current.fines = updatedFines;
        });

        // Set up events listener
        const eventsQuery = query(
          collection(db, "organizations", orgId, "events"),
          orderBy("dueDate", "asc")
        );
        unsubscribersRef.current.events = onSnapshot(
          eventsQuery,
          (snapshot) => {
            const updatedEvents = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              dueDate: doc.data().dueDate?.toDate(),
            }));
            dashboardData.current.events = updatedEvents;
          }
        );

        // Set up people listener
        const peopleQuery = query(
          collection(db, "organizations", orgId, "users")
        );
        unsubscribersRef.current.people = onSnapshot(
          peopleQuery,
          (snapshot) => {
            const updatedPeople = {
              officers: snapshot.docs
                .filter(
                  (doc) =>
                    doc.data().role === "treasurer" ||
                    doc.data().role === "secretary"
                )
                .map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  username:
                    doc.data().username || doc.data().displayName || "Unknown",
                  yearLevel: doc.data().yearLevel || "N/A",
                  bio: doc.data().bio || null,
                  role: doc.data().role || "student",
                  email: doc.data().email || null,
                  avatarUrl: doc.data().avatarUrl || null,
                })),
              students: snapshot.docs
                .filter(
                  (doc) => !["treasurer", "secretary"].includes(doc.data().role)
                )
                .map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  username:
                    doc.data().username || doc.data().displayName || "Unknown",
                  yearLevel: doc.data().yearLevel || "N/A",
                  bio: doc.data().bio || null,
                  role: doc.data().role || "student",
                  email: doc.data().email || null,
                  avatarUrl: doc.data().avatarUrl || null,
                })),
            };
            dashboardData.current.people = updatedPeople;
          }
        );

        console.log("[Dashboard] Real-time listeners set up successfully");
      } catch (error) {
        console.error(
          "[Dashboard] Error setting up real-time listeners:",
          error
        );
      }
    };

    const setupAvatarSubscription = async () => {
      try {
        console.log("[Dashboard] Setting up avatar subscription");
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (orgId) {
          unsubscribersRef.current.avatar =
            dashboardServices.subscribeToAvatarUpdates(
              user,
              orgId,
              (newAvatarUrl) => {
                setAvatarUrl(newAvatarUrl);
                if (dashboardData.current.user) {
                  dashboardData.current.user.avatarUrl = newAvatarUrl;
                }
              }
            );
          console.log("[Dashboard] Avatar subscription set up successfully");
        } else {
          console.warn(
            "[Dashboard] No organization ID found for avatar subscription"
          );
        }
      } catch (error) {
        console.error(
          "[Dashboard] Error setting up avatar subscription:",
          error
        );
      }
    };

    const initializeDashboard = async () => {
      try {
        console.log("[Dashboard] Initializing dashboard for user:", user.uid);

        // Get preloaded data from login
        const preloadedData =
          route.params?.preloadedData || global.dashboardData;

        if (preloadedData) {
          console.log("[Dashboard] Using preloaded data");
          dashboardData.current = preloadedData;
          setAvatarUrl(preloadedData.avatarUrl);
          setLastViewed(preloadedData.lastViewed);
        } else {
          // No preloaded data, initialize as empty and continue
          dashboardData.current = {};
        }

        // Set up real-time listeners
        await setupRealtimeListeners(preloadedData?.user?.id);

        // Set up avatar subscription
        await setupAvatarSubscription();

        console.log("[Dashboard] Dashboard initialization completed");
      } catch (error) {
        console.error("[Dashboard] Error initializing dashboard:", error);
      }
    };

    initializeDashboard();

    return () => {
      // Clean up all listeners
      Object.values(unsubscribersRef.current).forEach((unsub) => {
        if (unsub && typeof unsub === "function") {
          try {
            unsub();
          } catch (error) {
            console.error(
              "[Dashboard] Error cleaning up listener on unmount:",
              error
            );
          }
        }
      });
    };
  }, [user, route.params?.preloadedData]);

  // Handle navigation parameters - only after initialization
  useEffect(() => {
    if (!route.params?.screen || !user) return;

    const screenName = route.params.screen;
    if (screenName === lastNavigationScreen.current) return;

    lastNavigationScreen.current = screenName;
    const tabIndex = ADMIN_TABS.findIndex((tab) => tab.name === screenName);

    if (tabIndex !== -1) {
      setActiveTab(screenName);
      setActiveTabIndex(tabIndex);

      // Animate the underline with proper offset
      Animated.spring(translateX, {
        toValue: tabIndex * tabWidth + underlineOffset,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [route.params?.screen, user, translateX, tabWidth, underlineOffset]);

  // Tab press handler
  const handleTabPress = useCallback(
    async (name, index) => {
      setIsTabLoading(true);
      setActiveTab(name);
      setActiveTabIndex(index);
      Animated.spring(translateX, {
        toValue: index * tabWidth + underlineOffset,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
      setTimeout(() => setIsTabLoading(false), 300);

      // Update last viewed timestamp for Fines and Events tabs
      if ((name === "Fines" || name === "Events") && user) {
        const now = new Date();
        setLastViewed((prev) => ({
          ...prev,
          [name]: now,
        }));

        // Reset notification count for this tab
        setNotifications((prev) => ({
          ...prev,
          [name]: 0,
        }));

        // Save to Firestore
        try {
          const orgId = await AsyncStorage.getItem("selectedOrgId");
          const userDocRef = doc(db, "organizations", orgId, "users", user.uid);
          updateDoc(userDocRef, {
            [`lastViewed.${name}`]: now,
          }).catch((error) => {
            console.error(
              `[Dashboard] Error updating last viewed for ${name}:`,
              error
            );
          });
        } catch (error) {
          console.error(
            `[Dashboard] Error in handleTabPress for ${name}:`,
            error
          );
        }
      }
    },
    [user, translateX, tabWidth, underlineOffset]
  );

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      // Clean up listeners first
      Object.values(unsubscribersRef.current).forEach((unsub) => {
        if (unsub && typeof unsub === "function") {
          try {
            unsub();
          } catch (error) {
            console.error(
              "[Dashboard] Error cleaning up listener during logout:",
              error
            );
          }
        }
      });

      // Clean up presence service
      await userPresenceService.cleanup();

      // Sign out from Firebase
      await auth.signOut();

      // Navigate to login screen with a small delay to ensure cleanup is complete
      if (isNavigationReady && navigation) {
        setTimeout(() => {
          navigation.replace("LoginScreen");
        }, 100);
      }
    } catch (error) {
      console.error("[Dashboard] Error during logout:", error);
      if (isNavigationReady && navigation) {
        navigation.replace("LoginScreen");
      }
    }
  }, [navigation, isNavigationReady]);

  // Handle Android hardware back button to show logout modal globally
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const onBackPress = () => {
      if (!showLogoutModal) {
        setShowLogoutModal(true);
        return true; // Prevent default back action
      }
      return false; // Allow default if modal already visible
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, [showLogoutModal]);

  // Render content - always render the full dashboard structure
  const renderContent = useCallback(() => {
    switch (activeTab) {
      case "Home":
        return (
          <Home
            initialData={dashboardData.current.user}
            isDataPreloaded={!!user}
            showLogoutModal={() => setShowLogoutModal(true)}
          />
        );
      case "Events":
        return (
          <Events
            initialData={dashboardData.current.events}
            isDataPreloaded={!!user}
            showLogoutModal={() => setShowLogoutModal(true)}
          />
        );
      case "Fines":
        return (
          <Fines
            initialData={dashboardData.current.fines}
            isDataPreloaded={!!user}
            showLogoutModal={() => setShowLogoutModal(true)}
          />
        );
      case "People":
        return <People showLogoutModal={() => setShowLogoutModal(true)} />;
      case "Profile":
        return (
          <Profile
            initialData={dashboardData.current.user}
            isDataPreloaded={!!user}
            onAvatarUpdate={(newAvatarUrl) => {
              setAvatarUrl(newAvatarUrl);
              if (dashboardData.current.user) {
                dashboardData.current.user.avatarUrl = newAvatarUrl;
              }
            }}
            showLogoutModal={() => setShowLogoutModal(true)}
          />
        );
      default:
        return <View style={{ flex: 1 }} />;
    }
  }, [activeTab, user]);

  // Render avatar
  const renderAvatar = useCallback(() => {
    if (!user) {
      return <ActivityIndicator size="small" color="#aaa" />;
    }

    if (avatarUrl) {
      return (
        <Image source={{ uri: avatarUrl }} style={dashboardStyles.avatar} />
      );
    }

    const IconComponent = ADMIN_TABS.find(
      (tab) => tab.name === "Profile"
    )?.component;
    return (
      <IconComponent
        name={ADMIN_TABS.find((tab) => tab.name === "Profile")?.icon}
        size={24}
        color={
          activeTab === "Profile"
            ? theme.tabActiveColor
            : theme.tabInactiveColor
        }
      />
    );
  }, [avatarUrl, user, activeTab, theme]);

  // Render tab
  const renderTab = useCallback(
    ({ name, icon, component: IconComponent }, index) => (
      <TouchableOpacity
        key={name}
        onPress={() => handleTabPress(name, index)}
        style={dashboardStyles.tab}
        activeOpacity={0.7}
      >
        <View style={dashboardStyles.tabIconContainer}>
          {name === "Profile" ? (
            renderAvatar()
          ) : (
            <IconComponent
              name={icon}
              size={24}
              color={
                activeTab === name
                  ? theme.tabActiveColor
                  : theme.tabInactiveColor
              }
            />
          )}
        </View>

        {notifications[name] > 0 && (
          <View style={dashboardStyles.notificationBadge}>
            <Text style={dashboardStyles.notificationText}>
              {notifications[name]}
            </Text>
          </View>
        )}

        <Text
          style={
            activeTab === name
              ? dashboardStyles.activeTabText
              : dashboardStyles.tabText
          }
        >
          {name}
        </Text>
      </TouchableOpacity>
    ),
    [activeTab, renderAvatar, handleTabPress, notifications, theme]
  );

  // Handle session expiry
  if (!user) {
    return (
      <View style={styles.sessionExpiredContainer}>
        <Text style={styles.sessionExpiredText}>
          Session expired. Please log in again.
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => {
            if (isNavigationReady && navigation) {
              navigation.replace("Index");
            }
          }}
        >
          <Text style={styles.loginButtonText}>Return to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Normal dashboard rendering when user is logged in
  const { barStyle, backgroundColor: statusBarBg } =
    statusBarConfig[activeTab] || statusBarConfig.Home;
  return (
    <SafeAreaView
      style={[
        dashboardStyles.safeArea,
        {
          backgroundColor:
            activeTab === "Profile" ? "transparent" : theme.background,
        },
      ]}
      edges={["top", "right", "left"]}
    >
      <StatusBar
        barStyle={barStyle}
        backgroundColor={statusBarBg}
        translucent={statusBarBg === "transparent"}
      />
      <View
        style={[styles.statusBarBackground, { backgroundColor: "transparent" }]}
      />
      <View
        style={[
          dashboardStyles.container,
          activeTab === "Profile"
            ? { backgroundColor: "transparent", paddingTop: 0 }
            : { backgroundColor: theme.background, paddingTop: insets.top },
        ]}
      >
        {isTabLoading ? (
          <View
            style={{
              flex: 1,
              backgroundColor: statusBarBg,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color={theme.tabActiveColor} />
          </View>
        ) : (
          renderContent()
        )}
        <View
          style={[
            dashboardStyles.footer,
            {
              paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
              backgroundColor: theme.tabBackground,
            },
          ]}
        >
          <Animated.View
            style={[
              dashboardStyles.underline,
              {
                transform: [{ translateX }],
                width: underlineWidth,
                backgroundColor: theme.tabActiveColor,
              },
            ]}
          />
          {ADMIN_TABS.map(renderTab)}
        </View>
      </View>
      {showLogoutModal && (
        <Logout
          visible={showLogoutModal}
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
        />
      )}
    </SafeAreaView>
  );
};

export default React.memo(Dashboard);
