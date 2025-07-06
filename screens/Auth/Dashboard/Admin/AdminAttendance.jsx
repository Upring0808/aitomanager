import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../../config/firebaseconfig";
import Toast from "react-native-toast-message";

const AdminAttendance = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [markedDates, setMarkedDates] = useState({});
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadAttendanceData(selectedEvent);
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;

      // Load organization info
      const orgRef = doc(db, "organizations", orgId);
      const orgDoc = await getDoc(orgRef);
      const infoDocRef = doc(db, "organizations", orgId, "info", "details");
      const infoSnap = await getDoc(infoDocRef);

      setOrganization({
        id: orgId,
        name: orgDoc.data().name || "Organization",
        logoUrl: infoSnap.exists() ? infoSnap.data().logo_url || null : null,
      });

      const eventsRef = collection(db, "organizations", orgId, "events");
      const snapshot = await getDocs(eventsRef);
      const eventsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventsList);

      // Create marked dates for calendar
      const marked = {};
      eventsList.forEach((event) => {
        if (event.dueDate) {
          const date = new Date(event.dueDate.seconds * 1000);
          const dateString = date.toISOString().split("T")[0];
          marked[dateString] = {
            marked: true,
            dotColor: "#dc3545",
            textColor: "#333",
          };
        }
      });
      setMarkedDates(marked);
    } catch (error) {
      console.error("Error loading events:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load events",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const loadAttendanceData = async (event) => {
    try {
      setLoading(true);
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      // Get all users in the organization
      const usersRef = collection(db, "organizations", orgId, "users");
      const usersSnapshot = await getDocs(usersRef);
      const users = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Get attendance data for the selected event
      const attendees = event.attendees || [];
      const attendanceTimestamps = event.attendanceTimestamps || {};
      // Use helper to get event start/end
      const [eventStart, eventEnd] = getEventStartEnd(event);
      // Check if event has ended
      const now = new Date();
      const eventHasEnded = eventEnd ? now > eventEnd : false;
      const attendanceList = users.map((user) => {
        const hasAttended = attendees.includes(user.id);
        const attendanceTimestamp = attendanceTimestamps[user.id];
        // Only mark as absent if event has ended and user hasn't attended
        const isAbsent = eventHasEnded && !hasAttended;
        return {
          id: user.id,
          username:
            user.username ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "Unknown User",
          email: user.email,
          avatarUrl: user.avatarUrl,
          hasAttended: hasAttended,
          isAbsent: isAbsent,
          attendanceTimestamp: attendanceTimestamp,
          eventHasEnded: eventHasEnded,
        };
      });
      setAttendanceData(attendanceList);
    } catch (error) {
      console.error("Error loading attendance data:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load attendance data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date.dateString);

    // Find events for the selected date
    const eventsOnDate = events.filter((event) => {
      if (event.dueDate) {
        const eventDate = new Date(event.dueDate.seconds * 1000);
        const eventDateString = eventDate.toISOString().split("T")[0];
        return eventDateString === date.dateString;
      }
      return false;
    });

    if (eventsOnDate.length > 0) {
      // If multiple events on same date, show selection
      if (eventsOnDate.length === 1) {
        setSelectedEvent(eventsOnDate[0]);
      } else {
        Alert.alert(
          "Multiple Events",
          `There are ${eventsOnDate.length} events on this date. Please select one from the dropdown.`,
          [{ text: "OK" }]
        );
      }
    } else {
      setSelectedEvent(null);
      setAttendanceData([]);
    }
  };

  const handleEventSelect = (selectedValue) => {
    const selectedEventObj = events.find(
      (event) => event.title === selectedValue
    );
    setSelectedEvent(selectedEventObj);
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

  const formatTime = (dateObj) => {
    if (!dateObj || !dateObj.seconds) return "No Time";
    try {
      const date = new Date(dateObj.seconds * 1000);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Time";
    }
  };

  const formatAttendanceTimestamp = (timestamp) => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#203562" />
        <Text style={styles.loadingText}>Loading Attendance Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Event Calendar</Text>
          <Text style={styles.sectionSubtitle}>
            Red dots indicate dates with events
          </Text>
          <Calendar
            onDayPress={handleDateSelect}
            markedDates={{
              ...markedDates,
              [selectedDate]: {
                ...markedDates[selectedDate],
                selected: true,
                selectedColor: "#3652AD",
              },
            }}
            theme={{
              selectedDayBackgroundColor: "#203562",
              selectedDayTextColor: "#ffffff",
              todayTextColor: "#203562",
              dayTextColor: "#333",
              textDisabledColor: "#d9e1e8",
              dotColor: "#dc3545",
              selectedDotColor: "#ffffff",
              arrowColor: "#203562",
              monthTextColor: "#333",
              indicatorColor: "#203562",
              textDayFontWeight: "300",
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "300",
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
          />
        </View>

        {/* Event Selection */}
        <View style={styles.eventSelectionSection}>
          <Text style={styles.sectionTitle}>Select Event</Text>
          <Text style={styles.sectionSubtitle}>Slide to see more events.</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.eventSlider}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventCard,
                  selectedEvent?.id === event.id && styles.selectedEventCard,
                ]}
                onPress={() => handleEventSelect(event.title)}
                activeOpacity={0.8}
              >
                <Text style={styles.eventCardTitle}>{event.title}</Text>
                <Text style={styles.eventCardDate}>
                  {formatDate(event.dueDate)}
                </Text>
                <Text style={styles.eventCardTime}>
                  {formatTime(event.dueDate)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Selected Event Info */}
        {selectedEvent && (
          <View style={styles.eventInfoSection}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            <View style={styles.eventInfoCard}>
              <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
              <Text style={styles.eventTimeframe}>
                {selectedEvent.timeframe}
              </Text>
              <Text style={styles.eventDate}>
                {formatDate(selectedEvent.dueDate)}
              </Text>
              <Text style={styles.eventDescription}>
                {selectedEvent.description || "No description provided"}
              </Text>
              <View style={styles.attendanceStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {attendanceData.filter((user) => user.hasAttended).length}
                  </Text>
                  <Text style={styles.statLabel}>Attended</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {attendanceData.filter((user) => user.isAbsent).length}
                  </Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {
                      attendanceData.filter(
                        (user) => !user.hasAttended && !user.isAbsent
                      ).length
                    }
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{attendanceData.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Attendance List */}
        {selectedEvent && attendanceData.length > 0 && (
          <View style={styles.attendanceSection}>
            <Text style={styles.sectionTitle}>Attendance List</Text>
            <View style={styles.attendanceList}>
              {attendanceData.map((user, index) => (
                <View key={user.id} style={styles.attendanceItem}>
                  <View style={styles.userInfo}>
                    <View style={styles.avatarContainer}>
                      {user.avatarUrl ? (
                        <Image
                          source={{ uri: user.avatarUrl }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <FontAwesome name="user" size={16} color="#666" />
                        </View>
                      )}
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{user.username}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      {user.hasAttended && user.attendanceTimestamp && (
                        <Text style={styles.attendanceTime}>
                          Attended:{" "}
                          {formatAttendanceTimestamp(user.attendanceTimestamp)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.attendanceStatus,
                      user.hasAttended
                        ? styles.attended
                        : user.isAbsent
                        ? styles.absent
                        : styles.pending,
                    ]}
                  >
                    <FontAwesome
                      name={
                        user.hasAttended
                          ? "check"
                          : user.isAbsent
                          ? "times"
                          : "clock-o"
                      }
                      size={14}
                      color={
                        user.hasAttended
                          ? "#28a745"
                          : user.isAbsent
                          ? "#dc3545"
                          : "#ffc107"
                      }
                    />
                    <Text
                      style={[
                        styles.attendanceText,
                        user.hasAttended
                          ? styles.attendedText
                          : user.isAbsent
                          ? styles.absentText
                          : styles.pendingText,
                      ]}
                    >
                      {user.hasAttended
                        ? "Attended"
                        : user.isAbsent
                        ? "Absent"
                        : "Pending"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {selectedEvent && attendanceData.length === 0 && (
          <View style={styles.emptyState}>
            <FontAwesome name="users" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>
              No attendance data available
            </Text>
            <Text style={styles.emptyStateSubtext}>
              No users have been registered for this organization yet
            </Text>
          </View>
        )}
      </ScrollView>
      <Toast />
    </View>
  );
};

const styles = {
  mainContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  calendarSection: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#203562",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    fontWeight: "500",
  },
  eventSelectionSection: {
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
  eventInfoSection: {
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
  eventInfoCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#203562",
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#203562",
    marginBottom: 8,
  },
  eventTimeframe: {
    fontSize: 16,
    color: "#203562",
    fontWeight: "600",
    marginBottom: 6,
  },
  eventDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  eventDescription: {
    fontSize: 14,
    color: "#333",
    marginBottom: 16,
    lineHeight: 20,
  },
  attendanceStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    paddingTop: 20,
    marginTop: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#203562",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
    fontWeight: "500",
  },
  attendanceSection: {
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
  attendanceList: {
    marginTop: 20,
  },
  attendanceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e9ecef",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#dee2e6",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  attendanceTime: {
    fontSize: 12,
    color: "#28a745",
    fontWeight: "500",
    marginTop: 2,
  },
  attendanceStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: "center",
  },
  attended: {
    backgroundColor: "#d4edda",
    borderLeftColor: "#28a745",
  },
  absent: {
    backgroundColor: "#f8d7da",
    borderLeftColor: "#dc3545",
  },
  pending: {
    backgroundColor: "#fff3cd",
    borderLeftColor: "#ffc107",
  },
  attendanceText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  attendedText: {
    color: "#155724",
  },
  absentText: {
    color: "#721c24",
  },
  pendingText: {
    color: "#856404",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    backgroundColor: "white",
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  eventSlider: {
    height: 100,
  },
  eventCard: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedEventCard: {
    backgroundColor: "#3652AD",
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#203562",
  },
  eventCardDate: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  eventCardTime: {
    fontSize: 12,
    color: "#203562",
    fontWeight: "500",
  },
};

export default AdminAttendance;
