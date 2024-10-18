import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

const { width } = Dimensions.get("window");

const Profile = ({ onAvatarUpdate }) => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Fetch User Data
  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No user logged in");
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
          setUsername(userDoc.data().username);
          setEmail(userDoc.data().email);
          setPhone(userDoc.data().phone);
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "User data not found in the database.",
          });
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to fetch user data.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Image Picker
  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Toast.show({
        type: "error",
        text1: "Permission Denied",
        text2: "You need to allow access to your photos.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadImage(result.assets[0].uri);
    } else {
      Toast.show({
        type: "info",
        text1: "Cancelled",
        text2: "Image selection was cancelled.",
      });
    }
  };

  // Upload Image to Firebase Storage
  const uploadImage = async (uri) => {
    if (!auth.currentUser) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "User is not authenticated.",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error("Failed to fetch image from the provided URI.");
      }
      const blob = await response.blob();

      const filename = `avatars/${auth.currentUser.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      if (docId) {
        const userDocRef = doc(db, "users", docId);
        await updateDoc(userDocRef, { avatarUrl: downloadURL });

        setUserData((prevState) => ({ ...prevState, avatarUrl: downloadURL }));

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Profile picture updated successfully!",
        });
      } else {
        throw new Error("Document ID not found");
      }
    } catch (error) {
      console.error("Error uploading image: ", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update profile picture.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await auth.signOut();
      navigation.navigate("Index");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to log out.",
      });
    } finally {
      setLogoutLoading(false);
    }
  };

  // Save Changes
  const saveChanges = async () => {
    try {
      const userDocRef = doc(db, "users", docId);
      await updateDoc(userDocRef, { username, email, phone });
      setUserData((prevState) => ({
        ...prevState,
        username,
        email,
        phone,
      }));
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Profile updated successfully!",
      });
      setModalVisible(false);
    } catch (error) {
      console.error("Error updating user data: ", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update profile.",
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="maroon" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <LinearGradient colors={["#6D2932", "#B47B84"]} style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                userData?.avatarUrl
                  ? { uri: userData.avatarUrl }
                  : require("../../assets/aito.png")
              }
              style={styles.avatar}
              onError={(error) => console.error("Image loading error: ", error)}
            />
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={pickImage}
            >
              <Feather name="edit-2" size={15} color="#555" />
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{userData?.username || "User"}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.contentContainer}>
          <View style={styles.card}>
            <DetailItem label="Email" value={userData?.email} />
            <DetailItem label="Phone" value={userData?.phone} />
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            {logoutLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.logoutButtonText}>Logout</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal for Editing Profile */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              keyboardType="email-address"
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              value={phone}
              keyboardType="phone-pad"
              onChangeText={setPhone}
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Reusable DetailItem component
const DetailItem = ({ label, value }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    paddingVertical: 30,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  editAvatarButton: {
    position: "absolute",
    right: 10,
    bottom: 0,
    backgroundColor: "#ffffff",
    borderRadius: 50,
    padding: 5,
    elevation: 5,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff", // Change to white
    marginTop: 10,
  },
  editButton: {
    marginTop: 10,
    backgroundColor: "#6A9AB0",
    borderRadius: 5,
    padding: 10,
  },
  editButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  contentContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailIconContainer: {
    marginRight: 10,
  },
  detailIcon: {
    fontSize: 20,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
    color: "#555",
  },
  logoutButton: {
    backgroundColor: "#D9534F",
    borderRadius: 5,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutButtonText: {
    color: "#FFF",
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
    width: width * 0.8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: "#789DBC",
    borderRadius: 5,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#D9534F",
    borderRadius: 5,
    padding: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});

export default Profile;
