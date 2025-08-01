import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import aito from "../../assets/aito.png";
import BackgroundImage from "../../components/ImageBackground";
import Toast from "react-native-toast-message";
import { auth, db } from "../../config/firebaseconfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // import Firestore functions
import AsyncStorage from "@react-native-async-storage/async-storage";

const AdminLogin = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (type, message) => {
    Toast.show({
      type: type,
      text1: type === "success" ? "Success" : "Error",
      text2: message,
      position: "top",
      visibilityTime: 3000,
    });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("error", "Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Sign in using Firebase Authentication
      // Ensure auth has _getRecaptchaConfig method before using it
      if (!auth._getRecaptchaConfig) {
        console.log(
          "[AdminLogin] Adding missing _getRecaptchaConfig method to auth"
        );
        auth._getRecaptchaConfig = () => null;
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) throw new Error("No organization selected.");
      // Fetch the user from the org's admins collection to check if they are an admin
      const adminRef = doc(db, "organizations", orgId, "admins", user.uid);
      const adminDoc = await getDoc(adminRef);

      if (adminDoc.exists()) {
        showToast("success", "Admin login successful!");
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "AdminDashboard" }],
          });
        }, 300);
      } else {
        showToast(
          "error",
          "You do not have admin privileges in this organization."
        );
        await auth.signOut();
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "LandingScreen" }],
          });
        }, 500);
      }
    } catch (error) {
      console.error("Error during login:", error);
      let errorMessage = "An error occurred. Please try again.";
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No user found with this email.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled.";
          break;
      }
      showToast("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BackgroundImage>
      <LinearGradient
        colors={["#ffffffaa", "#f0f0f0dd"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
          >
            <ScrollView contentContainerStyle={styles.scrollView}>
              <View style={styles.logoContainer}>
                <Image source={aito} style={styles.logo} />
              </View>

              <Text style={styles.subHeader}>
                Alliance of Information Technologists Organization
              </Text>
              <Text style={styles.header}>LOGIN(admin)</Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#888" />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#a0a0a0"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#888" />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#a0a0a0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                  />
                  <TouchableOpacity
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    <Ionicons
                      name={
                        isPasswordVisible ? "eye-off-outline" : "eye-outline"
                      }
                      size={20}
                      color="#888"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? "Logging in..." : "Login"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
      <Toast />
    </BackgroundImage>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 150,
    height: 150,
  },
  header: {
    fontSize: 36,
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
  },
  subHeader: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    marginBottom: 5,
    fontStyle: "italic",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9EFEC",
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  button: {
    backgroundColor: "#16325B",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#cccccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  registerLink: {
    marginTop: 15,
    alignItems: "center",
  },
  registerLinkText: {
    color: "#16325B",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

export default AdminLogin;
