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
} from "react-native";
import { db } from "../../config/firebaseconfig";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { Button, Card, Paragraph } from "react-native-paper";
import Toast from "react-native-toast-message";
import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [filter, setFilter] = useState("All");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true); // For ActivityIndicator
  const arrowRotation = useRef(new Animated.Value(0)).current; // For smooth icon rotation
  const dropdownHeight = useRef(new Animated.Value(0)).current; // For dropdown animation

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
        setLoading(false); // Stop loading indicator
      }
    };
    fetchEvents();
  }, []);

  const handleAddEvent = async () => {
    if (!title || !timeframe) {
      alert("Please fill out both fields");
      return;
    }

    try {
      const newEvent = {
        title,
        timeframe,
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, "events"), newEvent);
      setEvents([...events, { ...newEvent, id: Date.now().toString() }]);

      setTitle("");
      setTimeframe("");

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

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);

    // Arrow rotation animation
    Animated.timing(arrowRotation, {
      toValue: showDropdown ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Dropdown height animation
    Animated.timing(dropdownHeight, {
      toValue: showDropdown ? 0 : 150, // Adjust height based on content
      duration: 300,
      useNativeDriver: false,
    }).start();
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Event Title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Timeframe (e.g. 8 AM - 5 PM)"
            value={timeframe}
            onChangeText={setTimeframe}
          />
          <Button mode="outlined" onPress={handleAddEvent}>
            Add Event
          </Button>
        </View>

        {/* Custom dropdown picker for filter */}
        <View style={styles.pickerWrapper}>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={toggleDropdown}
          >
            <Text style={styles.pickerText}>Filter: {filter}</Text>
            <Animated.View style={{ transform: [{ rotate: rotateArrow }] }}>
              <FontAwesome name="chevron-down" size={18} color="#333" />
            </Animated.View>
          </TouchableOpacity>

          <Animated.View
            style={[styles.customDropdown, { height: dropdownHeight }]}
          >
            {showDropdown && (
              <BlurView intensity={50} tint="light" style={styles.blurView}>
                <Text
                  style={styles.customDropdownItem}
                  onPress={() => {
                    setFilter("All");
                    toggleDropdown();
                  }}
                >
                  All Events
                </Text>
                <Text
                  style={styles.customDropdownItem}
                  onPress={() => {
                    setFilter("Today");
                    toggleDropdown();
                  }}
                >
                  Today
                </Text>
                <Text
                  style={styles.customDropdownItem}
                  onPress={() => {
                    setFilter("Past");
                    toggleDropdown();
                  }}
                >
                  Past Events
                </Text>
              </BlurView>
            )}
          </Animated.View>
        </View>

        {/* Show Activity Indicator while loading */}
        {loading ? (
          <ActivityIndicator size="large" color="maroon" />
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <Card key={event.id} style={styles.card}>
              <Card.Title title={event.title} />
              <Card.Content>
                <Paragraph>{event.timeframe}</Paragraph>
                {event.createdAt && (
                  <Text style={styles.dateText}>
                    {new Date(event.createdAt.seconds * 1000).toLocaleString()}
                  </Text>
                )}
              </Card.Content>
            </Card>
          ))
        ) : (
          <Text style={styles.noEvent}>There are no events yet.</Text>
        )}
        <Toast />
      </ScrollView>
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
  form: {
    marginBottom: 24,
  },
  input: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  pickerWrapper: {
    borderRadius: 8,
    marginBottom: 20,
    padding: 6,
    position: "relative",
    zIndex: 9999,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 9999,
  },
  pickerText: {
    fontSize: 16,
    color: "#333",
  },
  customDropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#705C53",
    borderRadius: 10,
    overflow: "hidden",
  },
  blurView: {
    paddingVertical: 10,
    borderRadius: 8,
  },
  customDropdownItem: {
    padding: 10,
    fontSize: 16,
    color: "white",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 5,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    minHeight: 120,
  },
  dateText: {
    position: "absolute",
    bottom: -10,
    right: 20,
    fontSize: 12,
    color: "#ADACA7",
  },
  noEvent: {
    textAlign: "center",
    fontSize: 18,
    color: "#666",
    marginTop: 20,
  },
});

export default AdminEvents;
