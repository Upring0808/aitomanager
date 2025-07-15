import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { db, auth } from "../config/firebaseconfig";
import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

const QRScanner = ({ visible, onClose, onAttendanceMarked }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setScanning(true);
    } else {
      setScanning(false);
    }
  }, [visible]);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || processing) return;

    setScanned(true);
    setScanning(false);
    setProcessing(true);

    try {
      console.log("Scanned QR Code:", data);

      // Parse the QR code data
      const qrData = JSON.parse(data);

      // Validate QR code structure
      if (
        !qrData.eventId ||
        !qrData.orgId ||
        qrData.type !== "event_attendance"
      ) {
        throw new Error("Invalid QR code format");
      }

      // Get current user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Get organization ID from storage
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId || orgId !== qrData.orgId) {
        throw new Error("QR code is not for this organization");
      }

      // Check if event exists and is valid
      const eventRef = doc(
        db,
        "organizations",
        orgId,
        "events",
        qrData.eventId
      );
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error("Event not found");
      }

      const eventData = eventDoc.data();

      // Helper to parse local time for event timeframe
      const parseLocalDateTime = (date, timeStr) => {
        // timeStr: "21:00" or "9:00 PM"
        let hours = 0,
          minutes = 0;
        if (/AM|PM/i.test(timeStr)) {
          // 12-hour format
          const [time, modifier] = timeStr.split(/\s+/);
          let [h, m] = time.split(":").map(Number);
          if (modifier.toUpperCase() === "PM" && h !== 12) h += 12;
          if (modifier.toUpperCase() === "AM" && h === 12) h = 0;
          hours = h;
          minutes = m;
        } else {
          // 24-hour format
          [hours, minutes] = timeStr.split(":").map(Number);
        }
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          hours,
          minutes,
          0,
          0
        );
      };

      const getEventStartEnd = (event) => {
        if (!event.dueDate || !event.timeframe) return [null, null];
        const date = new Date(event.dueDate);
        // 12-hour
        let match = event.timeframe.match(
          /(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i
        );
        if (match) {
          const [_, startStr, endStr] = match;
          const startDate = parseLocalDateTime(date, startStr);
          const endDate = parseLocalDateTime(date, endStr);
          return [startDate, endDate];
        }
        // 24-hour
        match = event.timeframe.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        if (match) {
          const [_, startStr, endStr] = match;
          const startDate = parseLocalDateTime(date, startStr);
          const endDate = parseLocalDateTime(date, endStr);
          return [startDate, endDate];
        }
        return [date, date];
      };

      // Check if event is still active using robust timeframe parsing
      const [eventStart, eventEnd] = getEventStartEnd(eventData);
      const now = new Date();

      if (!eventEnd || now > eventEnd) {
        throw new Error("Event has already ended");
      }

      // Check if user has already attended
      const attendees = eventData.attendees || [];
      if (attendees.includes(currentUser.uid)) {
        // Show a more user-friendly message for already attended
        Toast.show({
          type: "info",
          text1: "Already Attended",
          text2: `You have already marked attendance for ${eventData.title}`,
        });

        // Close scanner after showing message
        setTimeout(() => {
          onClose();
        }, 3000);
        return;
      }

      // Mark attendance with timestamp
      const attendanceTimestamp = new Date();
      await updateDoc(eventRef, {
        attendees: arrayUnion(currentUser.uid),
        [`attendanceTimestamps.${currentUser.uid}`]: attendanceTimestamp,
      });

      // Get user details for confirmation
      const userRef = doc(db, "organizations", orgId, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      // Format timestamp for display
      const formattedTime = attendanceTimestamp.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      Toast.show({
        type: "success",
        text1: "Attendance Marked Successfully!",
        text2: `${eventData.title} - ${formattedTime}`,
      });

      // Call callback to refresh events
      if (onAttendanceMarked) {
        onAttendanceMarked();
      }

      // Close scanner after successful scan
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error processing QR code:", error);

      let errorMessage = "Failed to process QR code";
      if (error.message.includes("Invalid QR code")) {
        errorMessage = "Invalid QR code format";
      } else if (error.message.includes("Event not found")) {
        errorMessage = "Event not found or has been removed";
      } else if (error.message.includes("Event has already ended")) {
        errorMessage = "This event has already ended";
      } else if (error.message.includes("already marked attendance")) {
        errorMessage = "Attendance already marked for this event";
      } else if (error.message.includes("not for this organization")) {
        errorMessage = "This QR code is not for your organization";
      }

      Toast.show({
        type: "error",
        text1: "Scan Failed",
        text2: errorMessage,
      });

      // Reset for next scan
      setScanned(false);
      setScanning(true);
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScanning(true);
  };

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.container}>
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <ActivityIndicator size="large" color="#203562" />
              <Text style={styles.loadingText}>
                Checking camera permissions...
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.container}>
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <FontAwesome name="camera" size={48} color="#ccc" />
              <Text style={styles.errorText}>Camera access denied</Text>
              <Text style={styles.errorSubtext}>
                Please enable camera permission to scan QR codes
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={requestPermission}
              >
                <Text style={styles.retryButtonText}>Grant Permission</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal 
      visible={visible} 
      animationType="slide"
      statusBarTranslucent={true}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent={true} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Event QR Code</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          {scanning && (
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            >
              {/* Scanning Overlay */}
              <View style={styles.overlay}>
                <View style={styles.scanArea}>
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />
                </View>

                <Text style={styles.scanText}>
                  Position the QR code within the frame
                </Text>
              </View>

              {/* Processing Overlay */}
              {processing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="white" />
                  <Text style={styles.processingText}>Processing...</Text>
                </View>
              )}
            </CameraView>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {scanned && !processing && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={resetScanner}
            >
              <FontAwesome name="refresh" size={20} color="white" />
              <Text style={styles.rescanButtonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50, // Account for status bar
    paddingBottom: 15,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 1000,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
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
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#203562",
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#203562",
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#203562",
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#203562",
  },
  scanText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginTop: 30,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingText: {
    color: "white",
    fontSize: 18,
    marginTop: 15,
  },
  bottomControls: {
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  rescanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#203562",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  rescanButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    margin: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 15,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  closeButtonText: {
    color: "#203562",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: "#203562",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default QRScanner;
