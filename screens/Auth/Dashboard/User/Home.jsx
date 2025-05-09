import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
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

const screenWidth = Dimensions.get("window").width;

const Home = () => {
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

      // Calculate which days have events
      const daysWithEvents = generateWeekDays(weekStart).map((day) => ({
        ...day,
        hasEvents: eventsInWeek.some((event) => {
          const eventDate = event.dueDate?.toDate() || new Date();
          return isSameDay(eventDate, day.date);
        }),
      }));

      // Update weekDays with event information
      setWeekDays(daysWithEvents);

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
      setAllEvents(allEvents);
    });

    return () => unsubscribe();
  }, [selectedDate, generateWeekDays]);

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
          isToday: isSameDay(date, new Date()),
          hasEvents: false, // This will be set separately in updateWeekDaysWithEvents
        };
      });
    },
    [selectedDate]
  );

  const fetchEvents = useCallback(async () => {
    try {
      const eventsRef = collection(db, "events");
      const eventsSnapshot = await getDocs(eventsRef);

      const allFetchedEvents = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
      }));

      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      // Filter today's events
      const todayEvents = allFetchedEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isSameDay(eventDate, selectedDate);
      });

      setEvents(todayEvents);
      setAllEvents(allFetchedEvents);

      // Immediately update weekDays with events
      const updatedWeekDays = generateWeekDays(weekStart).map((day) => ({
        ...day,
        hasEvents: allFetchedEvents.some((event) => {
          const eventDate = event.dueDate?.toDate() || new Date();
          return isSameDay(eventDate, day.date);
        }),
      }));
      setWeekDays(updatedWeekDays);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, [selectedDate, generateWeekDays]);

  const handlePreviousWeek = useCallback(() => {
    const newWeekStart = subWeeks(weekStart, 1);
    setWeekStart(newWeekStart);

    // Immediately update the week days with events for the new week
    const daysWithEvents = generateWeekDays(newWeekStart).map((day) => ({
      ...day,
      hasEvents: allEvents.some((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isSameDay(eventDate, day.date);
      }),
    }));
    setWeekDays(daysWithEvents);
  }, [weekStart, generateWeekDays, allEvents]);

  const handleNextWeek = useCallback(() => {
    const newWeekStart = addWeeks(weekStart, 1);
    setWeekStart(newWeekStart);

    // Immediately update the week days with events for the new week
    const daysWithEvents = generateWeekDays(newWeekStart).map((day) => ({
      ...day,
      hasEvents: allEvents.some((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isSameDay(eventDate, day.date);
      }),
    }));
    setWeekDays(daysWithEvents);
  }, [weekStart, generateWeekDays, allEvents]);

  const handleDateSelect = useCallback(
    (date) => {
      setSelectedDate(date);
      // Filter events for the selected date
      const selectedDayEvents = allEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isSameDay(eventDate, date);
      });
      setEvents(selectedDayEvents);
    },
    [allEvents]
  );

  useEffect(() => {
    fetchEvents(); // Fetch events for the current week on mount
  }, [fetchEvents]);

  const getSectionTitle = useCallback(() => {
    const today = new Date();
    const isToday = isSameDay(selectedDate, today);
    const formattedDate = format(selectedDate, "MMM d, yyyy");

    return isToday ? "Schedule Today" : `Schedule: ${formattedDate}`;
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
    // Initialize weekDays when component mounts
    const initWeekDays = () => {
      const days = generateWeekDays(weekStart);

      // If we have events already, mark the days with events
      if (allEvents.length > 0) {
        const daysWithEvents = days.map((day) => ({
          ...day,
          hasEvents: allEvents.some((event) => {
            const eventDate = event.dueDate?.toDate() || new Date();
            return isSameDay(eventDate, day.date);
          }),
        }));
        setWeekDays(daysWithEvents);
      } else {
        setWeekDays(days);
      }
    };

    initWeekDays();
  }, [weekStart, allEvents, generateWeekDays]);

  const updateWeekDaysWithEvents = useCallback(
    (eventsInWeek) => {
      console.log("Updating week days with events:", eventsInWeek.length);

      // Generate week days
      const days = generateWeekDays(weekStart);

      // Mark which days have events
      const weekDaysWithEvents = days.map((day) => {
        const hasEvents = eventsInWeek.some((event) => {
          const eventDate = event.dueDate?.toDate() || new Date();
          return isSameDay(eventDate, day.date);
        });

        console.log(`Day ${format(day.date, "EEE")} has events: ${hasEvents}`);

        return {
          ...day,
          hasEvents,
        };
      });

      // Update state with the new week days that have events marked
      setWeekDays(weekDaysWithEvents);
    },
    [generateWeekDays, weekStart]
  );

  // Make sure updateWeekDaysWithEvents is called when weekStart changes
  useEffect(() => {
    if (allEvents.length > 0) {
      // Filter events for the current week
      const eventsInWeek = allEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        const start = weekStart;
        const end = addDays(start, 6);
        return isWithinInterval(eventDate, { start, end });
      });

      // Update which days have events
      updateWeekDaysWithEvents(eventsInWeek);
    }
  }, [weekStart, allEvents, updateWeekDaysWithEvents]);

  const styles = StyleSheet.create({
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      marginBottom: 10,
      marginLeft: 20,
    },
    mainContainer: {
      flex: 1,
      backgroundColor: "#fff",
    },
    container: {
      flex: 1,
      padding: 20,
    },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 20,
      backgroundColor: "#003161",
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      marginBottom: 16,
    },
    leftContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 8,
    },
    rightContent: {
      flex: 1,
      alignItems: "flex-end",
    },
    icon: {
      marginRight: 12,
    },
    greeting: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
      flexShrink: 1,
      fontFamily: "Lato-Regular",
    },
    username: {
      fontSize: 20,
      fontFamily: "Lato-Regular",
      fontWeight: "600",
      color: "#FFFFFF",
      marginRight: 20,
      textTransform: "capitalize",
    },
    calendarControls: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 20,
      marginBottom: 10,
    },
    controlButton: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: "#f0f4f8",
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 15,
      backgroundColor: "#fff",
      marginHorizontal: 20,
      marginBottom: 20,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
    dayColumn: {
      alignItems: "center",
      width: 40,
      paddingVertical: 10,
      borderRadius: 12,
      position: "relative",
    },
    selectedColumn: {
      backgroundColor: "#E6F2FF",
      borderWidth: 1,
      borderColor: "#b1d4fe",
    },
    todayColumn: {
      borderWidth: 1,
      borderColor: "#f0f0f0",
    },
    dayText: {
      fontSize: 13,
      color: "#777",
      marginBottom: 4,
      fontWeight: "500",
    },
    dateText: {
      fontSize: 18,
      fontWeight: "600",
      color: "#444",
      marginTop: 8,
    },
    selectedText: {
      color: "#024CAA",
      fontWeight: "700",
    },
    todayText: {
      color: "#024CAA",
    },
    eventDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#FF4545",
      position: "absolute",
      top: 4,
      left: "50%",
      marginLeft: -3,
    },
    timelineContainer: {
      marginHorizontal: 20,
      marginBottom: 24,
      borderRadius: 20,
      borderWidth: 0,
      backgroundColor: "#FFFFFF",
      shadowColor: Platform.OS === "ios" ? "#1a1a1a" : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: Platform.OS === "android" ? 3 : 0,
      overflow: "hidden",
    },
    timelineDateBanner: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#EAEAEA",
      backgroundColor: "#FCFCFC",
      flexDirection: "row",
      alignItems: "center",
    },
    timelineDateText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#424242",
      letterSpacing: 0.3,
      marginLeft: 8,
    },
    eventsContainer: {
      flexDirection: "column",
      padding: 16,
      paddingBottom: 8,
    },
    eventCard: {
      borderRadius: 16,
      marginBottom: 16,
      backgroundColor: "#fff",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: Platform.OS === "ios" ? 2 : 1,
      },
      shadowOpacity: Platform.OS === "ios" ? 0.1 : 0.08,
      shadowRadius: Platform.OS === "ios" ? 9 : 6,
      elevation: Platform.OS === "android" ? 4 : 0,
      overflow: "hidden",
    },
    eventCardInner: {
      borderRadius: 16,
      position: "relative",
      overflow: "hidden",
    },
    eventCardContent: {
      padding: 16,
      backgroundColor: "transparent",
      position: "relative",
      zIndex: 2,
    },
    eventCardAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 6,
      zIndex: 3,
    },
    gradientOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    patternOverlay: {
      position: "absolute",
      top: 0,
      right: 0,
      width: 100,
      height: 100,
      opacity: 0.05,
      zIndex: 1,
    },
    eventRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      width: "100%",
    },
    eventTimeContainer: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: "rgba(255,255,255,0.20)",
      borderRadius: 8,
      alignSelf: "flex-start",
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    eventTime: {
      fontSize: 13,
      color: "rgba(255,255,255,0.95)",
      fontWeight: "500",
      marginLeft: 4,
    },
    eventIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.25)",
      marginRight: 14,
    },
    eventContent: {
      flex: 1,
    },
    eventTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#fff",
      marginBottom: 6,
      letterSpacing: 0.2,
    },
    eventBadge: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: "rgba(255,255,255,0.25)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    eventBadgeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "600",
      marginLeft: 3,
    },
    noEventsContainer: {
      padding: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    noEventsImage: {
      width: 100,
      height: 100,
      marginBottom: 16,
      opacity: 0.7,
    },
    noEventsText: {
      textAlign: "center",
      color: "#94A3B8",
      fontSize: 16,
      fontStyle: "italic",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "Lato-Bold",
      color: "#333",
      marginRight: 8,
    },
    sectionDescription: {
      fontSize: 14,
      color: "#666",
      marginLeft: 20,
      marginTop: -5,
      marginBottom: 16,
    },
    ReminderContainer: {
      marginBottom: 30,
    },
    ReminderCardContainer: {
      marginHorizontal: 20,
      marginBottom: 12,
    },
    ReminderCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
    ReminderCardContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    ReminderDateTimeContainer: {
      width: 60,
      height: 60,
      borderRadius: 12,
      backgroundColor: "#f1f5f9",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
    ReminderDateText: {
      fontSize: 18,
      fontWeight: "700",
      color: "#024CAA",
    },
    ReminderDayText: {
      textTransform: "uppercase",
      fontSize: 12,
      color: "#666",
      fontWeight: "600",
      marginTop: 2,
    },
    ReminderEventDetails: {
      flex: 1,
    },
    ReminderEventTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#333",
      marginBottom: 4,
    },
    ReminderEventTimeframe: {
      fontSize: 14,
      color: "#666",
      fontWeight: "500",
      flexDirection: "row",
      alignItems: "center",
    },
    ReminderEventTimeIcon: {
      marginRight: 6,
    },
    ReminderNoEvent: {
      textAlign: "center",
      marginTop: 40,
      marginBottom: 40,
      color: "#94A3B8",
      fontSize: 16,
    },
    dateHeader: {
      paddingVertical: 6,
      marginBottom: 10,
      marginHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      backgroundColor: "#f1f5f9",
      borderRadius: 30,
    },
    currentDate: {
      fontSize: 16,
      fontWeight: "600",
      color: "#333",
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: "#666",
    },
    calendarIcon: {
      marginRight: 8,
    },
  });

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading your schedule...</Text>
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
          <Text style={styles.username}>{username.split(" ")[0]}</Text>
        </View>
      </View>

      {/* Current Date Display */}
      <View style={styles.dateHeader}>
        <Icon
          name="calendar-outline"
          size={18}
          color="#024CAA"
          style={styles.calendarIcon}
        />
        <Text style={styles.currentDate}>
          {format(selectedDate, "d MMMM yyyy")}
        </Text>
      </View>

      {/* Calendar Navigation Controls */}
      <View style={styles.calendarControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handlePreviousWeek}
        >
          <Icon name="chevron-back-outline" size={20} color="#024CAA" />
        </TouchableOpacity>

        <Text style={{ color: "#666", fontWeight: "500" }}>
          Week of {format(weekStart, "MMM d")}
        </Text>

        <TouchableOpacity style={styles.controlButton} onPress={handleNextWeek}>
          <Icon name="chevron-forward-outline" size={20} color="#024CAA" />
        </TouchableOpacity>
      </View>

      {/* Week Row with Days */}
      <View style={styles.weekRow}>
        {weekDays.map((day, index) => {
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayColumn,
                day.isSelected && styles.selectedColumn,
                day.isToday && !day.isSelected && styles.todayColumn,
              ]}
              onPress={() => handleDateSelect(day.date)}
            >
              {day.hasEvents && <View style={styles.eventDot} />}
              <Text
                style={[
                  styles.dateText,
                  day.isSelected && styles.selectedText,
                  day.isToday && !day.isSelected && styles.todayText,
                ]}
              >
                {day.dayNumber}
              </Text>
              <Text
                style={[
                  styles.dayText,
                  day.isSelected && styles.selectedText,
                  day.isToday && !day.isSelected && styles.todayText,
                ]}
              >
                {day.dayName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
        <Icon
          name="calendar-outline"
          size={20}
          color="#024CAA"
          style={styles.sectionIcon}
        />
      </View>
      <Text style={styles.sectionDescription}>
        All events scheduled for this day
      </Text>

      {/* Timeline and Events */}
      <View style={styles.timelineContainer}>
        <View style={styles.timelineDateBanner}>
          <Icon name="calendar-outline" size={16} color="#424242" />
          <Text style={styles.timelineDateText}>
            {format(selectedDate, "EEEE, MMMM d")}
          </Text>
        </View>

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
              .map((event, index) => {
                // Create a solid color from the semi-transparent color
                const baseColor = event.color
                  .replace(/rgba?\(/, "")
                  .replace(/\)/, "")
                  .split(",");
                const solidColor = `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},1)`;

                // Get time for badge
                const timeMatch = event.timeframe.match(/(\d+:\d+)\s?(AM|PM)/i);
                const time = timeMatch ? timeMatch[0] : event.timeframe;

                // Determine a badge type based on index for variety
                const badgeTypes = ["Event", "Meeting", "Task", "Reminder"];
                const badgeType = badgeTypes[index % badgeTypes.length];

                return (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventCardInner}>
                      {/* Solid background */}
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: event.color,
                          zIndex: 1,
                        }}
                      />

                      {/* Pattern overlay for added dimension */}
                      <View
                        style={[
                          styles.patternOverlay,
                          { backgroundColor: "transparent" },
                        ]}
                      >
                        {/* Pattern would be implemented here */}
                      </View>

                      {/* Card accent */}
                      <View
                        style={[
                          styles.eventCardAccent,
                          { backgroundColor: solidColor },
                        ]}
                      />

                      {/* Badge indicator */}
                      <View style={styles.eventBadge}>
                        <Icon
                          name={
                            badgeType === "Event"
                              ? "calendar-outline"
                              : badgeType === "Meeting"
                              ? "people-outline"
                              : badgeType === "Task"
                              ? "checkmark-circle-outline"
                              : "alert-circle-outline"
                          }
                          size={10}
                          color="#fff"
                        />
                        <Text style={styles.eventBadgeText}>{badgeType}</Text>
                      </View>

                      {/* Main content */}
                      <View style={styles.eventCardContent}>
                        <View style={styles.eventRow}>
                          <View style={styles.eventIcon}>
                            <Icon
                              name="calendar-outline"
                              size={22}
                              color="#FFFFFF"
                            />
                          </View>
                          <View style={styles.eventContent}>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                            <View style={styles.eventTimeContainer}>
                              <Icon
                                name="time-outline"
                                size={12}
                                color="rgba(255,255,255,0.95)"
                              />
                              <Text style={styles.eventTime}>
                                {event.timeframe}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
          ) : (
            <View style={styles.noEventsContainer}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/6195/6195678.png",
                }}
                style={styles.noEventsImage}
              />
              <Text style={styles.noEventsText}>
                No events scheduled for today
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Upcoming Events Section */}
      <View style={styles.ReminderContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <Icon
            name="time-outline"
            size={20}
            color="#024CAA"
            style={styles.sectionIcon}
          />
        </View>
        <Text style={styles.sectionDescription}>
          Be prepared for your scheduled events ahead
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
                          {format(eventDate, "d")}
                        </Text>
                        <Text style={styles.ReminderDayText}>
                          {format(eventDate, "MMM")}
                        </Text>
                      </View>
                      <View style={styles.ReminderEventDetails}>
                        <Text style={styles.ReminderEventTitle}>
                          {event.title}
                        </Text>
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Icon
                            name="time-outline"
                            size={16}
                            color="#666"
                            style={styles.ReminderEventTimeIcon}
                          />
                          <Text style={styles.ReminderEventTimeframe}>
                            {format(eventDate, "h:mm a")} -{" "}
                            {format(eventDate, "EEEE")}
                          </Text>
                        </View>
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
export default Home;
