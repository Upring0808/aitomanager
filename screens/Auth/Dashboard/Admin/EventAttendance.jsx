import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { db } from "../../../../config/firebaseconfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import Toast from "react-native-toast-message";

const EventAttendance = ({ route, navigation }) => {
  const { event, organization } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendedUsers, setAttendedUsers] = useState([]);
  const [notAttendedUsers, setNotAttendedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("attended");
  const [attendanceDetails, setAttendanceDetails] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    loadAttendanceData();
  }, [event]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
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

      // Get attendance timestamps (if available)
      if (event.attendanceTimestamps) {
        setAttendanceDetails(event.attendanceTimestamps);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading attendance data:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load attendance data",
      });
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendanceData();
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const isEventPast = () => {
    if (!event.dueDate) return false;
    const eventDate = event.dueDate.toDate
      ? event.dueDate.toDate()
      : new Date(event.dueDate);
    return eventDate < new Date();
  };

  const renderUserCard = (user, type) => {
    const attendanceTime = attendanceDetails[user.id];

    return (
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
              <Text style={styles.userYearLevel}>Year {user.yearLevel}</Text>
            )}
            {type === "attended" && attendanceTime && (
              <Text style={styles.attendanceTime}>
                Attended: {formatTimestamp(attendanceTime)}
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
    );
  };

  // Add scroll handler for showing scroll-to-top button
  const handleScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    setShowScrollTop(y > 200);
  };

  // Scroll to top function
  const scrollToTop = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
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
      <ScrollView
        ref={scrollViewRef}
        style={styles.userList}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#203562"]}
            tintColor="#203562"
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {users.map((user) => renderUserCard(user, type))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color="#203562" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Attendance</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Event Info Card */}
      <View style={styles.eventInfoCard}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventTimeframe}>{event.timeframe}</Text>
        <Text style={styles.eventDate}>
          {event.dueDate?.toDate
            ? event.dueDate.toDate().toLocaleDateString()
            : new Date(event.dueDate).toLocaleDateString()}
        </Text>
        {event.description && (
          <Text style={styles.eventDescription}>{event.description}</Text>
        )}
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
          style={[styles.tab, activeTab === "attended" && styles.activeTab]}
          onPress={() => setActiveTab("attended")}
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
          style={[styles.tab, activeTab === "notAttended" && styles.activeTab]}
          onPress={() => setActiveTab("notAttended")}
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
        {/* Scroll to top button */}
        {showScrollTop && (
          <TouchableOpacity
            style={styles.scrollTopButton}
            onPress={scrollToTop}
            activeOpacity={0.8}
          >
            <FontAwesome name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#203562",
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  eventInfoCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#203562",
    marginBottom: 8,
  },
  eventTimeframe: {
    fontSize: 16,
    color: "#007BFF",
    fontWeight: "600",
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  eventDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  pastEventBadge: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  pastEventText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: "#f8f9fa",
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
    marginHorizontal: 16,
  },
  userList: {
    flex: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#203562",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
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
    marginBottom: 2,
  },
  userYearLevel: {
    fontSize: 12,
    color: "#007BFF",
    marginBottom: 2,
  },
  attendanceTime: {
    fontSize: 12,
    color: "#28a745",
    fontWeight: "500",
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
  scrollTopButton: {
    position: "absolute",
    right: 16,
    bottom: 24,
    backgroundColor: "#203562",
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
});

export default EventAttendance;
