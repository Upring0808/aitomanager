import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { auth, db } from "../../../../config/firebaseconfig";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import Icon from "react-native-vector-icons/Ionicons";

const { width, height } = Dimensions.get("window");

const Fines = () => {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [filteredFines, setFilteredFines] = useState([]);

  useEffect(() => {
    let unsubscribe;
    const fetchUserFines = async () => {
      try {
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
        const finesQuery = query(
          finesRef,
          where("userId", "==", userDocId),
          orderBy("createdAt", "desc")
        );

        unsubscribe = onSnapshot(finesQuery, (snapshot) => {
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
          setLoading(false);
        });
      } catch (error) {
        console.error("Error fetching fines:", error);
        setLoading(false);
      }
    };

    fetchUserFines();

    // Cleanup subscription on component unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filter fines based on active tab
  useEffect(() => {
    let filtered = [];
    switch (activeTab) {
      case "paid":
        filtered = fines.filter(
          (fine) => fine.status?.toLowerCase() === "paid"
        );
        break;
      case "unpaid":
        filtered = fines.filter(
          (fine) =>
            fine.status?.toLowerCase() !== "paid" &&
            fine.status?.toLowerCase() !== "paid in full"
        );
        break;
      default:
        filtered = fines;
    }
    setFilteredFines(filtered);
  }, [activeTab, fines]);

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

  const calculateTotalFines = () => {
    return fines.reduce(
      (total, fine) =>
        fine.status?.toLowerCase() !== "paid" ? total + fine.amount : total,
      0
    );
  };

  const renderFineItem = ({ item }) => (
    <TouchableOpacity style={styles.fineCard} activeOpacity={0.7}>
      <View style={styles.fineCardContent}>
        <View style={styles.fineIconContainer}>
          <Icon name="receipt" size={24} color="#007BFF" />
        </View>
        <View style={styles.fineDetails}>
          <View style={styles.fineHeaderRow}>
            <Text style={styles.fineTitle} numberOfLines={1}>
              {item.eventTitle}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Icon name={getStatusIcon(item.status)} size={16} color="white" />
              <Text style={styles.statusText}>
                {item.status?.charAt(0).toUpperCase() +
                  item.status?.slice(1).toLowerCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.fineDescription} numberOfLines={2}>
            {item.description || "No description available"}
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
            {item.status?.toLowerCase() === "paid" && item.paidAt && (
              <Text style={styles.paidAtText}>
                Paid on: {formatDate(item.paidAt)}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render Tab Navigation
  const renderTabNavigation = () => (
    <View style={styles.tabContainer}>
      {["all", "paid", "unpaid"].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabItem, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab)}
        >
          <Text
            style={[styles.tabText, activeTab === tab && styles.activeTabText]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
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
        <View style={styles.headerContent}>
          <Icon
            name="wallet-outline"
            size={30}
            color="white"
            style={styles.icon}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>My Fines</Text>
            <Text style={styles.subtitleText}>
              Current Fines Balance: ₱{calculateTotalFines().toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {renderTabNavigation()}

      <FlatList
        data={filteredFines}
        keyExtractor={(item) => item.id}
        renderItem={renderFineItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>
              {activeTab === "all"
                ? "No fines found"
                : `No ${activeTab} fines found`}
            </Text>
          </View>
        }
      />
    </View>
  );
};
const styles = StyleSheet.create({
  fineHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "left",
    marginBottom: 5,
    borderWidth: 0.1,
    borderColor: "black",
  },
  fineDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
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
  },
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  headerContainer: {
    backgroundColor: "#133E87",
    paddingTop: Platform.OS === "ios" ? 40 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  title: {
    fontFamily: "Lato-Bold",
    fontSize: 24,
    fontWeight: "600",
    color: "white",
    marginBottom: 5,
  },
  subtitleText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    marginBottom: 10,
    fontFamily: "Lato-Regular",
  },
  priorityBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: "flex-start",
  },
  priorityText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  fineCard: {
    marginBottom: 15,
    borderRadius: 15,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fineCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 15,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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

  //tab styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  activeTab: {
    backgroundColor: "#133E87",
    borderRadius: 10,
  },
  activeTabText: {
    color: "white",
    fontWeight: "600",
  },
});

// Helper functions
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

export default Fines;
