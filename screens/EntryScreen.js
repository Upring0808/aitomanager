import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import aitoLogo from "../assets/fivent1.png";

const NAVY = "#203562";
const WHITE = "#fff";

const EntryScreen = () => {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Image source={aitoLogo} style={styles.logo} />
          <Text style={styles.appName}>FIVENT</Text>
          <Text style={styles.appSubtitle}>FLOW</Text>
        </View>
        <View style={styles.bottomContent}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("LandingScreen")}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Find my department/org</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => navigation.navigate("QRLoginScreen")}
            activeOpacity={0.85}
          >
            <Text style={styles.qrButtonText}>Scan QR Code</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>Batanes State College</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WHITE,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: WHITE,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 32 : 18,
  },
  centerContent: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    width: "100%",
    paddingTop: 180,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 8,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 42,
    fontWeight: "700",
    color: NAVY,
    letterSpacing: 7,
    textAlign: "center",
    marginBottom: 4,
    lineHeight: 48,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: NAVY,
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 12,
    opacity: 0.7,
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  bottomContent: {
    width: "100%",
    alignItems: "center",
    marginBottom: 80,
  },
  button: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 18,
    width: "100%",
    alignItems: "center",
    marginBottom: 18,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  qrButton: {
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: NAVY,
    borderRadius: 8,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 18,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  qrButtonText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  footer: {
    color: NAVY,
    fontSize: 13,
    opacity: 0.7,
    textAlign: "center",
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
});

export default EntryScreen;
