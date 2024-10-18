import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  Text,
  Alert,
  SafeAreaView,
} from "react-native";
import { db } from "../../config/firebaseconfig"; // Firestore instance from your config
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore"; // Firestore methods
import { Button, Card, Paragraph } from "react-native-paper"; // React Native Paper components
import Toast from "react-native-toast-message"; // Toast notifications

const Events = () => {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [timeframe, setTimeframe] = useState("");

  // Fetch events from Firebase Firestore
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollection = collection(db, "events"); // Access 'events' collection
        const eventsSnapshot = await getDocs(eventsCollection); // Get documents
        const eventsList = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, []);

  // Function to add an event to Firestore
  const handleAddEvent = async () => {
    if (!title || !timeframe) {
      Alert.alert("Please fill out both fields");
      return;
    }

    try {
      const newEvent = {
        title,
        timeframe,
        createdAt: Timestamp.now(), // Store creation timestamp
      };
      await addDoc(collection(db, "events"), newEvent); // Add to Firestore
      setEvents([...events, { ...newEvent, id: Date.now().toString() }]); // Add to local state

      setTitle(""); // Reset input fields
      setTimeframe("");

      // Show success toast notification
      Toast.show({
        type: "success",
        text1: "Event has been created",
        text2: `Created at: ${new Date(
          newEvent.createdAt.seconds * 1000
        ).toLocaleString()}`,
      });
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* SafeAreaView for notch handling */}
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
          {/* React Native Paper Button */}
          <Button mode="outlined" onPress={handleAddEvent}>
            Add Event
          </Button>
        </View>

        {/* Display events in a card format */}
        {events.map((event) => (
          <Card key={event.id} style={styles.card}>
            <Card.Title title={event.title} />
            <Card.Content>
              <Paragraph>{event.timeframe}</Paragraph>
              {/* Date at the bottom right */}
              {event.createdAt && (
                <Text style={styles.dateText}>
                  {new Date(event.createdAt.seconds * 1000).toLocaleString()}
                </Text>
              )}
            </Card.Content>
          </Card>
        ))}

        {events.length === 0 && (
          <Text style={styles.noEvent}>No events added yet</Text>
        )}

        {/* Toast Notification */}
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
  card: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    minHeight: 170, // Increased card height
    justifyContent: "center",
  },
  dateText: {
    position: "absolute",
    bottom: 10,
    right: 10,
    fontSize: 12,
    color: "#666",
  },
  noEvent: {
    textAlign: "center",
    fontSize: 18,
    color: "#666",
    marginTop: 20,
  },
});

export default Events;
