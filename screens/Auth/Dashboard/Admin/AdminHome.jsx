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
  Modal,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import {
  collection,
  onSnapshot,
  query,
  getDocs,
  where,
  Timestamp,
  addDoc,
  orderBy,
  limit,
  updateDoc,
  doc,
  getDoc,
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
  Plus,
  Users,
  DollarSign,
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import Icon from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";

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

const THEME_COLORS = {
  primary: "#0A2463",
  textSecondary: "#4A5568",
  accent: "#3E92CC",
  fineColor: "#D92626",
};
const SPACING = 16;

const AdminHome = () => {
  const [username, setUsername] = useState("");
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekDays, setWeekDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [scrollY] = useState(new Animated.Value(0));
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [totalStudentFines, setTotalStudentFines] = useState(0);
  const [finesLoading, setFinesLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: "",
    studentId: "",
    yearLevel: "1",
    role: "student",
    password: "",
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    autoGenerateReports: false,
    fineReminderDays: 7,
    theme: "light",
  });

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

  useEffect(() => {
    const fetchTotalFines = async () => {
      setFinesLoading(true);
      try {
        // Get all users (students)
        const usersSnapshot = await getDocs(collection(db, "users"));
        const userIds = usersSnapshot.docs.map((doc) => doc.id);

        // Get all fines
        const finesSnapshot = await getDocs(collection(db, "fines"));
        let total = 0;
        finesSnapshot.forEach((doc) => {
          const data = doc.data();
          // Only count fines for users (students), not admins, and only unpaid
          if (userIds.includes(data.userId) && data.status !== "paid") {
            total += data.amount;
          }
        });
        setTotalStudentFines(total);
      } catch (e) {
        setTotalStudentFines(0);
      }
      setFinesLoading(false);
    };

    fetchTotalFines();
  }, []);

  useEffect(() => {
    fetchRecentActivities();
    // Set up real-time listener for activities
    const activitiesRef = collection(db, "activities");
    const q = query(activitiesRef, orderBy("timestamp", "desc"), limit(5));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }));
      setRecentActivities(activities);
    });

    return () => unsubscribe();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      const activitiesRef = collection(db, "activities");
      const q = query(activitiesRef, orderBy("timestamp", "desc"), limit(20));
      const snapshot = await getDocs(q);

      const activities = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const activityData = docSnapshot.data();
          const activity = {
            id: docSnapshot.id,
            type: activityData.type,
            timestamp: activityData.timestamp?.toDate(),
            details: activityData.details || {},
          };

          // No need to fetch related data here if it's already stored in details
          // We rely on the data being stored accurately when the activity is created

          return activity;
        })
      );

      // Filter out activities that might not have the necessary details yet if needed, though ideally creation logs should be complete
      const filteredActivities = activities.filter(
        (activity) =>
          activity.type !== "fine_paid" ||
          (activity.details?.studentName &&
            activity.details?.studentId &&
            activity.details?.eventTitle)
      );

      setRecentActivities(filteredActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch activities",
        position: "bottom",
      });
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (
      !timestamp ||
      !(timestamp instanceof Date) ||
      isNaN(timestamp.getTime())
    )
      return "";
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const formatActivityDescription = (activity) => {
    if (!activity || !activity.details) {
      return "Activity details not available";
    }

    const details = activity.details;
    switch (activity.type) {
      case "student_added":
        return `New ${details.studentRole || "student"} ${
          details.studentName || "Unknown"
        } (${details.studentId || "No ID"}) added by ${
          details.issuedBy || "System"
        } (${details.adminRole || "Admin"})`;

      case "fine_added":
        return `Fine of ₱${details.amount || "0"} added to ${
          details.studentName || "Unknown"
        } (${details.studentId || "No ID"}) for ${
          details.eventTitle || "Unknown Event"
        } by ${details.issuedBy || "System"} (${details.adminRole || "Admin"})`;

      case "fine_paid": {
        const paidDate = details.paidAt?.toDate();
        const displayDate =
          paidDate && !isNaN(paidDate.getTime())
            ? format(paidDate, "MMM d, yyyy")
            : "Unknown Date";
        return `Fine of ₱${details.amount || "0"} paid by ${
          details.studentName || "Unknown"
        } (${details.studentId || "No ID"}) for ${
          details.eventTitle || "Unknown Event"
        } on ${displayDate}`;
      }

      case "event_added":
        return `New event "${details.eventTitle || "Untitled Event"}" (${
          details.eventTimeframe || "No timeframe"
        }) created by ${details.issuedBy || "System"} (${
          details.adminRole || "Admin"
        })`;

      case "role_changed":
        return `Role changed for ${details.studentName || "Unknown"} from ${
          details.oldRole || "Unknown"
        } to ${details.newRole || "Unknown"} by ${
          details.issuedBy || "System"
        } (${details.adminRole || "Admin"})`;

      case "settings_updated":
        return `Settings updated by ${details.issuedBy || "System"} (${
          details.adminRole || "Admin"
        })`;

      default:
        return activity.description || "No description available";
    }
  };

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
    statsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 0,
      marginBottom: SPACING * 1.5,
      marginTop: 8,
    },
    landscapeFineStatCard: {
      flexDirection: "row",
      alignItems: "center",
      width: "92%",
      alignSelf: "center",
      backgroundColor: "linear-gradient(90deg, #0A2463 60%, #3E92CC 100%)", // fallback for web, will override below
      backgroundColor: "#0A2463", // fallback for native
      borderRadius: 20,
      paddingVertical: SPACING * 1.1,
      paddingHorizontal: SPACING * 1.2,
      marginVertical: 8,
      shadowColor: "#0A2463",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
      minHeight: 80,
      // Remove white space
    },
    landscapeFineStatIconWrap: {
      backgroundColor: "#3E92CC",
      borderRadius: 16,
      padding: 16,
      marginRight: 18,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#3E92CC",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    landscapeFineStatTextWrap: {
      flex: 1,
      justifyContent: "center",
    },
    landscapeFineStatValue: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#fff",
      letterSpacing: 0.5,
      marginBottom: 2,
      fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    },
    landscapeFineStatLabel: {
      fontSize: 14,
      color: "#E0E7EF",
      fontWeight: "500",
      letterSpacing: 0.3,
      fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
      opacity: 0.92,
    },
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
      width: "90%",
      maxHeight: "80%",
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      overflow: "hidden",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: SPACING,
      borderBottomWidth: 1,
      borderBottomColor: "#E2E8F0",
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: THEME_COLORS.primary,
    },
    modalBody: {
      padding: SPACING,
    },
    modalFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: SPACING,
      borderTopWidth: 1,
      borderTopColor: "#E2E8F0",
    },
    formGroup: {
      marginBottom: SPACING,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: "#475569",
      marginBottom: 8,
    },
    input: {
      backgroundColor: "#F1F5F9",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: "#1E293B",
    },
    pickerContainer: {
      backgroundColor: "#F1F5F9",
      borderRadius: 8,
      overflow: "hidden",
    },
    picker: {
      height: 50,
      color: "#1E293B",
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginLeft: SPACING,
    },
    cancelButton: {
      backgroundColor: "#E2E8F0",
    },
    submitButton: {
      backgroundColor: THEME_COLORS.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    addButton: {
      backgroundColor: THEME_COLORS.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 10,
    },
    quickActionsContainer: {
      padding: 16,
      marginBottom: 24,
    },
    quickActionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 16,
    },
    quickActionCard: {
      width: "47%",
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    quickActionContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    quickActionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    quickActionTextContainer: {
      flex: 1,
    },
    quickActionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
      marginBottom: 4,
    },
    quickActionDescription: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.8)",
    },
    recentActivityContainer: {
      padding: 16,
      marginBottom: 24,
    },
    activityCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    activityHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    activityTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1E293B",
      marginLeft: 8,
    },
    activityList: {
      gap: 16,
    },
    activityItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    activityIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#F1F5F9",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    activityContent: {
      flex: 1,
    },
    activityText: {
      fontSize: 14,
      color: "#1E293B",
      marginBottom: 2,
    },
    activityTime: {
      fontSize: 12,
      color: "#64748B",
    },
    fullScreenModalContainer: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    fullScreenModalContent: {
      flex: 1,
      paddingTop: Platform.OS === "ios" ? 50 : 20,
    },
    settingsGroup: {
      marginBottom: 24,
    },
    settingsGroupTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1E293B",
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#E2E8F0",
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingLabel: {
      fontSize: 16,
      color: "#1E293B",
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: "#64748B",
    },
  });

  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const randomLetters = Math.random()
      .toString(36)
      .substring(2, 4)
      .toUpperCase();
    return `${year}-${randomNum}-${randomLetters}`;
  };

  const handleAddUser = async () => {
    if (!newUser.fullName || !newUser.password) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all required fields",
        position: "bottom",
      });
      return;
    }

    setAddUserLoading(true);
    try {
      const studentId = generateStudentId();
      const currentUser = auth.currentUser;

      // Get admin details
      const adminDoc = await getDocs(
        query(collection(db, "admin"), where("uid", "==", currentUser.uid))
      );
      const adminData = adminDoc.docs[0]?.data() || { username: "System" };

      // Add user to Firestore
      await addDoc(collection(db, "users"), {
        fullName: newUser.fullName,
        studentId,
        yearLevel: newUser.yearLevel,
        role: newUser.role,
        password: newUser.password,
        createdAt: Timestamp.now(),
        addedBy: {
          uid: currentUser.uid,
          username: adminData.username,
        },
      });

      // Add detailed activity log
      await addDoc(collection(db, "activities"), {
        type: "student_added",
        description: "New student registered",
        timestamp: Timestamp.now(),
        details: {
          studentName: newUser.fullName,
          studentId,
          yearLevel: newUser.yearLevel,
          role: newUser.role,
          issuedBy: adminData.username,
          adminUid: currentUser.uid,
        },
      });

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Student added successfully",
        position: "bottom",
      });

      setShowAddUserModal(false);
      setNewUser({
        fullName: "",
        studentId: "",
        yearLevel: "1",
        role: "student",
        password: "",
      });
    } catch (error) {
      console.error("Error adding user:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to add student",
        position: "bottom",
      });
    } finally {
      setAddUserLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "student_added":
        return "person-add-outline";
      case "fine_added":
        return "cash-outline";
      case "fine_paid":
        return "checkmark-circle-outline";
      case "event_added":
        return "calendar-outline";
      case "role_changed":
        return "swap-horizontal-outline";
      case "settings_updated":
        return "settings-outline";
      default:
        return "information-circle-outline";
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "student_added":
        return "#0A2463";
      case "fine_added":
        return "#D92626";
      case "fine_paid":
        return "#16a34a";
      case "event_added":
        return "#2E7D32";
      case "role_changed":
        return "#6D28D9";
      case "settings_updated":
        return "#64748B";
      default:
        return "#64748B";
    }
  };

  const SettingsModal = () => (
    <Modal
      visible={showSettingsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSettingsModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Admin Settings</Text>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
              <Icon name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.settingsGroup}>
              <Text style={styles.settingsGroupTitle}>Notifications</Text>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Enable Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive alerts for new activities
                  </Text>
                </View>
                <Switch
                  value={settings.notifications}
                  onValueChange={(value) =>
                    setSettings({ ...settings, notifications: value })
                  }
                />
              </View>
            </View>

            <View style={styles.settingsGroup}>
              <Text style={styles.settingsGroupTitle}>Reports</Text>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Auto-generate Reports</Text>
                  <Text style={styles.settingDescription}>
                    Generate weekly reports automatically
                  </Text>
                </View>
                <Switch
                  value={settings.autoGenerateReports}
                  onValueChange={(value) =>
                    setSettings({ ...settings, autoGenerateReports: value })
                  }
                />
              </View>
            </View>

            <View style={styles.settingsGroup}>
              <Text style={styles.settingsGroupTitle}>Fine Management</Text>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Fine Reminder Days</Text>
                  <Text style={styles.settingDescription}>
                    Days before sending fine reminders
                  </Text>
                </View>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={settings.fineReminderDays.toString()}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        fineReminderDays: parseInt(value),
                      })
                    }
                    style={styles.picker}
                  >
                    {[3, 5, 7, 10, 14].map((days) => (
                      <Picker.Item
                        key={days}
                        label={`${days} days`}
                        value={days.toString()}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={() => {
                // Save settings to Firestore
                setShowSettingsModal(false);
              }}
            >
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const AddUserModal = () => (
    <Modal
      visible={showAddUserModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddUserModal(false)}
    >
      <View style={styles.fullScreenModalContainer}>
        <View style={styles.fullScreenModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Student</Text>
            <TouchableOpacity onPress={() => setShowAddUserModal(false)}>
              <Icon name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={newUser.fullName}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, fullName: text })
                }
                placeholder="Enter full name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={newUser.password}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, password: text })
                }
                placeholder="Enter password"
                secureTextEntry
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Year Level</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newUser.yearLevel}
                  onValueChange={(value) =>
                    setNewUser({ ...newUser, yearLevel: value })
                  }
                  style={styles.picker}
                >
                  {[1, 2, 3, 4, 5].map((year) => (
                    <Picker.Item
                      key={year}
                      label={`Year ${year}`}
                      value={year.toString()}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newUser.role}
                  onValueChange={(value) =>
                    setNewUser({ ...newUser, role: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Student" value="student" />
                  <Picker.Item label="Treasurer" value="treasurer" />
                  <Picker.Item label="Secretary" value="secretary" />
                </Picker>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowAddUserModal(false)}
              disabled={addUserLoading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleAddUser}
              disabled={addUserLoading}
            >
              {addUserLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Add Student</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const QuickActionCard = ({ title, description, icon, onPress, color }) => (
    <TouchableOpacity
      style={[styles.quickActionCard, { backgroundColor: color }]}
      onPress={onPress}
    >
      <View style={styles.quickActionContent}>
        <View style={styles.quickActionIconContainer}>
          <Icon name={icon} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.quickActionTextContainer}>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionDescription}>{description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleMarkAsPaid = async (fineId) => {
    try {
      const now = Timestamp.now();
      await updateDoc(doc(db, "fines", fineId), {
        status: "paid",
        paidAt: now,
      });

      // Add activity log
      await addDoc(collection(db, "activities"), {
        type: "fine_paid",
        description: "Fine payment received",
        timestamp: now,
        details: {
          fineId,
        },
      });

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Fine marked as paid",
        position: "bottom",
      });
    } catch (error) {
      console.error("Error marking fine as paid:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to mark fine as paid",
        position: "bottom",
      });
    }
  };

  const RecentActivitySection = () => (
    <View style={styles.recentActivityContainer}>
      <Text style={styles.sectionTitle}>Latest Updates</Text>
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <Icon name="time-outline" size={20} color="#64748B" />
          <Text style={styles.activityTitle}>Recent Activities</Text>
        </View>
        <View style={styles.activityList}>
          {recentActivities.slice(0, 3).map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View
                style={[
                  styles.activityIcon,
                  { backgroundColor: `${getActivityColor(activity.type)}20` },
                ]}
              >
                <Icon
                  name={getActivityIcon(activity.type)}
                  size={16}
                  color={getActivityColor(activity.type)}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  {formatActivityDescription(activity)}
                </Text>
                <Text style={styles.activityTime}>
                  {formatTimeAgo(activity.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const ActivityHistorySection = () => (
    <View style={styles.recentActivityContainer}>
      <Text style={styles.sectionTitle}>Activity History</Text>
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <Icon name="list-outline" size={20} color="#64748B" />
          <Text style={styles.activityTitle}>Detailed Logs</Text>
        </View>
        <View style={styles.activityList}>
          {recentActivities.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View
                style={[
                  styles.activityIcon,
                  { backgroundColor: `${getActivityColor(activity.type)}20` },
                ]}
              >
                <Icon
                  name={getActivityIcon(activity.type)}
                  size={16}
                  color={getActivityColor(activity.type)}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  {formatActivityDescription(activity)}
                </Text>
                <Text style={styles.activityTime}>
                  {format(activity.timestamp, "MMM d, yyyy 'at' h:mm a")}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.mainContainer}>
      <View style={styles.header}>
        <View style={styles.leftContent}>
          <Icon
            name="shield-checkmark-outline"
            size={24}
            color="#FFD700"
            style={styles.icon}
          />
          <Text style={styles.greeting}>Welcome,</Text>
        </View>
        <View style={styles.rightContent}>
          <Text style={styles.username}>{username.split(" ")[0]}</Text>
        </View>
      </View>

      {/* Total Fines Card */}
      <View style={styles.statsContainer}>
        <View style={styles.landscapeFineStatCard}>
          <View style={styles.landscapeFineStatIconWrap}>
            <Icon
              name="wallet-outline"
              size={36}
              color="#fff"
              style={{ opacity: 0.95 }}
            />
          </View>
          <View style={styles.landscapeFineStatTextWrap}>
            <Text style={styles.landscapeFineStatValue}>
              ₱
              {typeof totalStudentFines === "number"
                ? totalStudentFines.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })
                : "0.00"}
            </Text>
            <Text style={styles.landscapeFineStatLabel}>
              Total Student Fines
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions Section */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            title="Add Student"
            description="Register new student account"
            icon="person-add-outline"
            onPress={() => setShowAddUserModal(true)}
            color="#0A2463"
          />
          <QuickActionCard
            title="Manage Fines"
            description="View and update student fines"
            icon="cash-outline"
            onPress={() => {
              /* TODO: Navigate to fines management */
            }}
            color="#3E92CC"
          />
          <QuickActionCard
            title="View Reports"
            description="Generate and view reports"
            icon="bar-chart-outline"
            onPress={() => {
              /* TODO: Navigate to reports */
            }}
            color="#2E7D32"
          />
          <QuickActionCard
            title="Settings"
            description="Configure system settings"
            icon="settings-outline"
            onPress={() => setShowSettingsModal(true)}
            color="#6D28D9"
          />
        </View>
      </View>

      <RecentActivitySection />
      <ActivityHistorySection />

      <AddUserModal />
      <SettingsModal />
    </ScrollView>
  );
};

export default AdminHome;
