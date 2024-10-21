import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { auth, storage } from "../config/firebaseconfig";
import { ref, getDownloadURL, listAll, getMetadata } from "firebase/storage";
import { onAuthStateChanged, signOut } from "firebase/auth";

import AdminFines from "../admin/tabs/AdminFines";
import AdminOfficers from "../components/tabs/Officers";
import AdminProfile from "../admin/tabs/AdminProfile";
import AdminEvents from "../admin/tabs/AdminEvents";
import Header from "../components/Header";
import AdminHome from "../admin/tabs/AdminHome";

const { width } = Dimensions.get("window");
const tabWidth = width / 5;
const underlineWidth = tabWidth * 0.8;

const AdminDashboard = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("Home");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [translateX] = useState(new Animated.Value(0));
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const insets = useSafeAreaInsets();

  const tabs = useMemo(
    () => [
      { name: "Home", icon: "home", component: Ionicons },
      { name: "Events", icon: "calendar-outline", component: Ionicons },
      { name: "Fines", icon: "receipt", component: MaterialIcons },
      { name: "Officers", icon: "users", component: Feather },
      { name: "Profile", icon: "person-circle-outline", component: Ionicons },
    ],
    []
  );

  const fetchAvatar = useCallback(async (user) => {
    if (!user) {
      setAvatarUrl(null);
      setLoadingAvatar(false);
      return;
    }

    setLoadingAvatar(true);
    try {
      const avatarFolderRef = ref(storage, `admin/${user.uid}`);
      const listResult = await listAll(avatarFolderRef);

      if (listResult.items.length > 0) {
        const itemsWithMetadata = await Promise.all(
          listResult.items.map(async (item) => {
            const metadata = await getMetadata(item);
            return { item, metadata };
          })
        );

        itemsWithMetadata.sort(
          (a, b) =>
            new Date(b.metadata.timeCreated) - new Date(a.metadata.timeCreated)
        );

        const mostRecentItem = itemsWithMetadata[0].item;
        const url = await getDownloadURL(mostRecentItem);
        setAvatarUrl(url);
      } else {
        console.log("No avatar found for admin");
        setAvatarUrl(null);
      }
    } catch (error) {
      console.error("Error fetching avatar:", error);
      setAvatarUrl(null);
    } finally {
      setLoadingAvatar(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchAvatar(user);
      } else {
        setActiveTab("Home");
        setActiveTabIndex(0);
        setAvatarUrl(null);
        setLoadingAvatar(false);
      }
    });

    return () => unsubscribe();
  }, [fetchAvatar]);

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: activeTabIndex * tabWidth + (tabWidth - underlineWidth) / 2,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [activeTabIndex, translateX]);

  const handleTabPress = useCallback((tabName, index) => {
    setActiveTab(tabName);
    setActiveTabIndex(index);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigation.navigate("Login");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [navigation]);

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case "Home":
        return <AdminHome />;
      case "Fines":
        return <AdminFines />;
      case "Officers":
        return <AdminOfficers />;
      case "Profile":
        return (
          <AdminProfile onAvatarUpdate={() => fetchAvatar(auth.currentUser)} />
        );
      case "Events":
        return <AdminEvents />;
      default:
        return <AdminHome />;
    }
  }, [activeTab, fetchAvatar]);

  const renderTab = useCallback(
    ({ name, icon, component: IconComponent }, index) => (
      <TouchableOpacity
        key={name}
        onPress={() => handleTabPress(name, index)}
        style={styles.tab}
        activeOpacity={0.7}
      >
        {name === "Profile" && !loadingAvatar ? (
          avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              onError={() => setAvatarUrl(null)}
            />
          ) : (
            <IconComponent
              name={icon}
              size={24}
              color={activeTab === name ? "#3652AD" : "#aaa"}
            />
          )
        ) : loadingAvatar && name === "Profile" ? (
          <ActivityIndicator size="small" color="#aaa" />
        ) : (
          <IconComponent
            name={icon}
            size={24}
            color={activeTab === name ? "#3652AD" : "#aaa"}
          />
        )}
        <Text
          style={activeTab === name ? styles.activeTabText : styles.tabText}
        >
          {name}
        </Text>
      </TouchableOpacity>
    ),
    [activeTab, avatarUrl, handleTabPress, loadingAvatar]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "left"]}>
      <Header onLogout={handleLogout} />
      <View style={styles.container}>
        {renderContent()}
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 },
          ]}
        >
          <Animated.View
            style={[
              styles.underline,
              {
                transform: [{ translateX }],
                width: underlineWidth,
              },
            ]}
          />
          {tabs.map(renderTab)}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 8,
    position: "relative",
    paddingVertical: -12,
  },
  underline: {
    height: 2,
    backgroundColor: "#3652AD",
    position: "absolute",
    top: -1,
    width: 20,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 1,
    paddingTop: 10,
  },
  tabText: {
    fontSize: 10,
    color: "#aaa",
    marginBottom: -5,
  },
  activeTabText: {
    fontSize: 10,
    color: "#3652AD",
    fontWeight: "600",
    marginBottom: -5,
  },
  avatar: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
  },
});

export default AdminDashboard;
