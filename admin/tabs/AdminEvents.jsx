import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { db } from "../../config/firebaseconfig";
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { Button, Card } from "react-native-paper";
import Toast from "react-native-toast-message";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

const AdminEvents = () => {
  const [editingEventId, setEditingEventId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newTimeframe, setNewTimeframe] = useState("");
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState("All");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [selectedTimeType, setSelectedTimeType] = useState(null); // 'start' or 'end'

  const arrowRotation = useRef(new Animated.Value(0)).current;
  const dropdownHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollection = collection(db, "events");
        const eventsSnapshot = await getDocs(eventsCollection);
        let eventsList = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        eventsList.sort(
          (a, b) =>
            new Date(b.createdAt.seconds * 1000) -
            new Date(a.createdAt.seconds * 1000)
        );

        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleAddEvent = async () => {
    if (!title) {
      alert("Please enter an event title");
      return;
    }

    try {
      const formattedTimeframe = `${formatTime(startTime)} - ${formatTime(
        endTime
      )}`;

      if (editingEventId) {
        // Update existing event
        const eventDocRef = doc(db, "events", editingEventId);
        await updateDoc(eventDocRef, {
          title,
          timeframe: formattedTimeframe,
        });
        setEvents(
          events.map((event) =>
            event.id === editingEventId
              ? { ...event, title, timeframe: formattedTimeframe }
              : event
          )
        );
        Toast.show({
          type: "success",
          text1: "Event updated",
        });
      } else {
        // Add new event
        const newEvent = {
          title,
          timeframe: formattedTimeframe,
          createdAt: Timestamp.now(),
        };
        const docRef = await addDoc(collection(db, "events"), newEvent);
        setEvents([...events, { ...newEvent, id: docRef.id }]);
        Toast.show({
          type: "success",
          text1: "Event created",
          text2: `Created at: ${new Date(
            newEvent.createdAt.seconds * 1000
          ).toLocaleString()}`,
        });
      }

      const newEvent = {
        title,
        timeframe: formattedTimeframe,
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, "events"), newEvent);
      setEvents([...events, { ...newEvent, id: Date.now().toString() }]);

      setTitle("");
      setStartTime(new Date());
      setEndTime(new Date());

      Toast.show({
        type: "success",
        text1: "Event created",
        text2: `Created at: ${new Date(
          newEvent.createdAt.seconds * 1000
        ).toLocaleString()}`,
      });
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const handleEditEvent = (id, updatedTitle, updatedTimeframe) => {
    setEditingEventId(id);
    setNewTitle(updatedTitle);
    setNewTimeframe(updatedTimeframe);
  };

  const handleSaveEvent = async (id) => {
    try {
      await updateDoc(doc(db, "events", id), {
        title: newTitle,
        timeframe: newTimeframe,
      });
      setEvents(
        events.map((event) =>
          event.id === id
            ? { ...event, title: newTitle, timeframe: newTimeframe }
            : event
        )
      );
      setEditingEventId(null);
      Toast.show({ type: "success", text1: "Event updated successfully" });
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };
  const handleDeleteEvent = async (id) => {
    Alert.alert(
      "Delete Confirmation",
      "Are you sure you want to delete this event?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "events", id));
              setEvents(events.filter((event) => event.id !== id));
              Toast.show({
                type: "success",
                text1: "Event deleted",
              });
            } catch (error) {
              console.error("Error deleting event:", error);
            }
          },
        },
      ]
    );
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
        toValue: showDropdown ? 0 : 160,
        friction: 12,
        tension: 40,
        useNativeDriver: false,
      }),
    ]).start();
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
    const eventDate = new Date(event.createdAt.seconds * 1000);
    const today = new Date();
    if (filter === "Today") {
      return (
        eventDate.getDate() === today.getDate() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getFullYear() === today.getFullYear()
      );
    } else if (filter === "Past") {
      return eventDate < today;
    }
    return true;
  });

  const rotateArrow = arrowRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const renderEventCard = (event) => {
    const eventDate = new Date(event.createdAt.seconds * 1000);

    return (
      <Card key={event.id} style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.eventDetails}>
            {editingEventId === event.id ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.editInput}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Event Title"
                />
                <TextInput
                  style={styles.editInput}
                  value={newTimeframe}
                  onChangeText={setNewTimeframe}
                  placeholder="Time Frame"
                />
                <View style={styles.editButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.editActionButton, styles.cancelButton]}
                    onPress={() => setEditingEventId(null)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editActionButton, styles.saveButton]}
                    onPress={() => handleSaveEvent(event.id)}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.eventRow}>
                <View style={styles.eventTitleContainer}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTimeframe}>{event.timeframe}</Text>
                </View>
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() =>
                      handleEditEvent(event.id, event.title, event.timeframe)
                    }
                  >
                    <FontAwesome name="edit" size={20} color="#3E588F" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteEvent(event.id)}
                  >
                    <FontAwesome name="trash" size={20} color="red" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Card>
    );
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Event Title"
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.timeInputContainer}>
              <TouchableOpacity
                style={styles.timeInput}
                onPress={() => handleTimePickerPress("start")}
              >
                <Text style={styles.timeInputText}>
                  Start: {formatTime(startTime)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timeInput}
                onPress={() => handleTimePickerPress("end")}
              >
                <Text style={styles.timeInputText}>
                  End: {formatTime(endTime)}
                </Text>
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={selectedTimeType === "start" ? startTime : endTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleTimeChange}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={handleTimePickerConfirm}
                  >
                    <Text style={styles.timePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleAddEvent}
              style={styles.addButton}
            >
              Add Event
            </Button>
          </View>

          <View style={styles.filterContainer}>
            <View style={styles.pickerWrapper}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={toggleDropdown}
              >
                <Text style={styles.pickerText}>Filter: {filter}</Text>
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: arrowRotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "180deg"],
                        }),
                      },
                    ],
                  }}
                >
                  <FontAwesome name="chevron-down" size={15} color="#333" />
                </Animated.View>
              </TouchableOpacity>

              <Animated.View
                style={[
                  styles.customDropdown,
                  {
                    height: dropdownHeight,
                    opacity: dropdownHeight.interpolate({
                      inputRange: [0, 160],
                      outputRange: [0, 1],
                    }),
                  },
                ]}
              >
                <View style={styles.dropdownContent}>
                  {["All", "Today", "Past"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.customDropdownItem}
                      onPress={() => {
                        setFilter(option);
                        toggleDropdown();
                      }}
                    >
                      <Text style={styles.dropdownItemText}>
                        {option} Events
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#3E588Faa"
              style={styles.centerLoading}
            />
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map(renderEventCard)
          ) : (
            <Text style={styles.noEvent}>No events available.</Text>
          )}
        </ScrollView>
        <Toast />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  container: {
    padding: 16,
  },
  mainContainer: {
    flex: 1,
    position: "relative",
  },
  scrollContainer: {
    padding: 16,
    minHeight: "100%",
  },
  filterContainer: {
    position: "relative",
    zIndex: 1000,
    marginBottom: 20,
  },
  form: {
    marginBottom: 24,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  input: {
    borderColor: "#e0e0e0",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  timeInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  timeInput: {
    flex: 0.48,
    borderColor: "#e0e0e0",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  timeInputText: {
    fontSize: 16,
    color: "#333",
  },
  timePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
  },
  timePickerButton: {
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  timePickerButtonText: {
    fontSize: 16,
    color: "#3E588F",
    fontWeight: "600",
  },
  addButton: {
    marginTop: 8,
    backgroundColor: "#3E588F",
  },
  pickerWrapper: {
    position: "relative",
    zIndex: 1000,
  },
  dropdownOverlay: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#ffff",

    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  pickerText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  customDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#233c60",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 1000,
  },
  dropdownContent: {
    backgroundColor: "#233c60",
  },
  customDropdownItem: {
    padding: 16,
  },
  dropdownItemText: {
    color: "white",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,

    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: -1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  cardContent: {
    padding: 10,
  },
  dateTimeContainer: {
    alignItems: "center",
  },
  dateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  timeText: {
    fontSize: 14,
    color: "#888",
  },
  eventDetails: {
    flexDirection: "column",
  },
  eventTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  editContainer: {
    width: "100%",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    marginRight: -14,
    gap: 0,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 40,
    height: 40,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  eventTimeframe: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  noEvent: {
    textAlign: "center",
    marginTop: 50,
    color: "#888",
    fontSize: 18,
  },
  centerLoading: {
    position: "absolute",
    top: "50%",
    left: "50%",

    marginTop: 125,
    zIndex: 10,
  },

  eventTimeframe: {
    color: "#666",
  },
  editInput: {
    borderColor: "#e0e0e0",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },

  editButtonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  editActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#3E588F",
  },
  saveButton: {
    backgroundColor: "#3E588F",
  },
  cancelButtonText: {
    color: "#3E588F",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AdminEvents;
