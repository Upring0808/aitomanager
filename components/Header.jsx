import React from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons"; // Import an icon library (e.g., Ionicons)
import logo from "../assets/aito.png"; // Use your logo image

const Header = ({ title = "Aito Check" }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: Platform.OS === "ios" ? insets.top : 10,
        },
      ]}
    >
      <Ionicons
        name="checkmark-circle-outline" // Choose an icon fitting the app's purpose
        size={32}
        color="#2F2A56"
        style={styles.icon}
      />
      {/* <Image source={logo} style={styles.logo} resizeMode="contain" /> */}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#F8F9FA",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#dcdcdc",
    minHeight: 56,
  },
  icon: {
    marginRight: 2.5,
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2F2A56",
    letterSpacing: -0.5,
    lineHeight: 30,
    textShadowColor: "#00000020",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default Header;
