import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { db } from "../../../../config/firebaseconfig";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  updateDoc,
  doc,
  orderBy,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { MaterialIcons } from "@expo/vector-icons";
import DropdownPicker from "../../../../components/DropdownPicker";
import Toast from "react-native-toast-message";
import { auth } from "../../../../config/firebaseconfig";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const AdminFines = () => {
  const [users, setUsers] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [events, setEvents] = useState([]);
  const [fines, setFines] = useState({});
  const [searchText, setSearchText] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [studentFineAmount, setStudentFineAmount] = useState("");
  const [officerFineAmount, setOfficerFineAmount] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("students"); // "students" or "officers"
  const [selectedYearLevel, setSelectedYearLevel] = useState("All");

  //history
  // const [showHistory, setShowHistory] = useState(false);

  const [selectedUserHistory, setSelectedUserHistory] = useState([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyFilter, setHistoryFilter] = useState(null);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const popupOpacity = new Animated.Value(0);

  const [operationLoading, setOperationLoading] = useState(false); // New loading state for specific operations

  const calculateUnpaidFines = (userId, finesData) => {
    return finesData
      .filter((fine) => fine.userId === userId && fine.status === "unpaid")
      .reduce((total, fine) => total + fine.amount, 0);
  };

  const fetchUserHistory = async (userId) => {
    try {
      setOperationLoading(true); // Use operation loading instead of main loading
      const finesRef = collection(db, "fines");
      const q = query(
        finesRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        paidAt: doc.data().paidAt?.toDate(),
      }));
      setSelectedUserHistory(history);
      setHistoryModalVisible(true);
    } catch (error) {
      console.error("Error fetching history:", error);
      alert("Error loading history. Please try again.");
    } finally {
      setOperationLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const usersQuery = query(collection(db, "users"), orderBy("username"));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Separate students and officers
      const students = usersData.filter(
        (user) => !user.role || user.role === "student"
      );
      const officers = usersData.filter(
        (user) => user.role && user.role !== "student"
      );

      setUsers(students);
      setOfficers(officers);

      // Fetch events
      const eventsSnapshot = await getDocs(collection(db, "events"));
      const eventsData = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        createdAt: doc.data().createdAt,
        dueDate: doc.data().dueDate,
        timeframe: doc.data().timeframe,
      }));
      setEvents(eventsData);

      // Fetch fines
      const finesSnapshot = await getDocs(collection(db, "fines"));
      const finesData = finesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate unpaid fines per user
      const userFines = {};
      [...students, ...officers].forEach((user) => {
        userFines[user.id] = calculateUnpaidFines(user.id, finesData);
      });
      setFines(userFines);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error loading data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccessPopup(true);
    Animated.sequence([
      Animated.timing(popupOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(popupOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccessPopup(false);
    });
  };

  const handleMarkAsPaid = async (fineId) => {
    try {
      setOperationLoading(true);
      const now = Timestamp.now();

      // Get the fine details using getDoc
      const fineDocRef = doc(db, "fines", fineId);
      const fineDocSnap = await getDoc(fineDocRef);

      if (!fineDocSnap.exists()) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Fine not found",
          position: "bottom",
        });
        setOperationLoading(false);
        return;
      }

      const fineData = fineDocSnap.data();

      // Get user details using getDoc
      const userDocRef = doc(db, "users", fineData.userId);
      const userDocSnap = await getDoc(userDocRef);

      const userData = userDocSnap.exists() ? userDocSnap.data() : {}; // Get user data or empty object with fallback

      // Get event details using getDoc
      const eventDocRef = doc(db, "events", fineData.eventId);
      const eventDocSnap = await getDoc(eventDocRef);

      const eventData = eventDocSnap.exists() ? eventDocSnap.data() : {}; // Get event data or empty object with fallback

      // Get current admin details
      const currentUser = auth.currentUser;
      const adminQuery = query(
        collection(db, "admin"),
        where("uid", "==", currentUser.uid)
      );
      const adminSnapshot = await getDocs(adminQuery);
      const adminData = adminSnapshot.docs[0]?.data();

      // Update fine status
      await updateDoc(doc(db, "fines", fineId), {
        status: "paid",
        paidAt: now,
        paidBy: {
          uid: currentUser.uid,
          username: adminData?.username || "System",
          role: "admin",
        },
      });

      // Create detailed activity log
      const activityData = {
        type: "fine_paid",
        description: "Fine payment received", // This description might be overridden by formatActivityDescription
        timestamp: now,
        details: {
          fineId: fineId,
          amount: fineData.amount || 0,
          // Use fetched user and event data, with fallbacks
          studentName:
            userData.fullName || fineData.userFullName || "Unknown User",
          studentId: userData.studentId || fineData.userStudentId || "No ID",
          eventTitle: eventData.title || fineData.eventTitle || "Unknown Event",
          eventId: fineData.eventId,
          issuedBy: adminData?.username || "System",
          adminUid: currentUser.uid,
          status: "paid", // Include status in details
          paidAt: now, // Include paidAt timestamp in details
        },
      };

      // Add activity to Firestore
      await addDoc(collection(db, "activities"), activityData);

      // Update local state (assuming fineData includes userId)
      if (fineData.userId) {
        setSelectedUserHistory((prevHistory) =>
          prevHistory.map((fine) =>
            fine.id === fineId
              ? { ...fine, status: "paid", paidAt: now.toDate() } // Update local history item
              : fine
          )
        );

        // Update fines in the main list
        setFines((prevFines) => ({
          ...prevFines,
          [fineData.userId]:
            (prevFines[fineData.userId] || 0) - (fineData.amount || 0),
        }));

        // Refresh the user's history if modal is open
        // This ensures the history modal reflects the change immediately
        // You might want to add a check here if historyModalVisible is true
        // if (historyModalVisible) {
        //   fetchUserHistory(fineData.userId);
        // }
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Fine marked as paid",
        position: "bottom",
      });
    } catch (error) {
      console.error("Error marking fine as paid:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to mark fine as paid",
        position: "bottom",
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleBulkAssignFine = async () => {
    if (!selectedEvent?.id || !selectedUsers.length) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please select an event and at least one user",
        position: "bottom",
      });
      return;
    }

    try {
      setOperationLoading(true);

      // Get current admin details
      const currentUser = auth.currentUser;
      const adminQuery = query(
        collection(db, "admin"),
        where("uid", "==", currentUser.uid)
      );
      const adminSnapshot = await getDocs(adminQuery);
      const adminData = adminSnapshot.docs[0]?.data();

      // Get event details using getDoc for a single document
      const eventDocRef = doc(db, "events", selectedEvent.id);
      const eventDocSnap = await getDoc(eventDocRef);

      if (!eventDocSnap.exists()) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Selected event not found",
          position: "bottom",
        });
        setOperationLoading(false);
        return;
      }

      const eventData = eventDocSnap.data();

      // Process each selected user
      for (const user of selectedUsers) {
        // Get user details using getDoc for a single document
        const userDocRef = doc(db, "users", user.id);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          console.warn(
            `User with ID ${user.id} not found, skipping fine assignment.`
          );
          continue;
        }

        const userData = userDocSnap.data();
        const amount =
          user.role === "officer"
            ? parseFloat(officerFineAmount || "0")
            : parseFloat(studentFineAmount || "0");

        // Basic validation for amount
        if (isNaN(amount) || amount <= 0) {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: `Invalid fine amount for ${userData.fullName || user.id}`,
            position: "bottom",
          });
          continue;
        }

        // Create fine document
        const fineData = {
          userId: user.id, // Use the document ID as userId
          userFullName: userData.fullName || "Unknown User",
          userStudentId: userData.studentId || "No ID",
          userRole: userData.role || "student",
          eventId: selectedEvent.id,
          eventTitle: eventData.title || "Unknown Event",
          eventDueDate: eventData.dueDate || null,
          eventTimeframe: eventData.timeframe || "No timeframe",
          amount: amount,
          status: "unpaid",
          createdAt: Timestamp.now(),
          description: `Fine for ${eventData.title || "an event"}`,
          issuedBy: {
            uid: currentUser.uid,
            username: adminData?.username || "System",
            role: "admin",
          },
        };

        // Add fine to Firestore
        const fineRef = await addDoc(collection(db, "fines"), fineData);

        // Create detailed activity log
        const activityData = {
          type: "fine_added",
          description: "New fine assigned",
          timestamp: Timestamp.now(),
          details: {
            fineId: fineRef.id,
            amount: amount,
            studentName: userData.fullName || "Unknown User",
            studentId: userData.studentId || "No ID",
            eventTitle: eventData.title || "Unknown Event",
            eventId: selectedEvent.id,
            issuedBy: adminData?.username || "System",
            adminUid: currentUser.uid,
            status: "unpaid",
          },
        };

        // Add activity to Firestore
        await addDoc(collection(db, "activities"), activityData);

        // Update local state
        setFines((prevFines) => ({
          ...prevFines,
          [user.id]: (prevFines[user.id] || 0) + amount,
        }));
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Fines assigned successfully",
        position: "bottom",
      });

      setModalVisible(false);
      setStudentFineAmount("");
      setOfficerFineAmount("");
      setSelectedEvent(null);
      setSelectedUsers([]);
    } catch (error) {
      console.error("Error assigning fines:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to assign fines",
        position: "bottom",
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const filteredUsers = (activeTab === "students" ? users : officers)
    .filter((user) => {
      const matchesSearch = user.username
        ?.toLowerCase()
        .includes(searchText.toLowerCase());
      const matchesYearLevel =
        selectedYearLevel === "All" ||
        (user.yearLevel && user.yearLevel.toString() === selectedYearLevel);

      return matchesSearch && matchesYearLevel;
    })
    .sort((a, b) => {
      if (fines[a.id] > 0 && fines[b.id] === 0) return -1;
      if (fines[a.id] === 0 && fines[b.id] > 0) return 1;
      return a.username.localeCompare(b.username);
    });
  const yearLevelOptions = ["All", "1", "2", "3", "4"];
  const formatYearLevel = (level) => {
    if (level === "All") return "All";
    const suffixes = ["th", "st", "nd", "rd"];
    const v = parseInt(level) % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    return `${level}${suffix} `;
  };

  const renderEventItem = (event) => (
    <TouchableOpacity
      key={event.id}
      style={[
        styles.eventButton,
        selectedEvent?.id === event.id && styles.selectedEvent,
      ]}
      onPress={() => setSelectedEvent(event)}
    >
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <MaterialIcons
            name="event"
            size={20}
            color={selectedEvent?.id === event.id ? "#fff" : "#007BFF"}
          />
          <Text
            style={[
              styles.eventText,
              selectedEvent?.id === event.id && styles.selectedEventText,
            ]}
          >
            {event.title}
          </Text>
        </View>
        <View style={styles.eventDetails}>
          <View style={styles.eventDetailRow}>
            <MaterialIcons
              name="calendar-today"
              size={16}
              color={selectedEvent?.id === event.id ? "#fff" : "#64748b"}
            />
            <Text
              style={[
                styles.eventDate,
                selectedEvent?.id === event.id && styles.selectedEventText,
              ]}
            >
              {event.dueDate
                ? new Date(event.dueDate.seconds * 1000).toLocaleDateString()
                : "No date set"}
            </Text>
          </View>
          <View style={styles.eventDetailRow}>
            <MaterialIcons
              name="access-time"
              size={16}
              color={selectedEvent?.id === event.id ? "#fff" : "#64748b"}
            />
            <Text
              style={[
                styles.eventTime,
                selectedEvent?.id === event.id && styles.selectedEventText,
              ]}
            >
              {event.timeframe || "No time set"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAssignFineModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior="padding"
            style={styles.modalContainer}
          >
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <MaterialIcons
                    name="arrow-forward"
                    size={24}
                    color="#007BFF"
                  />
                  <Text style={styles.modalTitle}>Assign Fine</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.selectedUsersInfo}>
                <View style={styles.selectedUsersHeader}>
                  <View>
                    <Text style={styles.modalSubtitle}>Selected Users:</Text>
                    <Text style={styles.selectedCount}>
                      {selectedUsers.length} {activeTab} selected
                    </Text>
                  </View>
                  {selectedUsers.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearAllButton}
                      onPress={() => setSelectedUsers([])}
                    >
                      <MaterialIcons
                        name="clear-all"
                        size={20}
                        color="#ef4444"
                      />
                      <Text style={styles.clearAllText}>Clear All</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.eventsSection}>
                <View style={styles.eventsHeader}>
                  <Text style={styles.modalLabel}>Select Event</Text>
                  <View style={styles.slideNotice}>
                    <MaterialIcons name="swipe" size={16} color="#64748b" />
                    <Text style={styles.slideNoticeText}>
                      Slide to see more events
                    </Text>
                  </View>
                </View>
                <View style={styles.eventsContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.eventsScrollContent}
                  >
                    {events && events.length > 0 ? (
                      events.map(renderEventItem)
                    ) : (
                      <Text style={styles.noEventsText}>
                        No events available
                      </Text>
                    )}
                  </ScrollView>
                </View>
              </View>

              {selectedUsers.some(
                (user) => !user.role || user.role === "student"
              ) && (
                <>
                  <Text style={styles.modalLabel}>Fine Amount (Students)</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencySymbol}>₱</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter amount"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                      value={studentFineAmount}
                      onChangeText={setStudentFineAmount}
                    />
                  </View>
                </>
              )}

              {selectedUsers.some(
                (user) => user.role && user.role !== "student"
              ) && (
                <>
                  <Text style={styles.modalLabel}>Fine Amount (Officers)</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencySymbol}>₱</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter amount"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                      value={officerFineAmount}
                      onChangeText={setOfficerFineAmount}
                    />
                  </View>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!selectedEvent ||
                      (selectedUsers.some((user) => user.role === "student") &&
                        !studentFineAmount) ||
                      (selectedUsers.some((user) => user.role === "officer") &&
                        !officerFineAmount) ||
                      operationLoading) &&
                      styles.disabledButton,
                  ]}
                  onPress={handleBulkAssignFine}
                  disabled={
                    !selectedEvent ||
                    (selectedUsers.some((user) => user.role === "student") &&
                      !studentFineAmount) ||
                    (selectedUsers.some((user) => user.role === "officer") &&
                      !officerFineAmount) ||
                    operationLoading
                  }
                >
                  {operationLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Assign</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderHistoryModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={historyModalVisible}
      onRequestClose={() => setHistoryModalVisible(false)}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <MaterialIcons name="arrow-forward" size={24} color="#007BFF" />
              <Text style={styles.modalTitle}>More Details</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setHistoryModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.historyStats}>
              <View style={styles.statCard}>
                <MaterialIcons name="payments" size={24} color="#007BFF" />
                <Text style={styles.statValue}>
                  ₱
                  {selectedUserHistory
                    .reduce(
                      (total, fine) =>
                        total + (fine.status === "paid" ? fine.amount : 0),
                      0
                    )
                    .toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Total Paid</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons
                  name="pending-actions"
                  size={24}
                  color="#ef4444"
                />
                <Text style={[styles.statValue, { color: "#ef4444" }]}>
                  ₱
                  {selectedUserHistory
                    .reduce(
                      (total, fine) =>
                        total + (fine.status === "unpaid" ? fine.amount : 0),
                      0
                    )
                    .toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>

            <View style={styles.historyFilters}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  !historyFilter && styles.activeFilter,
                ]}
                onPress={() => setHistoryFilter(null)}
              >
                <Text
                  style={[
                    styles.filterText,
                    !historyFilter && styles.activeFilterText,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  historyFilter === "unpaid" && styles.activeFilter,
                ]}
                onPress={() => setHistoryFilter("unpaid")}
              >
                <Text
                  style={[
                    styles.filterText,
                    historyFilter === "unpaid" && styles.activeFilterText,
                  ]}
                >
                  Unpaid
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  historyFilter === "paid" && styles.activeFilter,
                ]}
                onPress={() => setHistoryFilter("paid")}
              >
                <Text
                  style={[
                    styles.filterText,
                    historyFilter === "paid" && styles.activeFilterText,
                  ]}
                >
                  Paid
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.historyList}>
              {selectedUserHistory
                .filter(
                  (fine) => !historyFilter || fine.status === historyFilter
                )
                .map((item) => (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyCardHeader}>
                      <View style={styles.eventInfo}>
                        <MaterialIcons name="event" size={20} color="#007BFF" />
                        <Text style={styles.eventTitle}>{item.eventTitle}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === "paid"
                            ? styles.paidBadge
                            : styles.unpaidBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            item.status === "paid"
                              ? styles.paidText
                              : styles.unpaidText,
                          ]}
                        >
                          {item.status === "paid" ? "Paid" : "Unpaid"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.historyDetails}>
                      <View style={styles.amountRow}>
                        <MaterialIcons
                          name="payments"
                          size={20}
                          color="#007BFF"
                        />
                        <Text style={styles.amountText}>
                          ₱{item.amount.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.dateRow}>
                        <MaterialIcons
                          name="calendar-today"
                          size={20}
                          color="#64748b"
                        />
                        <Text style={styles.dateText}>
                          {item.createdAt?.toLocaleDateString()}
                        </Text>
                      </View>
                      {item.status === "paid" && (
                        <View style={styles.paidDateRow}>
                          <MaterialIcons
                            name="check-circle"
                            size={20}
                            color="#16a34a"
                          />
                          <Text style={styles.paidDateText}>
                            Paid on {item.paidAt?.toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {item.status === "unpaid" && (
                      <TouchableOpacity
                        style={[
                          styles.markAsPaidButton,
                          operationLoading && styles.disabledButton,
                        ]}
                        onPress={() => handleMarkAsPaid(item.id)}
                        disabled={operationLoading}
                      >
                        {operationLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons
                              name="payment"
                              size={20}
                              color="#fff"
                            />
                            <Text style={styles.markAsPaidText}>
                              Mark as Paid
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              {selectedUserHistory.length === 0 && (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="history" size={48} color="#64748b" />
                  <Text style={styles.emptyText}>No fine history</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderSuccessPopup = () => (
    <Animated.View
      style={[
        styles.successPopup,
        {
          opacity: popupOpacity,
          transform: [
            {
              translateY: popupOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.successContent}>
        <View style={styles.successIconContainer}>
          <MaterialIcons name="check-circle" size={24} color="#fff" />
        </View>
        <Text style={styles.successText}>{successMessage}</Text>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading Fines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "students" && styles.activeTab]}
          onPress={() => setActiveTab("students")}
        >
          <MaterialIcons
            name="school"
            size={24}
            color={activeTab === "students" ? "#007BFF" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "students" && styles.activeTabText,
            ]}
          >
            Students
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "officers" && styles.activeTab]}
          onPress={() => setActiveTab("officers")}
        >
          <MaterialIcons
            name="security"
            size={24}
            color={activeTab === "officers" ? "#007BFF" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "officers" && styles.activeTabText,
            ]}
          >
            Officers
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchAndFilterContainer}>
        <View style={styles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchBar}
            placeholder={`Search ${activeTab} by username`}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        {activeTab === "students" && (
          <View style={styles.filterContainer}>
            <DropdownPicker
              options={yearLevelOptions}
              selectedValue={selectedYearLevel}
              onValueChange={setSelectedYearLevel}
              formatOption={(value) => formatYearLevel(value)}
            />
          </View>
        )}
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                selectedUsers.some((u) => u.id === item.id) &&
                  styles.selectedCard,
              ]}
              onPress={() => toggleUserSelection(item)}
            >
              <View style={styles.cardContent}>
                <View style={styles.userInfo}>
                  <View style={styles.avatarContainer}>
                    <MaterialIcons
                      name={item.role === "officer" ? "security" : "person"}
                      size={24}
                      color="#007BFF"
                    />
                  </View>
                  <View style={styles.userDetails}>
                    <Text
                      style={styles.username}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.username}
                    </Text>
                    {item.yearLevel && (
                      <Text style={styles.yearLevel}>
                        Year {item.yearLevel}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.fineInfo}>
                  {fines[item.id] > 0 ? (
                    <>
                      <MaterialIcons name="warning" size={16} color="#dc2626" />
                      <Text style={styles.hasFine}>
                        ₱{fines[item.id].toFixed(2)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color="#16a34a"
                      />
                      <Text style={styles.noFine}>No fines</Text>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.historyButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      fetchUserHistory(item.id);
                    }}
                  >
                    <MaterialIcons name="receipt" size={20} color="#007BFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name={activeTab === "students" ? "school" : "security"}
                size={48}
                color="#666"
              />
              <Text style={styles.emptyText}>No {activeTab} found</Text>
            </View>
          }
        />
      </View>

      {selectedUsers.length === 0 ? (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => alert("Select users to assign fines.")}
        >
          <MaterialIcons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.assignButtonText}>
            Assign Fine ({selectedUsers.length})
          </Text>
        </TouchableOpacity>
      )}

      {renderAssignFineModal()}

      {renderHistoryModal()}

      {renderSuccessPopup()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 0, // Removed bottom padding to maximize space
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 12, // Reduced from 20 to 12
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: "#e3f2fd",
  },
  tabText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#64748b",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#007BFF",
  },
  searchAndFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchBar: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: "#1e293b",
  },
  searchIcon: {
    marginRight: 12,
  },
  filterContainer: {
    width: 100,
    zIndex: 9999,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden", // Ensure content doesn't overflow rounded corners
  },
  selectedCard: {
    borderColor: "#007BFF",
    borderWidth: 2,
    backgroundColor: "#f0f7ff",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  userDetails: {
    flexDirection: "column",
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  yearLevel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  fineInfo: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  hasFine: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 15,
  },
  noFine: {
    color: "#16a34a",
    fontWeight: "500",
    fontSize: 14,
  },
  historyButton: {
    marginLeft: 8,
    padding: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  fabButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#007BFF",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  assignButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#007BFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  assignButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 0,
  },
  modalContent: {
    padding: 20,
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginLeft: 12,
    color: "#1e293b",
  },
  closeButton: {
    padding: 4,
  },
  selectedUsersInfo: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectedUsersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearAllText: {
    color: "#ef4444",
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  eventsSection: {
    marginBottom: 24,
  },
  eventsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  slideNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  slideNoticeText: {
    color: "#64748b",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  eventsContainer: {
    marginBottom: 20,
    maxHeight: 180,
  },
  eventsScrollContent: {
    paddingRight: 20,
    paddingBottom: 10,
  },
  eventButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 220,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  eventContent: {
    flexDirection: "column",
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  eventDetails: {
    marginLeft: 28,
  },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  eventText: {
    color: "#64748b",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  eventDate: {
    color: "#64748b",
    fontSize: 12,
    marginLeft: 8,
  },
  eventTime: {
    color: "#64748b",
    fontSize: 12,
    marginLeft: 8,
  },
  selectedEvent: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  selectedEventText: {
    color: "#ffffff",
  },
  noEventsText: {
    color: "#64748b",
    fontStyle: "italic",
    padding: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  currencySymbol: {
    fontSize: 16,
    color: "#007BFF",
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: "#1e293b",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginTop: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  historyStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007BFF",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  historyFilters: {
    flexDirection: "row",
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  activeFilter: {
    backgroundColor: "#007BFF",
  },
  filterText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  activeFilterText: {
    color: "#fff",
  },
  historyList: {
    flex: 1,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  historyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  eventInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    color: "#1e293b",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paidBadge: {
    backgroundColor: "#dcfce7",
  },
  unpaidBadge: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  paidText: {
    color: "#16a34a",
  },
  unpaidText: {
    color: "#ef4444",
  },
  historyDetails: {
    marginLeft: 28,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  amountText: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
    color: "#1e293b",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 8,
  },
  paidDateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  paidDateText: {
    fontSize: 14,
    color: "#16a34a",
    marginLeft: 8,
  },
  markAsPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  markAsPaidText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 14,
  },
  successPopup: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: "#10b981",
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  successContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  successIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  successText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  listContainer: {
    flex: 1,
    marginBottom: 80, // Reduced to give more space for the list
  },
  listContent: {
    paddingBottom: 100, // Adjusted to account for the floating button
    paddingTop: 4,
  },
});

export default AdminFines;
