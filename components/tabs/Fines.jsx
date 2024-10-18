import React from "react";
import { View, Text, StyleSheet } from "react-native";

const Fines = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fines</Text>
      <Text style={styles.description}>Here is a list of your fines.</Text>
      {/* Display list of fines */}
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

export default Fines;
