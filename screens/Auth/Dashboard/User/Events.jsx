import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { db } from "../../../../config/firebaseconfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import Toast from "react-native-toast-message";
import EventDetailsCard from "../../../../components/EventDetailsCard";
import DropdownPicker from "../../../../components/DropdownPicker";
import { Styles } from "../../../../styles/Styles";

const Events = ({
  initialData = [],
  isDataPreloaded = false,
  showLogoutModal,
}) => {
  const [events, setEvents] = useState(initialData);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const unsubscribeRef = useRef(null);
  const isInitialMount = useRef(true);

  const fetchEvents = useCallback(async () => {
    try {
      const eventsRef = collection(db, "events");
      const q = query(eventsRef, orderBy("dueDate", "asc"));
      const snapshot = await getDocs(q);
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
      }));
      setEvents(eventsData);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("[Events] Error fetching events:", error);
      setLoading(false);
      setRefreshing(false);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to refresh events",
      });
    }
  }, []);

  // Set up real-time listener for events
  useEffect(() => {
    // Skip initial setup if we have preloaded data
    if (isInitialMount.current && initialData.length > 0) {
      isInitialMount.current = false;
      return;
    }

    const eventsRef = collection(db, "events");
    const q = query(eventsRef, orderBy("dueDate", "asc"));

    // Store the unsubscribe function in the ref
    unsubscribeRef.current = onSnapshot(
      q,
      (snapshot) => {
        const eventsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate?.toDate(),
        }));
        setEvents(eventsData);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("[Events] Error in snapshot listener:", error);
        setLoading(false);
        setRefreshing(false);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load events",
        });
      }
    );

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [initialData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
  }, [fetchEvents]);

  const animateEventsEntrance = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const filteredEvents = events.filter((event) => {
    if (!event.dueDate) return false;

    const eventDate = event.dueDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

  useEffect(() => {
    animateEventsEntrance();
  }, [filter]);

  if (loading) {
    return (
      <View style={Styles.loader}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={Styles.loadingText}>Loading Events...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={Styles.safeArea}>
      <StatusBar
        barStyle={showLogoutModal ? "light-content" : "dark-content"}
        backgroundColor={showLogoutModal ? "transparent" : "#ffffff"}
        translucent={!!showLogoutModal}
      />
      <View style={Styles.mainContainer}>
        <ScrollView
          contentContainerStyle={Styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#007BFF"]}
              tintColor="#007BFF"
            />
          }
        >
          <View style={Styles.filterContainer}>
            <DropdownPicker
              options={["All", "Current", "Upcoming", "Past"]}
              selectedValue={filter}
              onValueChange={setFilter}
            />
          </View>

          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <EventDetailsCard event={event} key={event.id} />
            ))
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
