import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { auth, db } from "../../../../config/firebaseconfig";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import Icon from "react-native-vector-icons/Ionicons";

const { width } = Dimensions.get("window");

const Fines = () => {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserFines = async () => {
      try {
        setLoading(true);
        const currentUser = auth.currentUser;

        if (!currentUser) {
          console.error("No user is currently logged in.");
          setLoading(false);
          return;
        }

        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", currentUser.uid)
        );
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
          console.error("User document not found");
          setLoading(false);
          return;
        }

        const userDocId = userSnapshot.docs[0].id;

        const finesRef = collection(db, "fines");
        const q = query(
          finesRef,
          where("userId", "==", userDocId),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        const userFines = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            paidAt: data.paidAt?.toDate(),
          };
        });

        setFines(userFines);
      } catch (error) {
        console.error("Error fetching fines:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserFines();
  }, []);

  const formatDate = (date) => {
    if (!date) return "N/A";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "#4CAF50";
      case "pending":
        return "#FFC107";
      case "overdue":
        return "#F44336";
      default:
        return "#607D8B";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "checkmark-circle";
      case "pending":
        return "time";
      case "overdue":
        return "alert-circle";
      default:
        return "help-circle";
    }
  };

  const renderFineItem = ({ item }) => (
    <View style={styles.fineCard}>
      <View style={styles.fineCardContent}>
        <View style={styles.fineIconContainer}>
          <Icon name="receipt" size={24} color="#007BFF" />
        </View>
        <View style={styles.fineDetails}>
          <Text style={styles.fineTitle} numberOfLines={1}>
            {item.eventTitle}
          </Text>
          <Text style={styles.fineSubtitle}>{item.timeframe}</Text>
          <View style={styles.fineBottomRow}>
            <Text
              style={[
                styles.fineAmount,
                {
                  color:
                    item.status?.toLowerCase() === "paid"
                      ? "#4CAF50"
                      : "#F44336",
                },
              ]}
            >
              ₱{item.amount?.toFixed(2)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Icon name={getStatusIcon(item.status)} size={14} color="white" />
              <Text style={styles.statusText}>
                {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
              </Text>
            </View>
          </View>
          {item.status?.toLowerCase() === "paid" && item.paidAt && (
            <Text style={styles.paidAtText}>
              Paid on: {formatDate(item.paidAt)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading Fines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Icon
          name="wallet-outline"
          size={25}
          color="#AE445A"
          style={styles.icon}
        />
        <Text style={styles.title}>My Fines</Text>
      </View>

      <FlatList
        data={fines}
        keyExtractor={(item) => item.id}
        renderItem={renderFineItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>No fines found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginLeft: 10,
    color: "#333",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  fineCard: {
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  fineCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  fineIconContainer: {
    backgroundColor: "#E6F2FF",
    borderRadius: 10,
    padding: 10,
    marginRight: 15,
  },
  fineDetails: {
    flex: 1,
  },
  fineTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  fineSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  fineBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fineAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    marginLeft: 5,
  },
  paidAtText: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: "#999",
  },
});

export default Fines;
