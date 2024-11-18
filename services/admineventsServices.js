import { db } from "../config/firebaseconfig";
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
} from "firebase/firestore";
import Toast from "react-native-toast-message";

export const fetchEvents = async (yearLevel = null) => {
  try {
    const eventsCollection = collection(db, "events");
    let eventsQuery;

    if (yearLevel) {
      // If yearLevel is provided, filter events by yearLevel
      eventsQuery = query(
        eventsCollection,
        where("yearLevel", "array-contains", yearLevel)
      );
    } else {
      // If no yearLevel is provided, fetch all events
      eventsQuery = eventsCollection;
    }

    const eventsSnapshot = await getDocs(eventsQuery);
    const eventsList = eventsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        yearLevel: data.yearLevel || [], // Ensure yearLevel is always an array
        dueDate: data.dueDate ? data.dueDate : null,
        createdAt: data.createdAt ? data.createdAt : Timestamp.now(),
      };
    });
    return eventsList.sort(
      (a, b) =>
        new Date(b.createdAt.seconds * 1000) -
        new Date(a.createdAt.seconds * 1000)
    );
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

export const addEvent = async (title, timeframe, dueDate, yearLevels = []) => {
  try {
    const dueDateTimestamp = Timestamp.fromDate(dueDate);

    // Validate yearLevels is an array
    if (!Array.isArray(yearLevels)) {
      yearLevels = [yearLevels];
    }

    const docRef = await addDoc(collection(db, "events"), {
      title,
      timeframe,
      yearLevel: yearLevels, // Store which year levels this event is for
      dueDate: dueDateTimestamp,
      createdAt: Timestamp.now(),
    });

    return {
      id: docRef.id,
      title,
      timeframe,
      yearLevel: yearLevels,
      dueDate: dueDateTimestamp,
      createdAt: Timestamp.now(),
    };
  } catch (error) {
    console.error("Error adding event:", error);
    throw error;
  }
};

export const handleSaveEvent = async (
  id,
  newTitle,
  newTimeframe,
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
    });

    // Update the event in the local state
    setEvents(
      events.map((event) =>
        event.id === id
          ? {
              ...event,
              title: newTitle,
              timeframe: newTimeframe,
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

// New helper functions for year level operations

export const fetchEventsByYearLevel = async (yearLevel) => {
  try {
    const eventsCollection = collection(db, "events");
    const q = query(
      eventsCollection,
      where("yearLevel", "array-contains", yearLevel)
    );
    const querySnapshot = await getDocs(q);

    const eventsList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate || null,
      createdAt: doc.data().createdAt || Timestamp.now(),
    }));

    return eventsList.sort(
      (a, b) =>
        new Date(b.createdAt.seconds * 1000) -
        new Date(a.createdAt.seconds * 1000)
    );
  } catch (error) {
    console.error("Error fetching events by year level:", error);
    throw error;
  }
};

export const updateEventYearLevels = async (eventId, yearLevels) => {
  try {
    // Validate yearLevels is an array
    if (!Array.isArray(yearLevels)) {
      yearLevels = [yearLevels];
    }

    const eventDocRef = doc(db, "events", id);
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
