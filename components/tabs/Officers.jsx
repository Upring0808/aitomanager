import React from "react";
import { View, Text, StyleSheet } from "react-native";

const Officers = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Officers & Members</Text>
      <Text style={styles.description}>
        View AITO officers and members with their roles.
      </Text>
      {/* Display list of officers and their roles */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
  },
});

export default Officers;
