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
} from "react-native";
import { auth, db, storage } from "../../config/firebaseconfig";
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
import { useNavigation } from "@react-navigation/native";

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
      await auth.signOut();
      navigation.replace("Index");
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
              style={[styles.modalButton, { backgroundColor: "black" }]}
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3E588Faa" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View>
            <TouchableOpacity onPress={pickImage}>
              <Image
                source={
                  avatarUrl
                    ? { uri: avatarUrl }
                    : require("../../assets/aito.png")
                }
                style={styles.avatar}
              />
              <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
                <Feather name="edit" size={18} color="black" />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{adminData?.username || "Admin"}</Text>
        </View>

        <View style={styles.contentContainer}>
          {["username", "email", "phone"].map((field) => (
            <TouchableOpacity
              key={field}
              onPress={() => {
                setEditingField(field);
                setModalVisible(true);
              }}
              style={styles.fieldContainer}
            >
              <Text style={styles.label}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </Text>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.value}>{adminData[field]}</Text>
                <Feather name="edit" size={18} color="gray" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {renderFieldEditModal()}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    paddingVertical: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: "grey",
  },
  editIcon: {
    position: "absolute",
    right: -8,
    bottom: 5,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 3.5,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  fieldContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 10,
  },
  label: {
    fontSize: 14,
    color: "#999",
  },
  fieldValueContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  value: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  logoutButton: {
    marginTop: 30,
    backgroundColor: "#16325B",
    padding: 15,
    borderRadius: 30,
    width: 300,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
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
});

export default AdminProfile;
