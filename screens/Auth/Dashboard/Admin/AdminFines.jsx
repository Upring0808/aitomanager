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
} from "firebase/firestore";
import { MaterialIcons } from "@expo/vector-icons";
import DropdownPicker from "../../../../components/DropdownPicker";

const AdminFines = () => {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [fines, setFines] = useState({});
  const [searchText, setSearchText] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [fineAmount, setFineAmount] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  //history
  // const [showHistory, setShowHistory] = useState(false);

  const [selectedUserHistory, setSelectedUserHistory] = useState([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const [selectedYearLevel, setSelectedYearLevel] = useState("All");

  const calculateUnpaidFines = (userId, finesData) => {
    return finesData
      .filter((fine) => fine.userId === userId && fine.status === "unpaid")
      .reduce((total, fine) => total + fine.amount, 0);
  };

  const fetchUserHistory = async (userId) => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);

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
      usersData.forEach((user) => {
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

  const handleMarkAsPaid = async (fineId) => {
    try {
      setLoading(true);
      const fineRef = doc(db, "fines", fineId);
      await updateDoc(fineRef, {
        status: "paid",
        paidAt: Timestamp.now(),
      });

      // Refresh all data
      await fetchData();
      // Refresh history for the current user
      if (selectedUser) {
        await fetchUserHistory(selectedUser.id);
      }
      alert("Fine marked as paid successfully!");
    } catch (error) {
      console.error("Error marking fine as paid:", error);
      alert("Error updating fine status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignFine = async () => {
    if (!selectedUser?.id || !selectedEvent?.id || !fineAmount) {
      alert("Please fill in all required fields.");
      return;
    }

    const amount = parseFloat(fineAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid fine amount.");
      return;
    }

    try {
      setLoading(true);

      const fineData = {
        userId: selectedUser.id,
        username: selectedUser.username,
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        amount: amount,
        status: "unpaid",
        createdAt: Timestamp.now(),
        dueDate: selectedEvent.dueDate,
        timeframe: selectedEvent.timeframe,
        description: `You are fined for the event ${selectedEvent.title}`,
      };

      await addDoc(collection(db, "fines"), fineData);

      // Refresh all data to update the cards
      await fetchData();

      alert("Fine assigned successfully!");
      setModalVisible(false);
      setFineAmount("");
      setSelectedEvent(null);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error assigning fine:", error);
      alert(`Error assigning fine: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users
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
    </TouchableOpacity>
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
            placeholder="Search students by username"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <View style={styles.filterContainer}>
          <DropdownPicker
            options={yearLevelOptions}
            selectedValue={selectedYearLevel}
            onValueChange={setSelectedYearLevel}
            formatOption={(value) => formatYearLevel(value)} // Add this prop
          />
        </View>
      </View>
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setSelectedUser(item);
              setModalVisible(true);
            }}
          >
            <View style={styles.cardContent}>
              <View style={styles.userInfo}>
                <MaterialIcons name="person" size={24} color="#007BFF" />
                <View>
                  <Text style={styles.username}>{item.username}</Text>
                  {fines[item.id] > 0 && (
                    <View style={styles.eventTitlesContainer}></View>
                  )}
                </View>
              </View>
              <View style={styles.fineInfo}>
                <Text style={styles.fineAmount}>
                  {fines[item.id] > 0 ? (
                    <Text style={styles.hasFine}>
                      ₱{fines[item.id].toFixed(2)}
                    </Text>
                  ) : (
                    <Text style={styles.noFine}>No fines</Text>
                  )}
                </Text>
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedUser(item);
                    fetchUserHistory(item.id);
                  }}
                >
                  <MaterialIcons name="history" size={24} color="#007BFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          selectedYearLevel === "All" ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={48} color="#666" />
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="person-off" size={48} color="#666" />
              <Text style={styles.emptyText}>
                No{" "}
                {yearLevelOptions.find((level) => level === selectedYearLevel)}{" "}
                Year students found
              </Text>
            </View>
          )
        }
      />
      {/* Assign Fine Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior="padding"
              style={styles.modalContent}
            >
              <ScrollView>
                <View style={styles.modalHeader}>
                  <MaterialIcons name="person" size={24} color="#007BFF" />
                  <Text style={styles.modalTitle}>Assign Fine</Text>
                </View>
                <View style={styles.selectedUserInfo}>
                  <Text style={styles.modalSubtitle}>Student:</Text>
                  <Text style={styles.selectedUsername}>
                    {selectedUser?.username}
                  </Text>
                </View>
                <Text style={styles.label}>Select Event</Text>
                <View style={styles.eventsContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {events.map(renderEventItem)}
                  </ScrollView>
                </View>
                <Text style={styles.label}>Fine Amount (₱)</Text>
                <View style={styles.inputContainer}>
                  <Text
                    style={{ fontSize: 20, color: "#007BFF", marginRight: 5 }}
                  >
                    ₱
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#666"
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    value={fineAmount}
                    onChangeText={setFineAmount}
                  />
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <MaterialIcons name="close" size={15} color="#fff" />
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.assignButton]}
                    onPress={handleAssignFine}
                  >
                    <MaterialIcons name="check" size={15} color="#fff" />
                    <Text style={styles.buttonText}>Assign Fine</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* History Modal */}
      <Modal visible={historyModalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="history" size={24} color="#007BFF" />
              <Text style={styles.modalTitle}>Fine History</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setHistoryModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedUserHistory}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <MaterialIcons name="event" size={20} color="#007BFF" />
                    <Text style={styles.historyEventTitle}>
                      {item.eventTitle}
                    </Text>
                  </View>
                  <View style={styles.historyDetails}>
                    <View style={styles.historyInfo}>
                      <Text
                        style={{
                          fontSize: 20,
                          color: "#007BFF",
                          marginLeft: 2.5,
                        }}
                      >
                        ₱
                      </Text>
                      <Text style={styles.historyAmount}>
                        ₱{item.amount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.historyInfo}>
                      <MaterialIcons
                        name="access-time"
                        size={20}
                        color="#666"
                      />
                      <Text style={styles.historyDate}>
                        {item.createdAt.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View style={styles.statusContainer}>
                      {item.status === "paid" ? (
                        <>
                          <MaterialIcons
                            name="check-circle"
                            size={20}
                            color="#27ae60"
                          />
                          <Text style={styles.paidStatus}>
                            Paid on{" "}
                            {item.paidAt.toLocaleDateString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={styles.markAsPaidButton}
                          onPress={() => handleMarkAsPaid(item.id)}
                        >
                          <MaterialIcons
                            name="payment"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.markAsPaidText}>
                            Mark as Paid
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="history" size={48} color="#666" />
                  <Text style={styles.emptyText}>No fine history</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#333",
  },
  searchAndFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -10,
    marginBottom: 10,
  },

  filterContainer: {
    width: 80,
    zIndex: 9999,
    fontSize: 10,
  },

  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginRight: 5,
    elevation: 2,
  },

  searchBar: {
    flex: 1,
    height: 50,
  },

  searchIcon: {
    marginRight: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
    color: "#333",
  },
  fineInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  hasFine: {
    color: "#e74c3c",
    fontWeight: "600",
    fontSize: 16,
  },
  noFine: {
    color: "#27ae60",
    fontWeight: "500",
    fontSize: 14,
  },
  //modals
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    maxHeight: "85%",
    width: "100%",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    overflow: "scroll",
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  //assign
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 12,
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },
  selectedUserInfo: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e9e9e9",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#718096",
    marginBottom: 6,
  },
  selectedUsername: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2d3748",
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#2c3e50",
  },
  eventsContainer: {
    marginBottom: 20,
  },
  eventButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3498db",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    transition: "background-color 0.3s ease",
  },
  selectedEvent: {
    backgroundColor: "#3498db",
  },
  eventText: {
    color: "#3498db",
    marginLeft: 5,
    fontSize: 14,
    fontWeight: "600",
  },
  selectedEventText: {
    color: "#ffffff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  input: {
    flex: 1,
    height: 50,
    marginLeft: 10,
    fontSize: 16,
    color: "#2d3748",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  assignButton: {
    backgroundColor: "#2ecc71",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  eventTitlesContainer: {
    marginTop: 5,
  },
  eventTitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  historyButton: {
    marginLeft: 10,
    padding: 5,
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginBottom: 10,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  historyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  historyEventTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
    color: "#1a1a1a",
  },
  historyDetails: {
    marginLeft: 30,
  },
  historyInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 10,
    color: "#333",
  },
  historyDate: {
    fontSize: 14,
    marginLeft: 10,
    color: "#777",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  paidStatus: {
    fontSize: 14,
    marginLeft: 10,
    color: "#2ecc71",
    fontWeight: "600",
  },
  markAsPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    shadowColor: "#007bff",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  markAsPaidText: {
    color: "#ffffff",
    marginLeft: 5,
    fontWeight: "500",
    fontSize: 14,
  },
  closeButton: {
    position: "absolute",
    right: 0,
    padding: 5,
  },
});

export default AdminFines;
