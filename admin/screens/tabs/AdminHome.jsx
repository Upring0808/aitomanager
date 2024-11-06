import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  collection,
  onSnapshot,
  query,
  getDocs,
  where,
} from "firebase/firestore";
import { auth, db } from "../../../config/firebaseconfig";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  parse,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

const TIMELINE_HEIGHT = 660;
const EVENT_COLORS = [
  "#7C3AED80",
  "#3B82F680",
  "#10B98180",
  "#F59E0B80",
  "#EC489980",
  "#F472B680",
  "#FBBF2480",
  "#34D39980",
  "#60A5FA80",
  "#A78BFA80",
];
const TIME_SLOTS = [
  "7:00 AM",
  "7:30 AM",
  "8:00 AM",
  "8:30 AM",
  "9:00 AM",
  "9:30 AM",

  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "NOON",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
];

const Home = () => {
  const [username, setUsername] = useState("");
  const [events, setEvents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekDays, setWeekDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [scrollY] = useState(new Animated.Value(0));

  //loader while fetching
  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchEvents()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    checkUserAndFetchData();
    setupRealtimeUpdates(); // Start real-time listener
  }, []);

  const setupRealtimeUpdates = useCallback(() => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const eventsRef = collection(db, "events");
    const q = query(
      eventsRef,
      where("createdAt", ">=", dayStart),
      where("createdAt", "<=", dayEnd)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filteredEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
      }));

      setEvents(filteredEvents);
      updateWeekDaysWithEvents(filteredEvents);
    });

    return () => unsubscribe();
  }, [selectedDate, updateWeekDaysWithEvents]);

  const timeToDecimalHours = (timeStr) => {
    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let decimalHours = hours;

    // Convert minutes to decimal
    if (minutes) {
      decimalHours += minutes / 60;
    }

    // Handle PM conversion
    if (period === "PM" && hours !== 12) {
      decimalHours += 12;
    } else if (period === "AM" && hours === 12) {
      decimalHours = minutes / 60; // For 12 AM, start from 0 plus any minutes
    }

    return decimalHours;
  };

  // Check user role and fetch username
  const checkUserAndFetchData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const adminDoc = await getDocs(
          query(collection(db, "admin"), where("uid", "==", currentUser.uid))
        );

        if (!adminDoc.empty) {
          setIsAdmin(true);
          setUsername(adminDoc.docs[0].data().username);
        } else {
          const userDoc = await getDocs(
            query(collection(db, "users"), where("uid", "==", currentUser.uid))
          );
          if (!userDoc.empty) {
            setUsername(userDoc.docs[0].data().username);
          }
        }
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

  const timeSlots = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 7),
    []
  );

  // Generate week days
  const generateWeekDays = useCallback(
    (startDate) => {
      return Array.from({ length: 7 }, (_, i) => {
        const date = addDays(startDate, i);
        return {
          date,
          dayNumber: format(date, "d"),
          dayName: format(date, "E"),
          isSelected: isSameDay(date, selectedDate),
          hasEvents: false,
        };
      });
    },
    [selectedDate]
  );

  // event fetching
  const fetchEvents = useCallback(async (date) => {
    try {
      const eventsRef = collection(db, "events");
      const eventsSnapshot = await getDocs(eventsRef);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = eventsSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
        }))
        .filter((event) => {
          const eventDate = new Date(event.createdAt.seconds * 1000);
          return eventDate >= dayStart && eventDate <= dayEnd;
        })
        .sort((a, b) => {
          const getStartTime = (event) => {
            if (event.timeframe) {
              const [start] = event.timeframe.split("-");
              const [hours] = start.split(":").map(Number);
              return hours;
            }
            return new Date(event.createdAt.seconds * 1000).getHours();
          };
          return getStartTime(a) - getStartTime(b);
        });

      setEvents(dayEvents);
      updateWeekDaysWithEvents(dayEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, []);

  // Update week days with events
  const updateWeekDaysWithEvents = useCallback(
    (dayEvents) => {
      setWeekDays(
        generateWeekDays(weekStart).map((day) => ({
          ...day,
          hasEvents: dayEvents.some((event) => {
            const eventDate = new Date(event.createdAt.seconds * 1000);
            return (
              format(eventDate, "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
            );
          }),
        }))
      );
    },
    [generateWeekDays, weekStart]
  );

  // Navigation handlers
  const handlePreviousWeek = useCallback(() => {
    setWeekStart((prev) => subWeeks(prev, 1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekStart((prev) => addWeeks(prev, 1));
  }, []);

  const handleDateSelect = useCallback(
    (date) => {
      Animated.spring(scrollY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      setSelectedDate(date);
    },
    [scrollY]
  );

  //greetings
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good Morning, ";
    } else if (hour < 17) {
      return "Good Afternoon, ";
    } else {
      return "Good Evening, ";
    }
  };

  // Get event style with position calculation
  const getEventStyle = (event, index) => {
    let startDecimalHour, endDecimalHour;

    if (event.timeframe) {
      const [start, end] = event.timeframe
        .split("-")
        .map((time) => time.trim());
      startDecimalHour = timeToDecimalHours(start);
      endDecimalHour = timeToDecimalHours(end);
    } else {
      const eventDate = new Date(event.createdAt.seconds * 1000);
      startDecimalHour = eventDate.getHours() + eventDate.getMinutes() / 60;
      endDecimalHour = startDecimalHour + 1;
    }

    // Calculate position relative to 7 AM (our starting time)
    const startPosition = (startDecimalHour - 7) * (TIMELINE_HEIGHT / 12);
    const duration = endDecimalHour - startDecimalHour;
    const height = duration * (TIMELINE_HEIGHT / 12);

    return {
      position: "absolute",
      top: startPosition,
      height: Math.max(height, 30), // Minimum height of 30px for visibility
      left: 8 + (index % 3) * 90, // Distribute events horizontally
      width: 80,
      backgroundColor: event.color,
      borderRadius: 8,
      padding: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,

      zIndex: 1,
    };
  };
  // Initial data fetch
  useEffect(() => {
    checkUserAndFetchData();
    fetchEvents(selectedDate);
  }, []);

  // Update week days when week changes
  useEffect(() => {
    updateWeekDaysWithEvents(events);
  }, [weekStart, updateWeekDaysWithEvents, events]);

  const styles = StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: "#fff",
    },
    container: {
      flex: 1,
      paddingTop: 40,
    },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 20,
      backgroundColor: "#fff",
      borderBottomWidth: 1,
      borderBottomColor: "#f1f1f1",
    },
    greeting: {
      fontSize: 26,
      color: "#666",
      fontWeight: "500",
    },
    username: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#333",
      marginLeft: 5,
    },
    calendarHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: "#fff",
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#333",
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: "#fff",
    },
    dayColumn: {
      alignItems: "center",
      width: 40,
      paddingVertical: 8,
      borderRadius: 10,
    },
    selectedColumn: {
      backgroundColor: "#E1F7F5",
    },
    hasEventsColumn: {
      position: "relative",
    },
    dayText: {
      fontSize: 12,
      color: "#666",
      marginBottom: 4,
    },
    dateText: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#333",
    },
    selectedText: {
      color: "#024CAA",

      fontWeight: "bold",
    },
    eventDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#FF4545",
      marginTop: 4,
    },
    timelineContainer: {
      flexDirection: "row",
      paddingHorizontal: 20,
      marginBottom: 20,
      position: "relative",
      borderRadius: 20,
      height: TIMELINE_HEIGHT,
      borderWidth: 0.5,
      borderColor: "#B7B7B7",
      margin: 10,
    },
    timelineHours: {
      width: "60",
      paddingRight: 10,
    },
    timeSlot: {
      height: TIMELINE_HEIGHT / 24, // Divide by number of time slots
      justifyContent: "flex-start",
      paddingTop: 5,
      borderTopWidth: 1,
      width: "100%",
      borderTopColor: "#f0f0f0",
    },
    timeText: {
      fontSize: 12,
      color: "#999",
    },
    eventsContainer: {
      flex: 1,
      position: "relative",
      borderLeftWidth: 1,
      borderLeftColor: "#f0f0f0",
    },
    eventCard: {
      position: "absolute",
      padding: 5,
      marginTop: 30,
      borderRadius: 8,
      width: "auto", // Set to auto or a specific width
      maxWidth: "30%", // Ensure it doesn't exceed the card's width
    },

    eventTitle: {
      fontSize: 11,
      fontWeight: "bold",
      color: "#fff",
    },

    eventTime: {
      fontSize: 10,
      color: "#f3f3f3",
      width: "100%", // Set to 100% to take full width of the card
      flexWrap: "wrap", // Allow text to wrap to the next line
      overflow: "hidden", // Hide overflow text
      textOverflow: "ellipsis", // Show ellipsis for overflowing text (if needed)
      whiteSpace: "normal", // Allow wrapping (default behavior)
    },
    sectionTitle: {
      marginLeft: 20,
      marginTop: 5,
      fontSize: 24,
      fontWeight: "bold",
      color: "#333",
    },
  });

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3E588Faa" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}> {getGreeting()}</Text>
        <Text style={styles.username}>{username}</Text>
      </View>

      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={handlePreviousWeek}>
          <ChevronLeft size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{format(weekStart, "MMMM yyyy")}</Text>
        <TouchableOpacity onPress={handleNextWeek}>
          <ChevronRight size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Week Row */}
      <View style={styles.weekRow}>
        {weekDays.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayColumn,
              day.isSelected && styles.selectedColumn,
              day.hasEvents && styles.hasEventsColumn,
            ]}
            onPress={() => handleDateSelect(day.date)}
          >
            <Text
              style={[styles.dateText, day.isSelected && styles.selectedText]}
            >
              {day.dayNumber}
            </Text>
            <Text
              style={[styles.dayText, day.isSelected && styles.selectedText]}
            >
              {day.dayName}
            </Text>

            {day.hasEvents && <View style={styles.eventDot} />}
          </TouchableOpacity>
        ))}
      </View>
      <View>
        <Text style={styles.sectionTitle}>Schedule Today</Text>
      </View>

      {/* Timeline and Events */}
      <View style={styles.timelineContainer}>
        {/* Timeline Hours */}
        <View style={styles.timelineHours}>
          {TIME_SLOTS.map((time, index) => (
            <View key={time} style={styles.timeSlot}>
              <Text style={styles.timeText}>{time}</Text>
            </View>
          ))}
        </View>

        {/* Events Column */}
        <View style={styles.eventsContainer}>
          {events.map((event, index) => (
            <View
              key={event.id}
              style={[getEventStyle(event, index), styles.eventCard]}
            >
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventTime}>{event.timeframe}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

export default Home;
