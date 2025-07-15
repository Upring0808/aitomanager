import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from "react-native";
import { db, auth } from "../../../../config/firebaseconfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import Toast from "react-native-toast-message";
import EventDetailsCard from "../../../../components/EventDetailsCard";
import DropdownPicker from "../../../../components/DropdownPicker";
import QRScanner from "../../../../components/QRScanner";
import { Styles } from "../../../../styles/Styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import cacheService from "../../../../services/CacheService";
import { FontAwesome } from "@expo/vector-icons";

const Events = ({
  navigation,
  initialData = [],
  isDataPreloaded = false,
  showLogoutModal,
}) => {
  const [events, setEvents] = useState(initialData);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [userAttendance, setUserAttendance] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const unsubscribeRef = useRef(null);
  const isInitialMount = useRef(true);
  const isFirstMount = useRef(true);
  const insets = useSafeAreaInsets();
  const headerColor = "#ffffff";
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      
      // Always fetch events from Firestore to get up-to-date comment counts
      const eventsRef = collection(db, "organizations", orgId, "events");
      const q = query(eventsRef, orderBy("dueDate", "asc"));
      const snapshot = await getDocs(q);
      let eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate?.() ? doc.data().dueDate.toDate() : new Date(),
      }));
      // Cache the events data with proper date conversion
      const eventsForCache = eventsData.map(event => ({
        ...event,
        dueDate: event.dueDate ? event.dueDate.toISOString() : new Date().toISOString(),
      }));
      await cacheService.cacheEvents(orgId, eventsForCache);
      // Fetch comment count for each event using getDocs
      const eventsWithCounts = await Promise.all(eventsData.map(async (event) => {
        const commentsRef = collection(db, "organizations", orgId, "events", event.id, "comments");
        let commentCount = 0;
        try {
          const snapshot = await getDocs(commentsRef);
          commentCount = snapshot.size;
        } catch (e) {
          commentCount = 0;
        }
        return { ...event, commentCount };
      }));
      setEvents(eventsWithCounts);
      console.log('Events with commentCount:', eventsWithCounts.map(e => ({ title: e.title, commentCount: e.commentCount })));
      updateUserAttendance(eventsWithCounts);
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

  const fetchEventsOnce = useCallback(async () => {
    if (hasLoaded) return;
    
    // Check if we have cached data first
    const orgId = await AsyncStorage.getItem("selectedOrgId");
    if (orgId) {
      const hasCachedEvents = await cacheService.hasCache(cacheService.generateKey("events", orgId));
      if (hasCachedEvents) {
        console.log("[Events] Found cached data, loading immediately");
        // Load cached data immediately without showing loading state
        const cachedEvents = await cacheService.getCachedEvents(orgId);
        if (cachedEvents) {
          const eventsData = cachedEvents.map((event) => ({
            ...event,
            // Convert cached date string back to Date object
            dueDate: event.dueDate ? new Date(event.dueDate) : new Date(),
          }));
          setEvents(eventsData);
          updateUserAttendance(eventsData);
          setHasLoaded(true);
          setLoading(false);
          setIsDataReady(true);
          return;
        }
      }
    }
    
    // Only show loading if no cached data
    setLoading(true);
    try {
      await fetchEvents();
      setHasLoaded(true);
      setIsDataReady(true);
    } finally {
      setLoading(false);
    }
  }, [hasLoaded, fetchEvents]);

  // Set up real-time listener for events
  useEffect(() => {
    // Skip initial setup if we have preloaded data
    if (isInitialMount.current && initialData.length > 0) {
      isInitialMount.current = false;
      return;
    }

    // Only set up real-time listener if we don't have data ready
    if (isDataReady) return;

    (async () => {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const eventsRef = collection(db, "organizations", orgId, "events");
      const q = query(eventsRef, orderBy("dueDate", "asc"));
      unsubscribeRef.current = onSnapshot(
        (snapshot) => {
          const eventsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate?.() ? doc.data().dueDate.toDate() : new Date(),
          }));
          
          // Cache the events data with proper date conversion
          const eventsForCache = eventsData.map(event => ({
            ...event,
            // Convert Date objects to ISO strings for caching
            dueDate: event.dueDate ? event.dueDate.toISOString() : new Date().toISOString(),
          }));
          cacheService.cacheEvents(orgId, eventsForCache);
          
          setEvents(eventsData);

          // Update user attendance status
          updateUserAttendance(eventsData);

          setLoading(false);
          setRefreshing(false);
          setIsDataReady(true);
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
  }, [initialData, isDataReady]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const orgId = await AsyncStorage.getItem('selectedOrgId');
      if (!orgId) return;

      // 1. Try to load cached events immediately
      const cached = await cacheService.getCachedEvents(orgId);
      if (cached && isMounted) {
        setEvents(cached);
        setLoading(false); // Show cached data instantly, no spinner
      }

      // 2. Always fetch fresh events in the background
      fetchAndUpdateEvents(orgId, isMounted);
    })();
    return () => { isMounted = false; };
  }, []);

  const fetchAndUpdateEvents = async (orgId, isMounted = true) => {
    try {
      const eventsRef = collection(db, 'organizations', orgId, 'events');
      const q = query(eventsRef, orderBy('dueDate', 'asc'));
      const snapshot = await getDocs(q);
      let eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate?.() ? doc.data().dueDate.toDate() : new Date(),
      }));

      // Fetch comment count and seenProfiles for each event
      eventsData = await Promise.all(eventsData.map(async (event) => {
        // Comment count
        const commentsRef = collection(db, 'organizations', orgId, 'events', event.id, 'comments');
        let commentCount = 0;
        try {
          const commentsSnap = await getDocs(commentsRef);
          commentCount = commentsSnap.size;
        } catch {}
        // Seen profiles
        let seenProfiles = [];
        if (Array.isArray(event.seenBy) && event.seenBy.length > 0) {
          seenProfiles = await Promise.all(event.seenBy.map(async (uid) => {
            try {
              const userRef = doc(db, 'organizations', orgId, 'users', uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const data = userSnap.data();
                return {
                  id: uid,
                  username: data.username || data.email || 'Unknown',
                  avatarUrl: data.avatarUrl || null,
                };
              }
            } catch {}
            return null;
          }));
          seenProfiles = seenProfiles.filter(Boolean);
        }
        return { ...event, commentCount, seenProfiles };
      }));

      // 3. Update cache and UI
      await cacheService.cacheEvents(orgId, eventsData);
      if (isMounted) setEvents(eventsData);
    } catch (error) {
      console.error('[Events] Error fetching events:', error);
    }
  };

  // Add a manual refresh handler if needed
  const handleManualRefresh = async () => {
    setHasLoaded(false);
    setLoading(true);
    await fetchEventsOnce();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
  }, [fetchEvents]);

  // Helper function to check if event is active (same logic as EventDetailsCard)
  const isEventActive = (event) => {
    if (!event.dueDate || !event.timeframe) return false;
    
    const parseLocalDateTime = (date, timeStr) => {
      let hours = 0, minutes = 0;
      if (/AM|PM/i.test(timeStr)) {
        const [time, modifier] = timeStr.split(/\s+/);
        let [h, m] = time.split(":").map(Number);
        if (modifier.toUpperCase() === "PM" && h !== 12) h += 12;
        if (modifier.toUpperCase() === "AM" && h === 12) h = 0;
        hours = h;
        minutes = m;
      } else {
        [hours, minutes] = timeStr.split(":").map(Number);
      }
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
        0,
        0
      );
    };

    const getEventStartEnd = (event) => {
      if (!event.dueDate || !event.timeframe) return [null, null];
      const date = new Date(event.dueDate);
      
      let match = event.timeframe.match(
        /(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i
      );
      if (match) {
        const [_, startStr, endStr] = match;
        const startDate = parseLocalDateTime(date, startStr);
        const endDate = parseLocalDateTime(date, endStr);
        return [startDate, endDate];
      }
      
      match = event.timeframe.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      if (match) {
        const [_, startStr, endStr] = match;
        const startDate = parseLocalDateTime(date, startStr);
        const endDate = parseLocalDateTime(date, endStr);
        return [startDate, endDate];
      }
      return [date, date];
    };

    const [eventStart, eventEnd] = getEventStartEnd(event);
    const now = new Date();
    return eventEnd && now <= eventEnd;
  };

  const handleCentralizedScanQR = () => {
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

  // Always define filteredEvents as a variable before rendering
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

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        {/* Header/Filter restored and moved outside ScrollView */}
        <View style={[Styles.filterContainer, { paddingHorizontal: 16 }]}>
          <View style={Styles.filterRow}>
            <View style={Styles.filterDropdown}>
              <DropdownPicker
                options={["All", "Current", "Upcoming", "Past"]}
                selectedValue={filter}
                onValueChange={setFilter}
              />
            </View>
            <TouchableOpacity
              style={Styles.qrScanButton}
              onPress={handleCentralizedScanQR}
              activeOpacity={0.8}
            >
              <FontAwesome name="qrcode" size={20} color="white" />
              <Text style={Styles.qrScanButtonText}>Scan QR</Text>
            </TouchableOpacity>
          </View>
          <View style={Styles.qrScanHint}>
            <FontAwesome name="info-circle" size={14} color="#666" />
            <Text style={Styles.qrScanHintText}>
              Use QR scan to quickly attend events
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom:100 }}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#203562"]}
              tintColor="#203562"
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {filteredEvents.length > 0 ? (
            (() => { // Add debug log before rendering
              console.log('Rendering filteredEvents:', filteredEvents.map(e => ({ title: e.title, commentCount: e.commentCount })));
              return filteredEvents.map((item) => (
                <EventDetailsCard
                  key={item.id}
                  event={item}
                  hasAttended={userAttendance[item.id] || false}
                  navigation={navigation}
                />
              ));
            })()
          ) : (
            <Text style={Styles.noEvent}>No events available.</Text>
          )}
        </ScrollView>
        <Toast />
      </SafeAreaView>

      {/* QR Scanner Modal */}
      <QRScanner
        visible={qrScannerVisible}
        onClose={() => setQrScannerVisible(false)}
        onAttendanceMarked={handleAttendanceMarked}
      />
    </>
  );
};

export default Events;
