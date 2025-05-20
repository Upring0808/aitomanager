import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  SafeAreaView,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { User, Mail, ChevronRight, CheckCircle, X } from "lucide-react-native";
import aito from "../assets/aito.png";
import BackgroundImage from "./ImageBackground";
import { textStyles } from "../fallbackStyles";
import * as SplashScreen from "expo-splash-screen";

const { width, height } = Dimensions.get("window");

const Index = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Hide splash first, then start fade-in
    SplashScreen.hideAsync().finally(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const handleContactAdmin = () => {
    setModalVisible(true);
  };

  const handleSendMessage = () => {
    setSending(true);
    // Simulate sending the message
    setTimeout(() => {
      setSending(false);
      setSuccess(true);
      setTimeout(() => {
        setModalVisible(false);
        setSuccess(false);
        setMessage("");
      }, 2000);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackgroundImage>
        <LinearGradient
          colors={["#ffffffaa", "#16325Bff"]}
          style={styles.gradient}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
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
                  onPress={handleContactAdmin}
                  activeOpacity={0.7}
                >
                  <View style={styles.buttonContent}>
                    <Mail color="#16325B" size={24} style={styles.buttonIcon} />
                    <Text style={styles.buttonOutlineText}>Contact Admin</Text>
                    <ChevronRight color="#16325B" size={24} />
                  </View>
                </TouchableOpacity>

                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>No Account? </Text>
                  <TouchableOpacity onPress={handleContactAdmin}>
                    <Text style={styles.loginLink}>Contact Admin</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>
      </BackgroundImage>

      {/* Custom full-screen modal implementation */}
      {modalVisible && (
        <View style={styles.fullScreenModalContainer}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.fullScreenModalOverlay}>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <X color="#16325B" size={24} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Contact Admin</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your message..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendMessage}
                  disabled={sending || success}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" />
                  ) : success ? (
                    <CheckCircle color="#fff" size={24} />
                  ) : (
                    <Text style={styles.sendButtonText}>Send</Text>
                  )}
                </TouchableOpacity>
                {success && (
                  <Text style={styles.successMessage}>
                    Thank you for contacting us!
                  </Text>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}
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
  // Full-screen modal styles - updated to ensure it covers everything
  fullScreenModalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height + 80, // Add extra height to ensure it covers the bottom
    zIndex: 9999,
  },
  fullScreenModalOverlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: "#16325B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  successMessage: {
    marginTop: 10,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
});

export default Index;
