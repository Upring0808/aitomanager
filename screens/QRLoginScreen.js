import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "../firebase";
import {
  ArrowLeft,
  QrCode,
  Camera as CameraIcon,
  AlertCircle,
} from "lucide-react-native";
import aitoLogo from "../assets/fivent1.png";

const NAVY = "#203562";
const WHITE = "#fff";
const { width, height } = Dimensions.get("window");

const QRLoginScreen = () => {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState(null);
  const [navigationReady, setNavigationReady] = useState(false);
  const isMountedRef = useRef(true);

  // Safe navigation helper
  const safeNavigate = useCallback(
    (routeName, params = {}) => {
      try {
        if (!navigation) {
          console.warn("Navigation object is null");
          Alert.alert(
            "Navigation Error",
            "Navigation not available. Please restart the app."
          );
          return;
        }

        if (!navigationReady) {
          console.warn("Navigation not ready yet");
          // Wait a bit and try again
          setTimeout(() => {
            if (isMountedRef.current && navigationReady) {
              safeNavigate(routeName, params);
            }
          }, 500);
          return;
        }

        if (navigation.navigate && typeof navigation.navigate === "function") {
          navigation.navigate(routeName, params);
        } else {
          console.warn("Navigation.navigate not available");
          // Fallback: try to reset navigation
          if (navigation.reset && typeof navigation.reset === "function") {
            navigation.reset({
              index: 0,
              routes: [{ name: routeName, params }],
            });
          } else {
            console.error("No navigation method available");
            Alert.alert(
              "Navigation Error",
              "Unable to navigate. Please restart the app."
            );
          }
        }
      } catch (error) {
        console.error("Navigation error:", error);
        Alert.alert(
          "Navigation Error",
          "Unable to navigate. Please try again."
        );
      }
    },
    [navigation, navigationReady]
  );

  // Safe go back helper
  const safeGoBack = useCallback(() => {
    try {
      if (!navigation) {
        console.warn("Navigation object is null for go back");
        return;
      }

      if (!navigationReady) {
        console.warn("Navigation not ready for go back");
        return;
      }

      if (
        navigation.canGoBack &&
        typeof navigation.canGoBack === "function" &&
        navigation.canGoBack()
      ) {
        navigation.goBack();
      } else if (navigation.reset && typeof navigation.reset === "function") {
        navigation.reset({
          index: 0,
          routes: [{ name: "EntryScreen" }],
        });
      } else {
        console.warn("No navigation method available for go back");
      }
    } catch (error) {
      console.error("Go back error:", error);
      // Fallback
      if (
        navigation &&
        navigation.reset &&
        typeof navigation.reset === "function"
      ) {
        navigation.reset({
          index: 0,
          routes: [{ name: "EntryScreen" }],
        });
      }
    }
  }, [navigation, navigationReady]);

  // Handle QR code scan
  const handleBarCodeScanned = useCallback(
    async ({ data, type }) => {
      if (loading || scanned || !isMountedRef.current) {
        console.log(
          "Scan ignored - loading:",
          loading,
          "scanned:",
          scanned,
          "mounted:",
          isMountedRef.current
        );
        return;
      }

      console.log("QR Code scanned:", { data, type });
      setScanned(true);
      setLoading(true);

      try {
        // Parse the QR code data
        let qrData;
        try {
          qrData = JSON.parse(data);
        } catch (error) {
          console.log("QR data is not JSON, treating as direct org ID");
          qrData = { orgId: data };
        }

        const orgId = qrData.orgId || qrData.organizationId || data;

        if (!orgId) {
          throw new Error("Invalid QR code format");
        }

        console.log("Processing organization ID:", orgId);

        // Verify organization exists in Firebase
        const db = getDb();
        if (!db) {
          throw new Error("Database connection not available");
        }

        // Check if organization document exists
        const orgDoc = doc(db, "organizations", orgId);
        const orgSnap = await getDoc(orgDoc);

        if (!orgSnap.exists()) {
          throw new Error("Organization not found");
        }

        // Get organization info from info/details subcollection
        const infoDoc = doc(db, "organizations", orgId, "info", "details");
        const infoSnap = await getDoc(infoDoc);

        if (!infoSnap.exists()) {
          throw new Error("Organization information not found");
        }

        const orgData = infoSnap.data();
        console.log("Organization data:", orgData);

        // Store organization data
        await AsyncStorage.setItem("selectedOrgId", orgId);
        await AsyncStorage.setItem("selectedOrgName", orgData.name || orgId);
        if (orgData.logo_url) {
          await AsyncStorage.setItem("selectedOrgLogo", orgData.logo_url);
        }
        if (orgData.icon) {
          await AsyncStorage.setItem("selectedOrgIcon", orgData.icon);
        }

        console.log("QR Login - Successfully processed organization");

        // Navigate to login screen with a slight delay to ensure state is clean
        setTimeout(() => {
          if (isMountedRef.current) {
            safeNavigate("LoginScreen");
          }
        }, 100);
      } catch (error) {
        console.error("QR scan error:", error);

        if (isMountedRef.current) {
          let errorMessage =
            "This QR code is not valid or the organization doesn't exist. Please try again.";

          if (error.message.includes("Organization not found")) {
            errorMessage =
              "Organization not found. Please check if the QR code is correct.";
          } else if (
            error.message.includes("Organization information not found")
          ) {
            errorMessage =
              "Organization information is incomplete. Please contact the administrator.";
          } else if (error.message.includes("Database connection")) {
            errorMessage =
              "Unable to connect to the database. Please check your internet connection.";
          } else if (error.message.includes("Invalid QR code format")) {
            errorMessage =
              "Invalid QR code format. Please scan a valid organization QR code.";
          }

          Alert.alert("QR Code Error", errorMessage, [
            {
              text: "OK",
              onPress: () => {
                if (isMountedRef.current) {
                  setScanned(false);
                }
              },
            },
          ]);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [loading, scanned, safeNavigate]
  );

  // Reset scanner
  const resetScanner = useCallback(() => {
    if (isMountedRef.current) {
      setScanned(false);
      setError(null);
    }
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (showScanner) {
      setShowScanner(false);
      setScanned(false);
      setError(null);
    } else {
      safeGoBack();
    }
  }, [showScanner, safeGoBack]);

  // Start scanning
  const startScanning = useCallback(() => {
    if (!permission?.granted) {
      Alert.alert(
        "Camera Permission Required",
        "To scan QR codes, we need access to your camera. Please enable camera permissions in your device settings.",
        [
          {
            text: "Grant Permission",
            onPress: requestPermission,
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
      return;
    }

    if (error) {
      setError(null);
    }

    setShowScanner(true);
    setScanned(false);
  }, [permission, error, requestPermission]);

  // Initialize navigation ready state
  useEffect(() => {
    if (navigation) {
      setNavigationReady(true);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [navigation]);

  // Handle focus/blur for camera
  useFocusEffect(
    useCallback(() => {
      if (showScanner && permission?.granted) {
        setScanned(false);
        setError(null);
      }
    }, [showScanner, permission])
  );

  // Loading state
  if (!permission || !navigationReady) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>
            {!permission
              ? "Checking camera permissions..."
              : "Initializing navigation..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied state
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <ArrowLeft color={NAVY} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>QR Login</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.mainContent}>
            <View style={styles.errorContainer}>
              <AlertCircle color="#ff6b6b" size={48} />
              <Text style={styles.errorTitle}>Camera Permission Required</Text>
              <Text style={styles.errorText}>
                To scan QR codes, we need access to your camera. Please enable
                camera permissions in your device settings.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={requestPermission}
                activeOpacity={0.7}
              >
                <Text style={styles.retryButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Scanner view
  if (showScanner) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.scannerContainer}>
          {/* Header */}
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <ArrowLeft color={WHITE} size={24} />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Camera Container */}
          <View style={styles.scannerWrapper}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            >
              {/* Scanner Overlay */}
              <View style={styles.overlay}>
                <View style={styles.scanFrame}>
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />
                </View>

                <View style={styles.instructionsContainer}>
                  <Text style={styles.scanInstructions}>
                    Position the QR code within the frame
                  </Text>
                </View>

                {scanned && (
                  <View style={styles.rescanContainer}>
                    <TouchableOpacity
                      style={styles.rescanButton}
                      onPress={resetScanner}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rescanButtonText}>Scan Again</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {error && (
                  <View style={styles.errorOverlay}>
                    <AlertCircle color={WHITE} size={24} />
                    <Text style={styles.errorOverlayText}>{error}</Text>
                    <TouchableOpacity
                      style={styles.errorRetryButton}
                      onPress={() => setError(null)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.errorRetryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </CameraView>
          </View>

          {/* Loading overlay */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={WHITE} />
              <Text style={styles.loadingText}>Verifying organization...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Main view
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ArrowLeft color={NAVY} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Login</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.logoContainer}>
            <Image source={aitoLogo} style={styles.logo} />
          </View>

          <Text style={styles.title}>Quick Organization Access</Text>
          <Text style={styles.subtitle}>
            Scan your organization's QR code to quickly access your account
          </Text>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <QrCode size={24} color={NAVY} />
              <Text style={styles.featureText}>
                Instant organization detection
              </Text>
            </View>
            <View style={styles.featureItem}>
              <CameraIcon size={24} color={NAVY} />
              <Text style={styles.featureText}>Secure QR code scanning</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={startScanning}
            activeOpacity={0.85}
          >
            <CameraIcon color={WHITE} size={24} />
            <Text style={styles.scanButtonText}>Start Scanning</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => safeNavigate("LandingScreen")}
            activeOpacity={0.7}
          >
            <Text style={styles.manualButtonText}>
              Or find organization manually
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: NAVY,
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: NAVY,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: NAVY,
    marginLeft: 12,
  },
  scanButton: {
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  manualButton: {
    paddingVertical: 12,
  },
  manualButtonText: {
    color: NAVY,
    fontSize: 16,
    textDecorationLine: "underline",
  },
  // Error states
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ff6b6b",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: NAVY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
  // Scanner styles
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: WHITE,
  },
  scannerWrapper: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: WHITE,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: WHITE,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: WHITE,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: WHITE,
  },
  instructionsContainer: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scanInstructions: {
    color: WHITE,
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rescanContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    padding: 20,
  },
  rescanButton: {
    backgroundColor: NAVY,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  rescanButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
  errorOverlay: {
    position: "absolute",
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 107, 107, 0.9)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  errorOverlayText: {
    color: WHITE,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  errorRetryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  errorRetryButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "600",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: WHITE,
    fontSize: 16,
    marginTop: 16,
  },
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default QRLoginScreen;
