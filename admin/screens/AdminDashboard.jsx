import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { auth, db } from "../../config/firebaseconfig";
import { doc, onSnapshot } from "firebase/firestore";
import AdminFines from "../screens/tabs/AdminFines";
import AdminPeople from "../screens/tabs/AdminPeople";
import AdminProfile from "../screens/tabs/AdminProfile";
import AdminEvents from "../screens/tabs/AdminEvents";
import AdminHome from "../screens/tabs/AdminHome";
import Header from "../../components/Header";
import { dashboardStyles, constants } from "../styles/dashboardStyles";
import { dashboardServices } from "../services/dashboardServices";
import { ADMIN_TABS } from "../constants/adminTabs";

const AdminDashboard = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("Home");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [translateX] = useState(new Animated.Value(0));
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // Set up real-time listener for avatar updates
      const unsubscribe = dashboardServices.subscribeToAvatarUpdates(
        user,
        (newAvatarUrl) => {
          setAvatarUrl(newAvatarUrl);
          setLoadingAvatar(false);
        }
      );

      // Fetch the initial avatar
      dashboardServices.fetchAvatar(user).then(({ avatarUrl, error }) => {
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

  const handleTabPress = useCallback((tabName, index) => {
    setActiveTab(tabName);
    setActiveTabIndex(index);
  }, []);

  const handleLogout = useCallback(async () => {
    const { error } = await dashboardServices.logout();
    if (!error) {
      navigation.navigate("Login");
    }
  }, [navigation]);

  const handleAvatarError = useCallback(() => {
    setAvatarUrl(null);
    setLoadingAvatar(false);
  }, []);

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case "Home":
        return <AdminHome />;
      case "Fines":
        return <AdminFines />;
      case "People":
        return <AdminPeople />;
      case "Profile":
        return <AdminProfile onAvatarUpdate={dashboardServices.fetchAvatar} />;
      case "Events":
        return <AdminEvents />;
      default:
        return <AdminHome />;
    }
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
        color={activeTab === "Profile" ? "#3652AD" : "#aaa"}
      />
    );
  }, [avatarUrl, loadingAvatar, activeTab, handleAvatarError]);

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

  return (
    <SafeAreaView style={dashboardStyles.safeArea} edges={["right", "left"]}>
      <Header onLogout={handleLogout} />
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
    </SafeAreaView>
  );
};

export default AdminDashboard;
