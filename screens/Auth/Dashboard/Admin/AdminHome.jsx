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
import { ChevronLeft, ChevronRight } from "lucide-react-native";

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
  const [events, setEvents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekDays, setWeekDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [scrollY] = useState(new Animated.Value(0));

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

      // Filter events for the selected date
      const selectedDayEvents = allEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isSameDay(eventDate, selectedDate);
      });

      setEvents(selectedDayEvents);

      // Update week days with events
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      const eventsInWeek = allEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
      });

      updateWeekDaysWithEvents(eventsInWeek);
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

  const fetchEvents = useCallback(
    async (date) => {
      try {
        const eventsRef = collection(db, "events");
        const eventsSnapshot = await getDocs(eventsRef);

        const targetDate = date || selectedDate;
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        const dayEvents = eventsSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            color:
              EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
          }))
          .filter((event) => {
            const eventDate = event.dueDate?.toDate() || new Date();
            return isWithinInterval(eventDate, {
              start: dayStart,
              end: dayEnd,
            });
          })
          .sort((a, b) => {
            const getStartTime = (event) => {
              if (event.timeframe) {
                const [start] = event.timeframe.split("-");
                const [hours] = start.split(":").map(Number);
                return hours;
              }
              return event.dueDate?.toDate().getHours() || 0;
            };
            return getStartTime(a) - getStartTime(b);
          });

        setEvents(dayEvents);
        updateWeekDaysWithEvents(dayEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    },
    [selectedDate]
  );

  const updateWeekDaysWithEvents = useCallback(
    (allEvents) => {
      setWeekDays(
        generateWeekDays(weekStart).map((day) => ({
          ...day,
          hasEvents: allEvents.some((event) => {
            const eventDate = event.dueDate?.toDate() || new Date();
            return isSameDay(eventDate, day.date);
          }),
        }))
      );
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
      Animated.spring(scrollY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      setSelectedDate(date);
      fetchEvents(date); // Fetch events for the selected date
    },
    [scrollY, fetchEvents]
  );

  const getSectionTitle = useCallback(() => {
    const today = new Date();
    const isToday = isSameDay(selectedDate, today);
    const formattedDate = format(selectedDate, "MMMM d, yyyy");

    return isToday ? "Schedule Today" : `Schedule as of: ${formattedDate}`;
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
  }, [selectedDate]);

  useEffect(() => {
    updateWeekDaysWithEvents(events);
  }, [weekStart, updateWeekDaysWithEvents, events]);

  const styles = StyleSheet.create({
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
      color: "#4C4B16",
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
      flexDirection: "column",
      paddingHorizontal: 20,
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
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },

    eventContent: {
      flex: 1,
    },
    eventIcon: { marginRight: 10 },
    eventTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
    eventTime: { fontSize: 12, color: "#f0f0f0" },
    sectionTitle: {
      marginLeft: 20,
      marginTop: 5,
      marginBottom: -10,
      fontSize: 20,
      fontWeight: "500",
      color: "#333",
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
      {/* Header with Greeting and Username */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.username}>{username}</Text>
      </View>

      {/* Calendar Header with Week Navigation */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={handlePreviousWeek}>
          <ChevronLeft size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{format(weekStart, "MMMM yyyy")}</Text>
        <TouchableOpacity onPress={handleNextWeek}>
          <ChevronRight size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Week Row with Days */}
      <View style={styles.weekRow}>
        {weekDays.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayColumn,
              day.isSelected && styles.selectedColumn, // Highlight selected day
              day.hasEvents && styles.hasEventsColumn, // Highlight day with events
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
            {/* Event Indicator Dot */}
            {day.hasEvents && <View style={styles.eventDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Section Title */}
      <View>
        <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
      </View>

      {/* Timeline and Events */}
      <View style={styles.timelineContainer}>
        {/* Events Column */}
        <View style={styles.eventsContainer}>
          {events.length > 0 ? (
            events
              .sort((a, b) => {
                // Convert time string (e.g., "10:30 AM") to total minutes for sorting
                const convertToTimeValue = (time) => {
                  const [hour, minute, period] = time
                    .match(/(\d+):(\d+)\s?(AM|PM)/i)
                    .slice(1);
                  let hours = parseInt(hour, 10);
                  const minutes = parseInt(minute, 10);
                  if (period.toUpperCase() === "PM" && hours !== 12)
                    hours += 12;
                  if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
                  return hours * 60 + minutes; // Total minutes since midnight
                };
                return (
                  convertToTimeValue(a.timeframe) -
                  convertToTimeValue(b.timeframe)
                );
              })
              .map((event, index) => (
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
            // Fallback message when there are no events
            <Text style={styles.noEventsText}>No scheduled events yet</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};
export default AdminHome;
