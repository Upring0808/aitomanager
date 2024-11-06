import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  ScrollView,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { eventsStyles } from "../../styles/eventsStyles";
import {
  fetchEvents,
  addEvent,
  deleteEvent,
  handleSaveEvent,
} from "../../services/admineventsServices";
import { Button, Card } from "react-native-paper";
import Toast from "react-native-toast-message";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

const AdminEvents = () => {
  const [editingEventId, setEditingEventId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTimeframe, setNewTimeframe] = useState("");
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [filter, setFilter] = useState("All");
  const [selectedTimeType, setSelectedTimeType] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());

  const arrowRotation = useRef(new Animated.Value(0)).current;
  const dropdownHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const eventsList = await fetchEvents();
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
    if (!title) {
      alert("Please enter an event title");
      return;
    }
    const timeframe = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    try {
      const newEvent = await addEvent(title, timeframe, dueDate);
      setEvents([...events, newEvent]);
      Toast.show({ type: "success", text1: "Event created" });
      setTitle("");
      setStartTime(new Date());
      setEndTime(new Date());
      setDueDate(new Date());
    } catch (error) {
      console.error("Error adding event:", error);
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
            await deleteEvent(id);
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
        toValue: showDropdown ? 0 : 160,
        friction: 12,
        tension: 40,
        useNativeDriver: false,
      }),
    ]).start();
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
    return true; // for "All"
  });

  const rotateArrow = arrowRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const renderEventCard = (event) => {
    const eventDate = event.dueDate
      ? new Date(event.dueDate.seconds * 1000)
      : null;

    const formattedDate = eventDate
      ? eventDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "No Date";
    const formattedDay = eventDate
      ? eventDate.toLocaleDateString("en-US", { weekday: "long" })
      : "No Day";

    const createdAt = event.createdAt
      ? new Date(event.createdAt.seconds * 1000).toLocaleString()
      : "Unknown";

    return (
      // <View key={event.id} style={{ marginBottom: 0 }}>
      <Card key={event.id} style={eventsStyles.card}>
        <View style={eventsStyles.cardContent}>
          <View style={eventsStyles.dateTimeContainer}>
            <Text style={eventsStyles.dateText}>{formattedDate}</Text>
            <Text style={eventsStyles.dayText}>{formattedDay}</Text>
          </View>
          <View style={eventsStyles.intersection} />
          <View style={eventsStyles.eventDetails}>
            {editingEventId === event.id ? (
              <View style={eventsStyles.editContainer}>
                <TextInput
                  style={eventsStyles.editInput}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Event Title"
                />
                <TextInput
                  style={eventsStyles.editInput}
                  value={newTimeframe}
                  onChangeText={setNewTimeframe}
                  placeholder="Time Frame"
                />
                <View style={eventsStyles.editButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      eventsStyles.editActionButton,
                      eventsStyles.cancelButton,
                    ]}
                    onPress={() => setEditingEventId(null)}
                  >
                    <Text style={eventsStyles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      eventsStyles.editActionButton,
                      eventsStyles.saveButton,
                    ]}
                    onPress={() =>
                      handleSaveEvent(
                        event.id,
                        newTitle,
                        newTimeframe,
                        events,
                        setEvents,
                        setEditingEventId
                      )
                    }
                  >
                    <Text style={eventsStyles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={eventsStyles.eventRow}>
                <View style={eventsStyles.eventTitleContainer}>
                  <Text style={eventsStyles.eventTitle}>{event.title}</Text>
                  <Text style={eventsStyles.eventTimeframe}>
                    {event.timeframe}
                  </Text>
                  <Text style={eventsStyles.timestampText}>{createdAt}</Text>
                </View>
                <View style={eventsStyles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[eventsStyles.actionButton, eventsStyles.editButton]}
                    onPress={() =>
                      handleEditEvent(event.id, event.title, event.timeframe)
                    }
                  >
                    <FontAwesome name="edit" size={20} color="#3E588F" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      eventsStyles.actionButton,
                      eventsStyles.deleteButton,
                    ]}
                    onPress={() => handleDeleteEvent(event.id)}
                  >
                    <FontAwesome name="trash" size={20} color="#CC2B52" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Card>
      /*
      </View> */
    );
  };

  return (
    <SafeAreaView style={eventsStyles.safeArea}>
      <View style={eventsStyles.mainContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={100}
        >
          <ScrollView contentContainerStyle={eventsStyles.scrollContainer}>
            <View style={eventsStyles.form}>
              <TextInput
                style={eventsStyles.input}
                placeholder="Event Title"
                value={title}
                onChangeText={setTitle}
              />

              <View style={eventsStyles.timeInputContainer}>
                <TouchableOpacity
                  style={eventsStyles.timeInput}
                  onPress={() => handleTimePickerPress("start")}
                >
                  <Text style={eventsStyles.timeInputText}>
                    Start: {formatTime(startTime)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={eventsStyles.timeInput}
                  onPress={() => handleTimePickerPress("end")}
                >
                  <Text style={eventsStyles.timeInputText}>
                    End: {formatTime(endTime)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={eventsStyles.timeInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={eventsStyles.timeInputText}>
                    Due: {dueDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
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
                <View style={eventsStyles.timePickerContainer}>
                  <DateTimePicker
                    value={selectedTimeType === "start" ? startTime : endTime}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleTimeChange}
                  />
                  {Platform.OS === "ios" && (
                    <TouchableOpacity
                      style={eventsStyles.timePickerButton}
                      onPress={handleTimePickerConfirm}
                    >
                      <Text style={eventsStyles.timePickerButtonText}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <Button
                mode="contained"
                onPress={handleAddEvent}
                style={eventsStyles.addButton}
              >
                Add Event
              </Button>
            </View>

            <View style={eventsStyles.filterContainer}>
              <View style={eventsStyles.pickerWrapper}>
                <TouchableOpacity
                  style={eventsStyles.pickerButton}
                  onPress={toggleDropdown}
                >
                  <Text style={eventsStyles.pickerText}>Filter: {filter}</Text>
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
                    eventsStyles.customDropdown,
                    {
                      height: dropdownHeight,
                      opacity: dropdownHeight.interpolate({
                        inputRange: [0, 160],
                        outputRange: [0, 1],
                      }),
                    },
                  ]}
                >
                  <View style={eventsStyles.dropdownContent}>
                    {["All", "Current", "Upcoming"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={eventsStyles.customDropdownItem}
                        onPress={() => {
                          setFilter(option);
                          toggleDropdown();
                        }}
                      >
                        <Text style={eventsStyles.dropdownItemText}>
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
                style={eventsStyles.centerLoading}
              />
            ) : filteredEvents.length > 0 ? (
              filteredEvents.map(renderEventCard)
            ) : (
              <Text style={eventsStyles.noEvent}>No events available.</Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        <Toast />
      </View>
    </SafeAreaView>
  );
};

export default AdminEvents;
