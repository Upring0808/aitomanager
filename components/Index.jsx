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
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  useNavigation,
  useNavigationState,
  CommonActions,
  useFocusEffect,
} from "@react-navigation/native";
import {
  User,
  Mail,
  ChevronRight,
  CheckCircle,
  X,
  Phone,
  Building,
  MessageSquare,
  Send,
  AlertCircle,
} from "lucide-react-native";
import aito from "../assets/aito.png";
import BackgroundImage from "./ImageBackground";
import { textStyles } from "../fallbackStyles";
import * as SplashScreen from "expo-splash-screen";

const { width, height } = Dimensions.get("window");

const Index = () => {
  const navigation = useNavigation();
  const navigationState = useNavigationState((state) => state);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    yearLevel: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const navigationTimeoutRef = useRef(null);

  // Better navigation readiness check using useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      // This ensures the navigation is ready when the screen is focused
      setNavigationReady(true);
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Enhanced navigation readiness check
  useEffect(() => {
    const checkNavigation = () => {
      try {
        // Check if navigation object exists and has the required methods
        if (
          navigation &&
          navigation.dispatch &&
          navigationState &&
          navigationState.routes &&
          navigationState.routes.length > 0
        ) {
          setNavigationReady(true);
          console.log("[Index] Navigation is ready");
          if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
            navigationTimeoutRef.current = null;
          }
        } else {
          // If navigation is not ready, try again after a short delay
          if (!navigationTimeoutRef.current) {
            navigationTimeoutRef.current = setTimeout(checkNavigation, 200);
          }
        }
      } catch (error) {
        console.warn("[Index] Navigation check error:", error);
        // Retry after a longer delay if there's an error
        if (!navigationTimeoutRef.current) {
          navigationTimeoutRef.current = setTimeout(checkNavigation, 500);
        }
      }
    };

    checkNavigation();

    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, [navigation, navigationState]);

  // Handle splash screen and fade-in animation
  useEffect(() => {
    const initializeScreen = async () => {
      try {
        await SplashScreen.hideAsync();
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error("[Index] Error initializing screen:", error);
      }
    };

    initializeScreen();
  }, [fadeAnim]);

  const handleLoginPress = () => {
    if (!navigationReady || !navigation) {
      console.warn("[Index] Navigation not ready yet");
      return;
    }

    try {
      // Additional safety check before navigation
      if (navigation.dispatch && typeof navigation.dispatch === "function") {
        navigation.dispatch(
          CommonActions.navigate({
            name: "Login",
          })
        );
        console.log("[Index] Navigation dispatched successfully");
      } else {
        throw new Error("Navigation dispatch method not available");
      }
    } catch (error) {
      console.error("[Index] Navigation error:", error);

      // Alternative navigation method as fallback
      try {
        if (navigation.navigate && typeof navigation.navigate === "function") {
          navigation.navigate("Login");
          console.log("[Index] Fallback navigation successful");
        } else {
          console.error("[Index] No navigation methods available");
        }
      } catch (fallbackError) {
        console.error(
          "[Index] Fallback navigation also failed:",
          fallbackError
        );

        // Final retry with delay
        setTimeout(() => {
          try {
            if (navigation && navigation.dispatch) {
              navigation.dispatch(
                CommonActions.navigate({
                  name: "Login",
                })
              );
            }
          } catch (retryError) {
            console.error("[Index] Final retry failed:", retryError);
          }
        }, 1000);
      }
    }
  };

  const handleContactAdmin = () => {
    setModalVisible(true);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email format";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.yearLevel.trim())
      newErrors.yearLevel = "Year level is required";
    if (!formData.message.trim()) newErrors.message = "Message is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendMessage = () => {
    if (!validateForm()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSuccess(true);
      setTimeout(() => {
        setModalVisible(false);
        setSuccess(false);
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          yearLevel: "",
          message: "",
        });
        setErrors({});
      }, 2000);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
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
                  style={[
                    styles.button,
                    styles.elevatedShadow,
                    !navigationReady && styles.buttonDisabled,
                  ]}
                  onPress={handleLoginPress}
                  activeOpacity={0.7}
                  disabled={!navigationReady}
                >
                  <View style={styles.buttonContent}>
                    <User color="#fff" size={24} style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>
                      {navigationReady ? "Login" : "Loading..."}
                    </Text>
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
              </View>
            </View>
          </Animated.View>
        </LinearGradient>
      </BackgroundImage>

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

                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalHeader}>
                    <MessageSquare color="#16325B" size={28} />
                    <Text style={styles.modalTitle}>Contact Admin</Text>
                    <Text style={styles.modalSubtitle}>
                      Fill in your details to request access
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                      <User
                        color="#16325B"
                        size={20}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChangeText={(text) =>
                          setFormData({ ...formData, fullName: text })
                        }
                      />
                    </View>
                    {errors.fullName && (
                      <Text style={styles.errorText}>{errors.fullName}</Text>
                    )}

                    <View style={styles.inputWrapper}>
                      <Mail
                        color="#16325B"
                        size={20}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        value={formData.email}
                        onChangeText={(text) =>
                          setFormData({ ...formData, email: text })
                        }
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    {errors.email && (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    )}

                    <View style={styles.inputWrapper}>
                      <Phone
                        color="#16325B"
                        size={20}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChangeText={(text) =>
                          setFormData({ ...formData, phone: text })
                        }
                        keyboardType="phone-pad"
                      />
                    </View>
                    {errors.phone && (
                      <Text style={styles.errorText}>{errors.phone}</Text>
                    )}

                    <View style={styles.inputWrapper}>
                      <Building
                        color="#16325B"
                        size={20}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Year Level (e.g., 1st Year, 2nd Year)"
                        value={formData.yearLevel}
                        onChangeText={(text) =>
                          setFormData({ ...formData, yearLevel: text })
                        }
                      />
                    </View>
                    {errors.yearLevel && (
                      <Text style={styles.errorText}>{errors.yearLevel}</Text>
                    )}

                    <View style={styles.inputWrapper}>
                      <MessageSquare
                        color="#16325B"
                        size={20}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, styles.messageInput]}
                        placeholder="Your Message"
                        value={formData.message}
                        onChangeText={(text) =>
                          setFormData({ ...formData, message: text })
                        }
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>
                    {errors.message && (
                      <Text style={styles.errorText}>{errors.message}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (sending || success) && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendMessage}
                    disabled={sending || success}
                  >
                    {sending ? (
                      <ActivityIndicator color="#fff" />
                    ) : success ? (
                      <View style={styles.successContainer}>
                        <CheckCircle color="#fff" size={20} />
                        <Text style={styles.successText}>Request Sent!</Text>
                      </View>
                    ) : (
                      <View style={styles.sendButtonContent}>
                        <Send color="#fff" size={18} />
                        <Text style={styles.sendButtonText}>Send Request</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {success && (
                    <View style={styles.successMessageContainer}>
                      <AlertCircle color="#4CAF50" size={16} />
                      <Text style={styles.successMessage}>
                        Thank you for contacting us! We'll review your request
                        shortly.
                      </Text>
                    </View>
                  )}
                </ScrollView>
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
  buttonDisabled: {
    opacity: 0.6,
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
  elevatedShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fullScreenModalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: 9999,
  },
  fullScreenModalOverlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
  },
  modalContent: {
    width: "100%",
    maxWidth: width > 600 ? 500 : "95%",
    backgroundColor: "white",
    borderRadius: 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: "relative",
  },
  modalScrollView: {
    width: "100%",
    maxHeight: "100%",
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    paddingTop: 30,
    paddingBottom: 30,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#16325B",
    marginTop: 10,
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 5,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 15,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 10,
    height: 55,
  },
  inputIcon: {
    marginRight: 5,
    marginLeft: 5,
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    paddingLeft: 5,
  },
  messageInput: {
    minHeight: 50,
    paddingTop: 15,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 5,
  },
  sendButton: {
    backgroundColor: "#16325B",
    paddingVertical: 15,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  successText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  successMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  successMessage: {
    color: "#4CAF50",
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Index;
