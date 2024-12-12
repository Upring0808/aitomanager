import React from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import logo from "../assets/aito.png";

const Header = ({ title = "Aito Check" }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Notch Background */}
      <View
        style={[
          styles.notchBackground,
          { height: insets.top, backgroundColor: "#F8F9FA " },
        ]}
      />
      {/* Header Content */}
      <View style={styles.header}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8F9FA", // Same as header background
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
    width: 32, // Minimal size for logo
    height: 32,
    marginRight: 8,
  },
  title: {
    fontSize: 24, // Balanced font size
    fontWeight: "500", // Medium weight
    color: "#333333", // Neutral text color
    letterSpacing: -1,
  },
});

export default Header;
