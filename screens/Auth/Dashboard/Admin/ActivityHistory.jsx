import React, { useEffect, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SectionList,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { format, isSameDay, isValid } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../../../config/firebaseconfig";

const auth = getAuth();

// Add a safe date formatting utility
const safeFormat = (date, fmt) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  return format(date, fmt);
};

const ActivityHistory = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarMode, setCalendarMode] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      setError(null);
      try {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) {
          setActivities([]);
          setLoading(false);
          return;
        }
        const activitiesRef = collection(db, "organizations", orgId, "activities");
        const q = query(activitiesRef, orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        // Only include relevant activity types
        const allowedTypes = [
          "fine_added",
          "fine_paid",
          "event_added",
          "student_added",
          "role_changed",
          "settings_updated"
        ];
        const activitiesList = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
            };
          })
          .filter((activity) => allowedTypes.includes(activity.type));
        setActivities(activitiesList);
      } catch (err) {
        setError("Failed to load activity history.");
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const [filteredActivities, setFilteredActivities] = useState([]);
  useEffect(() => {
    const filtered = activities.filter((activity) => {
      const activityDate = new Date(activity.timestamp);
      return isSameDay(activityDate, selectedDate);
    });
    const sortedFiltered = filtered.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    setFilteredActivities(sortedFiltered);
  }, [selectedDate, activities]);

  const getActivityIcon = (type) => {
    switch (type) {
      case "student_added":
        return "person-add-outline";
      case "fine_added":
        return "cash-outline";
      case "fine_paid":
        return "checkmark-circle-outline";
      case "event_added":
        return "calendar-outline";
      case "role_changed":
        return "swap-horizontal-outline";
      case "settings_updated":
        return "settings-outline";
      default:
        return "information-circle-outline";
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "student_added":
        return "#0A2463";
      case "fine_added":
        return "#D92626";
      case "fine_paid":
        return "#16a34a";
      case "event_added":
        return "#2E7D32";
      case "role_changed":
        return "#6D28D9";
      case "settings_updated":
        return "#64748B";
      default:
        return "#64748B";
    }
  };

  const formatActivityDescription = (activity) => {
    if (!activity || !activity.details) {
      return "Activity details not available";
    }

    const details = activity.details;
    switch (activity.type) {
      case "student_added":
        return `New ${details.studentRole || "student"} ${
          details.studentName || "Unknown"
        } added by ${details.issuedBy || "System"} (${
          details.adminRole || "Admin"
        })`;

      case "fine_added":
        return `Fine of ₱${details.amount || "0"} added to ${
          details.studentName || "Unknown"
        } for ${details.eventTitle || "Unknown Event"} by ${
          details.issuedBy || "System"
        } (${details.adminRole || "Admin"})`;

      case "fine_paid": {
        const paidDate = details.paidAt?.toDate();
        const studentName = details.studentName || "Unknown";
        const eventTitle = details.eventTitle || "Unknown Event";
        const displayDate =
          paidDate && !isNaN(paidDate.getTime())
            ? format(paidDate, "MMM d, yyyy")
            : "Unknown Date";
        return `Fine of ₱${
          details.amount || "0"
        } paid by ${studentName} for ${eventTitle} on ${displayDate}`;
      }

      case "role_changed":
        return `Role changed for ${details.studentName || "Unknown"} from ${
          details.oldRole || "Unknown"
        } to ${details.newRole || "Unknown"} by ${
          details.issuedBy || "System"
        } (${details.adminRole || "Admin"})`;

      case "event_added":
        return `New event "${details.eventTitle || "Untitled Event"}" (${
          details.eventTimeframe || "No timeframe"
        }) created by ${details.issuedBy || "System"} (${
          details.adminRole || "Admin"
        })`;

      case "settings_updated":
        return `Settings updated by ${details.issuedBy || "System"} (${
          details.adminRole || "Admin"
        })`;

      default:
        return activity.description || "No description available";
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const handleDeleteHistoryPress = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setPasswordError("");

    const user = auth.currentUser;

    if (!user || !user.email) {
      Alert.alert("Error", "Admin user not found.");
      setIsDeleting(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        adminPassword
      );

      await reauthenticateWithCredential(user, credential);

      await deleteAllActivities();
      Alert.alert("Success", "Activity history deleted.");
      setShowDeleteModal(false);
      setAdminPassword("");
    } catch (error) {
      console.error("Error re-authenticating or deleting history: ", error);
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        setPasswordError("Incorrect password.");
      } else {
        Alert.alert(
          "Error",
          "Failed to delete activity history. Please try again."
        );
        setShowDeleteModal(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setAdminPassword("");
    setPasswordError("");
  };

  const deleteAllActivities = async () => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) {
        Alert.alert("Error", "Organization ID not found.");
        return;
      }
      const activitiesRef = collection(db, "organizations", orgId, "activities");
      const q = query(activitiesRef);

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      setActivities([]);
    } catch (error) {
      console.error("Error deleting activity history: ", error);
      throw error;
    }
  };

  // Move calendar and delete buttons to navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {calendarMode ? (
            <TouchableOpacity onPress={() => setCalendarMode(false)} style={{ padding: 8, marginRight: 10 }}>
              <Icon name="list-outline" size={24} color="#0A2463" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setCalendarMode(true)} style={{ padding: 8, marginRight: 10 }}>
              <Icon name="calendar-outline" size={24} color="#0A2463" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDeleteHistoryPress} style={{ padding: 8 }}>
            <Icon name="trash-outline" size={24} color="#D92626" />
          </TouchableOpacity>
        </View>
      ),
      headerTitle: 'Activity History',
    });
  }, [navigation, calendarMode]);

  // Group activities by date for SectionList
  const groupedActivities = React.useMemo(() => {
    const groups = {};
    activities.forEach((activity) => {
      const dateKey = format(new Date(activity.timestamp), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(activity);
    });
    return Object.entries(groups)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .map(([date, acts]) => ({
        title: format(new Date(date), "MMM d, yyyy"),
        data: acts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      }));
  }, [activities]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>Loading activity history...</Text>
          </View>
        ) : error ? (
          <View style={styles.noActivitiesContainer}>
            <Text style={styles.noActivitiesText}>{error}</Text>
          </View>
        ) : calendarMode ? (
          <>
            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={selectedDate}
                mode={"date"}
                is24Hour={true}
                display={"default"}
                onChange={handleDateChange}
              />
            )}
            <TouchableOpacity onPress={() => setCalendarMode(false)} style={{ alignSelf: 'flex-start', margin: 12, padding: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="arrow-back" size={20} color="#0A2463" />
              <Text style={{ color: '#0A2463', fontWeight: '600', marginLeft: 6 }}>Back to All</Text>
            </TouchableOpacity>
            <View style={styles.filterDateContainer}>
              <Text style={styles.filterDateText}>
                Activities on: {format(selectedDate, "MMM d, yyyy")}
              </Text>
            </View>
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: `${getActivityColor(activity.type)}20` },
                    ]}
                  >
                    <Icon
                      name={getActivityIcon(activity.type)}
                      size={20}
                      color={getActivityColor(activity.type)}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>
                      {formatActivityDescription(activity)}
                    </Text>
                    <Text style={styles.activityTime}>
                      {safeFormat(activity.timestamp, "MMM d, yyyy 'at' h:mm a")}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noActivitiesContainer}>
                <Text style={styles.noActivitiesText}>
                  No activities found for this date.
                </Text>
              </View>
            )}
          </>
        ) : (
          <SectionList
            sections={groupedActivities}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.filterDateContainer}>
                <Text style={styles.filterDateText}>{title}</Text>
              </View>
            )}
            renderItem={({ item: activity }) => (
              <View key={activity.id} style={styles.activityItem}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: `${getActivityColor(activity.type)}20` },
                  ]}
                >
                  <Icon
                    name={getActivityIcon(activity.type)}
                    size={20}
                    color={getActivityColor(activity.type)}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    {formatActivityDescription(activity)}
                  </Text>
                  <Text style={styles.activityTime}>
                    {safeFormat(activity.timestamp, "MMM d, yyyy 'at' h:mm a")}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.noActivitiesContainer}>
                <Text style={styles.noActivitiesText}>
                  No activities found.
                </Text>
              </View>
            )}
            contentContainerStyle={styles.contentContainer}
          />
        )}

        <Modal
          animationType="fade"
          transparent={true}
          visible={showDeleteModal}
          onRequestClose={handleCancelDelete}
          statusBarTranslucent={true}
          hardwareAccelerated={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirm Deletion</Text>
              <Text style={styles.modalMessage}>
                This action will permanently delete all activity history. Please
                enter your admin password to confirm.
              </Text>
              <TextInput
                style={[
                  styles.passwordInput,
                  passwordError ? styles.inputError : null,
                ]}
                placeholder="Admin Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={adminPassword}
                onChangeText={setAdminPassword}
                editable={!isDeleting}
              />
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancelDelete}
                  disabled={isDeleting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleConfirmDelete}
                  disabled={isDeleting || adminPassword.length === 0}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
    backgroundColor: "#0A2463",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  datePickerButton: {
    padding: 8,
    marginRight: 10,
  },
  deleteButton: {
    padding: 8,
  },
  filterDateContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  filterDateText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingTop: 16,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activityIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: "#334155",
    marginBottom: 2,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 11,
    color: "#64748B",
  },
  noActivitiesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  noActivitiesText: {
    fontSize: 16,
    color: "#64748B",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 14,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1F2937",
  },
  modalMessage: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 20,
  },
  passwordInput: {
    width: "100%",
    height: 40,
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    color: "#1F2937",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginBottom: 10,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  confirmButton: {
    backgroundColor: "#DC2626",
  },
  confirmButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
});

export default ActivityHistory;
