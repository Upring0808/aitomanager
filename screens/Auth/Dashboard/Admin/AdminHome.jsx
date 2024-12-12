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
import { Card } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "../../../../styles/AdminHomeStyles";
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
      setUpcomingEvents(upcomingEvents); // New state to store upcoming events

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

      setEvents(eventsInWeek); // Events for the selected date
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

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3E588Faa" />
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
          <Text style={styles.username}>{username}</Text>
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

            {/* Event Dot - Now always displayed for days with events */}
            {day.hasEvents && <View style={styles.eventDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Section Title */}
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
        <Calendar size={24} color="#0A5EB0" style={styles.sectionTitleIcon} />
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
        <View style={styles.filterContainer}>
          <Text style={styles.ReminderSectionTitle}>Upcoming Events</Text>

          <Clock size={24} color="#0A5EB0" style={styles.ReminderIcon} />
          <Text style={styles.ReminderSubtitle}>
            Be prepared for your scheduled events ahead.
          </Text>
        </View>
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
