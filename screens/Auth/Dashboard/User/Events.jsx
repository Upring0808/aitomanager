import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  StatusBar,
} from "react-native";
import { db, auth } from "../../../../config/firebaseconfig";
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
import QRScanner from "../../../../components/QRScanner";
import { Styles } from "../../../../styles/Styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Events = ({
  initialData = [],
  isDataPreloaded = false,
  showLogoutModal,
}) => {
  const [events, setEvents] = useState(initialData);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userAttendance, setUserAttendance] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const unsubscribeRef = useRef(null);
  const isInitialMount = useRef(true);
  const insets = useSafeAreaInsets();
  const headerColor = "#ffffff";

  const fetchEvents = useCallback(async () => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const eventsRef = collection(db, "organizations", orgId, "events");
      const q = query(eventsRef, orderBy("dueDate", "asc"));
      const snapshot = await getDocs(q);
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
      }));
      setEvents(eventsData);

      // Update user attendance status
      updateUserAttendance(eventsData);

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

  const updateUserAttendance = (eventsData) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const attendance = {};
    eventsData.forEach((event) => {
      const attendees = event.attendees || [];
      attendance[event.id] = attendees.includes(currentUser.uid);
    });
    setUserAttendance(attendance);
  };

  // Set up real-time listener for events
  useEffect(() => {
    // Skip initial setup if we have preloaded data
    if (isInitialMount.current && initialData.length > 0) {
      isInitialMount.current = false;
      return;
    }

    (async () => {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const eventsRef = collection(db, "organizations", orgId, "events");
      const q = query(eventsRef, orderBy("dueDate", "asc"));
      unsubscribeRef.current = onSnapshot(
        q,
        (snapshot) => {
          const eventsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate(),
          }));
          setEvents(eventsData);

          // Update user attendance status
          updateUserAttendance(eventsData);

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
    })();

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

  const handleScanQR = (event) => {
    setSelectedEvent(event);
    setQrScannerVisible(true);
  };

  const handleAttendanceMarked = () => {
    // Refresh events to update attendance status
    fetchEvents();
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
        <ActivityIndicator size="large" color="#203562" />
        <Text style={Styles.loadingText}>Loading Events...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={{ flex: 1 }}>
        {/* Extend header background behind status bar */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + 80, // Adjust 80 to your header height
            backgroundColor: headerColor,
            zIndex: 0,
          }}
        />
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: "transparent",
            paddingTop: insets.top,
          }}
          edges={["top", "left", "right"]}
        >
          <View style={Styles.mainContainer}>
            <ScrollView
              contentContainerStyle={Styles.scrollContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#203562"]}
                  tintColor="#203562"
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
                  <EventDetailsCard
                    event={event}
                    key={event.id}
                    onScanQR={handleScanQR}
                    hasAttended={userAttendance[event.id] || false}
                  />
                ))
              ) : (
                <Text style={Styles.noEvent}>No events available.</Text>
              )}
            </ScrollView>
            <Toast />
          </View>

          {/* QR Scanner Modal */}
          <QRScanner
            visible={qrScannerVisible}
            onClose={() => setQrScannerVisible(false)}
            onAttendanceMarked={handleAttendanceMarked}
          />
        </SafeAreaView>
      </View>
    </>
  );
};

export default Events;
