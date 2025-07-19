import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const Styles = StyleSheet.create({
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    paddingVertical: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#203562',
    
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(32,53,98,0.08)',
  },
  cardContent: {
    padding: 14,
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
    paddingTop:10,
    position: "relative",
    zIndex: 1000,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  filterDropdown: {
    flex: 1,
  },
  qrScanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#203562",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    gap: 8,
  },
  qrScanButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  qrScanHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
    gap: 6,
  },
  qrScanHintText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
