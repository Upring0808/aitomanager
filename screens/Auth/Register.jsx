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
  SafeAreaView,
  Image,
  Keyboard,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import aito from "../../assets/aito.png";
import BackgroundImage from "../../components/ImageBackground";
import Toast from "react-native-toast-message";
import { auth, db } from "../../config/firebaseconfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import Login from "./Login";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [yearLevel, setYearLevel] = useState("1");
  const [showPicker, setShowPicker] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleRegister = async () => {
    if (!username || !email || !phone || !password || !yearLevel) {
      showWarning("All fields are required.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showWarning("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      if (!usernameSnapshot.empty) {
        showWarning("Username is already taken. Please choose another.");
        setIsSubmitting(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        username,
        email,
        phone,
        yearLevel,
        createdAt: new Date(),
      });

      showSuccess("Registration successful!");
      navigation.navigate("Login");
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

  const YearLevelPicker = () => {
    if (Platform.OS === "ios") {
      return (
        <>
          <TouchableOpacity
            style={[styles.inputWrapper, styles.yearLevelButton]}
            onPress={() => setShowPicker(true)}
          >
            <MaterialIcons name="school" size={20} color="#888" />
            <Text style={styles.yearLevelText}>
              {yearLevels.find((yl) => yl.value === yearLevel)?.label ||
                "Select Year Level"}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#888" />
          </TouchableOpacity>

          <Modal visible={showPicker} transparent={true} animationType="fade">
            <View style={styles.modalContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShowPicker(false)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={yearLevel}
                onValueChange={(itemValue) => {
                  setYearLevel(itemValue);
                }}
                style={styles.iosPicker}
              >
                {yearLevels.map((yl) => (
                  <Picker.Item
                    key={yl.value}
                    label={yl.label}
                    value={yl.value}
                    color="#000"
                  />
                ))}
              </Picker>
            </View>
          </Modal>
        </>
      );
    }

    return (
      <View style={[styles.inputWrapper, styles.pickerWrapper]}>
        <MaterialIcons name="school" size={20} color="#888" />
        <Picker
          selectedValue={yearLevel}
          onValueChange={(itemValue) => setYearLevel(itemValue)}
          style={styles.picker}
          dropdownIconColor="#888"
          dropdownStyle={{ maxHeight: 200 }} // Ensures proper dropdown height
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
    );
  };

  return (
    <BackgroundImage>
      <LinearGradient
        colors={["#ffffffaa", "#16325B77"]}
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
                <View style={styles.logoAndWelcome}>
                  <View style={styles.logoContainer}>
                    <Image
                      source={aito}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
                  {/* Title Section */}
                  <View style={styles.headerContainer}>
                    <Text style={styles.welcomeTitle}>Create Your Account</Text>
                    <Text style={styles.subtitle}>
                      Your Academic Journey Starts Here
                    </Text>
                  </View>
                </View>

                {/* Form Container */}
                <View style={styles.formContainer}>
                  {/* Username Input */}
                  <View style={styles.inputBulk}>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color="#16325B"
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

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                      <MaterialIcons
                        name="email"
                        size={20}
                        color="#16325B"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Your Academic Email"
                        placeholderTextColor="#a0a0a0"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    {/* Phone Input */}
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="phone-portrait-outline"
                        size={20}
                        color="#16325B"
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

                    {/* Year Level Picker */}
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="school-outline"
                        size={20}
                        color="#16325B"
                        style={styles.inputIcon}
                      />
                      <Picker
                        selectedValue={yearLevel}
                        style={styles.picker}
                        onValueChange={(itemValue) => setYearLevel(itemValue)}
                      >
                        <Picker.Item label="Select Academic Year" value="" />
                        <Picker.Item label="1st Year" value="1" />
                        <Picker.Item label="2nd Year" value="2" />
                        <Picker.Item label="3rd Year" value="3" />
                        <Picker.Item label="4th Year" value="4" />
                      </Picker>
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

                  {/* Register Button */}
                  <TouchableOpacity
                    style={[
                      styles.registerButton,
                      isSubmitting && styles.registerButtonDisabled,
                    ]}
                    onPress={handleRegister}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.registerButtonText}>
                      {isSubmitting ? "Registering..." : "Create Account"}
                    </Text>
                  </TouchableOpacity>

                  {/* Login Link */}
                  <View style={styles.loginContainer}>
                    <Text style={styles.loginText}>
                      Already have an account?{" "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Login")}
                    >
                      <Text style={styles.loginLink}>Login</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </SafeAreaView>
        <Toast />
      </LinearGradient>
    </BackgroundImage>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    position: "relative", // Parent needs to allow positioning
    paddingHorizontal: 20,
  },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardAvoidView: { flex: 1 },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  logoAndWelcome: {
    marginBottom: 450,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#17153B",
    textAlign: "center",
    marginBottom: 5,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#405D72",
    textAlign: "center",
    fontWeight: "300",
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 35, // Rounded top-left corner
    borderTopRightRadius: 35, // Rounded top-right corner
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 }, // Shadow appears above
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 15,
    position: "absolute", // Positioning the form
    bottom: -20, // Snap to the bottom of the screen
    left: 0,
    right: 0,
    height: 500, // Fixed height for the form container
  },

  inputBulk: {
    marginTop: 10,
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
  picker: { flex: 1, color: "#333" },
  registerButton: {
    backgroundColor: "#16325B",
    borderRadius: 15,
    height: 50,
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#16325B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  registerButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  registerButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
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
  logoContainer: {
    alignItems: "center",
    marginBottom: 5,
    marginTop: 20,
  },
  logo: {
    width: 100,
    height: 100,
  },
});

export default Register;
