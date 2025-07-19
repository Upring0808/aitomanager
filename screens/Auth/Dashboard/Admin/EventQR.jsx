import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import Toast from "react-native-toast-message";
import ViewShot from "react-native-view-shot";
import { db } from "../../../../config/firebaseconfig";
import { collection, getDocs, getDoc, doc, query, where, addDoc, updateDoc } from "firebase/firestore";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Helper to parse timeframe and return [startDate, endDate] as Date objects
function parseLocalDateTime(date, timeStr) {
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
}

function getEventStartEnd(event) {
  if (!event.dueDate || !event.timeframe) return [null, null];
  const date = new Date(event.dueDate.seconds * 1000);
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
}

const EventQR = ({ navigation, route }) => {
  const { event, organization } = route.params;
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const viewShotRef = useRef();
  const [now, setNow] = useState(Date.now());
  const [timer, setTimer] = useState(0);

  // Use helper to get event start/end
  const [eventStart, eventEnd] = getEventStartEnd(event);
  const qrRelease = eventStart
    ? new Date(eventStart.getTime() - 60 * 60 * 1000)
    : null; // 1 hour before start

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate time until QR release or event end
  let qrAvailable = false;
  let eventEnded = false;
  let countdown = 0;
  if (eventStart && qrRelease) {
    if (now < qrRelease.getTime()) {
      qrAvailable = false;
      countdown = qrRelease.getTime() - now;
    } else if (eventEnd && now > eventEnd.getTime()) {
      qrAvailable = false;
      eventEnded = true;
    } else {
      qrAvailable = true;
    }
  }

  // Parse QR data
  const qrData =
    event.qrCode ||
    JSON.stringify({
      type: "event_attendance",
      eventId: event.id,
      orgId: organization?.id,
      eventTitle: event.title,
      eventTimeframe: event.timeframe,
      eventDate: event.dueDate?.toISOString(),
    });

  const qrDataObj = JSON.parse(qrData);

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

  const formatDate = (dateObj) => {
    if (!dateObj || !dateObj.seconds) return "No Date";
    try {
      const date = new Date(dateObj.seconds * 1000);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  useEffect(() => {
    const autoFineAbsentees = async () => {
      if (!eventEnded || event.finesProcessed) return;
      try {
        // Get orgId and eventId
        const orgId = organization?.id;
        const eventId = event.id;
        if (!orgId || !eventId) return;

        // Fetch fine settings
        const fineSettingsRef = doc(db, "organizations", orgId, "settings", "fineSettings");
        const fineSettingsSnap = await getDoc(fineSettingsRef);
        const fineSettings = fineSettingsSnap.exists()
          ? fineSettingsSnap.data()
          : { studentFine: 50, officerFine: 100 };

        // Fetch all users
        const usersRef = collection(db, "organizations", orgId, "users");
        const usersSnapshot = await getDocs(usersRef);
        const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Get attendees
        const attendees = event.attendees || [];

        // Fine absentees
        for (const user of users) {
          if (attendees.includes(user.id)) continue;
          // Check if already fined for this event
          const finesRef = collection(db, "organizations", orgId, "fines");
          const finesQuery = query(finesRef, where("userId", "==", user.id), where("eventId", "==", eventId));
          const finesSnap = await getDocs(finesQuery);
          if (!finesSnap.empty) continue;
          // Determine fine amount
          let amount = 0;
          if (user.role && user.role !== "student") {
            amount = fineSettings.officerFine || 100;
          } else {
            amount = fineSettings.studentFine || 50;
          }
          // Create fine
          await addDoc(finesRef, {
            userId: user.id,
            userFullName: user.fullName || "Unknown User",
            userStudentId: user.studentId || "No ID",
            userRole: user.role || "student",
            eventId: eventId,
            eventTitle: event.title || "Unknown Event",
            eventDueDate: event.dueDate || null,
            eventTimeframe: event.timeframe || "No timeframe",
            amount,
            status: "unpaid",
            createdAt: new Date(),
            description: `Fine for missing ${event.title || "an event"}`,
            issuedBy: {
              uid: "system",
              username: "System",
              role: "system",
            },
          });
        }

        // Mark event as processed
        const eventRef = doc(db, "organizations", orgId, "events", eventId);
        await updateDoc(eventRef, { finesProcessed: true });
      } catch (error) {
        console.error("Auto-fine error:", error);
      }
    };

    if (eventEnded) {
      autoFineAbsentees();
    }
    // eslint-disable-next-line
  }, [eventEnded]);

  useEffect(() => {
    // Set navigation bar color to white (opaque)
    if (Platform.OS === 'android') {
      if (StatusBar.setBackgroundColor) {
        StatusBar.setBackgroundColor('#ffffff', true);
      }
    }
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Debug info for event times */}
      <View
        style={{
          padding: 10,
          backgroundColor: "#f8f9fa",
          borderBottomWidth: 1,
          borderColor: "#eee",
        }}
      >
        <Text style={{ fontSize: 12, color: "#203562" }}>
          Now: {new Date(now).toLocaleString()}
        </Text>
        <Text style={{ fontSize: 12, color: "#203562" }}>
          Event Start: {eventStart ? eventStart.toLocaleString() : "N/A"}
        </Text>
        <Text style={{ fontSize: 12, color: "#203562" }}>
          Event End: {eventEnd ? eventEnd.toLocaleString() : "N/A"}
        </Text>
      </View>

    

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Information */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventTimeframe}>{event.timeframe}</Text>
          <Text style={styles.eventDate}>{formatDate(event.dueDate)}</Text>
          <Text style={styles.organizationName}>{organization?.name}</Text>
          {event.description && (
            <Text style={styles.eventDescription}>{event.description}</Text>
          )}
        </View>

        {/* QR Code or Timer */}
        <View style={styles.qrContainer}>
          {!qrAvailable && !eventEnded && (
            <>
              <Text style={styles.qrTitle}>QR code will be available in:</Text>
              <Text style={styles.countdownText}>
                {countdown > 0
                  ? `${Math.floor(countdown / 3600000)}h ${Math.floor(
                      (countdown % 3600000) / 60000
                    )}m ${Math.floor((countdown % 60000) / 1000)}s`
                  : "Soon"}
              </Text>
              <Text style={styles.qrNote}>
                QR code is released 1 hour before the event start time.
              </Text>
            </>
          )}
          {qrAvailable && (
            <>
              <Text style={styles.qrTitle}>Scan to Mark Attendance</Text>
              <ViewShot
                ref={viewShotRef}
                options={{
                  format: "png",
                  quality: 1.0,
                  result: "tmpfile",
                }}
                style={styles.qrWrapper}
              >
                <View style={styles.qrCodeContainer}>
                  <QRCode
                    value={qrData}
                    size={250}
                    color="#203562"
                    backgroundColor="white"
                    logo={
                      organization?.logoUrl
                        ? { uri: organization.logoUrl }
                        : null
                    }
                    logoSize={60}
                    logoMargin={10}
                    logoBorderRadius={15}
                    logoBackgroundColor="white"
                  />
                </View>
              </ViewShot>
            </>
          )}
          {eventEnded && (
            <>
              <Text style={styles.qrTitle}>Event has ended.</Text>
              <Text style={styles.qrNote}>Attendance is now closed.</Text>
            </>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to use:</Text>
          <View style={styles.instructionItem}>
            <FontAwesome name="display" size={16} color="#203562" />
            <Text style={styles.instructionText}>
              Display this QR code during the event
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <FontAwesome name="mobile" size={16} color="#203562" />
            <Text style={styles.instructionText}>
              Participants scan it to mark attendance
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <FontAwesome name="check-circle" size={16} color="#203562" />
            <Text style={styles.instructionText}>
              Attendance is automatically recorded
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <FontAwesome name="lock" size={16} color="#203562" />
            <Text style={styles.instructionText}>
              Each QR code is unique to this specific event
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSaveImage}
            disabled={saving}
          >
            <FontAwesome
              name={saving ? "spinner" : "download"}
              size={20}
              color="white"
            />
            <Text style={styles.actionButtonText}>
              {saving ? "Saving..." : "Save to Gallery"}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Add minimal extra space at the bottom for safe area */}
        <View style={{ height: Math.max(insets.bottom, 4) }} />
      </ScrollView>
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  safeAreaHeader: {
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingTop: 30,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#203562",
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  eventInfo: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#203562",
    marginBottom: 8,
  },
  eventTimeframe: {
    fontSize: 18,
    color: "#203562",
    fontWeight: "600",
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  organizationName: {
    fontSize: 16,
    color: "#203562",
    fontWeight: "600",
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  qrContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#203562",
    marginBottom: 20,
    textAlign: "center",
  },
  qrWrapper: {
    alignItems: "center",
  },
  qrCodeContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  instructions: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#203562",
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    flex: 1,
  },
  actionButtons: {
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#203562",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  countdownText: {
    fontSize: 16,
    color: "#203562",
    fontWeight: "600",
    marginBottom: 8,
  },
  qrNote: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

export default EventQR;
