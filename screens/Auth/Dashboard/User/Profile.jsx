import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  BackHandler,
} from "react-native";
import { auth, db, storage } from "../../../../config/firebaseconfig";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { dashboardServices } from "../../../../services/dashboardServices";
import userPresenceService from "../../../../services/UserPresenceService";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import Logout from "../../../../components/Logout";

const Profile = ({
  initialData,
  onAvatarUpdate,
  isDataPreloaded = false,
  showLogoutModal,
}) => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(initialData || null);
  const [loading, setLoading] = useState(!isDataPreloaded && !initialData);
  const [docId, setDocId] = useState(initialData?.id || null);
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || null);
  const [editingField, setEditingField] = useState(null);
  const [tempData, setTempData] = useState({
    username: initialData?.username || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [unsubscribeAvatar, setUnsubscribeAvatar] = useState(null);
  const [isConfirmingPassword, setIsConfirmingPassword] = useState(false);
  const [confirmPasswordTimeout, setConfirmPasswordTimeout] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    number: false,
    letter: false,
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const isLoggingOut = useRef(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(isDataPreloaded ? 1 : 0));
  const [slideAnim] = useState(new Animated.Value(isDataPreloaded ? 0 : 50));

  // Use refs to prevent unnecessary re-renders
  const userDataRef = useRef(initialData);
  const avatarUrlRef = useRef(initialData?.avatarUrl || null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle data updates when new initialData is passed
  useEffect(() => {
    if (
      initialData &&
      JSON.stringify(initialData) !== JSON.stringify(userData)
    ) {
      setUserData(initialData);
      userDataRef.current = initialData;
      setDocId(initialData.id);
      setTempData({
        username: initialData.username || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
      });
      setAvatarUrl(initialData.avatarUrl);
      avatarUrlRef.current = initialData.avatarUrl;

      // If data is preloaded, no need to show loading
      if (isDataPreloaded) {
        setLoading(false);
        // Start animations immediately for preloaded data
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [initialData, isDataPreloaded]);

  useEffect(() => {
    // Only fetch data if not preloaded and no initial data provided
    if (isDataPreloaded || initialData) {
      return;
    }

    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Query users collection with uid
        const usersQuery = query(
          collection(db, "users"),
          where("uid", "==", currentUser.uid)
        );

        const userSnapshot = await getDocs(usersQuery);

        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();

          if (!isMounted.current) return;

          // Set all user data
          setUserData(userData);
          userDataRef.current = userData;
          setDocId(userDoc.id);
          setTempData({
            username: userData.username || "",
            email: userData.email || "",
            phone: userData.phone || "",
          });
          setAvatarUrl(userData.avatarUrl);
          avatarUrlRef.current = userData.avatarUrl;

          // Set up real-time avatar subscription
          const unsubscribe = dashboardServices.subscribeToAvatarUpdates(
            currentUser,
            (newAvatarUrl) => {
              if (isMounted.current) {
                setAvatarUrl(newAvatarUrl);
                avatarUrlRef.current = newAvatarUrl;
                if (onAvatarUpdate) {
                  onAvatarUpdate(newAvatarUrl);
                }
              }
            }
          );
          setUnsubscribeAvatar(() => unsubscribe);
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "User data not found.",
          });
        }
      } catch (error) {
        console.error("[DEBUG] Error fetching user data:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to fetch data.",
        });
      } finally {
        if (isMounted.current) {
          setLoading(false);
          // Start animations when data is loaded
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
    };

    fetchUserData();

    // Cleanup subscription when component unmounts
    return () => {
      if (unsubscribeAvatar) {
        unsubscribeAvatar();
      }
    };
  }, [initialData, isDataPreloaded]);

  const handleSave = useCallback(
    async (field) => {
      try {
        if (!docId) {
          console.error("[DEBUG] No document ID found");
          return;
        }
        const userDocRef = doc(db, "users", docId);
        await updateDoc(userDocRef, { [field]: tempData[field] });

        if (isMounted.current) {
          setUserData((prevState) => {
            const newState = { ...prevState, [field]: tempData[field] };
            userDataRef.current = newState;
            return newState;
          });
          setEditingField(null);
          Toast.show({
            type: "success",
            text1: "Saved",
            text2: "Profile updated!",
          });
        }
      } catch (error) {
        console.error("[DEBUG] Error updating user profile:", error);
        Toast.show({ type: "error", text1: "Error", text2: "Update failed." });
      }
    },
    [docId, tempData]
  );

  const pickImage = useCallback(async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Toast.show({
          type: "error",
          text1: "Permission Denied",
          text2: "You need to grant permission to access your photos.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to pick image. Please try again.",
      });
    }
  }, []);

  const uploadImage = useCallback(
    async (uri) => {
      try {
        setLoading(true);
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = `avatars/${auth.currentUser.uid}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);

        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const userDocRef = doc(db, "users", docId);
        await updateDoc(userDocRef, { avatarUrl: downloadURL });

        if (isMounted.current) {
          setUserData((prevState) => {
            const newState = { ...prevState, avatarUrl: downloadURL };
            userDataRef.current = newState;
            return newState;
          });
          setAvatarUrl(downloadURL);
          avatarUrlRef.current = downloadURL;

          // Notify parent component of avatar update
          if (onAvatarUpdate) {
            onAvatarUpdate(downloadURL);
          }

          Toast.show({
            type: "success",
            text1: "Success",
            text2: "Avatar updated!",
          });
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Avatar update failed. Please try again.",
        });
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [docId, onAvatarUpdate]
  );

  const handleLogout = async () => {
    if (isLoggingOut.current) return;

    try {
      isLoggingOut.current = true;
      // First clean up presence service
      await userPresenceService.cleanup();

      // Then sign out from Firebase
      await auth.signOut();

      // Use navigation.reset instead of navigate to prevent double navigation
      navigation.reset({
        index: 0,
        routes: [{ name: "Index" }],
      });

      Toast.show({
        type: "success",
        text1: "Logged out",
        text2: "You have been logged out.",
      });
    } catch (error) {
      console.error("Error logging out:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to log out. Please try again.",
      });
    } finally {
      isLoggingOut.current = false;
    }
  };

  const validatePassword = useCallback((password) => {
    const errors = [];
    if (password.length < 6) {
      errors.push("Password must be at least 6 characters");
    }
    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[a-zA-Z]/.test(password)) {
      errors.push("Password must contain at least one letter");
    }
    return errors;
  }, []);

  const handlePasswordChange = async () => {
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordData;
      const errors = {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      };

      // Validate current password
      if (!currentPassword) {
        errors.currentPassword = "Current password is required";
      }

      // Validate new password
      const newPasswordErrors = validatePassword(newPassword);
      if (newPasswordErrors.length > 0) {
        errors.newPassword = newPasswordErrors[0];
      }

      // Validate confirm password
      if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your new password";
      } else if (confirmPassword !== newPassword) {
        errors.confirmPassword = "Passwords do not match";
      }

      // Check if there are any errors
      if (Object.values(errors).some((error) => error !== "")) {
        setPasswordErrors(errors);
        return;
      }

      setIsConfirmingPassword(true);
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      // Reauthenticate user
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setPasswordModalVisible(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Password updated successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      if (error.code === "auth/wrong-password") {
        setPasswordErrors((prev) => ({
          ...prev,
          currentPassword: "Current password is incorrect",
        }));
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message || "Failed to update password",
        });
      }
    } finally {
      setIsConfirmingPassword(false);
    }
  };

  const checkPasswordStrength = useCallback((password) => {
    setPasswordStrength({
      length: password.length >= 6,
      number: /\d/.test(password),
      letter: /[a-zA-Z]/.test(password),
    });
  }, []);

  const renderFieldEditModal = () => (
    <Modal
      transparent={true}
      visible={modalVisible}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ scale: fadeAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Edit{" "}
              {editingField &&
                editingField.charAt(0).toUpperCase() + editingField.slice(1)}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#f0f4ff",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Feather name="x" size={20} color="#203562" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalInputContainer}>
            <Feather
              name={
                editingField === "username"
                  ? "user"
                  : editingField === "email"
                  ? "mail"
                  : "phone"
              }
              size={20}
              color="#203562"
              style={styles.modalInputIcon}
            />
            <TextInput
              style={styles.modalInput}
              value={tempData[editingField] || ""}
              onChangeText={(text) =>
                setTempData((prev) => ({ ...prev, [editingField]: text }))
              }
              placeholder={`Enter your ${editingField}`}
              placeholderTextColor="#94A3B8"
              autoCapitalize={editingField === "email" ? "none" : "words"}
              keyboardType={
                editingField === "email"
                  ? "email-address"
                  : editingField === "phone"
                  ? "phone-pad"
                  : "default"
              }
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => {
                handleSave(editingField);
                setModalVisible(false);
              }}
            >
              <Text style={styles.modalSaveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderPasswordChangeModal = () => (
    <Modal
      transparent={true}
      visible={passwordModalVisible}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity
              onPress={() => {
                setPasswordModalVisible(false);
                setPasswordErrors({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              }}
            >
              <Feather name="x" size={24} color="#203562" />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.modalInputContainer,
              passwordErrors.currentPassword && styles.inputError,
            ]}
          >
            <Feather
              name="lock"
              size={20}
              color={passwordErrors.currentPassword ? "#EF4444" : "#203562"}
              style={styles.modalInputIcon}
            />
            <TextInput
              style={[
                styles.modalInput,
                passwordErrors.currentPassword && styles.inputErrorText,
              ]}
              value={passwordData.currentPassword}
              onChangeText={(text) => {
                setPasswordData((prev) => ({ ...prev, currentPassword: text }));
                setPasswordErrors((prev) => ({ ...prev, currentPassword: "" }));
              }}
              placeholder="Current Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
            />
          </View>
          {passwordErrors.currentPassword && (
            <Text style={styles.errorText}>
              {passwordErrors.currentPassword}
            </Text>
          )}

          <View
            style={[
              styles.modalInputContainer,
              passwordErrors.newPassword && styles.inputError,
            ]}
          >
            <Feather
              name="lock"
              size={20}
              color={passwordErrors.newPassword ? "#EF4444" : "#203562"}
              style={styles.modalInputIcon}
            />
            <TextInput
              style={[
                styles.modalInput,
                passwordErrors.newPassword && styles.inputErrorText,
              ]}
              value={passwordData.newPassword}
              onChangeText={(text) => {
                setPasswordData((prev) => ({ ...prev, newPassword: text }));
                checkPasswordStrength(text);
                setPasswordErrors((prev) => ({ ...prev, newPassword: "" }));
              }}
              placeholder="New Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
          {passwordErrors.newPassword && (
            <Text style={styles.errorText}>{passwordErrors.newPassword}</Text>
          )}

          <View
            style={[
              styles.modalInputContainer,
              passwordErrors.confirmPassword && styles.inputError,
            ]}
          >
            <Feather
              name="lock"
              size={20}
              color={passwordErrors.confirmPassword ? "#EF4444" : "#203562"}
              style={styles.modalInputIcon}
            />
            <TextInput
              style={[
                styles.modalInput,
                passwordErrors.confirmPassword && styles.inputErrorText,
              ]}
              value={passwordData.confirmPassword}
              onChangeText={(text) => {
                setPasswordData((prev) => ({ ...prev, confirmPassword: text }));
                setPasswordErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              placeholder="Confirm New Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
            />
          </View>
          {passwordErrors.confirmPassword && (
            <Text style={styles.errorText}>
              {passwordErrors.confirmPassword}
            </Text>
          )}

          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementItem}>
              <Feather
                name={passwordStrength.length ? "check-circle" : "circle"}
                size={16}
                color={passwordStrength.length ? "#16a34a" : "#64748B"}
              />
              <Text
                style={[
                  styles.requirementText,
                  passwordStrength.length && styles.requirementMet,
                ]}
              >
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Feather
                name={passwordStrength.number ? "check-circle" : "circle"}
                size={16}
                color={passwordStrength.number ? "#16a34a" : "#64748B"}
              />
              <Text
                style={[
                  styles.requirementText,
                  passwordStrength.number && styles.requirementMet,
                ]}
              >
                At least one number
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Feather
                name={passwordStrength.letter ? "check-circle" : "circle"}
                size={16}
                color={passwordStrength.letter ? "#16a34a" : "#64748B"}
              />
              <Text
                style={[
                  styles.requirementText,
                  passwordStrength.letter && styles.requirementMet,
                ]}
              >
                At least one letter
              </Text>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setPasswordModalVisible(false);
                setPasswordErrors({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              }}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                isConfirmingPassword && styles.modalSaveButtonDisabled,
              ]}
              onPress={handlePasswordChange}
              disabled={isConfirmingPassword}
            >
              {isConfirmingPassword ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSaveButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Remove local logoutModalVisible and use showLogoutModal for back button
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onBackPress = () => {
      if (!isLoggingOut.current) {
        showLogoutModal();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => {
      subscription.remove();
      isLoggingOut.current = false;
    };
  }, [showLogoutModal]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#f8f9fa"
          translucent={true}
        />
        <ActivityIndicator size="large" color="#203562" />
        <Text style={styles.loadingTextNeutral}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={showLogoutModal ? "dark-content" : "light-content"}
        backgroundColor={showLogoutModal ? "transparent" : "#ffffff"}
        translucent={!!showLogoutModal}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <LinearGradient
          colors={["#203562", "#16325B"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                onPress={pickImage}
                style={styles.avatarWrapper}
              >
                <Image
                  source={
                    avatarUrl
                      ? { uri: avatarUrl }
                      : require("../../../../assets/aito.png")
                  }
                  style={styles.avatar}
                />
                <View style={styles.editIconContainer}>
                  <Feather name="camera" size={18} color="white" />
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.username}>{userData?.username || "User"}</Text>
            <Text style={styles.userRole}>
              {userData?.yearLevel
                ? `Year ${userData.yearLevel}`
                : "Year Level Not Set"}
            </Text>
          </View>
        </LinearGradient>

        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Personal Information</Text>

          {[
            {
              field: "username",
              icon: "user",
              placeholder: "Add username",
            },
            { field: "email", icon: "mail", placeholder: "Add email" },
            {
              field: "phone",
              icon: "phone",
              placeholder: "Add phone number",
            },
          ].map(({ field, icon, placeholder }) => (
            <TouchableOpacity
              key={field}
              onPress={() => {
                setEditingField(field);
                setModalVisible(true);
              }}
              style={styles.fieldContainer}
            >
              <View style={styles.fieldIconContainer}>
                <Feather name={icon} size={20} color="#203562" />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.label}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Text>
                <Text
                  style={[
                    styles.value,
                    !userData?.[field] && styles.placeholderText,
                  ]}
                >
                  {userData?.[field] || placeholder}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setEditingField(field);
                  setModalVisible(true);
                }}
              >
                <Feather name="edit-2" size={16} color="#203562" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.logoutButton, { marginBottom: 10 }]}
            onPress={() => setPasswordModalVisible(true)}
          >
            <Feather
              name="lock"
              size={18}
              color="white"
              style={styles.logoutIcon}
            />
            <Text style={styles.logoutButtonText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={showLogoutModal}
            activeOpacity={0.7}
          >
            <Feather
              name="log-out"
              size={18}
              color="white"
              style={styles.logoutIcon}
            />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {renderFieldEditModal()}
      {renderPasswordChangeModal()}
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  // Main container styles
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingTop: Platform.OS === "ios" ? 20 : StatusBar.currentHeight,
  },
  loadingTextNeutral: {
    marginTop: 15,
    fontSize: 16,
    color: "#203562",
    fontWeight: "500",
    letterSpacing: 0.5,
  },

  // Header styles
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 60 : StatusBar.currentHeight + 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 16,
    marginHorizontal: 12,
  },
  headerContent: {
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  avatarWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  editIconContainer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#203562",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  username: {
    fontSize: 22,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 8,
    letterSpacing: 0.3,
  },
  userRole: {
    fontSize: 14,
    color: "#e0e0e0",
    marginTop: 4,
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  // Content styles
  scrollContainer: {
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#203562",
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  fieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  fieldIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  fieldContent: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1E293B",
    letterSpacing: 0.2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 20,
  },

  // Button styles
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#203562",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#203562",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 15,
    letterSpacing: 0.2,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  modalContent: {
    width: "88%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#203562",
    letterSpacing: 0.2,
  },
  modalText: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 12,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
    letterSpacing: 0.2,
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
    height: 44,
  },
  modalInputIcon: {
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    letterSpacing: 0.2,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  modalCancelButtonText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  modalSaveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#203562",
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
    shadowColor: "#203562",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalSaveButtonText: {
    fontSize: 15,
    color: "white",
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  placeholderText: {
    color: "#94A3B8",
    fontWeight: "400",
  },
  modalSaveButtonDisabled: {
    opacity: 0.7,
  },
  passwordRequirements: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  requirementsTitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
    fontWeight: "600",
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 8,
  },
  requirementMet: {
    color: "#16a34a",
  },
  passwordToggle: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 1,
  },
  inputErrorText: {
    color: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    marginBottom: 8,
  },
});

export default React.memo(Profile);
