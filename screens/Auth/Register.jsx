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

  const validateStudentId = async (studentId) => {
    const studentIdRegex = /^\d{4}-\d{4}-[A-Z]{2}$/;
    if (!studentIdRegex.test(studentId)) {
      showWarning(
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
      return !querySnapshot.empty; // Return true if studentId exists
    } catch (error) {
      console.error("Error validating student ID:", error);
      showWarning("Error checking Student ID. Please try again.");
      return false;
    }
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

    // Validate student ID against ICT student list
    const isValidStudentId = await validateStudentId(studentId);
    if (!isValidStudentId) {
      showWarning("This Student ID is not recognized as an ICT student.");
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

      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        username,
        studentId,
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
          dropdownStyle={{ maxHeight: 200 }}
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
                  <View style={styles.headerContainer}>
                    <Text style={styles.welcomeTitle}>Create Your Account</Text>
                  </View>
                </View>

                <View style={styles.formContainer}>
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

                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="id-card-outline"
                        size={20}
                        color="#16325B"
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
                        color="#16325B"
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

                    <YearLevelPicker />

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
    position: "relative",
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
    fontWeight: "600",
    color: "#17153B",
    textAlign: "center",
    marginBottom: 5,
    letterSpacing: -0.5,
    fontFamily: "Lato-Regular",
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
    height: 550, // Increased to accommodate new studentId input
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
  // Additional styles for YearLevelPicker
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  pickerHeader: {
    backgroundColor: "#fff",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    alignItems: "flex-end",
  },
  doneButton: {
    padding: 5,
  },
  doneButtonText: {
    fontSize: 16,
    color: "#16325B",
  },
  iosPicker: {
    height: 200,
    backgroundColor: "#fff",
  },
  pickerWrapper: {
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
  yearLevelButton: {
    justifyContent: "space-between",
  },
  yearLevelText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
});

export default Register;
