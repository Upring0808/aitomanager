import React, { useState, useEffect, useCallback } from "react";
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
  StatusBar,
  SafeAreaView,
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
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { dashboardServices } from "../../../../services/dashboardServices";
import { LinearGradient } from "expo-linear-gradient";
import { userPresenceService } from "../../../../services/UserPresenceService";

const AdminProfile = () => {
  const navigation = useNavigation();
  const [adminData, setAdminData] = useState(null);
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

  useEffect(() => {
    const fetchAdminData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const adminQuery = query(
          collection(db, "admin"),
          where("uid", "==", currentUser.uid)
        );
        const adminSnapshot = await getDocs(adminQuery);
        if (!adminSnapshot.empty) {
          const adminDoc = adminSnapshot.docs[0];
          setAdminData(adminDoc.data());
          setDocId(adminDoc.id);
          setTempData(adminDoc.data());
          setAvatarUrl(adminDoc.data().avatarUrl);

          // real-time avatar subscription
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
            text2: "Admin data not found.",
          });
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to fetch data.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();

    return () => {
      // Clean up the avatar subscription
      if (unsubscribeAvatar) {
        unsubscribeAvatar();
      }
    };
  }, []);

  const handleSave = async (field) => {
    try {
      const adminDocRef = doc(db, "admin", docId);
      await updateDoc(adminDocRef, { [field]: tempData[field] });
      setAdminData((prevState) => ({ ...prevState, [field]: tempData[field] }));
      setEditingField(null);
      Toast.show({
        type: "success",
        text1: "Saved",
        text2: "Admin profile updated!",
      });
    } catch (error) {
      console.error("Error updating admin profile:", error);
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
      const filename = `admin/${auth.currentUser.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      const adminDocRef = doc(db, "admin", docId);
      await updateDoc(adminDocRef, { avatarUrl: downloadURL });
      setAdminData((prevState) => ({ ...prevState, avatarUrl: downloadURL }));
      setAvatarUrl(downloadURL);

      // Notify the dashboard of the avatar update
      dashboardServices.updateAvatarUrl(auth.currentUser, downloadURL);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Admin avatar updated!",
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
    try {
      if (
        userPresenceService &&
        typeof userPresenceService.cleanup === "function"
      ) {
        try {
          await userPresenceService.cleanup();
        } catch (e) {}
      }
      if (unsubscribeAvatar) {
        try {
          unsubscribeAvatar();
        } catch (e) {}
      }
      await auth.signOut();
      Toast.show({
        type: "success",
        text1: "Logged out",
        text2: "You have been logged out.",
      });
      // DO NOT navigate here! Let App.js handle the stack change.
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to log out. Please try again.",
      });
    }
  };

  const renderFieldEditModal = () => (
    <Modal transparent={true} visible={modalVisible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit {editingField}</Text>
          <TextInput
            style={styles.modalInput}
            value={tempData[editingField]}
            onChangeText={(text) =>
              setTempData((prev) => ({ ...prev, [editingField]: text }))
            }
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#003161" }]}
              onPress={() => {
                handleSave(editingField);
                setModalVisible(false);
              }}
            >
              <Text style={[styles.modalButtonText, { color: "white" }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderLogoutConfirmModal = () => (
    <Modal transparent={true} visible={logoutModalVisible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Logout</Text>
          <Text style={styles.modalText}>
            Are you sure you want to log out?
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setLogoutModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#003161" }]}
              onPress={() => {
                setLogoutModalVisible(false);
                handleLogout();
              }}
            >
              <Text style={[styles.modalButtonText, { color: "white" }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#f8f9fa"
          translucent={true}
        />
        <ActivityIndicator size="large" color="#203562" />
        <Text style={styles.loadingTextNeutral}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#f8f9fa"
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
            <Text style={styles.username}>
              {adminData?.username || "Admin"}
            </Text>
            <Text style={styles.userRole}>Admin</Text>
          </View>
        </LinearGradient>

        <View style={styles.profileCard}>
          <Text style={styles.sectionTitle}>Admin Information</Text>
          {["username", "email", "phone"].map((field) => (
            <TouchableOpacity
              key={field}
              onPress={() => {
                setEditingField(field);
                setModalVisible(true);
              }}
              style={styles.fieldContainer}
            >
              <View style={styles.fieldIconContainer}>
                <Feather
                  name={
                    field === "username"
                      ? "user"
                      : field === "email"
                      ? "mail"
                      : "phone"
                  }
                  size={20}
                  color="#203562"
                />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.label}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Text>
                <Text
                  style={[
                    styles.value,
                    !adminData?.[field] && styles.placeholderText,
                  ]}
                >
                  {adminData?.[field] || `Add ${field}`}
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
        </View>
      </ScrollView>

      {renderFieldEditModal()}
      {renderLogoutConfirmModal()}
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingTextNeutral: {
    marginTop: 15,
    fontSize: 16,
    color: "#203562",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 20 : StatusBar.currentHeight + 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 15,
    marginHorizontal: 10,
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
  scrollContainer: {
    paddingBottom: 30,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  modalButtonText: {
    fontSize: 16,
    color: "#000",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  placeholderText: {
    color: "#94A3B8",
    fontWeight: "400",
  },
});

export default AdminProfile;
