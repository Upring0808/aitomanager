import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { User, UserPlus, ChevronRight } from "lucide-react-native";
import aito from "../assets/aito.png";
import BackgroundImage from "./ImageBackground";
import { textStyles } from "../fallbackStyles";

const { width, height } = Dimensions.get("window");

const Index = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <BackgroundImage>
        <LinearGradient
          colors={["#ffffffaa", "#16325Bff"]}
          style={styles.gradient}
        >
          <View style={styles.container}>
            <View style={styles.logoContainer}>
              <Image source={aito} style={styles.logo} resizeMode="contain" />
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.header}>AITO CHECK</Text>
              <Text style={styles.description}>
                Effortlessly view your fines and stay updated on events—all in
                one place.
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.elevatedShadow]}
                  onPress={() => navigation.navigate("Login")}
                  activeOpacity={0.7}
                >
                  <View style={styles.buttonContent}>
                    <User color="#fff" size={24} style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Login</Text>
                    <ChevronRight color="#fff" size={24} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.buttonOutline, styles.elevatedShadow]}
                  onPress={() => navigation.navigate("Register")}
                  activeOpacity={0.7}
                >
                  <View style={styles.buttonContent}>
                    <UserPlus
                      color="#16325B"
                      size={24}
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonOutlineText}>Register</Text>
                    <ChevronRight color="#16325B" size={24} />
                  </View>
                </TouchableOpacity>

                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>No Account? </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Register")}
                  >
                    <Text style={styles.loginLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </BackgroundImage>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  formContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 15,
    position: "absolute",
    bottom: -20,
    left: 0,
    right: 0,
    height: 280,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: width > 600 ? 250 : 200,
    height: width > 600 ? 250 : 200,
  },
  contentContainer: {
    alignItems: "center",
    marginBottom: 220,
  },
  header: {
    fontSize: width > 600 ? 48 : 36,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 1,
  },

  description: {
    fontSize: width > 600 ? 20 : 18,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 28,
    marginBottom: 20,
    maxWidth: 480,
    alignSelf: "center",
    fontWeight: "400",
    letterSpacing: 0.5,
  },

  buttonContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  button: {
    backgroundColor: "#16325B",
    paddingVertical: 15,
    borderRadius: 30,
    width: "90%",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#fff",
  },

  buttonOutline: {
    borderWidth: 2,
    borderColor: "#16325B",
    backgroundColor: "#fff",
    paddingVertical: 15,
    borderRadius: 30,
    width: "90%",
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: width > 600 ? 20 : 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  buttonOutlineText: {
    color: "#16325B",
    fontSize: width > 600 ? 20 : 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  loginText: {
    color: "#666",
    fontSize: 15,
  },
  loginLink: {
    color: "#16325B",
    fontWeight: "bold",
    fontSize: 15,
  },
  elevatedShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});

export default Index;
