import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { db } from "../config/firebaseconfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import Toast from "react-native-toast-message";

const AttendanceModal = ({
  visible,
  onClose,
  event,
  organization,
  activeTab,
  onTabChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [attendedUsers, setAttendedUsers] = useState([]);
  const [notAttendedUsers, setNotAttendedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (visible && event && organization) {
      loadAttendanceData();
    }
  }, [visible, event, organization]);

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      const orgId = organization.id;

      // Get all users in the organization
      const usersRef = collection(db, "organizations", orgId, "users");
      const usersSnapshot = await getDocs(usersRef);
      const usersList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllUsers(usersList);

      // Get attended users
      const attendedUserIds = event.attendees || [];
      const attended = usersList.filter((user) =>
        attendedUserIds.includes(user.id)
      );
      setAttendedUsers(attended);

      // Get not attended users
      const notAttended = usersList.filter(
        (user) => !attendedUserIds.includes(user.id)
      );
      setNotAttendedUsers(notAttended);
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

  const renderUserList = (users, type) => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#203562" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      );
    }

    if (users.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <FontAwesome
            name={type === "attended" ? "check-circle" : "times-circle"}
            size={48}
            color="#ccc"
          />
          <Text style={styles.emptyText}>
            {type === "attended"
              ? "No users have attended yet"
              : "All users have attended"}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.userList}>
        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.firstName?.charAt(0) || user.email?.charAt(0) || "U"}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                {user.yearLevel && (
                  <Text style={styles.userYearLevel}>
                    Year {user.yearLevel}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.statusIndicator}>
              <FontAwesome
                name={type === "attended" ? "check-circle" : "times-circle"}
                size={20}
                color={type === "attended" ? "#28a745" : "#dc3545"}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const isEventPast = () => {
    if (!event.dueDate) return false;
    const eventDate = event.dueDate.toDate
      ? event.dueDate.toDate()
      : new Date(event.dueDate);
    return eventDate < new Date();
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
              <Text style={styles.title}>Event Attendance</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Event Info */}
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventTimeframe}>{event.timeframe}</Text>
              <Text style={styles.eventDate}>
                {event.dueDate?.toDate
                  ? event.dueDate.toDate().toLocaleDateString()
                  : new Date(event.dueDate).toLocaleDateString()}
              </Text>
              {isEventPast() && (
                <View style={styles.pastEventBadge}>
                  <Text style={styles.pastEventText}>Event Ended</Text>
                </View>
              )}
            </View>

            {/* Attendance Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{attendedUsers.length}</Text>
                <Text style={styles.statLabel}>Attended</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{notAttendedUsers.length}</Text>
                <Text style={styles.statLabel}>Not Attended</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{allUsers.length}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "attended" && styles.activeTab,
                ]}
                onPress={() => onTabChange("attended")}
              >
                <FontAwesome
                  name="check-circle"
                  size={16}
                  color={activeTab === "attended" ? "#203562" : "#666"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "attended" && styles.activeTabText,
                  ]}
                >
                  Attended ({attendedUsers.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "notAttended" && styles.activeTab,
                ]}
                onPress={() => onTabChange("notAttended")}
              >
                <FontAwesome
                  name="times-circle"
                  size={16}
                  color={activeTab === "notAttended" ? "#203562" : "#666"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "notAttended" && styles.activeTabText,
                  ]}
                >
                  Not Attended ({notAttendedUsers.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* User List */}
            <View style={styles.userListContainer}>
              {activeTab === "attended"
                ? renderUserList(attendedUsers, "attended")
                : renderUserList(notAttendedUsers, "notAttended")}
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
    maxWidth: 400,
    maxHeight: "80%",
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
  eventInfo: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#203562",
    textAlign: "center",
    marginBottom: 4,
  },
  eventTimeframe: {
    fontSize: 14,
    color: "#007BFF",
    textAlign: "center",
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  pastEventBadge: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  pastEventText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statCard: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#203562",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#203562",
    fontWeight: "600",
  },
  userListContainer: {
    flex: 1,
  },
  userList: {
    flex: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#203562",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  userYearLevel: {
    fontSize: 12,
    color: "#007BFF",
    marginTop: 2,
  },
  statusIndicator: {
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

export default AttendanceModal;
