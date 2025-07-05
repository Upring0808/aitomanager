import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../../config/firebaseconfig";
import { BarChart } from "react-native-chart-kit";
import AsyncStorage from "@react-native-async-storage/async-storage";

const screenWidth = Dimensions.get("window").width;

const StudentOverview = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentsByYear, setStudentsByYear] = useState({});
  const [studentsWithOutstandingFines, setStudentsWithOutstandingFines] =
    useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) {
          setTotalStudents(0);
          setStudentsByYear({});
          setStudentsWithOutstandingFines(0);
          setLoading(false);
          return;
        }
        const usersCollectionRef = collection(
          db,
          "organizations",
          orgId,
          "users"
        );
        const finesCollectionRef = collection(
          db,
          "organizations",
          orgId,
          "fines"
        );

        const [usersSnapshot, finesSnapshot] = await Promise.all([
          getDocs(usersCollectionRef),
          getDocs(query(finesCollectionRef, where("status", "!=", "paid"))), // Fetch only unpaid fines
        ]);

        const users = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const unpaidFines = finesSnapshot.docs.map((doc) => doc.data());

        // All users with a valid username are counted as students (including officers)
        const students = users.filter((user) => user.username);
        // Officers are those with a username and a non-student role
        const officers = users.filter(
          (user) => user.role && user.role !== "student" && user.username
        );
        console.log("DEBUG: Total users:", users.length);
        console.log(
          "DEBUG: Students (all with username):",
          students.length,
          students.map((u) => u.username)
        );
        console.log(
          "DEBUG: Officers:",
          officers.length,
          officers.map((u) => u.username)
        );

        // Calculate statistics
        const total = students.length;
        const yearLevels = {};

        students.forEach((user) => {
          // Count by Year Level
          const year = user.yearLevel || "N/A"; // Handle missing yearLevel
          yearLevels[year] = (yearLevels[year] || 0) + 1;
        });

        // Count students with outstanding fines
        // Get unique user IDs from unpaid fines
        const usersWithFines = new Set(
          unpaidFines
            .filter((fine) => students.some((s) => s.id === fine.userId))
            .map((fine) => fine.userId)
        );
        setStudentsWithOutstandingFines(usersWithFines.size);

        setTotalStudents(total);
        setStudentsByYear(yearLevels);
      } catch (err) {
        console.error("Error fetching student data:", err);
        setError("Failed to load student data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(10, 36, 99, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#0A2463",
    },
    barPercentage: 0.6,
    formatYLabel: (value) => Math.round(value).toString(),
    formatXLabel: (value) => value.replace("Year ", "Y"),
  };

  const prepareChartData = () => {
    const sortedYears = Object.entries(studentsByYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([year]) => year !== "N/A" && !isNaN(parseInt(year)));

    return {
      labels: sortedYears.map(([year]) => `Year ${year}`),
      datasets: [
        {
          data: sortedYears.map(([, count]) => count),
          color: (opacity = 1) => `rgba(10, 36, 99, ${opacity})`,
        },
      ],
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar
          backgroundColor="#0A2463"
          barStyle="light-content"
          translucent={true}
        />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Student Overview</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Loading student data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar
          backgroundColor="#0A2463"
          barStyle="light-content"
          translucent={true}
        />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Student Overview</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar
        backgroundColor="#0A2463"
        barStyle="light-content"
        translucent={true}
      />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Overview</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <Icon name="people" size={24} color="#0A2463" />
            </View>
            <Text style={styles.cardTitle}>Total Students</Text>
            <Text style={styles.cardValue}>{totalStudents}</Text>
          </View>

          <View style={styles.statsCard}>
            <View style={[styles.statsIconContainer, styles.fineIconContainer]}>
              <Icon name="cash" size={24} color="#D92626" />
            </View>
            <Text style={styles.cardTitle}>Outstanding Fines</Text>
            <Text style={styles.cardValueFine}>
              {studentsWithOutstandingFines}
            </Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Students by Year Level</Text>
          <BarChart
            data={prepareChartData()}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            showValuesOnTopOfBars={true}
            fromZero={true}
            segments={5}
            yAxisLabel=""
            yAxisSuffix=""
            yAxisInterval={1}
            style={styles.chart}
          />
        </View>

        <View style={styles.yearLevelListContainer}>
          <Text style={styles.yearLevelListTitle}>Detailed Breakdown</Text>
          {Object.entries(studentsByYear)
            .sort(([a], [b]) => a.localeCompare(b))
            .filter(([year]) => year !== "N/A")
            .map(([year, count]) => (
              <View key={year} style={styles.yearLevelListItem}>
                <View style={styles.yearLevelInfo}>
                  <Icon
                    name="school"
                    size={20}
                    color="#0A2463"
                    style={styles.yearLevelIcon}
                  />
                  <Text style={styles.yearLevelText}>{`Year ${year}`}</Text>
                </View>
                <View style={styles.yearLevelCountContainer}>
                  <Text style={styles.yearLevelCount}>{count}</Text>
                  <Text style={styles.yearLevelPercentage}>
                    {Math.round((count / totalStudents) * 100)}%
                  </Text>
                </View>
              </View>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },
  header: {
    transform: [{ translateY: -35 }],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#0A2463",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
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
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerRight: {},
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
  },
  statsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(10, 36, 99, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  fineIconContainer: {
    backgroundColor: "rgba(217, 38, 38, 0.1)",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0A2463",
  },
  cardValueFine: {
    fontSize: 28,
    fontWeight: "700",
    color: "#D92626",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
    overflow: "hidden",
    paddingBottom: 8,
    paddingLeft: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    paddingRight: 0,
    paddingLeft: 24,
    paddingBottom: 0,
  },
  yearLevelListContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
  },
  yearLevelListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  yearLevelListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  yearLevelInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  yearLevelIcon: {
    marginRight: 8,
  },
  yearLevelText: {
    fontSize: 15,
    color: "#4A5568",
  },
  yearLevelCountContainer: {
    alignItems: "flex-end",
  },
  yearLevelCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  yearLevelPercentage: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 10,
    marginBottom: 10,
  },
});

export default StudentOverview;
