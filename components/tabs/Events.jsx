import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { db } from "../../config/firebaseconfig";
import { collection, getDocs } from "firebase/firestore";
import { Card } from "react-native-paper";
import Toast from "react-native-toast-message";
import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

const Events = () => {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const arrowRotation = useRef(new Animated.Value(0)).current;
  const dropdownHeight = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
        animateEventsEntrance();
      }
    };
    fetchEvents();
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    Animated.parallel([
      Animated.timing(arrowRotation, {
        toValue: showDropdown ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(dropdownHeight, {
        toValue: showDropdown ? 0 : 180,
        friction: 10,
        tension: 50,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animateEventsEntrance = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
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

  useEffect(() => {
    animateEventsEntrance();
  }, [filter]);

  const rotateArrow = arrowRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const renderEventCard = (event, index) => {
    const eventDate = new Date(event.createdAt.seconds * 1000);
    const formattedDate = eventDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const formattedTime = eventDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <Animated.View
        key={event.id}
        style={[
          styles.cardContainer,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateX: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [width, 0],
                }),
              },
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.dateTimeContainer}>
              <Text style={styles.dateText}>{formattedDate}</Text>
              <Text style={styles.timeText}>{formattedTime}</Text>
            </View>
            <View style={styles.eventDetails}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventTimeframe}>{event.timeframe}</Text>
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
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
            <BlurView intensity={90} tint="light" style={styles.blurView}>
              {["All", "Today", "Past"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.customDropdownItem}
                  onPress={() => {
                    setFilter(option);
                    toggleDropdown();
                  }}
                >
                  <Text style={styles.dropdownItemText}>{option} Events</Text>
                </TouchableOpacity>
              ))}
            </BlurView>
          </Animated.View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3E588F" />
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map(renderEventCard)
        ) : (
          <Text style={styles.noEvent}>No events available.</Text>
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
  pickerWrapper: {
    marginBottom: 20,
    zIndex: 1000,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  pickerText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  customDropdown: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  blurView: {
    borderRadius: 12,
    overflow: "hidden",
  },
  customDropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
  },
  dateTimeContainer: {
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3E588F",
  },
  timeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  eventTimeframe: {
    fontSize: 14,
    color: "#666",
  },
  noEvent: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 20,
  },
});

export default Events;
