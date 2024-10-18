import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Toast from "react-native-toast-message";

const CustomToast = (props) => {
  return (
    <View style={styles.toastContainer}>
      <Text style={styles.toastText}>{props.text1}</Text>
      {props.text2 && <Text style={styles.toastSubtitle}>{props.text2}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#3498db", // Customize your background color
    marginHorizontal: 20,
    marginBottom: 40,
    alignItems: "center",
  },
  toastText: {
    color: "#ffffff", // Customize your text color
    fontWeight: "bold",
  },
  toastSubtitle: {
    color: "#ffffff", // Customize your subtitle color
    marginTop: 5,
  },
});

export default CustomToast;
