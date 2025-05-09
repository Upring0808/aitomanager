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
import { db } from "../../../../config/firebaseconfig";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import Toast from "react-native-toast-message";
import EventDetailsCard from "../../../../components/EventDetailsCard";
import DropdownPicker from "../../../../components/DropdownPicker";
import { Styles } from "../../../../styles/Styles";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchEvents = useCallback(() => {
    if (!refreshing) setLoading(true);
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
  }, [refreshing]);

  useEffect(() => {
    const unsubscribe = fetchEvents();
    return () => unsubscribe();
  }, [fetchEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
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
      <View style={Styles.mainContainer}>
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
            <DropdownPicker
              options={["All", "Current", "Upcoming"]}
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
