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
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import Toast from "react-native-toast-message";

import BackgroundImage from "../../components/ImageBackground";
import { auth, db } from "../../config/firebaseconfig";
import aito from "../../assets/aito.png";

// Get screen dimensions
const { width, height } = Dimensions.get("window");
const { height: screenHeight, width: screenWidth } = Dimensions.get("screen");

const Login = ({ navigation }) => {
  // Your existing state variables
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] =
    useState(false);
  const [forgotStudentId, setForgotStudentId] = useState("");

  // Rest of your functions remain the same...
  const showToast = (type, message) => {
    Toast.show({
      type: type,
      text1: type === "success" ? "Success" : "Error",
      text2: message,
      position: "top",
      visibilityTime: 3000,
    });
  };

  const validateStudentId = async (studentId) => {
    const studentIdRegex = /^\d{4}-\d{4}-[A-Z]{2}$/;
    if (!studentIdRegex.test(studentId)) {
      showToast(
        "error",
        "Invalid Student ID format. Use YYYY-NNNN-XX (e.g., 2022-1114-AB)."
      );
      return false;
    }

    try {
      const q = query(
        collection(db, "ictStudentIds"),
        where("studentId", "==", studentId)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error validating student ID:", error);
      showToast("error", "Error checking Student ID. Please try again.");
      return false;
    }
  };

  const isEmail = (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const handleLogin = async () => {
    Keyboard.dismiss();

    if (!loginInput || !password) {
      showToast("error", "Student ID and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Secretly check if input is an email (for admin access)
      if (isEmail(loginInput)) {
        // Ensure auth has _getRecaptchaConfig method before using it
        if (!auth._getRecaptchaConfig) {
          console.log(
            "[Login] Adding missing _getRecaptchaConfig method to auth"
          );
          auth._getRecaptchaConfig = () => null;
        }

        // Direct email login (for admin)
        const userCredential = await signInWithEmailAndPassword(
          auth,
          loginInput,
          password
        );
        const user = userCredential.user;

        // Check if user is an admin
        const adminRef = doc(db, "admin", user.uid);
        const adminDoc = await getDoc(adminRef);

        if (adminDoc.exists()) {
          // Admin login successful but don't explicitly say it's an admin login
          showToast("success", "Login successful!");
          // Use the correct navigation pattern for nested navigators
          // Add a small delay to ensure Firebase auth state is fully updated
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: "AdminDashboard" }],
            });
          }, 300);
        } else {
          showToast("success", "Login successful!");
          // Add a small delay to ensure Firebase auth state is fully updated
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: "Dashboard" }],
            });
          }, 300);
        }
      } else {
        // Student ID login flow
        const isValidStudentId = await validateStudentId(loginInput);
        if (!isValidStudentId) {
          showToast(
            "error",
            "This Student ID is not recognized as an ICT student."
          );
          setIsSubmitting(false);
          return;
        }

        const q = query(
          collection(db, "users"),
          where("studentId", "==", loginInput)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.size === 0) {
          showToast("error", "Student ID not found.");
          setIsSubmitting(false);
          return;
        }

        if (querySnapshot.size > 1) {
          showToast("error", "Multiple users found with this Student ID.");
          setIsSubmitting(false);
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const email = userDoc.data().email;

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        showToast("success", "Login successful!");
        // Use the correct navigation pattern for nested navigators
        // Add a small delay to ensure Firebase auth state is fully updated
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "Dashboard" }],
          });
        }, 300);
      }
    } catch (error) {
      console.error("Error during login:", error);
      let errorMessage = "An error occurred. Please try again.";
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "Student ID or password is incorrect.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password.";
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

  const handleForgotPassword = async () => {
    if (!forgotStudentId) {
      showToast("error", "Please enter your Student ID.");
      return;
    }

    const isValidStudentId = await validateStudentId(forgotStudentId);
    if (!isValidStudentId) {
      showToast(
        "error",
        "This Student ID is not recognized as an ICT student."
      );
      return;
    }

    setIsResetting(true);

    try {
      const q = query(
        collection(db, "users"),
        where("studentId", "==", forgotStudentId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showToast("error", "No account found with this Student ID.");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const email = userDoc.data().email;

      await sendPasswordResetEmail(auth, email);
      showToast(
        "success",
        `Password reset email sent to ${email.substring(
          0,
          3
        )}...${email.substring(email.indexOf("@"))}`
      );
      setForgotPasswordModalVisible(false);
      setForgotStudentId("");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      showToast("error", "Failed to send password reset email.");
    } finally {
      setIsResetting(false);
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
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <ScrollView contentContainerStyle={styles.scrollView}>
                <View style={styles.logoContainer}>
                  <Image source={aito} style={styles.logo} />
                </View>

                <Text style={styles.subHeader}>
                  Alliance of Information Technologists Organization
                </Text>
                <Text style={styles.header}>LOGIN</Text>

                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="id-card-outline" size={20} color="#888" />
                    <TextInput
                      style={styles.input}
                      placeholder="Student ID"
                      placeholderTextColor="#a0a0a0"
                      value={loginInput}
                      onChangeText={setLoginInput}
                      keyboardType="default"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#888"
                    />
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
                  style={styles.forgotPassword}
                  onPress={() => setForgotPasswordModalVisible(true)}
                >
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, isSubmitting && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isSubmitting}
                >
                  <Text style={styles.buttonText}>
                    {isSubmitting ? "Logging in..." : "Login"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>
                    Don't have an account?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Index")}
                  >
                    <Text style={styles.registerLink}>Contact Admin</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>

      {/* Forgot Password Modal - Modified for full screen overlay */}
      <Modal
        visible={forgotPasswordModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true} // This ensures overlay extends behind status bar
        onRequestClose={() => {
          setForgotPasswordModalVisible(false);
          setForgotStudentId("");
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback
            onPress={() => {
              setForgotPasswordModalVisible(false);
              setForgotStudentId("");
            }}
          >
            <View style={styles.modalBackdrop}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalText}>
                    Enter your Student ID to receive a password reset link.
                  </Text>

                  <View style={styles.modalInputWrapper}>
                    <Ionicons name="id-card-outline" size={20} color="#888" />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Student ID (e.g., 2022-1114-AB)"
                      placeholderTextColor="#a0a0a0"
                      value={forgotStudentId}
                      onChangeText={setForgotStudentId}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setForgotPasswordModalVisible(false);
                        setForgotStudentId("");
                      }}
                      disabled={isResetting}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        styles.resetButton,
                        isResetting && styles.buttonDisabled,
                      ]}
                      onPress={handleForgotPassword}
                      disabled={isResetting}
                    >
                      <Text style={styles.resetButtonText}>
                        {isResetting ? "Sending..." : "Reset Password"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

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
    color: "#666",
    textAlign: "center",
    marginBottom: 5,
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#16325B",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#16325B",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: "#16325B80",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  registerText: {
    color: "#666",
    fontSize: 14,
  },
  registerLink: {
    color: "#16325B",
    fontSize: 14,
    fontWeight: "bold",
  },
  // Improved modal styles for full screen coverage
  modalOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "85%",
    maxWidth: 400,
    elevation: 5, // for Android shadow
    shadowColor: "#000", // for iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  modalText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  modalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9EFEC",
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 50,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 120,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E0E0E0",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "bold",
  },
  resetButton: {
    backgroundColor: "#16325B",
  },
  resetButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default Login;
