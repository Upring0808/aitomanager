import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  onSnapshot,
  query,
  getDocs,
  where,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../../../../config/firebaseconfig";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
} from "lucide-react-native";

import Icon from "react-native-vector-icons/Ionicons";

const TIMELINE_HEIGHT = 660;
const EVENT_COLORS = [
  "#4F46E580",
  "#6D28D980",
  "#475569C0",
  "#22D3EE80",
  "#064E3BC0",
  "#14532DC0",
  "#713F12C0",
  "#78350FC0",
  "#762B91C0",
  "#3F3F46C0",
  "#5B21B6C0",
  "#4338CA80",
  "#1E293BC0",
  "#15803DC0",
  "#854D0EC0",
  "#831843C0",
  "#881337C0",
  "#57534EC0",
  "#525252C0",
  "#994F0FC0",
];

const AdminHome = () => {
  const [username, setUsername] = useState("");
  const [events, setEvents] = useState([]); // Events for the selected date
  const [allEvents, setAllEvents] = useState([]); // All events for the week
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekDays, setWeekDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [scrollY] = useState(new Animated.Value(0));
  //upcoming
  const [upcomingEvents, setUpcomingEvents] = useState([]);

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
    const eventsRef = collection(db, "events");
    const q = query(eventsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
      }));

      // Update week days with events
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      const eventsInWeek = allEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
      });

      updateWeekDaysWithEvents(eventsInWeek); // Update week days with events

      // Filter events for the selected date
      const selectedDayEvents = allEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isSameDay(eventDate, selectedDate);
      });

      // Filter upcoming events
      const upcomingEvents = allEvents
        .filter((event) => {
          const eventDate = event.dueDate?.toDate() || new Date();
          return eventDate > new Date();
        })
        .sort(
          (a, b) =>
            (a.dueDate?.toDate() || new Date()) -
            (b.dueDate?.toDate() || new Date())
        )
        .slice(0, 3); // Top 3 upcoming events

      setEvents(selectedDayEvents);
      setUpcomingEvents(upcomingEvents);
    });

    return () => unsubscribe();
  }, [selectedDate, updateWeekDaysWithEvents]);

  const timeToDecimalHours = (timeStr) => {
    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let decimalHours = hours;

    if (minutes) {
      decimalHours += minutes / 60;
    }

    if (period === "PM" && hours !== 12) {
      decimalHours += 12;
    } else if (period === "AM" && hours === 12) {
      decimalHours = minutes / 60;
    }

    return decimalHours;
  };

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

  const fetchEvents = useCallback(async () => {
    try {
      const eventsRef = collection(db, "events");
      const eventsSnapshot = await getDocs(eventsRef);

      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      const allFetchedEvents = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
      }));

      // Filter events that fall within the current week
      const eventsInWeek = allFetchedEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
      });

      // Filter today's events
      const todayEvents = allFetchedEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isSameDay(eventDate, new Date());
      });

      setEvents(todayEvents); // Events for today
      setAllEvents(allFetchedEvents); // Store all events for the week
      updateWeekDaysWithEvents(eventsInWeek); // Update week days with events
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, [selectedDate]);

  const updateWeekDaysWithEvents = useCallback(
    (eventsInWeek) => {
      const weekDaysWithEvents = generateWeekDays(weekStart).map((day) => ({
        ...day,
        hasEvents: eventsInWeek.some((event) => {
          const eventDate = event.dueDate?.toDate() || new Date();
          return isSameDay(eventDate, day.date);
        }),
      }));
      setWeekDays(weekDaysWithEvents);
    },
    [generateWeekDays, weekStart]
  );

  const handlePreviousWeek = useCallback(() => {
    setWeekStart((prev) => subWeeks(prev, 1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekStart((prev) => addWeeks(prev, 1));
  }, []);

  const handleDateSelect = useCallback(
    (date) => {
      setSelectedDate(date);
      fetchEvents(); // Fetch events for the selected date
    },
    [fetchEvents]
  );

  useEffect(() => {
    fetchEvents(); // Fetch events for the current week on mount
  }, [fetchEvents]);

  useEffect(() => {
    updateWeekDaysWithEvents(allEvents); // Update week days whenever allEvents changes
  }, [allEvents, updateWeekDaysWithEvents]);

  const getSectionTitle = useCallback(() => {
    const today = new Date();
    const isToday = isSameDay(selectedDate, today);
    const formattedDate = format(selectedDate, "MMMM d, yyyy");

    return isToday ? "Schedule Today" : `Schedule on: ${formattedDate}`;
  }, [selectedDate]);

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

  useEffect(() => {
    checkUserAndFetchData();
    const unsubscribe = setupRealtimeUpdates();
    return () => unsubscribe();
  }, [setupRealtimeUpdates]);

  useEffect(() => {
    updateWeekDaysWithEvents(events);
  }, [weekStart, updateWeekDaysWithEvents, events]);
  useEffect(() => {
    fetchEvents(); // Fetch events for the current week on mount
  }, []);
  const styles = StyleSheet.create({
    sectionHeader: {
      flexDirection: "row", // Aligns title and icon horizontally
      alignItems: "center", // Vertically centers them
      justifyContent: "flex-start", // Ensures proper spacing
      marginBottom: 0, // Adds space below the section
    },
    mainContainer: {
      flex: 1,
      backgroundColor: "#fff",
    },
    container: { flex: 1, padding: 20 },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 18,
      backgroundColor: "#003161",
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      marginBottom: 10,
    },
    leftContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1, // Allow left content to grow and shrink
      marginRight: 8, // Add spacing between left and right
    },
    rightContent: {
      flex: 1, // Allow right content to grow and shrink
      alignItems: "flex-end", // Align text to the right
    },
    icon: {
      marginRight: 8,
    },
    greeting: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
      flexShrink: 1, // Prevent overflowing content
      fontFamily: "Lato-Regular",
    },
    username: {
      fontSize: 20, // Increase the font size
      fontFamily: "Lato-Regular",
      fontWeight: "400", // Make the text bold
      color: "#FFFFFF", // Set a bright white color for emphasis
      marginRight: 20, // Add spacing to the right for breathing room
      textTransform: "capitalize", // Ensure the name starts with a capital letter
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
      color: "#4C4B16",
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: "#fff",
      marginBottom: 5,
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
      zIndex: 999999,
    },
    timelineContainer: {
      flexDirection: "column",
      paddingHorizontal: 20,
      marginTop: 8,
      marginBottom: 20,
      position: "relative",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      backgroundColor: "#F9FAFB",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,

      margin: 18,
      alignSelf: "stretch", // Adjust to the full width of the container
      height: "auto", // Allow dynamic height based on content
    },

    eventsContainer: {
      flexDirection: "column", // Stack event cards vertically
      paddingTop: 20,
    },

    eventCard: {
      borderRadius: 12,
      backgroundColor: "#4F46E5", // Custom color for a reminder look
      padding: 16,
      marginBottom: 20,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
    },

    eventContent: {
      flex: 1,
    },
    eventIcon: { marginRight: 10 },
    eventTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
    eventTime: { fontSize: 12, color: "#f0f0f0" },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      fontFamily: "Lato-Bold",
      color: "#333",
      marginRight: 5,
      marginLeft: 25,
    },
    noEventsText: {
      textAlign: "center",
      color: "#888",
      marginTop: 0,
      marginBottom: 20,
      paddingVertical: 100,
      fontSize: 16,
      fontStyle: "italic",
    },

    ReminderContainer: {
      marginBottom: 12,
    },
    ReminderSectionTitle: {
      marginLeft: 25,
      marginTop: 5,
      fontSize: 20,
      fontWeight: "600",
      color: "#333",
    },

    ReminderCardContainer: {
      marginBottom: 0,
      margin: 18,
    },
    ReminderCard: {
      backgroundColor: "#507687",
      borderRadius: 15,
      padding: 12.5,
      shadowColor: "#000",
      shadowOpacity: 0.02,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      marginVertical: -9,
      marginBottom: 0,
      borderWidth: 0.25,
      borderColor: "#B7B7B7",
    },
    ReminderCardContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    ReminderDateTimeContainer: {
      width: 80,
      marginRight: 16,
    },
    ReminderDateText: {
      fontSize: 19,
      fontWeight: "600",
      color: "#FFF4B7",
    },
    ReminderDayText: {
      textTransform: "uppercase",
      fontSize: 12,
      color: "#fff",
      textAlign: "left",
      width: "100%",
    },
    ReminderEventDetails: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    ReminderEventTitleContainer: {
      flex: 1,
    },
    ReminderEventTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#fff",
    },
    ReminderEventTimeframe: {
      fontSize: 14,
      color: "#fff",
      marginTop: 4,
    },
    ReminderEventRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    },
    ReminderIntersection: {
      height: 50,
      borderLeftWidth: 0.6,
      borderLeftColor: "#fff",
      marginVertical: 0,
      marginHorizontal: 0,
      marginLeft: -15.5,
      paddingRight: 20,
    },
    ReminderNoEvent: {
      textAlign: "center",
      marginTop: 50,
      color: "#888",
      fontSize: 18,
    },
    ReminderCardContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between", // Helps spread out the content
    },
    sectionTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 1,
      marginVertical: -0,
    },
    sectionTitleIcon: {
      marginLeft: 5,
      marginTop: 15,
    },
    ReminderIcon: {
      marginLeft: 170,
      marginTop: -23,

      marginBottom: 4,
    },
    ReminderSubtitle: {
      color: "#888",
      fontSize: 14,
      marginLeft: 25,
      marginBottom: 5,
      fontFamily: "Lato-Regular",
    },
    dateHeader: {
      padding: 10,
      backgroundColor: "#fff",
      marginBottom: -10,
      alignItems: "center", // Center items horizontally
      justifyContent: "center", // Center items vertically
      flexDirection: "row", // Change to 'column' if you want to stack items vertically
      textAlign: "center", // Center text within the container
    },
    currentDate: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#333",
    },
    selectedDate: {
      fontSize: 16,
      color: "#666",
      marginTop: 5,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: "#666",
    },
  });

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading Home...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.mainContainer}>
      <View style={styles.header}>
        <View style={styles.leftContent}>
          <Icon
            name="wallet-outline"
            size={24}
            color="#FFD700"
            style={styles.icon}
          />
          <Text style={styles.greeting}>{getGreeting()}</Text>
        </View>
        <View style={styles.rightContent}>
          <Text style={styles.username}>
            {username.split(" ")[0]} {/* Display only the first name */}
          </Text>
        </View>
      </View>

      {/* Current Date Display */}
      <View style={styles.dateHeader}>
        <Text style={styles.currentDate}>
          {format(selectedDate, "d MMMM yyyy")}
        </Text>
      </View>

      {/* Week Row with Days */}
      <View style={styles.weekRow}>
        {weekDays.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.dayColumn, day.isSelected && styles.selectedColumn]}
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

            {/* Event Dot - Displayed for days with events */}
            {day.hasEvents && <View style={styles.eventDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
        <Icon
          name="calendar-outline"
          size={24}
          color="#074799"
          style={styles.sectionIcon}
        />
      </View>

      {/* Timeline and Events */}
      <View style={styles.timelineContainer}>
        {/* Events Column */}
        <View style={styles.eventsContainer}>
          {events.length > 0 ? (
            events
              .sort((a, b) => {
                const convertToTimeValue = (time) => {
                  const [hour, minute, period] = time
                    .match(/(\d+):(\d+)\s?(AM|PM)/i)
                    .slice(1);
                  let hours = parseInt(hour, 10);
                  const minutes = parseInt(minute, 10);
                  if (period.toUpperCase() === "PM" && hours !== 12)
                    hours += 12;
                  if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
                  return hours * 60 + minutes;
                };
                return (
                  convertToTimeValue(a.timeframe) -
                  convertToTimeValue(b.timeframe)
                );
              })
              .map((event) => (
                <View
                  key={event.id}
                  style={[styles.eventCard, { backgroundColor: event.color }]}
                >
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventTime}>{event.timeframe}</Text>
                  </View>
                </View>
              ))
          ) : (
            <Text style={styles.noEventsText}>No scheduled events</Text>
          )}
        </View>
      </View>

      {/* Upcoming Events Section */}
      <View style={styles.ReminderContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <Icon
            name="time-outline" // Represents a clock
            size={24}
            color="#074799"
            style={styles.sectionIcon}
          />
        </View>
        <Text style={styles.ReminderSubtitle}>
          Be prepared for your scheduled events ahead.
        </Text>
        <ScrollView>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => {
              const eventDate = event.dueDate?.toDate() || new Date();
              return (
                <View key={event.id} style={styles.ReminderCardContainer}>
                  <View style={styles.ReminderCard}>
                    <View style={styles.ReminderCardContent}>
                      <View style={styles.ReminderDateTimeContainer}>
                        <Text style={styles.ReminderDateText}>
                          {format(eventDate, "MMM d")}
                        </Text>
                        <Text style={styles.ReminderDayText}>
                          {format(eventDate, "EEEE")}
                        </Text>
                      </View>
                      <View style={styles.ReminderIntersection} />
                      <View style={styles.ReminderEventDetails}>
                        <Text style={styles.ReminderEventTitle}>
                          {event.title}
                        </Text>
                        <Text style={styles.ReminderEventTimeframe}>
                          {format(eventDate, "h:mm a")}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.ReminderNoEvent}>No upcoming events</Text>
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
};
export default AdminHome;
