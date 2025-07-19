import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
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
import adminStatusService from "../services/AdminStatusService";
import { auth } from "../config/firebaseconfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { constants, dashboardStyles } from "../styles/dashboardStyles";
import Header from "./Header";
import Logout from "../components/Logout"; // Import the Logout component (adjust path as needed)
import { ADMIN_TABS } from "./adminTabs";
import AdminHome from "../screens/Auth/Dashboard/Admin/AdminHome";
import AdminFines from "../screens/Auth/Dashboard/Admin/AdminFines";
import AdminPeople from "../screens/Auth/Dashboard/Admin/AdminPeople";
import AdminProfile from "../screens/Auth/Dashboard/Admin/AdminProfile";
import AdminEvents from "../screens/Auth/Dashboard/Admin/AdminEvents";

const AdminDashboard = ({ navigation, route }) => {
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
  const [activeTab, setActiveTab] = useState("Home");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [translateX] = useState(new Animated.Value(0));
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false); // Logout modal state
  const insets = useSafeAreaInsets();
  const [orgLogoUrl, setOrgLogoUrl] = useState(null);

  // Admin status is now managed entirely by App.js
  // This prevents conflicts when navigating between admin screens

  // Handle hardware back button press
  useFocusEffect(
    useCallback(() => {
      // Skip BackHandler setup on web where it's not supported
      if (Platform.OS !== "web") {
        const onBackPress = () => {
          // Only show logout modal if we're still logged in
          if (auth.currentUser) {
            setShowLogoutModal(true); // Show logout modal when back is pressed
            return true; // Prevent default back action
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
            console.error(
              "[AdminDashboard] Error removing back handler:",
              error
            );
          }
        };
      }
      return () => {}; // Return empty cleanup for web
    }, [])
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      let unsubscribe = () => {};
      (async () => {
        try {
          const orgId = await AsyncStorage.getItem("selectedOrgId");
          if (orgId) {
            unsubscribe = dashboardServices.subscribeToAvatarUpdates(
              user,
              orgId,
              (newAvatarUrl) => {
                setAvatarUrl(newAvatarUrl);
                setLoadingAvatar(false);
              },
              true // isAdmin
            );
          }

          dashboardServices
            .fetchAvatar(user, orgId, true) // isAdmin
            .then(({ avatarUrl, error }) => {
              if (!error) {
                setAvatarUrl(avatarUrl);
                setLoadingAvatar(false);
              } else {
                console.error("[AdminDashboard] Error fetching avatar:", error);
                setLoadingAvatar(false);
              }
            })
            .catch((error) => {
              console.error("[AdminDashboard] Avatar fetch exception:", error);
              setLoadingAvatar(false);
            });
        } catch (error) {
          console.error("[AdminDashboard] Avatar subscription error:", error);
          setLoadingAvatar(false);
        }
      })();

      return () => {
        try {
          unsubscribe();
        } catch (error) {
          console.error("[AdminDashboard] Error unsubscribing avatar:", error);
        }
      };
    } else {
      setLoadingAvatar(false);
    }
  }, []);

  useEffect(() => {
    // Only animate if we have a valid auth state
    if (auth.currentUser) {
      Animated.spring(translateX, {
        toValue:
          activeTabIndex * constants.tabWidth +
          (constants.tabWidth - constants.underlineWidth) / 2,
        useNativeDriver: true,
        friction: 8,
      }).start();
    }
  }, [activeTabIndex, translateX]);

  useEffect(() => {
    let unsubscribe;
    const fetchOrgLogo = async () => {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const infoDocRef = doc(db, "organizations", orgId, "info", "details");
      unsubscribe = onSnapshot(infoDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setOrgLogoUrl(docSnap.data().logo_url || null);
        }
      });
    };
    fetchOrgLogo();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTab]);

  const handleTabPress = useCallback((name, index) => {
    setActiveTab(name);
    setActiveTabIndex(index);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      console.log("[AdminDashboard] Starting logout process");
      
      // Close the modal first
      setShowLogoutModal(false);
      
      // Clean up presence service
      console.log("[AdminDashboard] Cleaning up presence service");
      await userPresenceService.cleanup();

      // Force admin offline and cleanup
      console.log("[AdminDashboard] Forcing admin offline and cleaning up");
      await adminStatusService.forceOffline();
      await adminStatusService.cleanup();

      // Then sign out from Firebase
      console.log("[AdminDashboard] Signing out from Firebase");
      await auth.signOut();

      // Navigate to LoginScreen
      console.log("[AdminDashboard] Navigating to LoginScreen");
      navigation.setParams({ isLoggingOut: true });
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginScreen" }],
      });
    } catch (error) {
      console.error("[AdminDashboard] Error during logout:", error);
      // Attempt to navigate anyway
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginScreen" }],
      });
    }
  }, [navigation]);

  const handleAvatarError = useCallback(() => {
    setAvatarUrl(null);
    setLoadingAvatar(false);
  }, []);

  const renderContent = useCallback(() => {
    if (!auth.currentUser) {
      return (
        <View style={dashboardStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#203562" />
        </View>
      );
    }
    return (
      <View style={dashboardStyles.container}>
        {activeTab === "Home" && <AdminHome />}
        {activeTab === "Fines" && <AdminFines />}
        {activeTab === "People" && <AdminPeople />}
        {activeTab === "Profile" && (
          <AdminProfile
            onAvatarUpdate={(url) => {
              setAvatarUrl(url);
              setLoadingAvatar(false);
            }}
            onShowLogoutModal={() => setShowLogoutModal(true)}
          />
        )}
        {activeTab === "Events" && (
          <AdminEvents navigation={navigation} route={route} />
        )}
      </View>
    );
  }, [activeTab, setAvatarUrl]);

  const renderAvatar = useCallback(() => {
    console.log("Dashboard orgLogoUrl:", orgLogoUrl);
    if (loadingAvatar) {
      return <ActivityIndicator size="small" color="#aaa" />;
    }
    if (orgLogoUrl) {
      return (
        <Image
          source={{ uri: orgLogoUrl }}
          style={dashboardStyles.avatar}
          onError={(e) => {
            console.error("Org logo image load error:", e.nativeEvent);
            handleAvatarError();
          }}
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
        color={activeTab === "Profile" ? "#3652AD" : "#aaa"}
      />
    );
  }, [orgLogoUrl, loadingAvatar, activeTab, handleAvatarError]);

  const renderTab = useCallback(
    ({ name, icon, component: IconComponent }, index) => (
      <TouchableOpacity
        key={name}
        onPress={() => handleTabPress(name, index)}
        style={dashboardStyles.tab}
        activeOpacity={0.7}
      >
        {name === "Profile" ? (
          renderAvatar()
        ) : (
          <IconComponent
            name={icon}
            size={24}
            color={activeTab === name ? "#3652AD" : "#aaa"}
          />
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
    [activeTab, renderAvatar, handleTabPress]
  );

  const LogoutWrapper = useCallback(() => {
    // Only show logout modal if we're logged in and modal is visible
    if (!showLogoutModal || !auth.currentUser) return null;

    return (
      <Logout
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        isAdmin={true}
      />
    );
  }, [showLogoutModal, handleLogout]);

  // Check if user is logged in before rendering the dashboard
  useEffect(() => {
    if (!auth.currentUser && navigation) {
      console.log("[AdminDashboard] User is null, redirecting to LoginScreen");
      // Set a flag to prevent auth state conflicts
      navigation.setParams({ isLoggingOut: true });
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginScreen" }],
      });
    }
  }, [auth.currentUser, navigation]);

  if (!auth.currentUser) {
    // Return loading while redirecting
    return (
      <SafeAreaView style={dashboardStyles.safeArea} edges={["right", "left"]}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#203562" />
          <Text style={{ marginTop: 10, color: "#64748b" }}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Normal dashboard rendering when user is logged in
  return (
    <SafeAreaView style={dashboardStyles.safeArea} edges={["right", "left"]}>
      <View style={dashboardStyles.container}>
        {renderContent()}
        <View
          style={[
            dashboardStyles.footer,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 },
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

export default AdminDashboard;
