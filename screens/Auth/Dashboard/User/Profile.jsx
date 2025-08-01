import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  ToastAndroid,
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
import { Feather, MaterialIcons, Ionicons, Entypo } from "@expo/vector-icons";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useOfficer } from "../../../../context/OfficerContext";

const Profile = React.memo(({
  initialData,
  onAvatarUpdate,
  isDataPreloaded = false,
  showLogoutModal,
  isActive = true,
}) => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(initialData || null);
  const [loading, setLoading] = useState(!isDataPreloaded && !initialData && !userData);
  const [docId, setDocId] = useState(initialData?.id || null);
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || null);
  const [editingField, setEditingField] = useState(null);
  const [tempData, setTempData] = useState({
    username: initialData?.username || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    yearLevel: initialData?.yearLevel || "",
    studentId: initialData?.studentId || "",
    address: initialData?.address || "",
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
  const [hasLoaded, setHasLoaded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const {
    activeOfficerRole,
    officerLoading,
    signInAsOfficer,
    setupOfficerCredential,
    isOfficerCredentialSet,
    signOutOfficer,
  } = useOfficer();
  const [officerModal, setOfficerModal] = useState({ visible: false, role: null, mode: null }); // mode: 'setup' or 'signin'
  const [officerCredential, setOfficerCredential] = useState("");
  const [officerError, setOfficerError] = useState("");
  const [officerChecking, setOfficerChecking] = useState(false);

  // Use refs to prevent unnecessary re-renders
  const userDataRef = useRef(initialData);
  const avatarUrlRef = useRef(initialData?.avatarUrl || null);
  const isMounted = useRef(true);

  const insets = useSafeAreaInsets();
  const headerColor = "#203562";
  const windowHeight = Dimensions.get("window").height;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 1. Set initial data immediately to prevent jittering
  useEffect(() => {
    if (initialData && !userData) {
      // Set all data at once to prevent multiple re-renders
      const data = {
        ...initialData,
        username: initialData.username || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
      };
      
      setUserData(data);
      userDataRef.current = data;
      setDocId(initialData.id);
      setTempData({
        username: data.username,
        email: data.email,
        phone: data.phone,
        yearLevel: data.yearLevel,
        studentId: data.studentId,
        address: data.address,
      });
      setAvatarUrl(initialData.avatarUrl);
      avatarUrlRef.current = initialData.avatarUrl;
      setLoading(false); // Immediately stop loading when we have initial data
    }
  }, [initialData, userData]);

  // 2. Fix the fetch effect dependencies - prevent unnecessary re-fetching
  useEffect(() => {
    if (isDataPreloaded || initialData || userData) return;
    
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) return;
        
        const usersQuery = query(
          collection(db, "organizations", orgId, "users"),
          where("uid", "==", currentUser.uid)
        );
        
        const userSnapshot = await getDocs(usersQuery);
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          
          // Ensure data types are correct
          userData.username = typeof userData.username === "string" ? userData.username : "";
          userData.email = typeof userData.email === "string" ? userData.email : "";
          userData.phone = typeof userData.phone === "string" ? userData.phone : "";
          
          if (!isMounted.current) return;
          
          // Set all user data at once to prevent multiple re-renders
          setUserData(userData);
          userDataRef.current = userData;
          setDocId(userDoc.id);
          setTempData({
            username: userData.username,
            email: userData.email,
            phone: userData.phone,
            yearLevel: userData.yearLevel,
            studentId: userData.studentId,
            address: userData.address,
          });
          setAvatarUrl(userData.avatarUrl);
          avatarUrlRef.current = userData.avatarUrl;
          
          // Set up real-time avatar subscription
          try {
            const unsubscribe = dashboardServices.subscribeToAvatarUpdates(
              currentUser,
              orgId,
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
          } catch (subError) {
            console.error("[DEBUG] Error in subscribeToAvatarUpdates:", subError);
          }
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "User data not found.",
          });
        }
      } catch (error) {
        console.error("[DEBUG] Error fetching user data:", error);
        if (!userDataRef.current) {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Failed to fetch data.",
          });
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
      setHasLoaded(true);
    };
    
    fetchUserData();
    
    return () => {
      if (unsubscribeAvatar) {
        unsubscribeAvatar();
      }
    };
  }, [isDataPreloaded, initialData, userData]);

  // Add a global error boundary for debugging
  useEffect(() => {
    const errorHandler = (error, isFatal) => {
      console.log("[GLOBAL ERROR]", error, isFatal);
    };
    if (typeof ErrorUtils !== "undefined") {
      ErrorUtils.setGlobalHandler(errorHandler);
    }
    return () => {
      if (typeof ErrorUtils !== "undefined") {
        ErrorUtils.setGlobalHandler(() => {});
      }
    };
  }, []);

  // 3. Optimize the handleSave function
  const handleSave = useCallback(
    async (field) => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) return;
        const userDocRef = doc(db, "organizations", orgId, "users", currentUser.uid);
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
        console.error("Error updating user profile:", error);
        Toast.show({ type: "error", text1: "Error", text2: "Update failed." });
      }
    },
    [tempData]
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
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        console.log("Selected asset:", selectedAsset);
        if (selectedAsset && selectedAsset.uri) {
          console.log("Uploading image with URI:", selectedAsset.uri);
          await uploadImage(selectedAsset.uri);
        } else {
          console.error("Invalid asset selected:", selectedAsset);
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Invalid image selected. Please try again.",
          });
        }
      } else {
        console.log("Image picker result:", result);
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
      // Validate URI first before setting loading state
      if (!uri || typeof uri !== "string") {
        console.error("Invalid URI provided:", uri);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Invalid image selected. Please try again.",
        });
        return;
      }

      // Set loading state
      setLoading(true);

      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "User not authenticated. Please log in again.",
          });
          return;
        }

        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Organization not found. Please try again.",
          });
          return;
        }

        // Use currentUser.uid as the document ID since that's how user documents are structured
        const userDocumentId = currentUser.uid;
        console.log("[DEBUG] Using user UID as document ID:", userDocumentId);

        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const blob = await response.blob();
        if (!blob || blob.size === 0) {
          throw new Error("Invalid image blob received");
        }
        const filename = `org_logos/${orgId}/students/${
          currentUser.uid
        }/${Date.now()}.jpg`;
        console.log("Uploading to filename:", filename);

        if (!storage) {
          throw new Error("Firebase Storage is not initialized");
        }

        const storageRef = ref(storage, filename);
        console.log("Storage reference created");
        await uploadBytes(storageRef, blob);
        console.log("Upload completed, getting download URL");
        const downloadURL = await getDownloadURL(storageRef);
        console.log("Download URL obtained:", downloadURL);

        console.log(
          "[DEBUG] Updating document with orgId:",
          orgId,
          "userDocumentId:",
          userDocumentId
        );
        const userDocRef = doc(
          db,
          "organizations",
          orgId,
          "users",
          userDocumentId
        );
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
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Avatar update failed. Please try again.",
        });
      } finally {
        // Always reset loading state
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [onAvatarUpdate]
  );

  const handleLogout = async () => {
    // Logout is now handled by Dashboard through showLogoutModal
    // This function is kept for compatibility but should not be used
    console.log("[Profile] Logout should be handled by Dashboard");
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
      <View style={[styles.modalContainer, { 
        paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
        backgroundColor: "rgba(0,0,0,0.4)",
      }]}>
        <View
          style={[
            styles.modalContent,
            // {
            //   transform: [{ scale: fadeAnim }],
            //   opacity: fadeAnim,
            // },
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
                  : editingField === "phone"
                  ? "phone"
                  : editingField === "yearLevel"
                  ? "book"
                  : editingField === "studentId"
                  ? "hash"
                  : "map-pin"
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
              placeholder={`Enter your ${editingField === "yearLevel" ? "year level" : 
                          editingField === "studentId" ? "student ID" : editingField}`}
              placeholderTextColor="#94A3B8"
              autoCapitalize={editingField === "email" ? "none" : "words"}
              keyboardType={
                editingField === "email"
                  ? "email-address"
                  : editingField === "phone"
                  ? "phone-pad"
                  : editingField === "yearLevel" || editingField === "studentId"
                  ? "numeric"
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
        </View>
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
      <View style={[styles.modalContainer, { 
        paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
        backgroundColor: "rgba(0,0,0,0.4)",
      }]}>
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

  // Remove StatusBar configuration from Profile component - let Dashboard handle it

  // 4. Memoize the profile fields
  const renderProfileFields = useMemo(() => {
    const fields = [
      { field: "username", icon: "user", placeholder: "Add username" },
      { field: "email", icon: "mail", placeholder: "Add email" },
      { field: "phone", icon: "phone", placeholder: "Add phone number" },
      { field: "yearLevel", icon: "book", placeholder: "Add year level" },
      { field: "studentId", icon: "hash", placeholder: "Add student ID" },
      { field: "address", icon: "map-pin", placeholder: "Add address" },
    ];
    return fields.map(({ field, icon, placeholder }) => (
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
            {field === "yearLevel" ? "Year Level" : 
             field === "studentId" ? "Student ID" :
             field.charAt(0).toUpperCase() + field.slice(1)}
          </Text>
          <Text
            style={[
              styles.value,
              !userData?.[field] && styles.placeholderText,
            ]}
          >
            {typeof userData?.[field] === "string" ? userData[field] : ""}
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
    ));
  }, [userData]);

  // 5. Memoize the avatar rendering
  const renderAvatar = useMemo(() => (
    <View style={styles.avatarContainer}>
      <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
        <Image
          source={
            avatarUrl
              ? { uri: avatarUrl }
              : require("../../../../assets/aito.png")
          }
          style={styles.avatar}
        />
        <View style={styles.editIconContainer}>
          <Feather name="camera" size={16} color="white" />
        </View>
      </TouchableOpacity>
    </View>
  ), [avatarUrl, pickImage]);

  // Helper: get officer roles from userData
  const officerRole = useMemo(() => {
    if (!userData || !userData.role) return null;
    return ["treasurer", "secretary", "governor", "vice_governor"].includes(userData.role) ? userData.role : null;
  }, [userData]);

  // Handler: open officer modal
  const handleOfficerButton = async (role) => {
    console.log('[DEBUG] handleOfficerButton called with role:', role);
    setOfficerChecking(true);
    const isSet = await isOfficerCredentialSet(role);
    setOfficerChecking(false);
    setOfficerModal({ visible: true, role, mode: isSet ? "signin" : "setup" });
    setOfficerCredential("");
    setOfficerError("");
  };

  // Handler: submit officer credential (setup or signin)
  const handleOfficerSubmit = async () => {
    setOfficerError("");
    if (!officerCredential || officerCredential.length < 4) {
      setOfficerError("Credential must be at least 4 characters.");
      return;
    }
    let result;
    if (officerModal.mode === "setup") {
      result = await setupOfficerCredential(officerModal.role, officerCredential);
    } else {
      result = await signInAsOfficer(officerModal.role, officerCredential);
    }
    if (result.success) {
      setOfficerModal({ visible: false, role: null, mode: null });
      setOfficerCredential("");
      setOfficerError("");
      // Navigate to correct officer dashboard
      if (["governor", "vice_governor"].includes(officerModal.role)) {
        navigation.navigate("GovernorDashboard", { userData });
      } else if (officerModal.role === "treasurer") {
        navigation.navigate("AdminDashboard", { screen: "AdminFines" });
      } else if (officerModal.role === "secretary") {
        navigation.navigate("AdminDashboard", { screen: "AdminEvents" });
      }
    } else {
      setOfficerError(result.error || "Failed. Try again.");
    }
  };

  // Handler: close modal
  const handleOfficerModalClose = () => {
    setOfficerModal({ visible: false, role: null, mode: null });
    setOfficerCredential("");
    setOfficerError("");
  };

  // 6. Main render
  if (loading || !userData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: "#f8fafc" }]}>
        <ActivityIndicator size="large" color="#203562" />
        <Text style={[styles.loadingTextNeutral, { color: "#64748b" }]}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc", minHeight: "100%" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 43 + (insets.bottom || 24), alignItems: "center" }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        bounces={false}
      >
        {/* Navy header as part of scrollable content */}
        <LinearGradient
          colors={["#203562", "#254080", "#3E92CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
            paddingTop: Platform.OS === "ios" ? insets.top + 24 : (StatusBar.currentHeight || 0) + 24,
            paddingBottom: 64,
            alignItems: "center",
            position: "relative",
            width: "100%",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          }}
        >
          {/* Three-dots menu button */}
          <View style={{ position: "absolute", top: Platform.OS === "ios" ? insets.top + 8 : (StatusBar.currentHeight || 0) + 8, right: 24, zIndex: 10 }}>
            <TouchableOpacity 
              onPress={() => setMenuVisible(true)} 
              style={{ padding: 10, borderRadius: 20 }}
            >
              <Entypo name="dots-three-vertical" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        {/* Avatar, Name, Year Level block - floating at transition */}
        <View style={{
          alignItems: "center",
          marginTop: -70,
          marginBottom: 12,
          zIndex: 11,
        }}>
          <View style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            borderRadius: 60,
            backgroundColor: "#fff",
            padding: 6,
            elevation: 8,
          }}>
            <Image
              source={avatarUrl ? { uri: avatarUrl } : require("../../../../assets/aito.png")}
              style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: "#fff" }}
            />
            <TouchableOpacity
              onPress={pickImage}
              style={{
                position: "absolute",
                right: 8,
                bottom: 8,
                backgroundColor: "#3E92CC",
                borderRadius: 16,
                width: 34,
                height: 34,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: "#fff",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
              }}
            >
              <Feather name="camera" size={17} color="#fff" />
            </TouchableOpacity>
          </View>
          {/* Name and year level below avatar */}
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#203562", letterSpacing: 0.2, marginTop: 18, marginBottom: 2 }}>{userData?.username || "User"}</Text>
          <Text style={{ fontSize: 16, color: "#64748b", fontWeight: "600", letterSpacing: 0.2, marginBottom: 4 }}>{userData?.yearLevel ? `Year ${userData.yearLevel}` : "Year Level Not Set"}</Text>
          {/* Officer Role Display */}
          {userData?.role && userData.role !== "student" && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="shield-checkmark" size={18} color="#203562" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 15, color: '#203562', fontWeight: '600' }}>
                {userData.role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </View>
          )}
        </View>
        {/* White card for fields */}
        <View style={{
          backgroundColor: "#fff",
          borderTopLeftRadius: 36,
          borderTopRightRadius: 36,
          padding: 28,
          width: "92%",
          minHeight: windowHeight * 0.65,
          marginTop: 0,
          marginBottom: 24,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          paddingBottom: 40,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.10,
          shadowRadius: 8,
          elevation: 3,
          alignItems: "center",
        }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#203562", marginBottom: 20, letterSpacing: 0.2, alignSelf: "flex-start" }}>Personal Information</Text>
          {/* Profile fields with icons and dividers */}
          {renderProfileFields}
        </View>
        {/* Gentle fade at the bottom for pro touch */}
        <LinearGradient
          colors={["rgba(248,250,252,0)", "#f8fafc"]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 48, width: "100%" }}
          pointerEvents="none"
        />
      </ScrollView>
      {/* Officer Access FAB removed */}
      {/* Dropdown menu modal for Reset Password, Logout, and Officer Access */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={{ 
            flex: 1, 
            backgroundColor: "rgba(0,0,0,0.1)",
            paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
          }}
          activeOpacity={1}
          onPressOut={() => setMenuVisible(false)}
        >
          <View style={{ 
            position: "absolute", 
            top: Platform.OS === 'ios' ? insets.top + 60 : (StatusBar.currentHeight || 0) + 60, 
            right: 28, 
            backgroundColor: "#fff", 
            borderRadius: 12, 
            shadowColor: "#000", 
            shadowOpacity: 0.15, 
            shadowRadius: 16, 
            elevation: 8, 
            minWidth: 180,
            zIndex: 1000,
          }}>
            {/* Officer Access Option */}
            {userData && officerRole && (
              <TouchableOpacity
                style={{ padding: 18, flexDirection: "row", alignItems: "center" }}
                onPress={() => {
                  setMenuVisible(false);
                  handleOfficerButton(officerRole);
                }}
              >
                <Ionicons name="shield-checkmark" size={20} color="#203562" style={{ marginRight: 12 }} />
                <Text style={{ color: "#203562", fontWeight: "500", fontSize: 16 }}>
                  Sign in as {officerRole.charAt(0).toUpperCase() + officerRole.slice(1).replace("_", " ")}
                </Text>
              </TouchableOpacity>
            )}
            {/* Reset Password Option */}
            <TouchableOpacity
              style={{ padding: 18, flexDirection: "row", alignItems: "center" }}
              onPress={() => {
                setMenuVisible(false);
                setPasswordModalVisible(true);
              }}
            >
              <Feather name="lock" size={20} color="#203562" style={{ marginRight: 12 }} />
              <Text style={{ color: "#203562", fontWeight: "500", fontSize: 16 }}>Reset Password</Text>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
            {/* Logout Option */}
            <TouchableOpacity
              style={{ padding: 18, flexDirection: "row", alignItems: "center" }}
              onPress={() => {
                setMenuVisible(false);
                showLogoutModal();
              }}
            >
              <Feather name="log-out" size={20} color="#EF4444" style={{ marginRight: 12 }} />
              <Text style={{ color: "#EF4444", fontWeight: "500", fontSize: 16 }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {renderFieldEditModal()}
      {renderPasswordChangeModal()}
      {/* Officer credential modal moved to end for overlay priority */}
      <Modal
        visible={officerModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={handleOfficerModalClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.officerModalContent}>
            <Ionicons
              name="shield-checkmark"
              size={40}
              color="#203562"
              style={{ alignSelf: 'center', marginBottom: 8 }}
            />
            <Text style={styles.officerModalTitle}>
              {officerModal.mode === "setup"
                ? `Set up your ${officerModal.role ? officerModal.role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "Officer"} credential`
                : `Enter your ${officerModal.role ? officerModal.role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "Officer"} credential`}
            </Text>
            <Text style={styles.officerModalLabel}>Officer Credential</Text>
            <TextInput
              value={officerCredential}
              onChangeText={setOfficerCredential}
              placeholder="Enter password or PIN"
              secureTextEntry
              style={styles.officerModalInput}
              placeholderTextColor="#94A3B8"
              autoFocus
            />
            {officerError ? <Text style={styles.errorText}>{officerError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={handleOfficerModalClose} style={styles.modalCancelButton}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOfficerSubmit}
                style={[styles.modalSaveButton, officerLoading && styles.modalSaveButtonDisabled]}
                disabled={officerLoading}
              >
                <Text style={styles.modalSaveButtonText}>
                  {officerModal.mode === "setup" ? "Set Up" : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Toast />
    </View>
  );
});

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
    marginHorizontal: 0,
    width: "100%",
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
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  editIconContainer: {
    position: "absolute",
    right: 2,
    bottom: 2,
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
    borderBottomColor: "#f1f5f9",
  },
  fieldIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  fieldContent: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
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
    fontWeight: "500",
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
  officerRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  officerRoleText: {
    fontSize: 15,
    color: '#203562',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#203562',
    borderRadius: 32,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#203562',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    zIndex: 100,
  },
  officerModalContent: {
    width: '88%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    marginTop: 0,
    marginBottom: 0,
    zIndex: 1001,
  },
  officerModalTitle: {
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 8,
    color: '#203562',
    textAlign: 'center',
  },
  officerModalLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
    marginTop: 2,
    textAlign: 'left',
    alignSelf: 'flex-start',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  officerModalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
  },
});

export default Profile;
