import { StyleSheet, Dimensions } from "react-native";
export const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: { flex: 1, padding: 20 },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: "#003161",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginBottom: 10,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  username: {
    fontSize: 15,
    color: "#E0E0E0",
    marginRight: 15,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4C4B16",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  dayColumn: {
    alignItems: "center",
    width: 40,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectedColumn: {
    backgroundColor: "#E1F7F5",
  },
  hasEventsColumn: {
    position: "relative",
  },
  dayText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  selectedText: {
    color: "#024CAA",
    fontWeight: "bold",
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FF4545",
    marginTop: 4,
  },
  timelineContainer: {
    flexDirection: "column",
    paddingHorizontal: 20,

    marginBottom: 20,
    position: "relative",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,

    margin: 18,
    alignSelf: "stretch", // Adjust to the full width of the container
    height: "auto", // Allow dynamic height based on content
  },

  eventsContainer: {
    flexDirection: "column", // Stack event cards vertically
    paddingTop: 20,
  },

  eventCard: {
    borderRadius: 12,
    backgroundColor: "#4F46E5", // Custom color for a reminder look
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  eventContent: {
    flex: 1,
  },
  eventIcon: { marginRight: 10 },
  eventTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  eventTime: { fontSize: 12, color: "#f0f0f0" },
  sectionTitle: {
    marginLeft: 20,
    marginTop: 5,
    marginBottom: -10,
    fontSize: 20,
    fontWeight: "500",
    color: "#333",
  },
  noEventsText: {
    textAlign: "center",
    color: "#888",
    marginTop: 0,
    marginBottom: 20,
    paddingVertical: 100,
    fontSize: 16,
    fontStyle: "italic",
  },

  ReminderContainer: {
    marginBottom: 12,
  },
  ReminderSectionTitle: {
    marginLeft: 25,
    marginTop: 5,
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },

  ReminderCardContainer: {
    marginBottom: 5,
    margin: 18,
  },
  ReminderCard: {
    backgroundColor: "#507687",
    borderRadius: 15,
    padding: 12.5,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginVertical: -9,
    marginBottom: 0,
    borderWidth: 0.25,
    borderColor: "#B7B7B7",
  },
  ReminderCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  ReminderDateTimeContainer: {
    width: 80,
    marginRight: 16,
  },
  ReminderDateText: {
    fontSize: 19,
    fontWeight: "600",
    color: "#FFF4B7",
  },
  ReminderDayText: {
    textTransform: "uppercase",
    fontSize: 12,
    color: "#fff",
    textAlign: "left",
    width: "100%",
  },
  ReminderEventDetails: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ReminderEventTitleContainer: {
    flex: 1,
  },
  ReminderEventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  ReminderEventTimeframe: {
    fontSize: 14,
    color: "#fff",
    marginTop: 4,
  },
  ReminderEventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  ReminderIntersection: {
    height: 50,
    borderLeftWidth: 0.6,
    borderLeftColor: "#fff",
    marginVertical: 0,
    marginHorizontal: 0,
    marginLeft: -15.5,
    paddingRight: 20,
  },
  ReminderNoEvent: {
    textAlign: "center",
    marginTop: 50,
    color: "#888",
    fontSize: 18,
  },
  ReminderCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Helps spread out the content
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 1,
    marginVertical: -0,
  },
  sectionTitleIcon: {
    marginLeft: 5,
    marginTop: 15,
  },
  ReminderIcon: {
    marginLeft: 170,
    marginTop: -23,
    borderWidth: 2,
    borderColor: "red",
    marginBottom: 4,
  },
  ReminderSubtitle: {
    color: "#888",
    fontSize: 14,
    marginLeft: 25,
  },
  dateHeader: {
    padding: 10,
    backgroundColor: "#fff",
    marginBottom: -10,
    alignItems: "center", // Center items horizontally
    justifyContent: "center", // Center items vertically
    flexDirection: "row", // Change to 'column' if you want to stack items vertically
    textAlign: "center", // Center text within the container
  },
  currentDate: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  selectedDate: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
});
