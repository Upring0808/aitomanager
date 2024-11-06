import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput } from "react-native";
import { db } from "../../../config/firebaseconfig";
import { collection, getDocs, query, where } from "firebase/firestore";

const AdminFines = () => {
  const [fines, setFines] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch fines from Firestore
    const fetchFines = async () => {
      const finesCollection = collection(db, "fines");
      const finesSnapshot = await getDocs(finesCollection);
      const finesData = finesSnapshot.docs.map((doc) => doc.data());
      setFines(finesData);
    };

    // Fetch events from Firestore
    const fetchEvents = async () => {
      const eventsCollection = collection(db, "events");
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsData = eventsSnapshot.docs.map((doc) => doc.data());
      setEvents(eventsData);
    };

    fetchFines();
    fetchEvents();
  }, []);

  const handleSearch = (text) => {
    setSearchText(text);
  };

  // Filter fines based on the search text
  const filteredFines = fines.filter((fine) =>
    fine.username.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fines</Text>
      <TextInput
        style={styles.searchBar}
        placeholder="Search by username"
        value={searchText}
        onChangeText={handleSearch}
      />

      <FlatList
        data={filteredFines}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.fineAmount}>Fine: {item.amount} pesos</Text>
            <Text style={styles.event}>Event: {item.event}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No fines found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  searchBar: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    marginVertical: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  username: {
    fontSize: 18,
    fontWeight: "bold",
  },
  fineAmount: {
    fontSize: 16,
    color: "#333",
    marginTop: 5,
  },
  event: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
});

export default AdminFines;
