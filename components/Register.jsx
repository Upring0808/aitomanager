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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import aito from "../assets/aito.png";
import BackgroundImage from "../components/ImageBackground";
import Toast from "react-native-toast-message";
import { auth, db } from "../config/firebaseconfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation();

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
    if (!username || !email || !phone || !password) {
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

  return (
    <BackgroundImage>
      <LinearGradient
        colors={["#ffffffaa", "#f0f0f0dd"]}
        style={styles.gradient}
      >
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
            <Text style={styles.header}>REGISTER</Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#888" />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#a0a0a0"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={styles.inputWrapper}>
                <MaterialIcons name="email" size={20} color="#888" />
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
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color="#888"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="#a0a0a0"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
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
                    name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? "Registering..." : "Register"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? Login here
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
      <Toast />
    </BackgroundImage>
  );
};

const styles = StyleSheet.create({
  loginLink: {
    marginTop: 15,
    alignItems: "center",
  },
  loginLinkText: {
    color: "#16325B",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  gradient: {
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
});

export default Register;
