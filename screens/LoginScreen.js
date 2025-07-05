import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Building,
  BookOpen,
  Users,
  GraduationCap,
  Shield,
} from "lucide-react-native";
import {
  getDocs,
  collection,
  query,
  where,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebaseconfig";

// Firebase imports
import { getAuth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

const LoginScreen = () => {
  const navigation = useNavigation();
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Get icon component by name
  const getIconComponent = (iconName) => {
    const icons = {
      BookOpen: BookOpen,
      Users: Users,
      GraduationCap: GraduationCap,
      Building: Building,
      Shield: Shield,
    };
    return icons[iconName] || Building;
  };

  // Load selected organization from AsyncStorage
  const loadSelectedOrganization = async () => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      const orgName = await AsyncStorage.getItem("selectedOrgName");
      const orgLogo = await AsyncStorage.getItem("selectedOrgLogo");
      const orgIcon = await AsyncStorage.getItem("selectedOrgIcon");

      if (orgId && orgName) {
        setSelectedOrg({
          id: orgId,
          name: orgName,
          logo_url: orgLogo,
          icon: orgIcon || "Building",
        });
      } else {
        // If no organization selected, go back to landing
        Alert.alert(
          "No Organization Selected",
          "Please select an organization first.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error(
        "[LoginScreen] Error loading selected organization:",
        error
      );
      navigation.goBack();
    }
  };

  // Handle login
  const handleLogin = async () => {
    let hasError = false;
    if (!email.trim()) {
      setEmailError("Email or Student ID is required");
      hasError = true;
    } else {
      setEmailError("");
    }
    if (!password.trim()) {
      setPasswordError("Password is required");
      hasError = true;
    } else {
      setPasswordError("");
    }
    if (hasError) return;

    if (!selectedOrg) {
      Alert.alert("Error", "No organization selected");
      return;
    }

    setAuthLoading(true);

    try {
      const auth = getAuth();
      if (!auth) {
        throw new Error("Authentication service not available");
      }

      let loginEmail = email.trim();
      // If not an email, treat as student ID and look up email in org's users
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginEmail)) {
        // Lookup email by student ID in org's users
        const orgId = selectedOrg.id;
        const usersRef = collection(db, "organizations", orgId, "users");
        const q = query(usersRef, where("studentId", "==", loginEmail));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          throw new Error("No account found with this Student ID.");
        }
        const userDoc = snapshot.docs[0];
        loginEmail = userDoc.data().email;
        if (!loginEmail) {
          throw new Error("No email found for this Student ID.");
        }
      }

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        password
      );
      const user = userCredential.user;

      console.log("[LoginScreen] Login successful for user:", user.email);

      // Save user info to AsyncStorage
      await AsyncStorage.setItem("userEmail", user.email);
      await AsyncStorage.setItem("userId", user.uid);

      // After login, wait a moment, then check if user is an admin in this org
      setTimeout(async () => {
        const orgId = selectedOrg.id;
        const adminRef = doc(db, "organizations", orgId, "admins", user.uid);
        const adminDoc = await getDoc(adminRef);
        if (adminDoc.exists()) {
          navigation.reset({ index: 0, routes: [{ name: "AdminDashboard" }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
        }
      }, 300);
    } catch (error) {
      console.error("[LoginScreen] Login error:", error);

      let errorMessage = "Login failed. Please try again.";

      if (error.code === "auth/user-not-found") {
        errorMessage =
          "No account found with this email address or student ID.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Wrong credentials, try again!";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Login Error", errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Please contact your organization administrator to reset your password.",
      [{ text: "OK" }]
    );
  };

  // Handle sign up
  const handleSignUp = () => {
    navigation.navigate("Register");
  };

  // Handle back navigation
  const handleBack = () => {
    try {
      if (navigation && navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.reset({ index: 0, routes: [{ name: "LandingScreen" }] });
      }
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback to reset navigation
      navigation.reset({ index: 0, routes: [{ name: "EntryScreen" }] });
    }
  };

  // Animation effects
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Load organization on component mount
  useEffect(() => {
    loadSelectedOrganization();
  }, []);

  if (!selectedOrg) {
    return (
      <SafeAreaView style={styles.containerMinimal}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#fff"
          translucent={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16325B" />
          <Text style={[styles.loadingText, { color: "#16325B" }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const IconComponent = getIconComponent(selectedOrg.icon);

  return (
    <SafeAreaView style={styles.containerMinimal}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
        translucent={true}
      />
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Header with back button */}
              <View style={styles.headerMinimal}>
                <TouchableOpacity
                  style={styles.backButtonMinimal}
                  onPress={handleBack}
                  activeOpacity={0.7}
                >
                  <ArrowLeft color="#16325B" size={24} />
                </TouchableOpacity>
              </View>
              {/* Organization Info */}
              <View style={styles.orgInfoContainerMinimal}>
                <View style={styles.orgLogoContainer}>
                  {selectedOrg.logo_url ? (
                    <Image
                      source={{ uri: selectedOrg.logo_url }}
                      style={styles.orgLogo}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.orgIconContainerMinimal}>
                      <IconComponent color="#16325B" size={40} />
                    </View>
                  )}
                </View>
                <Text style={styles.orgNameMinimal}>{selectedOrg.name}</Text>
                <Text style={styles.loginTitleMinimal}>Sign In</Text>
              </View>
              {/* Login Form */}
              <View style={styles.formContainer}>
                {/* Email Input */}
                <View
                  style={[
                    styles.inputContainerMinimal,
                    emailError ? styles.inputError : null,
                  ]}
                >
                  <Mail color="#16325B" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email or Student ID"
                    placeholderTextColor="#b0b8c1"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (text.trim()) setEmailError("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!authLoading}
                  />
                </View>
                {emailError ? (
                  <Text style={styles.errorText}>
                    {emailError.replace(
                      "Email or Username",
                      "Email, Username, or Student ID"
                    )}
                  </Text>
                ) : null}
                {/* Password Input */}
                <View
                  style={[
                    styles.inputContainerMinimal,
                    passwordError ? styles.inputError : null,
                  ]}
                >
                  <Lock color="#16325B" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#b0b8c1"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (text.trim()) setPasswordError("");
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!authLoading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    {showPassword ? (
                      <EyeOff color="#16325B" size={20} />
                    ) : (
                      <Eye color="#16325B" size={20} />
                    )}
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}
                {/* Login Button */}
                <TouchableOpacity
                  style={[
                    styles.loginButtonMinimal,
                    authLoading && styles.loginButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  activeOpacity={0.7}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.loginButtonTextMinimal}>Login</Text>
                  )}
                </TouchableOpacity>
                {/* Forgot Password & Sign Up */}
                <View style={styles.linksContainerMinimal}>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={handleForgotPassword}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.linkTextMinimal}>Forgot Password?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={handleSignUp}
                    onLongPress={() => navigation.navigate("RegisterAdmin")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.linkTextMinimal}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  orgInfoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  orgLogoContainer: {
    marginBottom: 15,
  },
  orgLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  orgIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  orgName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: "#16325B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  loginButtonDisabled: {
    backgroundColor: "#666",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  linksContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    color: "#e0e7ff",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  // Minimalistic overrides
  containerMinimal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  orgInfoContainerMinimal: {
    alignItems: "center",
    marginBottom: 40,
  },
  orgIconContainerMinimal: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f6fa",
    justifyContent: "center",
    alignItems: "center",
  },
  orgNameMinimal: {
    fontSize: 20,
    fontWeight: "600",
    color: "#16325B",
    textAlign: "center",
    marginBottom: 10,
  },
  loginTitleMinimal: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#16325B",
    textAlign: "center",
  },
  inputContainerMinimal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f6fa",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5eaf2",
  },
  loginButtonMinimal: {
    backgroundColor: "#16325B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  loginButtonTextMinimal: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  linksContainerMinimal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkTextMinimal: {
    color: "#16325B",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  // Minimalistic header and version styles
  headerMinimal: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    marginTop: 16, // Lower the back button from the top
  },
  backButtonMinimal: {
    padding: 8,
  },
  // Footer version style (match LandingScreen)
  footer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 10,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  footerText: {
    color: "#16325B",
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  inputError: {
    borderColor: "#ff4d4f",
  },
  errorText: {
    color: "#ff4d4f",
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 8,
  },
});

export default LoginScreen;
