import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const Header = ({ title = "AitoCheck" }) => {
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
        name="checkmark-done-outline"
        size={28}
        color="#59B4C3"
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    // Fixed minimum height for consistency
    minHeight: 56,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#003366",
  },
});

export default Header;
