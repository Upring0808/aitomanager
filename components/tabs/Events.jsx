import React, { useState, useEffect, useRef, useCallback } from "react";
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
  RefreshControl,
} from "react-native";
import { db } from "../../config/firebaseconfig";
import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
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
  const [refreshing, setRefreshing] = useState(false);
  const arrowRotation = useRef(new Animated.Value(0)).current;
  const dropdownHeight = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchEvents = useCallback(async () => {
    if (!refreshing) setLoading(true); // Set loading only if it's not a refresh
    try {
      const eventsCollection = collection(db, "events");
      const eventsQuery = query(eventsCollection, orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
        const eventsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(eventsList);
        animateEventsEntrance();
        setLoading(false);
        setRefreshing(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error fetching events:", error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    const unsubscribe = fetchEvents();
    return () => unsubscribe;
  }, [fetchEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);
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
      <View style={styles.mainContainer}>
        {loading && !refreshing && (
          <ActivityIndicator
            size="large"
            color="#3E588Faa"
            style={styles.centerLoading}
          />
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#D3D6DB"]}
              tintColor="#D3D6DB"
            />
          }
        >
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

          {filteredEvents.length > 0 ? (
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
  pickerWrapper: {
    position: "relative",
    zIndex: 1000,
  },
  filterContainer: {
    position: "relative",
    zIndex: 1000,
    marginBottom: 20,
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
  dropdownOverlay: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 1000,
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
  blurView: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#233c60",
  },
  customDropdownItem: {
    padding: 16,
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 16,
  },
  noEvent: {
    textAlign: "center",
    marginTop: 50,
    color: "#888",
    fontSize: 18,
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flex: 1,
    marginLeft: 16,
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
  centerLoading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -25, // half of size
    marginTop: -25, // half of size
    zIndex: 10,
  },
});

export default Events;
