import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Image,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Toast from "react-native-toast-message";

import BackgroundImage from "../../components/ImageBackground";
import { auth, db } from "../../config/firebaseconfig";
import aito from "../../assets/aito.png";

const Login = ({ navigation }) => {
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
    // Dismiss keyboard before login
    Keyboard.dismiss();

    if (!email || !password) {
      showToast("error", "Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const adminRef = doc(db, "admin", user.uid);
      const adminDoc = await getDoc(adminRef);

      if (adminDoc.exists()) {
        showToast("success", "Admin login successful!");
        navigation.navigate("AdminDashboard", { screen: "AdminHome" });
      } else {
        showToast("success", "Login successful!");
        navigation.navigate("Dashboard", { screen: "Home" });
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
        colors={["#ffffff88", "#f0f0f088"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollViewContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.content}>
                {/* Logo Section */}
                <View style={styles.logoAndWelcome}>
                  <View style={styles.logoContainer}>
                    <Image
                      source={aito}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.welcomeTitle}>Welcome Back</Text>
                  <Text style={styles.subtitle}>Sign in to continue</Text>
                </View>
                {/* Login Form */}
                <View style={styles.formContainer}>
                  {/* Email Input */}
                  <View style={styles.inputBulk}>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color="#16325B"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        placeholderTextColor="#a0a0a0"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => {}}
                      />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#16325B"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#a0a0a0"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!isPasswordVisible}
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                      />
                      <TouchableOpacity
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={
                            isPasswordVisible
                              ? "eye-off-outline"
                              : "eye-outline"
                          }
                          size={20}
                          color="#16325B"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Login Button */}
                  <TouchableOpacity
                    style={[
                      styles.loginButton,
                      isSubmitting && styles.loginButtonDisabled,
                    ]}
                    onPress={handleLogin}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.loginButtonText}>
                      {isSubmitting ? "Logging in..." : "Login"}
                    </Text>
                  </TouchableOpacity>

                  {/* Register Link */}
                  <View style={styles.registerContainer}>
                    <Text style={styles.registerText}>
                      Don't have an account?{" "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Register")}
                    >
                      <Text style={styles.registerLink}>Sign Up</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
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
  keyboardAvoidView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 20,
  },
  logoAndWelcome: {
    marginBottom: 250,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 5,
    marginTop: 5,
  },
  logo: {
    width: 180,
    height: 180,
  },
  organizationName: {
    fontSize: 16,
    color: "#16325B",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "300",
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
    height: 300,
  },

  welcomeTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#16325B",
    textAlign: "center",
    marginBottom: 5,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 60,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6F9",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    padding: 5,
  },
  loginButton: {
    backgroundColor: "#16325B",
    borderRadius: 15,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: {
    color: "#888",
    fontSize: 14,
  },
  registerLink: {
    color: "#16325B",
    fontWeight: "bold",
    fontSize: 14,
  },
  inputBulk: {
    marginTop: 10,
  },
});

export default Login;
