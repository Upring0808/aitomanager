// BackgroundImage.jsx
import React from "react";
import { ImageBackground, StyleSheet } from "react-native";
import bg from "../assets/bg.jpg";

const BackgroundImage = ({ children }) => {
  return (
    <ImageBackground
      source={bg}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});

export default BackgroundImage;
