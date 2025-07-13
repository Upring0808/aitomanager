import React, { useState, useEffect } from "react";
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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { dashboardServices } from "../../../../services/dashboardServices";
import userPresenceService from "../../../../services/UserPresenceService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Profile = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [tempData, setTempData] = useState({
    username: "",
    email: "",
    phone: "",
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [unsubscribeAvatar, setUnsubscribeAvatar] = useState(null);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", currentUser.uid)
        );
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          setUserData(userDoc.data());
          setDocId(userDoc.id);
          setTempData(userDoc.data());
          setAvatarUrl(userDoc.data().avatarUrl);

          // Set up real-time avatar subscription
          const unsubscribe = dashboardServices.subscribeToAvatarUpdates(
            currentUser,
            (newAvatarUrl) => {
              setAvatarUrl(newAvatarUrl);
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
        console.error("Error fetching user data:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to fetch data.",
        });
      } finally {
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
    };

    fetchUserData();

    // Cleanup subscription when component unmounts
    return () => {
      if (unsubscribeAvatar) {
        unsubscribeAvatar();
      }
    };
  }, []);

  const handleSave = async (field) => {
    try {
      const userDocRef = doc(db, "users", docId);
      await updateDoc(userDocRef, { [field]: tempData[field] });
      setUserData((prevState) => ({ ...prevState, [field]: tempData[field] }));
      setEditingField(null);
      Toast.show({
        type: "success",
        text1: "Saved",
        text2: "Profile updated!",
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      Toast.show({ type: "error", text1: "Error", text2: "Update failed." });
    }
  };

  const pickImage = async () => {
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
  };

  const uploadImage = async (uri) => {
    try {
      setLoading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `avatars/${auth.currentUser.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      const userDocRef = doc(db, "users", docId);
      await updateDoc(userDocRef, { avatarUrl: downloadURL });
      setUserData((prevState) => ({ ...prevState, avatarUrl: downloadURL }));
      setAvatarUrl(downloadURL);

      // Notify dashboard of avatar update
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (orgId) {
        dashboardServices.updateAvatarUrl(auth.currentUser, orgId, downloadURL);
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Avatar updated!",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Avatar update failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // Logout is now handled by Dashboard through showLogoutModal
    // This function is kept for compatibility but should not be used
    console.log("[Profile_old] Logout should be handled by Dashboard");
  };

  const renderFieldEditModal = () => (
    <Modal
      transparent={true}
      visible={modalVisible}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Edit{" "}
              {editingField &&
                editingField.charAt(0).toUpperCase() + editingField.slice(1)}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color="#203562" />
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
              placeholderTextColor="#999"
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
        </View>
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
        barStyle="light-content"
        backgroundColor="#203562"
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
            <Text style={styles.userRole}>ICT Student</Text>
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
            { field: "username", icon: "user" },
            { field: "email", icon: "mail" },
            { field: "phone", icon: "phone" },
          ].map(({ field, icon }) => (
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
                <Text style={styles.value}>{userData?.[field] || ""}</Text>
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
    paddingBottom: 25, // Reduced padding for a more compact header
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 15, // Add space between header and content
    marginHorizontal: 10, // Add horizontal margin for better appearance
  },
  headerContent: {
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 15,
    alignItems: "center",
  },
  avatarWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
    right: 0,
    bottom: 0,
    backgroundColor: "#203562",
    borderRadius: 18,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  username: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 5,
  },
  userRole: {
    fontSize: 14,
    color: "#e0e0e0",
    marginTop: 3,
  },

  // Content styles
  scrollContainer: {
    paddingBottom: 30,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15, // Increased horizontal margin for better appearance
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5, // Increased elevation for better shadow on Android
    marginBottom: 20, // Add space at the bottom
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#203562",
    marginBottom: 20,
  },
  fieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
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
    marginRight: 15,
  },
  fieldContent: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: "#888",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
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

  // Logout button
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#203562",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#203562",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Darker overlay for better contrast
    position: "absolute", // Position absolute to cover the entire screen
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999, // High z-index to ensure it's above everything
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#203562",
  },
  modalText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 25,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10, // Add horizontal padding for better text layout
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 25,
    backgroundColor: "#f9f9f9",
  },
  modalInputIcon: {
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f5f5f5",
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  modalSaveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#203562",
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
    shadowColor: "#203562",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  modalSaveButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },

  // Logout modal specific styles
  logoutModalIconContainer: {
    alignItems: "center",
    marginBottom: 15,
    marginTop: 10,
  },
  logoutModalIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#203562",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingHorizontal: 5,
  },
  logoutConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#ff3b30",
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
  },
  logoutConfirmButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
});

export default Profile;
