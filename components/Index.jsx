import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import aito from "../assets/aito.png";
import BackgroundImage from "../components/ImageBackground";

const { width } = Dimensions.get("window");

const Index = ({ navigation }) => {
  return (
    <BackgroundImage>
      <LinearGradient
        colors={["#ffffffaa", "#e6f2f3dd"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" />

          <ScrollView contentContainerStyle={styles.scrollView}>
            <View style={styles.container}>
              {/* Logo Section */}
              <View style={styles.logoContainer}>
                <Image source={aito} style={styles.logo} resizeMode="contain" />
              </View>

              {/* Text Section */}
              <View style={styles.contentContainer}>
                <Text style={styles.header}>AITO CHECK</Text>
                <Text style={styles.subHeader}>
                  Alliance of Information Technologists Organization
                </Text>
                <Text style={styles.description}>
                  Manage your organization effortlessly with the AITO app.
                  Simplifying tasks, communication, and events in one platform.
                </Text>
              </View>

              {/* Buttons Section */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => navigation.navigate("Login")}
                >
                  <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.buttonOutline}
                  onPress={() => navigation.navigate("Register")}
                >
                  <Text style={styles.buttonOutlineText}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </BackgroundImage>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: width > 600 ? 250 : 150,
    height: width > 600 ? 250 : 150,
  },
  contentContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  header: {
    fontSize: width > 600 ? 48 : 36,
    color: "#257180",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subHeader: {
    fontSize: width > 600 ? 20 : 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 10,
    fontStyle: "italic",
  },
  description: {
    fontSize: width > 600 ? 18 : 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 26,
    marginBottom: 30,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#257180",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    width: "90%",
    marginBottom: 15,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: width > 600 ? 20 : 18,
    fontWeight: "bold",
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: "#257180",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    width: "90%",
  },
  buttonOutlineText: {
    color: "#257180",
    fontSize: width > 600 ? 20 : 18,
    fontWeight: "bold",
  },
});

export default Index;
