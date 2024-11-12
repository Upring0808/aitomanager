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
import { db } from "../../../../config/firebaseconfig";
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
import { Styles } from "../../../../styles/Styles";
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

  useEffect(() => {
    animateEventsEntrance();
  }, [filter]);

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

    // Add an onPress function to trigger the QR scanner
    const onScanPress = () => {
      // Code to open the QR scanner will go here
    };
    return (
      <Animated.View
        key={event.id}
        style={[
          Styles.cardContainer,
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
        <Card key={event.id} style={Styles.card}>
          <View style={Styles.cardContent}>
            <View style={Styles.dateTimeContainer}>
              <Text style={Styles.dateText}>{formattedDate}</Text>
              <Text style={Styles.dayText}>{formattedDay}</Text>
            </View>
            <View style={Styles.intersection} />
            <View style={Styles.eventDetails}>
              <View style={Styles.eventRow}>
                <View style={Styles.eventTitleContainer}>
                  <Text style={Styles.eventTitle}>{event.title}</Text>
                  <Text style={Styles.eventTimeframe}>{event.timeframe}</Text>
                  <Text style={Styles.timestampText}>{createdAt}</Text>
                </View>
                {/* Add Scanner Icon */}
                <TouchableOpacity
                  onPress={onScanPress}
                  style={Styles.iconContainer}
                >
                  <FontAwesome name="qrcode" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={Styles.safeArea}>
      <View style={Styles.mainContainer}>
        {loading && !refreshing && (
          <ActivityIndicator
            size="large"
            color="#3E588Faa"
            style={Styles.centerLoading}
          />
        )}

        <ScrollView
          contentContainerStyle={Styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#D3D6DB"]}
              tintColor="#D3D6DB"
            />
          }
        >
          <View style={Styles.filterContainer}>
            <View style={Styles.pickerWrapper}>
              <TouchableOpacity
                style={Styles.pickerButton}
                onPress={toggleDropdown}
              >
                <Text style={Styles.pickerText}>Filter: {filter}</Text>
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
                  Styles.customDropdown,
                  {
                    height: dropdownHeight,
                    opacity: dropdownHeight.interpolate({
                      inputRange: [0, 160],
                      outputRange: [0, 1],
                    }),
                  },
                ]}
              >
                <View style={Styles.dropdownContent}>
                  {["All", "Current", "Upcoming"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={Styles.customDropdownItem}
                      onPress={() => {
                        setFilter(option);
                        toggleDropdown();
                      }}
                    >
                      <Text style={Styles.dropdownItemText}>
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
            <Text style={Styles.noEvent}>No events available.</Text>
          )}
        </ScrollView>
        <Toast />
      </View>
    </SafeAreaView>
  );
};

export default Events;
