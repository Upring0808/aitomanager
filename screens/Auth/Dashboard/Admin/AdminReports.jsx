import React, { useState, useEffect, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  StatusBar,
} from "react-native";
import { db } from "../../../../config/firebaseconfig";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  subYears,
  addYears,
  isSameWeek,
  isSameMonth,
  isSameYear,
  isWithinInterval,
  parseISO,
  parse,
} from "date-fns";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BarChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const screenWidth = Dimensions.get("window").width;

const AdminReports = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [totalFines, setTotalFines] = useState(0);
  const [allPaidFines, setAllPaidFines] = useState([]); // Store all paid fines
  const [filteredFines, setFilteredFines] = useState([]); // Fines within the selected date range
  const [startDate, setStartDate] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  ); // Default to start of current week
  const [endDate, setEndDate] = useState(
    endOfWeek(new Date(), { weekStartsOn: 1 })
  ); // Default to end of current week
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPickingStartDate, setIsPickingStartDate] = useState(false);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [finesByEvent, setFinesByEvent] = useState([]); // New state for fines breakdown by event

  // Set navigation header title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Reports',
    });
  }, [navigation]);

  const fetchAllPaidFines = useCallback(async () => {
    setLoading(true);
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) {
        setAllPaidFines([]);
        setLoading(false);
        return;
      }
      const finesRef = collection(db, "organizations", orgId, "fines");
      const q = query(finesRef, where("status", "==", "paid"));
      const snapshot = await getDocs(q);
      const paidFinesList = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          paidAt: doc.data().paidAt?.toDate(),
          userFullName: doc.data().userFullName || "Unknown User",
          userStudentId: doc.data().userStudentId || "No ID",
          eventTitle: doc.data().eventTitle || "Unknown Event",
        }))
        .filter((fine) => fine.paidAt);
      setAllPaidFines(paidFinesList);
    } catch (error) {
      console.error("Error fetching all paid fines:", error);
      setAllPaidFines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPaidFines();
  }, [fetchAllPaidFines]);

  // Effect to filter fines and calculate total whenever date range or allPaidFines changes
  useEffect(() => {
    if (!startDate || !endDate) return; // Ensure dates are selected

    const filtered = allPaidFines.filter((fine) => {
      const paidDate = fine.paidAt;
      // isWithinInterval is inclusive of start and end dates
      return (
        paidDate &&
        isWithinInterval(paidDate, { start: startDate, end: endDate })
      );
    });

    setFilteredFines(filtered);

    const total = filtered.reduce((sum, fine) => sum + (fine.amount || 0), 0);
    setTotalFines(total);

    // Prepare data for the chart
    const dailyFines = {};
    filtered.forEach((fine) => {
      const date = format(fine.paidAt, "yyyy-MM-dd");
      dailyFines[date] = (dailyFines[date] || 0) + (fine.amount || 0);
    });

    const sortedDates = Object.keys(dailyFines).sort();
    const labels = sortedDates.map((date) => format(parseISO(date), "MMM d"));
    const data = sortedDates.map((date) => dailyFines[date]);

    setChartData({ labels, datasets: [{ data }] });

    // Calculate fines breakdown by event
    const eventTotals = filtered.reduce((acc, fine) => {
      const eventId = fine.eventId || "unknown_event";
      const eventTitle = fine.eventTitle || "Unknown Event";
      if (!acc[eventId]) {
        acc[eventId] = { id: eventId, title: eventTitle, total: 0 };
      }
      acc[eventId].total += fine.amount || 0;
      return acc;
    }, {});

    // Convert object to array and sort by total amount (descending)
    const sortedEvents = Object.values(eventTotals).sort(
      (a, b) => b.total - a.total
    );
    setFinesByEvent(sortedEvents);
  }, [allPaidFines, startDate, endDate]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios"); // Close picker on iOS, Android closes automatically
    if (selectedDate) {
      if (isPickingStartDate) {
        setStartDate(selectedDate);
        if (selectedDate > endDate) {
          // Ensure endDate is not before startDate
          setEndDate(selectedDate);
        }
      } else {
        setEndDate(selectedDate);
        if (selectedDate < startDate) {
          // Ensure startDate is not after endDate
          setStartDate(selectedDate);
        }
      }
    }
  };

  const showPicker = (isStartDate) => {
    setIsPickingStartDate(isStartDate);
    setShowDatePicker(true);
  };

  const renderDatePicker = () => {
    if (!showDatePicker) return null;

    const currentDateValue = isPickingStartDate ? startDate : endDate;

    return (
      <DateTimePicker
        testID="dateTimePicker"
        value={currentDateValue || new Date()}
        mode="date"
        display="default" // Use "spinner" or "calendar" as preferred
        onChange={handleDateChange}
        maximumDate={new Date()} // Prevent selecting future dates
      />
    );
  };

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0, // optional, defaults to 2dp
    color: (opacity = 1) => `rgba(10, 36, 99, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726",
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
     
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView style={styles.content}>
          {/* Date Range Selection */}
          <View style={styles.dateRangeContainer}>
            <TouchableOpacity
              onPress={() => showPicker(true)}
              style={styles.dateInputButton}
            >
              <Text style={styles.dateInputLabel}>From:</Text>
              <Text style={styles.dateInputText}>
                {startDate
                  ? format(startDate, "MMM d, yyyy")
                  : "Select Start Date"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.dateRangeSeparator}>-</Text>
            <TouchableOpacity
              onPress={() => showPicker(false)}
              style={styles.dateInputButton}
            >
              <Text style={styles.dateInputLabel}>To:</Text>
              <Text style={styles.dateInputText}>
                {endDate ? format(endDate, "MMM d, yyyy") : "Select End Date"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Total Fines Display */}
          <View style={styles.totalFinesCard}>
            <Text style={styles.totalFinesLabel}>
              Total Fines Collected (
              {startDate && endDate
                ? `${format(startDate, "MMM d")} - ${format(
                    endDate,
                    startDate.getFullYear() === endDate.getFullYear()
                      ? "MMM d, yyyy"
                      : "MMM d, yyyy"
                  )}`
                : "Selected Period"}
              )
            </Text>
            <Text style={styles.totalFinesValue}>
              ₱
              {totalFines.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>

          {/* Fines Chart */}
          {chartData.labels.length > 0 ? (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Daily Fines Collected</Text>
              <BarChart
                data={chartData}
                width={screenWidth - 32} // chart width
                height={220}
                yAxisLabel="₱"
                chartConfig={chartConfig}
                verticalLabelRotation={30}
                style={styles.chartStyle}
              />
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>
                No fine data for the selected date range.
              </Text>
            </View>
          )}

          {/* Fines by Event Breakdown */}
          <View style={styles.finesByEventContainer}>
            <Text style={styles.finesByEventTitle}>
              Fines Collected by Event
            </Text>
            {finesByEvent.length > 0 ? (
              <View style={styles.finesByEventList}>
                {finesByEvent.map((event) => (
                  <View key={event.id} style={styles.finesByEventItem}>
                    <View style={styles.finesByEventDetails}>
                      <Text style={styles.finesByEventText}>{event.title}</Text>
                      <Text style={styles.finesByEventTotal}>
                        ₱
                        {event.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>
                  No fine data per event for the selected date range.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {renderDatePicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
    backgroundColor: "#0A2463",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#64748B",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dateRangeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 8,
  },
  dateInputButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginHorizontal: 4,
    borderColor: "#E2E8F0",
    borderWidth: 1,
  },
  dateInputLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  dateInputText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  dateRangeSeparator: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A5568",
    marginHorizontal: 8,
  },
  totalFinesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  totalFinesLabel: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 8,
  },
  totalFinesValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0A2463",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 20,
    paddingLeft: 5,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 15,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },
  finesByEventContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  finesByEventTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 15,
  },
  finesByEventList: {
    gap: 10,
  },
  finesByEventItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  finesByEventDetails: {
    flex: 1,
    marginRight: 10,
  },
  finesByEventText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
    marginBottom: 4,
  },
  finesByEventTotal: {
    fontSize: 14,
    color: "#16a34a", // Green color for total
    fontWeight: "600",
  },
});

export default AdminReports;
