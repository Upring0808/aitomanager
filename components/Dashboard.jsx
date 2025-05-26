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
import { avatarRealtime } from "../services/avatarRealtime";
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
  const [loadingAvatar, setLoadingAvatar] = useState(true);
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
  const [lastViewed, setLastViewed] = useState({
    Fines: new Date(0),
    Events: new Date(0),
  });

  // Single loading state for the entire dashboard
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);

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
  const initialLoadComplete = useRef(false);
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

  // Check if navigation is ready
  useEffect(() => {
    if (navigation) {
      setIsNavigationReady(true);
    }
  }, [navigation]);

  // Single initialization effect - load everything at once
  useEffect(() => {
    if (!user || initialLoadComplete.current) return;

    let isMounted = true;

    const initializeDashboard = async () => {
      try {
        console.log("[Dashboard] Initializing dashboard for user:", user.uid);

        // Load all data concurrently
        const [
          userSnapshot,
          eventsSnapshot,
          finesSnapshot,
          peopleSnapshot,
          avatarData,
          lastViewedData,
        ] = await Promise.all([
          // User data
          getDocs(query(collection(db, "users"), where("uid", "==", user.uid))),
          // Events data
          getDocs(query(collection(db, "events"), orderBy("dueDate", "asc"))),
          // Fines data
          getDocs(query(collection(db, "fines"), orderBy("dueDate", "asc"))),
          // People data - Remove any filters to get all users
          getDocs(query(collection(db, "users"))),
          // Avatar data
          avatarRealtime
            .fetchAvatar(user)
            .catch((err) => ({ avatarUrl: null, error: err })),
          // Last viewed data
          getDoc(doc(db, "users", user.uid)).catch((err) => ({
            exists: () => false,
            error: err,
          })),
        ]);

        if (!isMounted) return;

        // Process user data
        let userData = null;
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          userData = {
            id: userDoc.id,
            uid: user.uid,
            username: user.displayName,
            email: user.email,
            ...userDoc.data(),
          };
        }

        // Process events data
        const eventsData = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate?.toDate(),
        }));

        // Process fines data
        const finesData = finesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate?.toDate(),
        }));

        // Process people data - Improved data processing
        const peopleData = peopleSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          username: doc.data().username || doc.data().displayName || "Unknown",
          yearLevel: doc.data().yearLevel || "N/A",
          bio: doc.data().bio || null,
          role: doc.data().role || "student",
          email: doc.data().email || null,
          avatarUrl: doc.data().avatarUrl || null,
        }));

        // Split people into officers and students - Improved filtering
        const officersData = [];
        const studentsData = [];
        peopleData.forEach((user) => {
          if (user.role === "treasurer" || user.role === "secretary") {
            officersData.push(user);
          } else {
            // Include all other users as students
            studentsData.push(user);
          }
        });

        // Sort students by username
        studentsData.sort((a, b) =>
          (a.username || "").localeCompare(b.username || "")
        );

        // Sort officers by role and then username
        officersData.sort((a, b) => {
          if (a.role !== b.role) {
            return a.role === "treasurer" ? -1 : 1;
          }
          return (a.username || "").localeCompare(b.username || "");
        });

        // Process avatar data
        if (!avatarData.error) {
          setAvatarUrl(avatarData.avatarUrl);
        }
        setLoadingAvatar(false);

        // Process last viewed data
        if (
          lastViewedData.exists &&
          lastViewedData.exists() &&
          lastViewedData.data().lastViewed
        ) {
          const data = lastViewedData.data().lastViewed;
          setLastViewed({
            Fines: data.Fines ? new Date(data.Fines) : new Date(0),
            Events: data.Events ? new Date(data.Events) : new Date(0),
          });
        }

        // Store all data in ref
        dashboardData.current = {
          user: userData,
          events: eventsData,
          fines: finesData,
          people: {
            officers: officersData,
            students: studentsData,
          },
        };

        // Set up real-time listeners after initial load
        await setupRealtimeListeners(userData?.id);

        // Set up avatar subscription
        setupAvatarSubscription();

        initialLoadComplete.current = true;
        setIsInitializing(false);
        setInitError(null);

        console.log("[Dashboard] Dashboard initialization completed");
        console.log("[Dashboard] Total students loaded:", studentsData.length);
        console.log("[Dashboard] Total officers loaded:", officersData.length);
      } catch (error) {
        console.error("[Dashboard] Error initializing dashboard:", error);
        if (isMounted) {
          setInitError(error.message || "Failed to initialize dashboard");
          setIsInitializing(false);
        }
      }
    };

    // Setup realtime listeners
    const setupRealtimeListeners = async (userDocId) => {
      if (!userDocId) return;

      try {
        // Clean up existing listeners
        Object.values(unsubscribersRef.current).forEach((unsub) => {
          if (unsub && typeof unsub === "function") {
            try {
              unsub();
            } catch (error) {
              console.error("[Dashboard] Error cleaning up listener:", error);
            }
          }
        });

        // Set up fines listener
        const finesQuery = query(
          collection(db, "fines"),
          where("userId", "==", userDocId)
        );
        unsubscribersRef.current.fines = onSnapshot(
          finesQuery,
          (snapshot) => {
            const newFines = snapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
              }))
              .filter((fine) => fine.createdAt > lastViewed.Fines).length;

            setNotifications((prev) => ({
              ...prev,
              Fines: newFines,
            }));
          },
          (error) => {
            console.error("[Dashboard] Fines snapshot error:", error);
          }
        );

        // Set up events listener
        unsubscribersRef.current.events = onSnapshot(
          collection(db, "events"),
          (snapshot) => {
            const newEvents = snapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
              }))
              .filter((event) => event.createdAt > lastViewed.Events).length;

            setNotifications((prev) => ({
              ...prev,
              Events: newEvents,
            }));
          },
          (error) => {
            console.error("[Dashboard] Events snapshot error:", error);
          }
        );
      } catch (error) {
        console.error(
          "[Dashboard] Error setting up realtime listeners:",
          error
        );
      }
    };

    // Setup avatar subscription
    const setupAvatarSubscription = () => {
      try {
        unsubscribersRef.current.avatar =
          avatarRealtime.subscribeToAvatarUpdates(user, (newAvatarUrl) => {
            setAvatarUrl(newAvatarUrl);
            // Update the stored user data
            if (dashboardData.current.user) {
              dashboardData.current.user.avatarUrl = newAvatarUrl;
            }
          });
      } catch (error) {
        console.error("[Dashboard] Avatar subscription error:", error);
      }
    };

    initializeDashboard();

    return () => {
      isMounted = false;
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
  }, [user]);

  // Handle navigation parameters - only after initialization
  useEffect(() => {
    if (!route.params?.screen || isInitializing) return;

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
  }, [
    route.params?.screen,
    isInitializing,
    translateX,
    tabWidth,
    underlineOffset,
  ]);

  // Tab press handler
  const handleTabPress = useCallback(
    (name, index) => {
      setActiveTab(name);
      setActiveTabIndex(index);

      // Animate the underline with proper offset
      Animated.spring(translateX, {
        toValue: index * tabWidth + underlineOffset,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

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
          const userDocRef = doc(db, "users", user.uid);
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

      // Navigate to login with a small delay to ensure cleanup is complete
      if (isNavigationReady && navigation) {
        setTimeout(() => {
          navigation.replace("Index");
        }, 100);
      }
    } catch (error) {
      console.error("[Dashboard] Error during logout:", error);
      if (isNavigationReady && navigation) {
        navigation.replace("Index");
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
            isDataPreloaded={!isInitializing}
            showLogoutModal={() => setShowLogoutModal(true)}
          />
        );
      case "Events":
        return (
          <Events
            initialData={dashboardData.current.events}
            isDataPreloaded={!isInitializing}
            showLogoutModal={() => setShowLogoutModal(true)}
          />
        );
      case "Fines":
        return (
          <Fines
            initialData={dashboardData.current.fines}
            isDataPreloaded={!isInitializing}
            showLogoutModal={() => setShowLogoutModal(true)}
          />
        );
      case "People":
        return (
          <People
            initialData={dashboardData.current.people}
            isDataPreloaded={!isInitializing}
            showLogoutModal={() => setShowLogoutModal(true)}
          />
        );
      case "Profile":
        return (
          <Profile
            initialData={dashboardData.current.user}
            isDataPreloaded={!isInitializing}
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
  }, [activeTab, isInitializing]);

  // Render avatar
  const renderAvatar = useCallback(() => {
    if (loadingAvatar) {
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
  }, [avatarUrl, loadingAvatar, activeTab, theme]);

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

  // Always render the full dashboard structure
  return (
    <SafeAreaView
      style={[dashboardStyles.safeArea, { backgroundColor: theme.background }]}
      edges={["right", "left"]}
    >
      <StatusBar
        barStyle={
          showLogoutModal
            ? "light-content"
            : isDarkMode
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={showLogoutModal ? "transparent" : theme.background}
        translucent={showLogoutModal ? true : false}
      />
      <View
        style={[
          styles.statusBarBackground,
          { backgroundColor: theme.background },
        ]}
      />
      <Header
        onLogout={() => setShowLogoutModal(true)}
        userName={user?.displayName || "User"}
        avatarUrl={avatarUrl}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      <View
        style={[
          dashboardStyles.container,
          { backgroundColor: theme.background },
        ]}
      >
        {renderContent()}

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

      {/* Loading overlay - shows on top of dashboard during initialization */}
      {isInitializing && (
        <View
          style={[
            styles.loadingOverlay,
            isDarkMode && styles.loadingOverlayDark,
          ]}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#203562" />
            <Text
              style={[
                styles.loadingTextNeutral,
                isDarkMode && styles.loadingTextDark,
              ]}
            >
              Loading Dashboard...
            </Text>
          </View>
        </View>
      )}

      {/* Error overlay */}
      {initError && (
        <View
          style={[
            styles.loadingOverlay,
            isDarkMode && styles.loadingOverlayDark,
          ]}
        >
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {initError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                initialLoadComplete.current = false;
                setIsInitializing(true);
                setInitError(null);
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
