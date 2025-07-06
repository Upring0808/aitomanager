import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import Toast from "react-native-toast-message";
import ViewShot from "react-native-view-shot";

const QRCodeGenerator = ({ organization, visible, onClose }) => {
  const [saving, setSaving] = useState(false);
  const viewShotRef = useRef();

  // Parse QR data to determine if it's an event or organization QR
  const qrData =
    organization.qrData ||
    JSON.stringify({
      type: "organization_login",
      orgId: organization.id,
      orgName: organization.name,
    });

  const qrDataObj = JSON.parse(qrData);
  const isEventQR = qrDataObj.type === "event_attendance";

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Join ${organization.name}! Use this QR code to access our organization portal. Org ID: ${organization.id}`,
        title: "Organization QR Code",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to share QR code",
      });
    }
  };

  const handleSaveImage = async () => {
    if (!viewShotRef.current) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "QR code not ready",
      });
      return;
    }

    try {
      setSaving(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to save images to your gallery."
        );
        setSaving(false);
        return;
      }

      // Capture the QR code using ViewShot
      const uri = await viewShotRef.current.capture({
        format: "png",
        quality: 1.0,
        result: "tmpfile",
      });

      console.log("Captured QR code URI:", uri);

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(uri);

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "QR code saved to gallery!",
      });
    } catch (error) {
      console.error("Error saving QR code:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to save QR code: " + error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {isEventQR
                  ? "Event Attendance QR Code"
                  : "Organization QR Code"}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Event/Organization Info */}
            <View style={styles.orgInfo}>
              {isEventQR ? (
                <>
                  <Text style={styles.eventTitle}>{qrDataObj.eventTitle}</Text>
                  <Text style={styles.eventTimeframe}>
                    {qrDataObj.eventTimeframe}
                  </Text>
                  <Text style={styles.eventDate}>
                    {new Date(qrDataObj.eventDate).toLocaleDateString()}
                  </Text>
                  <Text style={styles.orgName}>{organization.name}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.orgName}>{organization.name}</Text>
                  <Text style={styles.orgId}>ID: {organization.id}</Text>
                </>
              )}
            </View>

            {/* QR Code with ViewShot wrapper */}
            <ViewShot
              ref={viewShotRef}
              options={{
                format: "png",
                quality: 1.0,
                result: "tmpfile",
              }}
              style={styles.qrContainer}
            >
              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrData}
                  size={200}
                  color="#203562"
                  backgroundColor="white"
                  logo={
                    organization.logoUrl
                      ? { uri: organization.logoUrl }
                      : require("../assets/logo.png")
                  }
                  logoSize={30}
                  logoMargin={8}
                  logoBorderRadius={12}
                  logoBackgroundColor="white"
                />
              </View>
            </ViewShot>

            {/* Instructions */}
            <View style={styles.instructions}>
              <Text style={styles.instructionTitle}>How to use:</Text>
              {isEventQR ? (
                <>
                  <Text style={styles.instructionText}>
                    1. Display this QR code during the event
                  </Text>
                  <Text style={styles.instructionText}>
                    2. Participants scan it to mark attendance
                  </Text>
                  <Text style={styles.instructionText}>
                    3. Attendance is automatically recorded
                  </Text>
                  <Text style={styles.instructionText}>
                    4. Each QR code is unique to this specific event
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.instructionText}>
                    1. Share this QR code with organization members
                  </Text>
                  <Text style={styles.instructionText}>
                    2. They can scan it to quickly access the login screen
                  </Text>
                  <Text style={styles.instructionText}>
                    3. The organization ID will be automatically filled
                  </Text>
                </>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Feather name="share-2" size={20} color="white" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveImage}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Feather
                  name={saving ? "loader" : "download"}
                  size={20}
                  color="white"
                />
                <Text style={styles.actionButtonText}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#203562",
  },
  closeButton: {
    padding: 4,
  },
  orgInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  orgName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#203562",
    textAlign: "center",
  },
  orgId: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#203562",
    textAlign: "center",
    marginBottom: 4,
  },
  eventTimeframe: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007BFF",
    textAlign: "center",
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
  },
  qrWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  instructions: {
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#203562",
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButton: {
    backgroundColor: "#007BFF",
  },
  saveButton: {
    backgroundColor: "#28a745",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
});

export default QRCodeGenerator;
