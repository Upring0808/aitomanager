import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { QrCode } from "lucide-react-native";
import aitoLogo from "../assets/fivent1.png";

const NAVY = "#203562";
const WHITE = "#fff";

const LOGO_SLIDE_DURATION = 800;
const UI_FADE_DURATION = 400;
const LOGO_START_OFFSET = 100; // px below final position

const EntryScreen = () => {
  const navigation = useNavigation();
  const logoTranslateY = useRef(new Animated.Value(LOGO_START_OFFSET)).current;
  const uiOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide up the logo
    Animated.timing(logoTranslateY, {
      toValue: 0,
      duration: LOGO_SLIDE_DURATION,
      useNativeDriver: true,
      easing: Animated.Easing ? Animated.Easing.out(Animated.Easing.cubic) : undefined,
    }).start(() => {
      // Fade in the rest of the UI
      Animated.timing(uiOpacity, {
        toValue: 1,
        duration: UI_FADE_DURATION,
        useNativeDriver: true,
      }).start();
    });
  }, [logoTranslateY, uiOpacity]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Animated.View style={{ transform: [{ translateY: logoTranslateY }] }}>
            <Image source={aitoLogo} style={styles.logo} />
          </Animated.View>
          <Animated.View style={{ opacity: uiOpacity, alignItems: 'center' }}>
            <Text style={styles.appName}>FIVENT</Text>
            <Text style={styles.appSubtitle}>FLOW</Text>
          </Animated.View>
        </View>
        <Animated.View style={[styles.bottomContent, { opacity: uiOpacity }]}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("LandingScreen")}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Find my department/org</Text>
          </TouchableOpacity>

          {/* QR Login Row */}
          <TouchableOpacity
            style={styles.qrRow}
            onPress={() => navigation.navigate("QRLoginScreen")}
            activeOpacity={0.85}
          >
            <QrCode size={22} color={NAVY} style={{ marginRight: 8 }} />
            <Text style={styles.qrRowText}>QR Login</Text>
          </TouchableOpacity>

          {/* Batanes State College Text */}
          <Text style={styles.collegeText}>Batanes State College</Text>
        </Animated.View>
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
    paddingBottom: 30,
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
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: Platform.OS === "ios" ? 32 : 18,
  },
  button: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 18,
    width: "100%",
    alignItems: "center",
    marginBottom: 32,
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
  qrRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderRadius: 0,
    width: undefined,
    alignSelf: "center",
  },
  qrRowText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  collegeText: {
    color: NAVY,
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
});

export default EntryScreen;
