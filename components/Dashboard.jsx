import React, { useCallback, useEffect, useState, useMemo } from "react";
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
} from "react-native";
import { createStackNavigator } from "@react-navigation/stack";

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
} from "firebase/firestore";

// Create a stack navigator for nested screens
// Note: This stack navigator is not used directly in this component
// It's used by the DashboardNavigator in App.js
const DashboardStack = createStackNavigator();

// Helper function to check if user is authenticated
const isAuthenticated = () => {
  return !!auth.currentUser;
};

// Main Dashboard component that contains the nested navigator
const Dashboard = ({ navigation, route }) => {
  // Extract initial screen from route params if available
  const initialScreen = route?.params?.screen || "Home";

  // Handle nested navigation - this is important for proper navigation from other screens
  React.useEffect(() => {
    if (route.params?.screen) {
      // If we receive a screen parameter, navigate to that screen
      // Use a slight delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        // Check if the component is still mounted and auth is still valid
        if (auth.currentUser) {
          navigation.navigate(route.params.screen);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [route.params?.screen, navigation]);

  // Find the initial tab index based on the screen name
  const findTabIndex = (tabName) => {
    return ADMIN_TABS.findIndex((tab) => tab.name === tabName);
  };

  const [activeTab, setActiveTab] = useState(initialScreen);
  const [activeTabIndex, setActiveTabIndex] = useState(
    findTabIndex(initialScreen)
  );
  const [translateX] = useState(
    new Animated.Value(
      findTabIndex(initialScreen) * constants.tabWidth +
        (constants.tabWidth - constants.underlineWidth) / 2
    )
  );
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const insets = useSafeAreaInsets();
  // No longer need fadeAnim for tab transitions
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Navigate to the correct screen when receiving screen parameter
  useEffect(() => {
    if (route.params?.screen && auth.currentUser) {
      const tabName = route.params.screen;
      const tabIndex = findTabIndex(tabName);

      if (tabIndex !== -1) {
        setActiveTab(tabName);
        setActiveTabIndex(tabIndex);

        // Animate the underline to the new position
        Animated.spring(translateX, {
          toValue:
            tabIndex * constants.tabWidth +
            (constants.tabWidth - constants.underlineWidth) / 2,
          useNativeDriver: true,
          friction: 8,
        }).start();
      }
    }
  }, [route.params?.screen, translateX]);

  // Replace the hardcoded notifications with dynamic state
  const [notifications, setNotifications] = useState({
    Home: 0,
    Fines: 0,
    People: 0,
    Events: 0,
    Profile: 0,
  });

  // Add state to track last viewed timestamps
  const [lastViewed, setLastViewed] = useState({
    Fines: new Date(0),
    Events: new Date(0),
  });

  // Load last viewed timestamps from Firestore on component mount
  useEffect(() => {
    const loadLastViewed = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().lastViewed) {
          const data = userDoc.data().lastViewed;
          setLastViewed({
            Fines: data.Fines ? new Date(data.Fines) : new Date(0),
            Events: data.Events ? new Date(data.Events) : new Date(0),
          });
        } else {
          // Initialize lastViewed if it doesn't exist
          setLastViewed({
            Fines: new Date(0),
            Events: new Date(0),
          });
        }
      } catch (error) {
        console.error(
          "[Dashboard] Error loading last viewed timestamps:",
          error
        );
        // Set default values on error
        setLastViewed({
          Fines: new Date(0),
          Events: new Date(0),
        });
      }
    };

    loadLastViewed();
  }, []);

  // Set up listeners for new fines and events
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Get user document ID
    const getUserDocId = async () => {
      try {
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", user.uid)
        );
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) return null;
        return userSnapshot.docs[0].id;
      } catch (error) {
        console.error("[Dashboard] Error getting user doc ID:", error);
        return null;
      }
    };

    // Set up listeners once we have the user doc ID
    let finesUnsubscribe = () => {};
    let eventsUnsubscribe = () => {};

    getUserDocId().then((userDocId) => {
      if (!userDocId) return;

      try {
        // Listen for fines
        const finesQuery = query(
          collection(db, "fines"),
          where("userId", "==", userDocId)
        );

        finesUnsubscribe = onSnapshot(
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

        // Listen for events
        eventsUnsubscribe = onSnapshot(
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
        console.error("[Dashboard] Error setting up listeners:", error);
      }
    });

    return () => {
      try {
        finesUnsubscribe();
        eventsUnsubscribe();
      } catch (error) {
        console.error("[Dashboard] Error unsubscribing listeners:", error);
      }
    };
  }, [lastViewed]);

  // Update last viewed timestamp when tab is selected
  const handleTabPress = useCallback(
    (name, index) => {
      // Change tab without animation
      setActiveTab(name);
      setActiveTabIndex(index);

      // Update last viewed timestamp for the tab
      if ((name === "Fines" || name === "Events") && auth.currentUser) {
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

        // Save last viewed timestamp to Firestore
        try {
          const user = auth.currentUser;
          if (user) {
            const userDocRef = doc(db, "users", user.uid);
            updateDoc(userDocRef, {
              [`lastViewed.${name}`]: now,
            }).catch((error) => {
              console.error(
                `[Dashboard] Error updating last viewed for ${name}:`,
                error
              );
            });
          }
        } catch (error) {
          console.error(
            `[Dashboard] Error in handleTabPress for ${name}:`,
            error
          );
        }
      }
    },
    [lastViewed]
  );

  // Create a theme object based on the dark mode state
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

  // Handle back button press
  useFocusEffect(
    useCallback(() => {
      // Skip BackHandler setup on web where it's not supported
      if (Platform.OS !== "web") {
        const onBackPress = () => {
          // Only show logout modal if we're still logged in
          if (auth.currentUser) {
            setShowLogoutModal(true);
            return true; // Prevents default back action
          }
          return false; // Allow default back action if not logged in
        };

        const subscription = BackHandler.addEventListener(
          "hardwareBackPress",
          onBackPress
        );

        return () => {
          try {
            subscription.remove();
          } catch (error) {
            console.error("[Dashboard] Error removing back handler:", error);
          }
        };
      }
      return () => {}; // Return empty cleanup for web
    }, [])
  );

  // Handle logout function
  const handleLogout = useCallback(async () => {
    try {
      // First clean up presence service
      await userPresenceService.cleanup();

      // Then sign out from Firebase
      await auth.signOut();

      // Navigate to Index and reset navigation stack
      // Use a more reliable approach with a single reset call
      navigation.reset({
        index: 0,
        routes: [{ name: "Index" }],
      });
    } catch (error) {
      console.error("[Dashboard] Error during logout:", error);
      // Attempt to navigate anyway with a single reset call
      navigation.reset({
        index: 0,
        routes: [{ name: "Index" }],
      });
    }
  }, [navigation]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      let unsubscribe = () => {};
      try {
        unsubscribe = avatarRealtime.subscribeToAvatarUpdates(
          user,
          (newAvatarUrl) => {
            setAvatarUrl(newAvatarUrl);
            setLoadingAvatar(false);
          }
        );

        avatarRealtime
          .fetchAvatar(user)
          .then(({ avatarUrl, error }) => {
            if (!error) {
              setAvatarUrl(avatarUrl);
              setLoadingAvatar(false);
            } else {
              console.error("[Dashboard] Error fetching avatar:", error);
              setLoadingAvatar(false);
            }
          })
          .catch((error) => {
            console.error("[Dashboard] Avatar fetch exception:", error);
            setLoadingAvatar(false);
          });
      } catch (error) {
        console.error("[Dashboard] Avatar subscription error:", error);
        setLoadingAvatar(false);
      }

      return () => {
        try {
          unsubscribe();
        } catch (error) {
          console.error("[Dashboard] Error unsubscribing avatar:", error);
        }
      };
    } else {
      setLoadingAvatar(false);
    }
  }, []);

  // Update the translateX value when activeTabIndex changes (except when changed by route params)
  useEffect(() => {
    // Skip animation if the change was triggered by route.params (handled in the other useEffect)
    // Also ensure we have a valid auth state
    if (!route.params?.screen && auth.currentUser) {
      Animated.spring(translateX, {
        toValue:
          activeTabIndex * constants.tabWidth +
          (constants.tabWidth - constants.underlineWidth) / 2,
        useNativeDriver: true,
        friction: 8,
      }).start();
    }
  }, [activeTabIndex, translateX, route.params?.screen]);

  // Add refresh functionality
  const onRefresh = useCallback(() => {
    if (!auth.currentUser) {
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    // Fetch fresh data here based on the active tab
    try {
      // Reload avatar
      if (auth.currentUser) {
        avatarRealtime
          .fetchAvatar(auth.currentUser)
          .then(({ avatarUrl, error }) => {
            if (!error) {
              setAvatarUrl(avatarUrl);
            }
          })
          .catch((error) => {
            console.error("[Dashboard] Error refreshing avatar:", error);
          });
      }

      // Complete refresh after a delay
      setTimeout(() => {
        setRefreshing(false);
      }, 1500);
    } catch (error) {
      console.error("[Dashboard] Error during refresh:", error);
      setRefreshing(false);
    }
  }, []);

  // This function is already defined above, so we're removing this duplicate

  const handleAvatarError = useCallback(() => {
    console.log("[Dashboard] Avatar loading error, using fallback");
    setAvatarUrl(null);
    setLoadingAvatar(false);
  }, []);

  // Render content without animation
  const renderContent = useCallback(() => {
    // If user is not logged in, don't render content
    if (!auth.currentUser) {
      return (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text>Please log in to view this content</Text>
        </View>
      );
    }

    let content;
    switch (activeTab) {
      case "Home":
        content = <Home />;
        break;
      case "Fines":
        content = <Fines />;
        break;
      case "People":
        content = <People />;
        break;
      case "Profile":
        content = <Profile onAvatarUpdate={avatarRealtime.fetchAvatar} />;
        break;
      case "Events":
        content = <Events />;
        break;
      default:
        content = <Home />;
    }

    return (
      <View style={{ flex: 1 }}>
        {content}
        {/* Render any children passed from navigation if available */}
        {route.children}
      </View>
    );
  }, [activeTab, route.children]);

  const renderAvatar = useCallback(() => {
    if (loadingAvatar) {
      return <ActivityIndicator size="small" color="#aaa" />;
    }

    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={dashboardStyles.avatar}
          onError={handleAvatarError}
        />
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
  }, [avatarUrl, loadingAvatar, activeTab, handleAvatarError, theme]);

  // Updated renderTab function with notification badges and underline indicator
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

        {/* Show notification badge if count > 0 */}
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

  // Create a custom LogoutWrapper component that shows the modal only when needed
  const LogoutWrapper = useCallback(() => {
    // Only show logout modal if we're logged in and modal is visible
    if (!showLogoutModal || !auth.currentUser) return null;

    return (
      <Logout
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => handleLogout()}
      />
    );
  }, [showLogoutModal, handleLogout]);

  // Check if user is logged in before rendering the dashboard
  if (!auth.currentUser) {
    // If not logged in, render a loading state or redirect
    return (
      <SafeAreaView
        style={[
          dashboardStyles.safeArea,
          { backgroundColor: theme.background },
        ]}
        edges={["right", "left"]}
      >
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text>Session expired. Please log in again.</Text>
          <TouchableOpacity
            style={{
              marginTop: 20,
              backgroundColor: "#3652AD",
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 5,
            }}
            onPress={() =>
              navigation.reset({ index: 0, routes: [{ name: "Index" }] })
            }
          >
            <Text style={{ color: "white" }}>Return to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Normal dashboard rendering when user is logged in
  return (
    <SafeAreaView
      style={[dashboardStyles.safeArea, { backgroundColor: theme.background }]}
      edges={["right", "left"]}
    >
      <Header
        onLogout={() => setShowLogoutModal(true)}
        userName={auth.currentUser?.displayName || "User"}
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
                width: constants.underlineWidth,
              },
            ]}
          />
          {ADMIN_TABS.map(renderTab)}
        </View>
      </View>
      <LogoutWrapper />
    </SafeAreaView>
  );
};

export default Dashboard;
