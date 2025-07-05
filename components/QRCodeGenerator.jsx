import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Alert,
  ActivityIndicator,
} from "react-native";
import QRCode from "qrcode.react";
import { Camera, Download, Share2 } from "lucide-react-native";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import ViewShot from "react-native-view-shot";

const NAVY = "#203562";
const WHITE = "#fff";

const QRCodeGenerator = ({ organization, visible, onClose }) => {
  const [qrData, setQrData] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewShotRef, setViewShotRef] = useState(null);

  useEffect(() => {
    if (organization && visible) {
      // Create QR data with organization information
      const data = {
        orgId: organization.id,
        organizationId: organization.id,
        name: organization.name,
        timestamp: new Date().toISOString(),
        type: "organization_login",
      };
      setQrData(JSON.stringify(data));
    }
  }, [organization, visible]);

  const handleSaveQR = async () => {
    if (!viewShotRef) return;

    try {
      setSaving(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to save the QR code to your gallery."
        );
        return;
      }

      // Capture the QR code as image
      const uri = await viewShotRef.capture();

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(uri);

      Alert.alert("Success", "QR code has been saved to your gallery!", [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error saving QR code:", error);
      Alert.alert("Error", "Failed to save QR code. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleShareQR = async () => {
    if (!viewShotRef) return;

    try {
      setSaving(true);

      // Capture the QR code as image
      const uri = await viewShotRef.capture();

      // Share the image
      await Share.share({
        url: uri,
        title: `${organization.name} QR Code`,
        message: `Scan this QR code to access ${organization.name} on FIVENT FLOW`,
      });
    } catch (error) {
      console.error("Error sharing QR code:", error);
      Alert.alert("Error", "Failed to share QR code. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleTestQR = () => {
    Alert.alert(
      "Test QR Code",
      "To test this QR code:\n\n1. Open FIVENT FLOW on another device\n2. Go to QR Login\n3. Scan this QR code\n4. You should be redirected to the login screen for this organization",
      [{ text: "OK" }]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Code</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.orgInfo}>
            <Text style={styles.orgName}>{organization?.name}</Text>
            <Text style={styles.orgSubtitle}>Organization QR Code</Text>
          </View>

          <View style={styles.qrContainer}>
            <ViewShot
              ref={setViewShotRef}
              options={{
                format: "png",
                quality: 1,
                width: 300,
                height: 300,
              }}
              style={styles.qrWrapper}
            >
              <View style={styles.qrBackground}>
                {qrData ? (
                  <QRCode
                    value={qrData}
                    size={250}
                    fgColor={NAVY}
                    bgColor={WHITE}
                    level="M"
                    includeMargin={true}
                  />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <ActivityIndicator size="large" color={NAVY} />
                    <Text style={styles.qrPlaceholderText}>
                      Generating QR Code...
                    </Text>
                  </View>
                )}
              </View>
            </ViewShot>
          </View>

          <Text style={styles.instructions}>
            Share this QR code with your organization members. When they scan
            it, they'll be directed to the login screen for {organization?.name}
            .
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSaveQR}
              disabled={saving}
            >
              <Download size={20} color={WHITE} />
              <Text style={styles.actionButtonText}>
                {saving ? "Saving..." : "Save to Gallery"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={handleShareQR}
              disabled={saving}
            >
              <Share2 size={20} color={NAVY} />
              <Text style={styles.shareButtonText}>
                {saving ? "Sharing..." : "Share"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.testButton} onPress={handleTestQR}>
            <Camera size={16} color={NAVY} />
            <Text style={styles.testButtonText}>How to Test</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
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
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "500",
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  orgInfo: {
    alignItems: "center",
    marginBottom: 32,
  },
  orgName: {
    fontSize: 24,
    fontWeight: "700",
    color: NAVY,
    textAlign: "center",
    marginBottom: 4,
  },
  orgSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  qrWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  qrBackground: {
    backgroundColor: WHITE,
    padding: 20,
    borderRadius: 16,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  qrPlaceholder: {
    width: 250,
    height: 250,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlaceholderText: {
    marginTop: 16,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  instructions: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: NAVY,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: NAVY,
  },
  shareButtonText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  testButtonText: {
    color: NAVY,
    fontSize: 16,
    marginLeft: 8,
    textDecorationLine: "underline",
  },
});

export default QRCodeGenerator;
