import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const Styles = StyleSheet.create({
  cardContainer: {
    paddingVertical: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  dateTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3E588F",
  },
  dayText: {
    fontSize: 14,
    color: "#666",
  },
  intersection: {
    height: 1,
    backgroundColor: "#EBEBEB",
    marginVertical: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitleContainer: {
    flex: 1,
    paddingRight: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  eventTimeframe: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  arrowContainer: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    transform: [{ rotate: "0deg" }],
  },

  descriptionSubheading: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  eventDescriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#555",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#f9f9f9",
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
    marginTop: 5,
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
  adminInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  adminText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#333",
    marginTop: -3,
  },
});
