import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import cacheService from "../../../../services/CacheService";

const { width, height } = Dimensions.get("window");

const Fines = ({
  initialData = [],
  isDataPreloaded = false,
  showLogoutModal,
}) => {
  const [fines, setFines] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [filteredFines, setFilteredFines] = useState(initialData);
  const [hasLoaded, setHasLoaded] = useState(false);
  const insets = useSafeAreaInsets();
  const headerColor = "#ffffff";
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      let unsubscribe;
      const fetchUserFines = async () => {
        try {
          const currentUser = auth.currentUser;

          if (!currentUser) {
            console.error("No user is currently logged in.");
            setLoading(false);
            return;
          }

          const orgId = await AsyncStorage.getItem("selectedOrgId");
          if (!orgId) return;

          // Check if we have cached data first
          const hasCachedFines = await cacheService.hasCache(cacheService.generateKey("fines", orgId, currentUser.uid));
          if (hasCachedFines) {
            console.log("[Fines] Found cached data, loading immediately");
            const cachedFines = await cacheService.getCachedFines(orgId, currentUser.uid);
            if (cachedFines) {
              // Convert cached date strings back to Date objects
              const finesWithDates = cachedFines.map(fine => ({
                ...fine,
                createdAt: fine.createdAt ? new Date(fine.createdAt) : new Date(),
                paidAt: fine.paidAt ? new Date(fine.paidAt) : null,
              }));
              setFines(finesWithDates);
              setLoading(false);
              setHasLoaded(true);
              return; // Exit early to avoid setting up real-time listener
            }
          }

          const userQuery = query(
            collection(db, "organizations", orgId, "users"),
            where("uid", "==", currentUser.uid)
          );

          const userSnapshot = await getDocs(userQuery);

          if (userSnapshot.empty) {
            console.error("User document not found");
            setLoading(false);
            return;
          }

          const userDoc = userSnapshot.docs[0];
          const userDocId = userDoc.id;

          // Query fines collection with userId
          const finesRef = collection(db, "organizations", orgId, "fines");
          const finesQuery = query(
            finesRef,
            where("userId", "==", userDocId),
            orderBy("createdAt", "desc")
          );

          // Set up real-time listener for fines
          unsubscribe = onSnapshot(
            finesQuery,
            (snapshot) => {
              const userFines = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate() : new Date(),
                  paidAt: data.paidAt?.toDate?.() ? data.paidAt.toDate() : null,
                };
              });
              
              // Cache the fines data with proper date conversion
              const finesForCache = userFines.map(fine => ({
                ...fine,
                // Convert Date objects to ISO strings for caching
                createdAt: fine.createdAt ? fine.createdAt.toISOString() : new Date().toISOString(),
                paidAt: fine.paidAt ? fine.paidAt.toISOString() : null,
              }));
              cacheService.cacheFines(orgId, currentUser.uid, finesForCache);
              
              setFines(userFines);
              setLoading(false);
              setHasLoaded(true);
            },
            (error) => {
              console.error("Error in fines listener:", error);
              setLoading(false);
              setHasLoaded(true);
            }
          );
        } catch (error) {
          console.error("Error fetching fines:", error);
          setLoading(false);
          setHasLoaded(true);
        }
      };

      fetchUserFines();
      isFirstMount.current = false;

      // Cleanup subscription on component unmount
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  // Add a manual refresh handler if needed
  const handleManualRefresh = async () => {
    setHasLoaded(false);
    setLoading(true);
    // ... call fetchUserFines again ...
  };

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
            <Text
              style={styles.fineTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.eventTitle}
            </Text>
            <View style={[styles.statusBadgeWrapper, { marginTop: 4 }]}> 
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) }
                ]}
              >
                <Icon name={getStatusIcon(item.status)} size={16} color="white" />
                <Text style={styles.statusText}>
                  {item.status?.charAt(0).toUpperCase() +
                    item.status?.slice(1).toLowerCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.fineInfoContainer}>
            <Text style={styles.fineDescription} numberOfLines={2}>
              {item.description || "No description available"}
            </Text>

            <View style={styles.fineMetaContainer}>
              <View style={styles.fineMetaRow}>
                <Icon name="time-outline" size={14} color="#666" />
                <Text style={styles.fineMetaText}>
                  {formatDate(item.createdAt).split(",")[1].trim()}
                </Text>
              </View>
              <View style={styles.fineMetaRow}>
                <Icon name="calendar-outline" size={14} color="#666" />
                <Text style={styles.fineMetaText}>
                  Fined on: {formatDate(item.createdAt).split(",")[0]}
                </Text>
              </View>
              {item.status?.toLowerCase() === "paid" && item.paidAt && (
                <View style={styles.fineMetaRow}>
                  <Icon
                    name="checkmark-circle-outline"
                    size={14}
                    color="#4CAF50"
                  />
                  <Text style={[styles.fineMetaText, { color: "#4CAF50" }]}>
                    Paid on: {formatDate(item.paidAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>

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

  return (
    <>
      <View style={{ flex: 1 }}>
        {/* Extend header background behind status bar */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + 80, // Adjust 80 to your header height
            backgroundColor: headerColor,
            zIndex: 0,
          }}
        />
        {renderTabNavigation()}

        <FlatList
          data={filteredFines}
          keyExtractor={(item) => item.id}
          renderItem={renderFineItem}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: insets.bottom + 70 },
          ]}
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
    </>
  );
};

const styles = StyleSheet.create({
  fineHeaderRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 2,
  },
  fineDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexShrink: 0,
    marginLeft: 0,
    minWidth: 60,
    minHeight: 24,
    justifyContent: 'center',
  },
  statusText: {
    color: "white",
    fontSize: 11,
    marginLeft: 4,
  },
  paidAtText: {
    fontSize: 11,
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
    // paddingBottom: 20, // Remove static padding to avoid double-padding
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
    padding: 12,
    borderRadius: 15,
  },
  fineIconContainer: {
    backgroundColor: "#E6F2FF",
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  fineDetails: {
    flex: 1,
  },
  fineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
    width: '100%',
  },
  fineSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  fineDate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  fineBottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  fineAmount: {
    fontSize: 15,
    fontWeight: "600",
  },
  fineInfoContainer: {
    marginTop: 4,
  },
  fineMetaContainer: {
    marginTop: 6,
    gap: 4,
  },
  fineMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fineMetaText: {
    fontSize: 12,
    color: "#666",
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
  statusBadgeWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
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
