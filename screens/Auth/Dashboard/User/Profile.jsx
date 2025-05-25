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

const Profile = ({ initialData, onAvatarUpdate, isDataPreloaded = false }) => {
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
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [unsubscribeAvatar, setUnsubscribeAvatar] = useState(null);
  const [isConfirmingPassword, setIsConfirmingPassword] = useState(false);
  const [confirmPasswordTimeout, setConfirmPasswordTimeout] = useState(null);

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
    try {
      // First clean up presence service
      await userPresenceService.cleanup();

      // Then sign out from Firebase
      await auth.signOut();

      // Use navigation.navigate instead of reset to avoid navigation errors
      // This will trigger the auth state change in App.js which will redirect to Index
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
    }
  };

  const handlePasswordChange = async () => {
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordData;

      if (!currentPassword || !newPassword || !confirmPassword) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "All fields are required",
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "New passwords do not match",
        });
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

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Password updated successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update password",
      });
    } finally {
      setIsConfirmingPassword(false);
    }
  };

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

  const renderLogoutConfirmModal = () => (
    <Modal
      transparent={true}
      visible={logoutModalVisible}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.logoutModalIconContainer}>
            <View style={styles.logoutModalIcon}>
              <Feather name="log-out" size={30} color="#203562" />
            </View>
          </View>

          <Text style={[styles.modalTitle, { textAlign: "center" }]}>
            Confirm Logout
          </Text>
          <Text style={styles.modalText}>
            Are you sure you want to log out of your account?
          </Text>

          <View style={styles.logoutModalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setLogoutModalVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutConfirmButton}
              onPress={() => {
                setLogoutModalVisible(false);
                handleLogout();
              }}
            >
              <Text style={styles.logoutConfirmButtonText}>Logout</Text>
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
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
              <Feather name="x" size={24} color="#203562" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalInputContainer}>
            <Feather
              name="lock"
              size={20}
              color="#203562"
              style={styles.modalInputIcon}
            />
            <TextInput
              style={styles.modalInput}
              value={passwordData.currentPassword}
              onChangeText={(text) =>
                setPasswordData((prev) => ({ ...prev, currentPassword: text }))
              }
              placeholder="Current Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
          </View>

          <View style={styles.modalInputContainer}>
            <Feather
              name="lock"
              size={20}
              color="#203562"
              style={styles.modalInputIcon}
            />
            <TextInput
              style={styles.modalInput}
              value={passwordData.newPassword}
              onChangeText={(text) =>
                setPasswordData((prev) => ({ ...prev, newPassword: text }))
              }
              placeholder="New Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
          </View>

          <View style={styles.modalInputContainer}>
            <Feather
              name="lock"
              size={20}
              color="#203562"
              style={styles.modalInputIcon}
            />
            <TextInput
              style={styles.modalInput}
              value={passwordData.confirmPassword}
              onChangeText={(text) => {
                setPasswordData((prev) => ({ ...prev, confirmPassword: text }));
                // Clear any existing timeout
                if (confirmPasswordTimeout) {
                  clearTimeout(confirmPasswordTimeout);
                }
                // Set new timeout for validation
                const timeout = setTimeout(() => {
                  if (text && text !== passwordData.newPassword) {
                    Toast.show({
                      type: "error",
                      text1: "Passwords don't match",
                      text2: "Please make sure your passwords match",
                    });
                  }
                }, 1000);
                setConfirmPasswordTimeout(timeout);
              }}
              placeholder="Confirm New Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setPasswordModalVisible(false)}
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
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={true}
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
            onPress={() => setLogoutModalVisible(true)}
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
      {renderLogoutConfirmModal()}
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

  // Logout modal specific styles
  logoutModalIconContainer: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 12,
  },
  logoutModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#203562",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 8,
  },
  logoutConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutConfirmButtonText: {
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
});

export default React.memo(Profile);
