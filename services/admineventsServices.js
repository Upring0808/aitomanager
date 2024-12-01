import { db, auth } from "../config/firebaseconfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import Toast from "react-native-toast-message";

// Fetch Events
export const fetchEvents = async (yearLevel = null) => {
  try {
    const eventsCollection = collection(db, "events");
    const eventsQuery = yearLevel
      ? query(eventsCollection, where("yearLevel", "array-contains", yearLevel))
      : eventsCollection;

    const eventsSnapshot = await getDocs(eventsQuery);
    const eventsList = eventsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdBy: data.createdBy || "Unknown User", // Fallback if username is missing
        dueDate: data.dueDate || null,
        createdAt: data.createdAt || Timestamp.now(),
      };
    });

    // Sort events by creation date (newest first)
    return eventsList.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

// Add Event
export const addEvent = async (
  title,
  timeframe,
  dueDate,
  description,
  yearLevels = []
) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User is not authenticated.");
    }

    const adminDocRef = doc(db, "admin", user.uid);
    const adminDoc = await getDoc(adminDocRef);

    if (!adminDoc.exists()) {
      throw new Error("Admin document not found in Firestore.");
    }

    const adminData = adminDoc.data();
    const username = adminData.username || user.email;

    const dueDateTimestamp = Timestamp.fromDate(dueDate);

    const docRef = await addDoc(collection(db, "events"), {
      title,
      timeframe,
      yearLevel: yearLevels,
      dueDate: dueDateTimestamp,
      description, // Add description here
      createdAt: Timestamp.now(),
      createdBy: username,
    });

    return {
      id: docRef.id,
      title,
      timeframe,
      yearLevel: yearLevels,
      dueDate: dueDateTimestamp,
      description, // Include it in the returned event object
      createdAt: Timestamp.now(),
      createdBy: username,
    };
  } catch (error) {
    console.error("Error adding event:", error);
    throw error;
  }
};

// Update Event
export const handleSaveEvent = async (
  id,
  newTitle,
  newTimeframe,
  newDescription,
  events,
  setEvents,
  setEditingEventId
) => {
  if (!newTitle || !newTimeframe) {
    console.error("Title or timeframe is missing");
    return;
  }

  try {
    const eventDocRef = doc(db, "events", id);
    await updateDoc(eventDocRef, {
      title: newTitle,
      timeframe: newTimeframe,
      description: newDescription,
    });

    // Update the event in the local state
    setEvents(
      events.map((event) =>
        event.id === id
          ? {
              ...event,
              title: newTitle,
              timeframe: newTimeframe,
              description: newDescription,
            }
          : event
      )
    );

    setEditingEventId(null);
    Toast.show({ type: "success", text1: "Event updated successfully" });
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
};

// Delete Event
export const deleteEvent = async (id) => {
  try {
    const eventDocRef = doc(db, "events", id);
    await deleteDoc(eventDocRef);
    Toast.show({ type: "success", text1: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
};

// Fetch Events by Year Level
export const fetchEventsByYearLevel = async (yearLevel) => {
  try {
    const eventsCollection = collection(db, "events");
    const eventsQuery = query(
      eventsCollection,
      where("yearLevel", "array-contains", yearLevel)
    );

    const eventsSnapshot = await getDocs(eventsQuery);
    const eventsList = eventsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueDate: data.dueDate || null,
        createdAt: data.createdAt || Timestamp.now(),
      };
    });

    // Sort events by creation date (newest first)
    return eventsList.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  } catch (error) {
    console.error("Error fetching events by year level:", error);
    throw error;
  }
};

// Update Event Year Levels
export const updateEventYearLevels = async (eventId, yearLevels) => {
  try {
    if (!Array.isArray(yearLevels)) {
      yearLevels = [yearLevels]; // Ensure it's an array
    }

    const eventDocRef = doc(db, "events", eventId);
    await updateDoc(eventDocRef, {
      yearLevel: yearLevels,
    });

    Toast.show({
      type: "success",
      text1: "Event year levels updated successfully",
    });
  } catch (error) {
    console.error("Error updating event year levels:", error);
    throw error;
  }
};
