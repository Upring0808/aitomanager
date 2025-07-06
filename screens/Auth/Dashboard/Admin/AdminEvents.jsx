import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { Button } from "react-native-paper";
import Toast from "react-native-toast-message";
import {
  addEvent,
  deleteEvent,
  fetchEvents,
  handleSaveEvent,
} from "../../../../services/admineventsServices";
import { eventsStyles } from "../../../../styles/eventsStyles";
import AdminEventCard from "../../../../components/AdminEventCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../../config/firebaseconfig";
import AdminAttendance from "./AdminAttendance";

const { width } = Dimensions.get("window");

const AdminEvents = ({ navigation, route }) => {
  const [editingEventId, setEditingEventId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [filter, setFilter] = useState("All");
  const [selectedTimeType, setSelectedTimeType] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [editValues, setEditValues] = useState({
    newTitle: "",
    newTimeframe: "",
    newDescription: "",
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const arrowRotation = useRef(new Animated.Value(0)).current;
  const dropdownHeight = useRef(new Animated.Value(0)).current;
  const [organization, setOrganization] = useState(null);
  const formAnimation = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState("events"); // "events" or "attendance"

  // Handle route params to preserve active tab
  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveTab(route.params.activeTab);
    }
  }, [route.params?.activeTab]);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) return;

        // Load organization info
        const orgRef = doc(db, "organizations", orgId);
        const orgDoc = await getDoc(orgRef);

        // Load organization details (including logo)
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
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const handleAddEvent = async () => {
    if (!title || !description) {
      alert("Please fill out all fields.");
      return;
    }
    const timeframe = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;

      // Generate unique event ID first
      const eventId = `event_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create unique QR code data for this specific event
      const qrCodeValue = JSON.stringify({
        eventId: eventId,
        orgId: orgId,
        type: "event_attendance",
        eventTitle: title,
        eventTimeframe: timeframe,
        eventDate: dueDate.toISOString(),
        createdAt: new Date().toISOString(),
      });

      const newEvent = await addEvent(
        title,
        timeframe,
        dueDate,
        description,
        [],
        orgId,
        eventId,
        qrCodeValue
      );

      setEvents([...events, { ...newEvent, qrCode: qrCodeValue }]);
      Toast.show({ type: "success", text1: "Event created successfully!" });
      setTitle("");
      setDescription("");
      setStartTime(new Date());
      setEndTime(new Date());
      setDueDate(new Date());
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error adding event:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to create event",
      });
    }
  };

  const handleEditEvent = (id, updatedTitle, updatedTimeframe) => {
    setEditingEventId(id);
    setNewTitle(updatedTitle);
    setNewTimeframe(updatedTimeframe);
  };

  const handleDeleteEvent = async (id) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const orgId = await AsyncStorage.getItem("selectedOrgId");
            if (!orgId) return;
            await deleteEvent(id, orgId);
            setEvents(events.filter((event) => event.id !== id));
            Toast.show({ type: "success", text1: "Event deleted" });
          } catch (error) {
            console.error("Error deleting event:", error);
          }
        },
      },
    ]);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    Animated.parallel([
      Animated.timing(arrowRotation, {
        toValue: showDropdown ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(dropdownHeight, {
        toValue: showDropdown ? 0 : 200,
        friction: 12,
        tension: 40,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const toggleCreateForm = () => {
    setShowCreateForm(!showCreateForm);
    Animated.timing(formAnimation, {
      toValue: showCreateForm ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  const handleTimePickerPress = (type) => {
    setSelectedTimeType(type);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      if (selectedTimeType === "start") {
        setStartTime(selectedTime);
      } else {
        setEndTime(selectedTime);
      }
    }
  };

  const handleTimePickerConfirm = () => {
    setShowTimePicker(false);
    setSelectedTimeType(null);
  };

  const filteredEvents = events.filter((event) => {
    if (!event || !event.dueDate) return false;

    const eventDate = new Date(event.dueDate.seconds * 1000);
    const today = new Date();

    if (filter === "Current") {
      return (
        eventDate.getDate() === today.getDate() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getFullYear() === today.getFullYear()
      );
    } else if (filter === "Past") {
      return eventDate < today;
    } else if (filter === "Upcoming") {
      return eventDate > today;
    }
    return true;
  });

  const rotateArrow = arrowRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const handleEditStart = (event) => {
    setEditingEventId(event.id);
    setEditValues({
      newTitle: event.title,
      newTimeframe: event.timeframe,
      newDescription: event.description || "",
    });
  };

  const handleTitleChange = (value) => {
    setEditValues((prev) => ({ ...prev, newTitle: value }));
  };

  const handleTimeframeChange = (value) => {
    setEditValues((prev) => ({ ...prev, newTimeframe: value }));
  };

  const handleDescriptionChange = (value) => {
    setEditValues((prev) => ({ ...prev, newDescription: value }));
  };

  const handleCardPress = (event) => {
    // Navigate to QR screen instead of attendance
    navigation.navigate("EventQR", {
      event: event,
      organization: organization,
    });
  };

  const renderEventCard = (event) => {
    if (!event) return null;

    return (
      <View key={event.id} style={modernStyles.eventCardContainer}>
        <AdminEventCard
          event={{
            ...event,
            title: event.title || "",
            timeframe: event.timeframe || "",
            description: event.description || "",
            createdBy: event.createdBy || "Unknown",
            dueDate: event.dueDate || null,
            createdAt: event.createdAt || null,
          }}
          isEditing={editingEventId === event.id}
          newTitle={editingEventId === event.id ? editValues.newTitle : ""}
          newTimeframe={
            editingEventId === event.id ? editValues.newTimeframe : ""
          }
          newDescription={
            editingEventId === event.id ? editValues.newDescription : ""
          }
          onEditTitle={handleTitleChange}
          onEditTimeframe={handleTimeframeChange}
          onEditDescription={handleDescriptionChange}
          onSave={async () => {
            const orgId = await AsyncStorage.getItem("selectedOrgId");
            if (!orgId) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Organization ID not found",
              });
              return;
            }
            await handleSaveEvent(
              event.id,
              editValues.newTitle,
              editValues.newTimeframe,
              editValues.newDescription,
              events,
              setEvents,
              setEditingEventId,
              orgId
            );
          }}
          onCancel={() => setEditingEventId(null)}
          onDelete={() => handleDeleteEvent(event.id)}
          onStartEditing={() => handleEditStart(event)}
          onNavigateToAttendance={() => handleCardPress(event)}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={modernStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#203562" />
        <Text style={modernStyles.loadingText}>Loading Events...</Text>
      </View>
    );
  }

  // Show attendance screen if attendance tab is active
  if (activeTab === "attendance") {
    return (
      <SafeAreaView style={modernStyles.safeArea}>
        <View style={modernStyles.mainContainer}>
          {/* Header with Tab Switching */}
          <View style={modernStyles.header}>
            <View style={modernStyles.tabContainer}>
              <TouchableOpacity
                style={[
                  modernStyles.tabButton,
                  activeTab === "events" && modernStyles.activeTabButton,
                ]}
                onPress={() => setActiveTab("events")}
              >
                <FontAwesome
                  name="plus"
                  size={18}
                  color={activeTab === "events" ? "white" : "#203562"}
                />
                <Text
                  style={[
                    modernStyles.tabButtonText,
                    activeTab === "events" && modernStyles.activeTabButtonText,
                  ]}
                >
                  Events
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modernStyles.tabButton,
                  activeTab === "attendance" && modernStyles.activeTabButton,
                ]}
                onPress={() => setActiveTab("attendance")}
              >
                <FontAwesome
                  name="users"
                  size={18}
                  color={activeTab === "attendance" ? "white" : "#203562"}
                />
                <Text
                  style={[
                    modernStyles.tabButtonText,
                    activeTab === "attendance" &&
                      modernStyles.activeTabButtonText,
                  ]}
                >
                  Attendance
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <AdminAttendance navigation={navigation} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={modernStyles.safeArea}>
      <View style={modernStyles.mainContainer}>
        {/* Header with Tab Switching */}
        <View style={modernStyles.header}>
          <View style={modernStyles.tabContainer}>
            <TouchableOpacity
              style={[
                modernStyles.tabButton,
                activeTab === "events" && modernStyles.activeTabButton,
              ]}
              onPress={() => setActiveTab("events")}
            >
              <FontAwesome
                name="plus"
                size={18}
                color={activeTab === "events" ? "white" : "#203562"}
              />
              <Text
                style={[
                  modernStyles.tabButtonText,
                  activeTab === "events" && modernStyles.activeTabButtonText,
                ]}
              >
                Events
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modernStyles.tabButton,
                activeTab === "attendance" && modernStyles.activeTabButton,
              ]}
              onPress={() => setActiveTab("attendance")}
            >
              <FontAwesome
                name="users"
                size={18}
                color={activeTab === "attendance" ? "white" : "#203562"}
              />
              <Text
                style={[
                  modernStyles.tabButtonText,
                  activeTab === "attendance" &&
                    modernStyles.activeTabButtonText,
                ]}
              >
                Attendance
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            contentContainerStyle={modernStyles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Create Event Form */}
            <Animated.View
              style={[
                modernStyles.createFormContainer,
                {
                  maxHeight: formAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 400],
                  }),
                  opacity: formAnimation,
                },
              ]}
            >
              <View style={modernStyles.formCard}>
                <Text style={modernStyles.formTitle}>Create New Event</Text>

                <TextInput
                  style={modernStyles.input}
                  placeholder="Event Title"
                  value={title}
                  onChangeText={setTitle}
                  placeholderTextColor="#999"
                />

                <TextInput
                  style={[modernStyles.input, modernStyles.textArea]}
                  placeholder="Event Description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />

                <View style={modernStyles.timeInputContainer}>
                  <TouchableOpacity
                    style={modernStyles.timeInput}
                    onPress={() => handleTimePickerPress("start")}
                  >
                    <FontAwesome name="clock-o" size={16} color="#203562" />
                    <Text style={modernStyles.timeInputText}>
                      Start: {formatTime(startTime)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={modernStyles.timeInput}
                    onPress={() => handleTimePickerPress("end")}
                  >
                    <FontAwesome name="clock-o" size={16} color="#203562" />
                    <Text style={modernStyles.timeInputText}>
                      End: {formatTime(endTime)}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={modernStyles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <FontAwesome name="calendar" size={16} color="#203562" />
                  <Text style={modernStyles.dateInputText}>
                    Date: {dueDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dueDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (selectedDate) {
                        setDueDate(selectedDate);
                      }
                    }}
                  />
                )}

                {showTimePicker && (
                  <View style={modernStyles.timePickerContainer}>
                    <DateTimePicker
                      value={selectedTimeType === "start" ? startTime : endTime}
                      mode="time"
                      is24Hour={false}
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={handleTimeChange}
                    />
                    {Platform.OS === "ios" && (
                      <TouchableOpacity
                        style={modernStyles.timePickerButton}
                        onPress={handleTimePickerConfirm}
                      >
                        <Text style={modernStyles.timePickerButtonText}>
                          Done
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={modernStyles.formActions}>
                  <TouchableOpacity
                    style={modernStyles.cancelButton}
                    onPress={toggleCreateForm}
                  >
                    <Text style={modernStyles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={modernStyles.submitButton}
                    onPress={handleAddEvent}
                  >
                    <Text style={modernStyles.submitButtonText}>
                      Create Event
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            {/* Events List */}
            <View style={modernStyles.eventsSection}>
              <View style={modernStyles.sectionHeader}>
                <Text style={modernStyles.sectionTitle}>Events</Text>
                <TouchableOpacity
                  style={modernStyles.addButton}
                  onPress={toggleCreateForm}
                >
                  <FontAwesome name="plus" size={20} color="#203562" />
                </TouchableOpacity>
              </View>

              {/* Filter Section */}
              <View style={modernStyles.filterSection}>
                <View style={modernStyles.filterContainer}>
                  <TouchableOpacity
                    style={modernStyles.filterButton}
                    onPress={toggleDropdown}
                  >
                    <Text style={modernStyles.filterButtonText}>
                      {filter} Events
                    </Text>
                    <Animated.View
                      style={{
                        transform: [{ rotate: rotateArrow }],
                      }}
                    >
                      <FontAwesome
                        name="chevron-down"
                        size={15}
                        color="#203562"
                      />
                    </Animated.View>
                  </TouchableOpacity>

                  <Animated.View
                    style={[
                      modernStyles.dropdown,
                      {
                        height: dropdownHeight,
                        opacity: dropdownHeight.interpolate({
                          inputRange: [0, 200],
                          outputRange: [0, 1],
                        }),
                      },
                    ]}
                  >
                    <View style={modernStyles.dropdownContent}>
                      {["All", "Current", "Upcoming", "Past"].map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={modernStyles.dropdownItem}
                          onPress={() => {
                            setFilter(option);
                            toggleDropdown();
                          }}
                        >
                          <Text style={modernStyles.dropdownItemText}>
                            {option} Events
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Animated.View>
                </View>
              </View>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => renderEventCard(event))
              ) : (
                <View style={modernStyles.emptyState}>
                  <FontAwesome name="calendar-o" size={48} color="#ccc" />
                  <Text style={modernStyles.emptyStateText}>
                    No {filter.toLowerCase()} events available
                  </Text>
                  <Text style={modernStyles.emptyStateSubtext}>
                    Create your first event to get started
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <Toast />
      </View>
    </SafeAreaView>
  );
};

const modernStyles = {
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  mainContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#f8f9fa",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 30,
    padding: 6,
    minWidth: 320,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginHorizontal: 3,
    flex: 1,
  },
  activeTabButton: {
    backgroundColor: "#203562",
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#203562",
    marginLeft: 8,
  },
  activeTabButtonText: {
    color: "white",
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  createFormContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    overflow: "hidden",
  },
  formCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#203562",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f8f9fa",
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  timeInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8f9fa",
    marginHorizontal: 4,
  },
  timeInputText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8f9fa",
    marginBottom: 20,
  },
  dateInputText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  timePickerContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timePickerButton: {
    backgroundColor: "#203562",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  timePickerButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 8,
    backgroundColor: "white",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#203562",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  filterSection: {
    marginTop: 12,
    marginBottom: 16,
  },
  filterContainer: {
    position: "relative",
    zIndex: 1,
  },
  filterButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#203562",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 12,
    marginTop: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: "hidden",
  },
  dropdownContent: {
    paddingVertical: 8,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#333",
  },

  eventsSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#203562",
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  eventCardContainer: {
    marginBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "white",
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
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
};

export default AdminEvents;
