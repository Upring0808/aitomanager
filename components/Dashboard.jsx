import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
  ScrollView,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { avatarRealtime } from "../services/avatarRealtime";
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

const Dashboard = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("Home");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [translateX] = useState(new Animated.Value(0));
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const insets = useSafeAreaInsets();
  // No longer need fadeAnim for tab transitions
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
        }
      } catch (error) {
        console.error("Error loading last viewed timestamps:", error);
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
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", user.uid)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) return null;
      return userSnapshot.docs[0].id;
    };

    // Set up listeners once we have the user doc ID
    getUserDocId().then((userDocId) => {
      if (!userDocId) return;

      // Listen for fines
      const finesQuery = query(
        collection(db, "fines"),
        where("userId", "==", userDocId)
      );

      const finesUnsubscribe = onSnapshot(finesQuery, (snapshot) => {
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
      });

      // Listen for events
      const eventsUnsubscribe = onSnapshot(
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
        }
      );

      return () => {
        finesUnsubscribe();
        eventsUnsubscribe();
      };
    });
  }, [lastViewed]);

  // Update last viewed timestamp when tab is selected
  const handleTabPress = useCallback(
    (name, index) => {
      // Change tab without animation
      setActiveTab(name);
      setActiveTabIndex(index);

      // Update last viewed timestamp for the tab
      if (name === "Fines" || name === "Events") {
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
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          updateDoc(userDocRef, {
            [`lastViewed.${name}`]: now,
          }).catch((error) => {
            console.error(`Error updating last viewed for ${name}:`, error);
          });
        }
      }
      // No fade animation needed
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
      const onBackPress = () => {
        setShowLogoutModal(true);
        return true; // Prevents default back action
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () =>
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [])
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const unsubscribe = avatarRealtime.subscribeToAvatarUpdates(
        user,
        (newAvatarUrl) => {
          setAvatarUrl(newAvatarUrl);
          setLoadingAvatar(false);
        }
      );

      avatarRealtime.fetchAvatar(user).then(({ avatarUrl, error }) => {
        if (!error) {
          setAvatarUrl(avatarUrl);
          setLoadingAvatar(false);
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    Animated.spring(translateX, {
      toValue:
        activeTabIndex * constants.tabWidth +
        (constants.tabWidth - constants.underlineWidth) / 2,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [activeTabIndex, translateX]);

  // Add refresh functionality
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Fetch fresh data here based on the active tab
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleLogout = useCallback(async () => {
    const { error } = await avatarRealtime.logout();
    if (!error) {
      navigation.navigate("Login");
    }
  }, [navigation]);

  const handleAvatarError = useCallback(() => {
    setAvatarUrl(null);
    setLoadingAvatar(false);
  }, []);

  // Render content without animation
  const renderContent = useCallback(() => {
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

    return <View style={{ flex: 1 }}>{content}</View>;
  }, [activeTab]);

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
    if (!showLogoutModal) return null;

    return (
      <Logout
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    );
  }, [showLogoutModal, handleLogout]);

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
