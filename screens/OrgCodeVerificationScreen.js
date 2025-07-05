import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "../firebase";
import { useNavigation, useRoute } from "@react-navigation/native";
import aitoIcon from "../assets/aito.png";

const NAVY = "#203562";
const NAVY_DARK = "#16325B";
const WHITE = "#fff";

const OrgCodeVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { organization } = route.params;
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyCode = async () => {
    setCodeError("");
    setLoading(true);
    try {
      const db = getDb();
      const infoDoc = doc(
        db,
        "organizations",
        organization.id,
        "info",
        "details"
      );
      const infoSnap = await getDoc(infoDoc);
      if (!infoSnap.exists()) {
        setCodeError("Organization info not found.");
        setLoading(false);
        return;
      }
      const data = infoSnap.data();
      if (data.access_code && codeInput.trim() === data.access_code) {
        await AsyncStorage.setItem("selectedOrgId", organization.id);
        await AsyncStorage.setItem("selectedOrgName", organization.name);
        if (organization.logo_url) {
          await AsyncStorage.setItem("selectedOrgLogo", organization.logo_url);
        }
        setLoading(false);
        navigation.navigate("LoginScreen");
      } else {
        setCodeError("Incorrect access code.");
        setLoading(false);
      }
    } catch (error) {
      setCodeError("Error verifying code.");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.container}
        >
          <View style={styles.card}>
            <Image
              source={
                organization.logo_url
                  ? { uri: organization.logo_url }
                  : aitoIcon
              }
              style={styles.logo}
            />
            <Text style={styles.title}>{organization.name}</Text>
            <Text style={styles.note}>
              If you don't have the access code, please contact your
              organization governor or admin.
            </Text>
            <View style={styles.divider} />
            <TextInput
              style={styles.input}
              placeholder="Access Code"
              placeholderTextColor="#9ca3af"
              value={codeInput}
              onChangeText={setCodeInput}
              autoCapitalize="none"
              secureTextEntry
              accessibilityLabel="Access Code"
            />
            {codeError ? <Text style={styles.error}>{codeError}</Text> : null}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: WHITE,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 38,
    paddingHorizontal: 28,
    width: "100%",
    maxWidth: 390,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
    marginTop: 60,
    marginBottom: 30,
  },
  logo: {
    width: 55,
    height: 55,
    marginBottom: 18,
    resizeMode: "contain",
    borderRadius: 50,
  },
  title: {
    fontSize: 23,
    fontWeight: "700",
    color: NAVY_DARK,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.1,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  note: {
    color: NAVY,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 18,
    marginTop: 2,
    fontWeight: "400",
    lineHeight: 21,
    opacity: 0.92,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 18,
    borderRadius: 1,
  },
  input: {
    width: "100%",
    backgroundColor: "#f7f9fc",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: NAVY_DARK,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    fontWeight: "500",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  error: {
    color: "#e53935",
    fontSize: 15,
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "500",
  },
  button: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    transitionDuration: "150ms",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  cancelButton: {
    marginTop: 18,
    alignItems: "center",
    width: "100%",
  },
  cancelButtonText: {
    color: NAVY,
    fontSize: 15,
    textDecorationLine: "underline",
    fontWeight: "500",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    opacity: 0.85,
  },
  footer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 10,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  footerText: {
    color: NAVY_DARK,
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
});

export default OrgCodeVerificationScreen;
