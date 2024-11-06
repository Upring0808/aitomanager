import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const Styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  container: {
    padding: 16,
  },
  mainContainer: {
    flex: 1,
    position: "relative",
  },
  scrollContainer: {
    padding: 16,
    minHeight: "100%",
  },
  filterContainer: {
    position: "relative",
    zIndex: 1000,
    marginBottom: 20,
  },
  pickerWrapper: {
    position: "relative",
    zIndex: 1000,
  },
  dropdownOverlay: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#ffff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  pickerText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  customDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#233c60",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 1000,
  },
  dropdownContent: {
    backgroundColor: "#233c60",
  },
  customDropdownItem: {
    padding: 16,
  },
  dropdownItemText: {
    color: "white",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateTimeContainer: {
    width: 80,
    marginRight: 16,
  },
  dateText: {
    fontSize: 19,
    fontWeight: "600",
    color: "#536493",
  },
  dayText: {
    textTransform: "uppercase",
    fontSize: 12,
    color: "#3C3D37",
    textAlign: "left",
    width: "100%",
  },
  eventDetails: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitleContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  eventTimeframe: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  noEvent: {
    textAlign: "center",
    marginTop: 50,
    color: "#888",
    fontSize: 18,
  },
  centerLoading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: 125,
    zIndex: 10,
  },
  intersection: {
    height: 50,
    borderLeftWidth: 0.6,
    borderLeftColor: "#B7B7B7",
    marginVertical: 0,
    marginHorizontal: 0,
    marginLeft: -15.5,
    paddingRight: 20,
  },
  timestampText: {
    fontSize: 10,
    color: "#888",
    opacity: 0.5,
    textAlign: "left",
    paddingRight: 16,
    paddingBottom: 0,
  },
});
