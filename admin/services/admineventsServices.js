import { db } from "../../config/firebaseconfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import Toast from "react-native-toast-message";

export const fetchEvents = async () => {
  const eventsCollection = collection(db, "events");
  const eventsSnapshot = await getDocs(eventsCollection);
  const eventsList = eventsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,

      dueDate: data.dueDate ? data.dueDate : null,

      createdAt: data.createdAt ? data.createdAt : Timestamp.now(),
    };
  });
  return eventsList.sort(
    (a, b) =>
      new Date(b.createdAt.seconds * 1000) -
      new Date(a.createdAt.seconds * 1000)
  );
};

export const addEvent = async (title, timeframe, dueDate) => {
  try {
    const dueDateTimestamp = Timestamp.fromDate(dueDate);

    const docRef = await addDoc(collection(db, "events"), {
      title,
      timeframe,
      dueDate: dueDateTimestamp,
      createdAt: Timestamp.now(),
    });

    return {
      id: docRef.id,
      title,
      timeframe,
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

    setEvents(
      events.map((event) =>
        event.id === id
          ? { ...event, title: newTitle, timeframe: newTimeframe }
          : event
      )
    );
    setEditingEventId(null);
    Toast.show({ type: "success", text1: "Event updated successfully" });
  } catch (error) {
    console.error("Error updating event:", error);
  }
};

export const deleteEvent = async (id) => {
  const eventDocRef = doc(db, "events", id);
  await deleteDoc(eventDocRef);
};
