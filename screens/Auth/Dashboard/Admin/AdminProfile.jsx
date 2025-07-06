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
  BackHandler,
  Switch,
} from "react-native";
import { auth, db, storage } from "../../../../config/firebaseconfig";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { dashboardServices } from "../../../../services/dashboardServices";
import { LinearGradient } from "expo-linear-gradient";
import { userPresenceService } from "../../../../services/UserPresenceService";
import Logout from "../../../../components/Logout";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Clipboard from "expo-clipboard";
import QRCodeGenerator from "../../../../components/QRCodeGenerator";

const AdminProfile = ({
  initialData,
  onAvatarUpdate,
  isDataPreloaded = false,
  onShowLogoutModal,
}) => {
  const navigation = useNavigation();
  const [adminData, setAdminData] = useState(initialData || null);
  const [loading, setLoading] = useState(!isDataPreloaded && !initialData);
  const [docId, setDocId] = useState(initialData?.id || null);
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || null);
  const [editingField, setEditingField] = useState(null);
  const [tempData, setTempData] = useState({
    username: initialData?.username || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
  });
  const [unsubscribeAvatar, setUnsubscribeAvatar] = useState(null);
  const [orgInfo, setOrgInfo] = useState(null);
  const [orgInfoLoading, setOrgInfoLoading] = useState(true);
  const [orgInfoEdit, setOrgInfoEdit] = useState({});
  const [orgLogoUploading, setOrgLogoUploading] = useState(false);
  const [orgStats, setOrgStats] = useState({ users: 0, admins: 0 });
  const [savingField, setSavingField] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [adminError, setAdminError] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);

  useEffect(() => {
    const fetchAdminData = async () => {
      const currentUser = auth.currentUser;
      console.log("[DEBUG] fetchAdminData: currentUser", currentUser);
      if (!currentUser) {
        setLoading(false);
        setAdminError(true);
        return;
      }
      try {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        console.log("[DEBUG] fetchAdminData: orgId", orgId);
        if (!orgId) {
          setAdminError(true);
          return;
        }
        const adminQuery = query(
          collection(db, "organizations", orgId, "admins"),
          where("uid", "==", currentUser.uid)
        );
        const adminSnapshot = await getDocs(adminQuery);
        console.log(
          "[DEBUG] fetchAdminData: adminSnapshot.empty",
          adminSnapshot.empty
        );
        if (!adminSnapshot.empty) {
          const adminDoc = adminSnapshot.docs[0];
          setAdminData(adminDoc.data());
          setDocId(adminDoc.id);
          setTempData(adminDoc.data());
          setAvatarUrl(adminDoc.data().avatarUrl);
          setAdminError(false);
          // real-time avatar subscription
          const unsubscribe = dashboardServices.subscribeToAvatarUpdates(
            currentUser,
            orgId,
            (newAvatarUrl) => {
              setAvatarUrl(newAvatarUrl);
            },
            true
          );
          setUnsubscribeAvatar(() => unsubscribe);
        } else {
          setAdminError(true);
          console.log(
            "[DEBUG] fetchAdminData: No admin doc found for this user/org"
          );
        }
      } catch (error) {
        setAdminError(true);
        console.error("[DEBUG] Error fetching admin data:", error);
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

  useEffect(() => {
    let unsubscribe;
    (async () => {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) {
        setOrgInfoLoading(false);
        return;
      }
      const infoDocRef = doc(db, "organizations", orgId, "info", "details");
      unsubscribe = onSnapshot(infoDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setOrgInfo(docSnap.data());
          setOrgInfoEdit(docSnap.data());
        }
        setOrgInfoLoading(false);
      });
      // Fetch stats
      const usersSnap = await getDocs(
        collection(db, "organizations", orgId, "users")
      );
      const adminsSnap = await getDocs(
        collection(db, "organizations", orgId, "admins")
      );
      setOrgStats({ users: usersSnap.size, admins: adminsSnap.size });
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSave = async (field) => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const adminDocRef = doc(db, "organizations", orgId, "admins", docId);
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
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `org_logos/${orgId}/admin/${
        auth.currentUser.uid
      }/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      const adminDocRef = doc(db, "organizations", orgId, "admins", docId);
      await updateDoc(adminDocRef, { avatarUrl: downloadURL });
      setAdminData((prevState) => ({ ...prevState, avatarUrl: downloadURL }));
      setAvatarUrl(downloadURL);
      if (onAvatarUpdate) {
        onAvatarUpdate(downloadURL);
      }
      dashboardServices.updateAvatarUrl(
        auth.currentUser,
        orgId,
        downloadURL,
        true
      );
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
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to log out. Please try again.",
      });
    }
  };

  // Add back button handler
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const onBackPress = () => {
      onShowLogoutModal();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, [onShowLogoutModal]);

  const pickOrgLogo = async () => {
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
        quality: 0.7,
      });
      if (!result.canceled && result.assets.length > 0) {
        setOrgLogoUploading(true);
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        let ext = result.assets[0].uri.split(".").pop();
        if (!ext || ext.length > 5) ext = "jpg";
        const storageRef = ref(storage, `org_logos/${orgId}/logo.${ext}`);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        // Update Firestore org info document with new logo_url
        const infoDocRef = doc(db, "organizations", orgId, "info", "details");
        await updateDoc(infoDocRef, { logo_url: url });
        setOrgInfoEdit((prev) => ({ ...prev, logo_url: url }));
        setOrgLogoUploading(false);
        Toast.show({ type: "success", text1: "Logo uploaded!" });
      }
    } catch (e) {
      setOrgLogoUploading(false);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to upload logo.",
      });
    }
  };

  const saveOrgInfo = async () => {
    try {
      setOrgInfoLoading(true);
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      const newOrgId = orgInfoEdit.name.trim().replace(/\s+/g, "_");
      if (orgId !== newOrgId) {
        // Migrate all subcollections: info, admins (add more as needed)
        // 1. Create the new org doc with a field to avoid italicized style
        const newOrgDocRef = doc(db, "organizations", newOrgId);
        await setDoc(newOrgDocRef, {
          migrated: true,
          createdAt: new Date().toISOString(),
        });
        // 2. Copy info/details
        const oldInfoRef = doc(db, "organizations", orgId, "info", "details");
        const newInfoRef = doc(
          db,
          "organizations",
          newOrgId,
          "info",
          "details"
        );
        const infoSnap = await getDoc(oldInfoRef);
        if (infoSnap.exists()) {
          await setDoc(newInfoRef, infoSnap.data());
          // Ensure the name field is updated to the new name
          await updateDoc(newInfoRef, { name: orgInfoEdit.name.trim() });
        }
        // 3. Copy admins subcollection
        const adminsSnap = await getDocs(
          collection(db, "organizations", orgId, "admins")
        );
        for (const adminDoc of adminsSnap.docs) {
          await setDoc(
            doc(db, "organizations", newOrgId, "admins", adminDoc.id),
            adminDoc.data()
          );
        }
        // 4. (Optional) Copy other subcollections (users, events, etc.)
        // 5. Delete old org document (removes root doc, not subcollections)
        await deleteDoc(doc(db, "organizations", orgId));
        // 6. Update AsyncStorage
        await AsyncStorage.setItem("selectedOrgId", newOrgId);
        Toast.show({
          type: "success",
          text1: "Organization ID updated!",
          text2: "App will reload.",
        });
        // 7. Reload app or navigate to force context update
        setTimeout(() => {
          if (navigation && navigation.reset) {
            navigation.reset({ index: 0, routes: [{ name: "LandingScreen" }] });
          } else {
            // fallback: reload
            if (typeof window !== "undefined") window.location.reload();
          }
        }, 1200);
      } else {
        Toast.show({ type: "success", text1: "Organization info updated!" });
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update org info.",
      });
    } finally {
      setOrgInfoLoading(false);
    }
  };

  // Helper to migrate org document if name changes
  const migrateOrganizationDocument = async (oldOrgId, newOrgId) => {
    if (oldOrgId === newOrgId) return;
    try {
      // Copy info/details
      const oldInfoRef = doc(db, "organizations", oldOrgId, "info", "details");
      const newInfoRef = doc(db, "organizations", newOrgId, "info", "details");
      const infoSnap = await getDoc(oldInfoRef);
      if (infoSnap.exists()) {
        await setDoc(newInfoRef, infoSnap.data());
      }
      // TODO: Copy other subcollections (users, admins, events, etc.) if needed
      // Delete old org doc (optional, only if migration is successful)
      // await deleteDoc(doc(db, 'organizations', oldOrgId));
      Toast.show({ type: "success", text1: "Organization ID updated!" });
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to update org ID" });
      console.error("[DEBUG] Error migrating org document:", e);
    }
  };

  if (loading || orgInfoLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar
          barStyle={onShowLogoutModal ? "light-content" : "dark-content"}
          backgroundColor={onShowLogoutModal ? "transparent" : "#f8f9fa"}
          translucent={!!onShowLogoutModal}
        />
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingTextNeutral}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }
  if (adminError && !adminData) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar
          barStyle={onShowLogoutModal ? "light-content" : "dark-content"}
          backgroundColor={onShowLogoutModal ? "transparent" : "#f8f9fa"}
          translucent={!!onShowLogoutModal}
        />
        <Feather
          name="alert-triangle"
          size={48}
          color="#EF4444"
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.loadingTextNeutral}>Admin data not found.</Text>
      </SafeAreaView>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
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
                  onPress={pickOrgLogo}
                  style={styles.avatarWrapper}
                >
                  {orgInfo?.logo_url ? (
                    <Image
                      source={{ uri: orgInfo.logo_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <Feather
                      name="user"
                      size={80}
                      color="#ccc"
                      style={styles.avatar}
                    />
                  )}
                  <View style={styles.editIconContainer}>
                    <Feather name="camera" size={18} color="white" />
                  </View>
                </TouchableOpacity>
              </View>
              <Text style={styles.username}>
                {orgInfoEdit.name || "Organization"}
                {!!orgInfoEdit.active && (
                  <View
                    style={{
                      marginLeft: 8,
                      backgroundColor: "#22c55e",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      alignSelf: "center",
                      display: "inline-flex",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      Active
                    </Text>
                  </View>
                )}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <Text style={styles.userRole}>
                  Org ID:{" "}
                  {orgInfoEdit.orgId ||
                    (orgInfoEdit.name
                      ? orgInfoEdit.name.replace(/\s+/g, "_")
                      : "")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Clipboard.setStringAsync(
                      orgInfoEdit.orgId ||
                        (orgInfoEdit.name
                          ? orgInfoEdit.name.replace(/\s+/g, "_")
                          : "")
                    );
                    Toast.show({ type: "success", text1: "Org ID copied!" });
                  }}
                  style={{
                    marginLeft: 8,
                    backgroundColor: "#e0e0e0",
                    borderRadius: 6,
                    padding: 4,
                  }}
                >
                  <Feather name="copy" size={14} color="#203562" />
                </TouchableOpacity>
              </View>
              <Text style={{ color: "#e0e0e0", fontSize: 12, marginTop: 4 }}>
                Users: {orgStats.users} | Admins: {orgStats.admins}
              </Text>
              {lastSaved && (
                <Text style={{ color: "#a3e635", fontSize: 12, marginTop: 2 }}>
                  Last updated: {lastSaved}
                </Text>
              )}
            </View>
          </LinearGradient>

          <View style={styles.profileCard}>
            <Text style={styles.sectionTitle}>Organization Information</Text>
            {[
              { key: "name", label: "Name", icon: "briefcase" },
              { key: "email", label: "Email", icon: "mail" },
              { key: "phone", label: "Phone", icon: "phone" },
              { key: "description", label: "Description", icon: "info" },
            ].map((field, idx, arr) => (
              <React.Fragment key={field.key}>
                <TouchableOpacity
                  onPress={() => setEditingField(field.key)}
                  style={styles.fieldContainer}
                >
                  <View style={styles.fieldIconContainer}>
                    <Feather name={field.icon} size={20} color="#203562" />
                  </View>
                  <View style={styles.fieldContent}>
                    <Text style={styles.label}>{field.label}</Text>
                    <Text
                      style={[
                        styles.value,
                        !orgInfoEdit[field.key] && styles.placeholderText,
                      ]}
                    >
                      {orgInfoEdit[field.key] || `Add ${field.label}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setEditingField(field.key)}
                  >
                    <Feather name="edit-2" size={16} color="#203562" />
                  </TouchableOpacity>
                </TouchableOpacity>
                {idx < arr.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: "#203562",
                  fontWeight: "bold",
                  marginRight: 10,
                }}
              >
                Active
              </Text>
              <Switch
                value={!!orgInfoEdit.active}
                onValueChange={async (v) => {
                  setOrgInfoEdit((prev) => ({ ...prev, active: v }));
                  setSavingField(true);
                  Toast.show({ type: "info", text1: "Saving..." });
                  const orgId = await AsyncStorage.getItem("selectedOrgId");
                  const infoDocRef = doc(
                    db,
                    "organizations",
                    orgId,
                    "info",
                    "details"
                  );
                  await updateDoc(infoDocRef, { active: v });
                  setSavingField(false);
                  setLastSaved(new Date().toLocaleTimeString());
                  Toast.show({
                    type: "success",
                    text1: "Organization info updated!",
                  });
                }}
              />
              {savingField && (
                <ActivityIndicator
                  size="small"
                  color="#22c55e"
                  style={{ marginLeft: 10 }}
                />
              )}
            </View>

            {/* QR Code Section */}
            <View style={styles.qrSection}>
              <Text style={styles.sectionTitle}>QR Code Access</Text>
              <Text style={styles.qrDescription}>
                Generate a QR code for your organization members to quickly
                access the login screen.
              </Text>
              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => setShowQRGenerator(true)}
                activeOpacity={0.7}
              >
                <Feather name="qr-code" size={20} color="white" />
                <Text style={styles.qrButtonText}>Generate QR Code</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Logout button at the bottom */}
          <View style={{ marginHorizontal: 15, marginBottom: 30 }}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={onShowLogoutModal}
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
          </View>
        </ScrollView>
        {editingField && (
          <Modal
            transparent={true}
            visible={!!editingField}
            animationType="fade"
          >
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
            >
              <View style={[styles.modalContent, { width: "90%" }]}>
                <Text style={styles.modalTitle}>Edit {editingField}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={orgInfoEdit[editingField] ?? ""}
                  onChangeText={(text) =>
                    setOrgInfoEdit((prev) => ({
                      ...prev,
                      [editingField]: text,
                    }))
                  }
                  autoFocus
                  editable={!savingField}
                  onSubmitEditing={async () => {
                    setSavingField(true);
                    Toast.show({ type: "info", text1: "Saving..." });
                    if (editingField === "name") {
                      await saveOrgInfo();
                      setSavingField(false);
                      setEditingField(null);
                      return;
                    }
                    const orgId = await AsyncStorage.getItem("selectedOrgId");
                    const infoDocRef = doc(
                      db,
                      "organizations",
                      orgId,
                      "info",
                      "details"
                    );
                    await updateDoc(infoDocRef, {
                      [editingField]: orgInfoEdit[editingField],
                    });
                    setSavingField(false);
                    setLastSaved(new Date().toLocaleTimeString());
                    Toast.show({ type: "success", text1: "Saved!" });
                    setEditingField(null);
                  }}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setEditingField(null)}
                    disabled={savingField}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      {
                        backgroundColor: "#003161",
                        opacity: savingField ? 0.6 : 1,
                      },
                    ]}
                    onPress={async () => {
                      setSavingField(true);
                      Toast.show({ type: "info", text1: "Saving..." });
                      if (editingField === "name") {
                        await saveOrgInfo();
                        setSavingField(false);
                        setEditingField(null);
                        return;
                      }
                      const orgId = await AsyncStorage.getItem("selectedOrgId");
                      const infoDocRef = doc(
                        db,
                        "organizations",
                        orgId,
                        "info",
                        "details"
                      );
                      await updateDoc(infoDocRef, {
                        [editingField]: orgInfoEdit[editingField],
                      });
                      setSavingField(false);
                      setLastSaved(new Date().toLocaleTimeString());
                      Toast.show({ type: "success", text1: "Saved!" });
                      setEditingField(null);
                    }}
                    disabled={savingField}
                  >
                    {savingField ? (
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color="#22c55e"
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.modalButtonText,
                        { color: "white", marginLeft: savingField ? 6 : 0 },
                      ]}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* QR Code Generator Modal */}
        {showQRGenerator && orgInfo && (
          <QRCodeGenerator
            organization={{
              id:
                orgInfo.orgId ||
                (orgInfo.name ? orgInfo.name.replace(/\s+/g, "_") : ""),
              name: orgInfo.name || "Organization",
              logoUrl: orgInfo.logo_url,
            }}
            visible={showQRGenerator}
            onClose={() => setShowQRGenerator(false)}
          />
        )}

        <Toast />
      </SafeAreaView>
    </View>
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
    marginBottom: 8,
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 9999,
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
  placeholderText: {
    color: "#94A3B8",
    fontWeight: "400",
  },
  qrSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  qrDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 20,
  },
  qrButton: {
    flexDirection: "row",
    backgroundColor: "#203562",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#203562",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  qrButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
});

export default AdminProfile;
