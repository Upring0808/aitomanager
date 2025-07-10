import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Keyboard,
  Switch,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { getDb, getStorage, getAuth } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle } from "lucide-react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";

const initialState = {
  name: "",
  description: "",
  email: "",
  password: "",
  access_code: "",
  logo: null,
  active: true,
};

const CreateOrganizationScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [fields, setFields] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Validation helpers
  const validate = () => {
    const newErrors = {};
    if (!fields.name.trim()) newErrors.name = "Organization name is required.";
    if (!fields.description.trim())
      newErrors.description = "Description is required.";
    if (!fields.email.trim()) newErrors.email = "Contact email is required.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email))
      newErrors.email = "Invalid email format.";
    if (!fields.password.trim() || fields.password.length < 6)
      newErrors.password = "Password (min 6 chars) is required.";
    if (!fields.access_code.trim())
      newErrors.access_code = "Access code is required.";
    if (!fields.logo) newErrors.logo = "Logo is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Pick image from gallery with permission request
  const pickImage = async () => {
    console.log("Requesting media library permissions...");
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log("Media library permission status:", status);
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Permission to access gallery is required!"
      );
      return;
    }
    console.log("Launching image library picker...");
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    console.log("Image picker result:", result);
    if (!result.canceled && result.assets && result.assets[0]) {
      setFields({ ...fields, logo: result.assets[0].uri });
      console.log("Image selected:", result.assets[0].uri);
    } else {
      console.log("No image selected or picker was canceled.");
    }
  };

  // Upload image to Firebase Storage in /org_logos/{orgId}/logo.jpg
  const uploadLogo = async (orgId) => {
    if (!fields.logo) return null;
    try {
      setUploading(true);
      const storage = getStorage();
      // TEMP: Remove auth check for testing
      // const auth = getAuth();
      // if (!auth.currentUser) {
      //   setUploading(false);
      //   Alert.alert("Auth Error", "You must be logged in to upload a logo.");
      //   return null;
      // }
      const response = await fetch(fields.logo);
      const blob = await response.blob();
      let ext = fields.logo.split(".").pop();
      if (!ext || ext.length > 5) ext = "jpg";
      // This will create the folder if it doesn't exist
      const storageRef = ref(storage, `org_logos/${orgId}/logo.${ext}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      setUploading(false);
      return url;
    } catch (error) {
      setUploading(false);
      console.error("Logo upload error:", error);
      Alert.alert(
        "Upload Error",
        "Failed to upload logo. Please try again or check your Firebase Storage rules."
      );
      return null;
    }
  };

  // Create organization in Firestore
  const handleCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    const orgId = fields.name.trim().replace(/\s+/g, "_");
    let logoUrl = null;
    if (fields.logo) {
      logoUrl = await uploadLogo(orgId);
      if (!logoUrl) {
        setCreating(false);
        return;
      }
    }
    try {
      const db = getDb();
      const auth = getAuth();
      // 1. Create the org document with a fixed ID (ensures not italicized)
      const orgDoc = doc(db, "organizations", orgId);
      await setDoc(orgDoc, {}); // Ensures the org doc exists
      // 2. Create the info/details subdocument
      const infoDoc = doc(db, "organizations", orgId, "info", "details");
      await setDoc(infoDoc, {
        name: fields.name.trim(),
        description: fields.description.trim(),
        email: fields.email.trim(),
        access_code: fields.access_code.trim(),
        logo_url: logoUrl,
        active: fields.active,
        created_at: new Date().toISOString(),
      });
      // 3. Create admin user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        fields.email.trim(),
        fields.password
      );
      // Add admin to org's admins subcollection
      const adminUid = userCredential.user.uid;
      const adminDocRef = doc(db, "organizations", orgId, "admins", adminUid);
      await setDoc(adminDocRef, {
        email: fields.email.trim(),
        created_at: new Date().toISOString(),
      });
      setShowSuccess(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        setShowSuccess(false);
        fadeAnim.setValue(0);
        setFields(initialState);
        setErrors({});
        navigation.goBack();
      }, 1200);
    } catch (error) {
      console.error("Firestore org create error:", error);
      Alert.alert("Error", error.message || "Failed to create organization.");
    } finally {
      setCreating(false);
    }
  };

  // Clear form
  const handleClear = () => {
    setFields(initialState);
    setErrors({});
  };

  // Keyboard dismiss
  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <SafeAreaView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <LinearGradient
        colors={["#16325B", "#1e4a8a", "#2d5aa0"]}
        style={styles.gradient}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={[
                styles.content,
                {
                  paddingBottom: 24 + insets.bottom,
                  paddingTop: 24 + insets.top,
                },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={styles.card}
                accessibilityLabel="Create Organization Form"
              >
                <Text style={styles.title}>Create Organization</Text>
                {/* Section: Basic Info */}
                <Text style={styles.sectionHeader}>Basic Information</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="Organization Name*"
                  placeholderTextColor="#999"
                  value={fields.name}
                  onChangeText={(v) => setFields({ ...fields, name: v })}
                  editable={!creating && !uploading}
                  accessibilityLabel="Organization Name"
                  returnKeyType="next"
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
                <TextInput
                  style={[
                    styles.input,
                    errors.description && styles.inputError,
                  ]}
                  placeholder="Description*"
                  placeholderTextColor="#999"
                  value={fields.description}
                  onChangeText={(v) => setFields({ ...fields, description: v })}
                  editable={!creating && !uploading}
                  accessibilityLabel="Description"
                  multiline
                  numberOfLines={3}
                  returnKeyType="next"
                />
                {errors.description && (
                  <Text style={styles.errorText}>{errors.description}</Text>
                )}
                {/* Section: Contact Info */}
                <Text style={styles.sectionHeader}>Contact Information</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Contact Email*"
                  placeholderTextColor="#999"
                  value={fields.email}
                  onChangeText={(v) => setFields({ ...fields, email: v })}
                  editable={!creating && !uploading}
                  accessibilityLabel="Contact Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Admin Password* (min 6 chars)"
                  placeholderTextColor="#999"
                  value={fields.password}
                  onChangeText={(v) => setFields({ ...fields, password: v })}
                  editable={!creating && !uploading}
                  accessibilityLabel="Admin Password"
                  secureTextEntry
                  returnKeyType="next"
                />
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
                <TextInput
                  style={[
                    styles.input,
                    errors.access_code && styles.inputError,
                  ]}
                  placeholder="Access Code*"
                  placeholderTextColor="#999"
                  value={fields.access_code}
                  onChangeText={(v) => setFields({ ...fields, access_code: v })}
                  editable={!creating && !uploading}
                  accessibilityLabel="Access Code"
                  autoCapitalize="none"
                  returnKeyType="done"
                />
                {errors.access_code && (
                  <Text style={styles.errorText}>{errors.access_code}</Text>
                )}
                {/* Section: Logo */}
                <Text style={styles.sectionHeader}>Logo</Text>
                <TouchableOpacity
                  style={[styles.logoPicker, errors.logo && styles.inputError]}
                  onPress={pickImage}
                  disabled={creating || uploading}
                  accessibilityLabel="Pick Logo Image"
                >
                  {fields.logo ? (
                    <Image
                      source={{ uri: fields.logo }}
                      style={styles.logoPreviewLarge}
                    />
                  ) : (
                    <Text style={styles.logoPickerText}>Pick Logo Image*</Text>
                  )}
                </TouchableOpacity>
                {errors.logo && (
                  <Text style={styles.errorText}>{errors.logo}</Text>
                )}
                {/* Section: Status */}
                <View style={styles.switchRow}>
                  <Text style={styles.sectionHeader}>Active</Text>
                  <Switch
                    value={fields.active}
                    onValueChange={(v) => setFields({ ...fields, active: v })}
                    disabled={creating || uploading}
                    accessibilityLabel="Active Status"
                  />
                </View>
                {/* Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.createButton,
                      (creating || uploading) && styles.buttonDisabled,
                    ]}
                    onPress={handleCreate}
                    disabled={creating || uploading}
                    accessibilityLabel="Create Organization"
                  >
                    <Text style={styles.createButtonText}>Create</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.clearButton,
                      (creating || uploading) && styles.buttonDisabled,
                    ]}
                    onPress={handleClear}
                    disabled={creating || uploading}
                    accessibilityLabel="Clear Form"
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            {/* Loading Overlay */}
            {(uploading || creating) && (
              <View style={styles.loadingOverlay} accessibilityLabel="Loading">
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Saving organization...</Text>
              </View>
            )}
            {/* Success Animation */}
            {showSuccess && (
              <Animated.View
                style={[styles.successOverlay, { opacity: fadeAnim }]}
                accessibilityLabel="Success Animation"
              >
                <CheckCircle color="#4ade80" size={80} />
                <Text style={styles.successText}>Created!</Text>
              </Animated.View>
            )}
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 18,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 18,
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: 16,
    color: "#60a5fa",
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
    color: "#16325B",
  },
  inputError: {
    borderColor: "#f87171",
    borderWidth: 1.5,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 2,
  },
  logoPicker: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    overflow: "hidden",
    alignSelf: "center",
  },
  logoPickerText: { color: "#16325B", fontSize: 15 },
  logoPreviewLarge: { width: 140, height: 140, borderRadius: 70 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  createButton: {
    backgroundColor: "#4ade80",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginRight: 10,
  },
  createButtonText: { color: "#16325B", fontSize: 18, fontWeight: "bold" },
  clearButton: {
    backgroundColor: "#334155",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  clearButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  buttonDisabled: { opacity: 0.6 },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(30,41,59,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
    fontWeight: "bold",
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(16,185,129,0.12)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  successText: {
    color: "#4ade80",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 16,
  },
});

export default CreateOrganizationScreen;
