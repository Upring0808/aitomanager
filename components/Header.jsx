import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import logo from "../assets/aito.png";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Header = ({ title = "Aito Check" }) => {
  const insets = useSafeAreaInsets();
  const [orgLogo, setOrgLogo] = useState(null);

  useEffect(() => {
    const fetchLogo = async () => {
      const logoUrl = await AsyncStorage.getItem("selectedOrgLogo");
      setOrgLogo(logoUrl);
    };
    fetchLogo();
  }, []);

  return (
    <View style={styles.container}>
      {/* Notch Background */}
      <View
        style={[
          styles.notchBackground,
          { height: insets.top, backgroundColor: "white" },
        ]}
      />
      {/* Header Content */}
      <View style={styles.header}>
        <Image
          source={orgLogo ? { uri: orgLogo } : logo}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white", // Same as header background
  },
  notchBackground: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0", // Subtle border
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
    borderRadius: 16, // Make it circular
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24, // Balanced font size
    fontWeight: "600", // Medium weight
    color: "#333333", // Neutral text color
    letterSpacing: -1,
    fontFamily: "Lato-Bold",
  },
});

export default Header;
