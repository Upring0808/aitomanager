import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Image,
  Keyboard,
  Modal,
  TouchableWithoutFeedback,
  StatusBar,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { auth, db } from "../../config/firebaseconfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc } from "firebase/firestore";
import aito from '../../assets/aito.png';

const NAVY = "#203562";
const WHITE = "#fff";

const Register = () => {
  const [username, setUsername] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [yearLevel, setYearLevel] = useState("1");
  const [showPicker, setShowPicker] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgLogo, setOrgLogo] = useState(null);
  const navigation = useNavigation();

  const yearLevels = [
    { label: "1st Year", value: "1" },
    { label: "2nd Year", value: "2" },
    { label: "3rd Year", value: "3" },
    { label: "4th Year", value: "4" },
  ];

  const showWarning = (message) => {
    Toast.show({
      type: "error",
      text1: "Warning",
      text2: message,
      position: "top",
      visibilityTime: 3000,
    });
  };

  const showSuccess = (message) => {
    Toast.show({
      type: "success",
      text1: "Success",
      text2: message,
      position: "top",
      visibilityTime: 3000,
    });
  };

  const validateStudentId = (studentId) => {
    const studentIdRegex = /^\d{4}-\d{4}-[A-Z]{2}$/;
    if (!studentIdRegex.test(studentId)) {
      showWarning(
        "Invalid Student ID format. Use YYYY-NNNN-XX (e.g., 2022-1114-AB)."
      );
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (
      !username ||
      !studentId ||
      !email ||
      !phone ||
      !password ||
      !yearLevel
    ) {
      showWarning("All fields are required.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showWarning("Please enter a valid email address.");
      return;
    }

    // Validate student ID format only
    const isValidStudentId = validateStudentId(studentId);
    if (!isValidStudentId) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Username uniqueness check should be org-specific
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) {
        showWarning("No organization selected.");
        setIsSubmitting(false);
        return;
      }
      const usernameQuery = query(
        collection(db, "organizations", orgId, "users"),
        where("username", "==", username)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      if (!usernameSnapshot.empty) {
        showWarning(
          "Username is already taken in this organization. Please choose another."
        );
        setIsSubmitting(false);
        return;
      }

      // Ensure auth has _getRecaptchaConfig method before using it
      if (!auth._getRecaptchaConfig) {
        console.log(
          "[Register] Adding missing _getRecaptchaConfig method to auth"
        );
        auth._getRecaptchaConfig = () => null;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const userId = userCredential.user.uid;
      // Save user profile under organizations/{orgId}/users/{userId}
      await setDoc(doc(db, "organizations", orgId, "users", userId), {
        uid: userId,
        username,
        studentId,
        email,
        phone,
        yearLevel,
        createdAt: new Date(),
      });
      showSuccess("Registration successful!");
      navigation.navigate("LoginScreen");
    } catch (error) {
      console.error("Error during registration:", error);
      if (error.code === "auth/email-already-in-use") {
        showWarning(
          "This email is already registered. Please use a different email or try logging in."
        );
      } else {
        showWarning(error.message || "An error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchLogoAndName = async () => {
      const logoUrl = await AsyncStorage.getItem('selectedOrgLogo');
      setOrgLogo(logoUrl);
      const name = await AsyncStorage.getItem('selectedOrgName');
      setOrgName(name || '');
    };
    fetchLogoAndName();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={orgLogo ? { uri: orgLogo } : aito}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.topContentCentered}>
            <Text style={styles.orgNameCentered}>{orgName ? orgName : 'Register'}</Text>
            <Text style={styles.titleCentered}>Create Your Account</Text>
          </View>
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={NAVY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Choose Your Username"
                placeholderTextColor="#a0a0a0"
                value={username}
                onChangeText={setUsername}
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons
                name="id-card-outline"
                size={20}
                color={NAVY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Student ID (e.g., 2022-1114-AB)"
                placeholderTextColor="#a0a0a0"
                value={studentId}
                onChangeText={setStudentId}
                keyboardType="default"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="email"
                size={20}
                color={NAVY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Your Valid Email"
                placeholderTextColor="#a0a0a0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={NAVY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Contact Number"
                placeholderTextColor="#a0a0a0"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="school"
                size={20}
                color={NAVY}
                style={styles.inputIcon}
              />
              <Picker
                selectedValue={yearLevel}
                onValueChange={(itemValue) => setYearLevel(itemValue)}
                style={styles.picker}
                dropdownIconColor={NAVY}
                mode="dropdown"
              >
                {yearLevels.map((yl) => (
                  <Picker.Item
                    key={yl.value}
                    label={yl.label}
                    value={yl.value}
                    style={styles.pickerItem}
                  />
                ))}
              </Picker>
            </View>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={NAVY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Create Your Password"
                placeholderTextColor="#a0a0a0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={
                    isPasswordVisible ? "eye-off-outline" : "eye-outline"
                  }
                  size={20}
                  color={NAVY}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.registerButton, isSubmitting && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              <Text style={styles.registerButtonText}>
                {isSubmitting ? "Registering..." : "Create Account"}
              </Text>
            </TouchableOpacity>
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("LoginScreen")}
              >
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: 32,
    backgroundColor: WHITE,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  topContentCentered: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  orgNameCentered: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 2,
    textAlign: 'center',
  },
  titleCentered: {
    fontSize: 22,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 14,
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
    width: '100%',
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5eaf2',
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 5,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: NAVY,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    padding: 5,
  },
  picker: {
    flex: 1,
    color: NAVY,
    backgroundColor: 'transparent',
  },
  registerButton: {
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 14,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#666',
    fontSize: 16,
  },
  loginLink: {
    color: NAVY,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Register;
