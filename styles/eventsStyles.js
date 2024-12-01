import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const eventsStyles = StyleSheet.create({
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
  form: {
    marginBottom: 32,
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(230, 232, 236, 0.4)",
  },

  input: {
    borderWidth: 0,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: "#f8fafc",
    color: "#1a202c",
    fontWeight: "500",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  timeInputContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },

  timeInput: {
    flex: 1,
    minWidth: width * 0.4,
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#f8fafc",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    borderWidth: 0,
  },

  timeInputText: {
    fontSize: 15,
    color: "#1a202c",
    fontWeight: "500",
    textAlign: "center",
  },

  timePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(230, 232, 236, 0.7)",
  },

  timePickerButton: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
  },

  timePickerButtonText: {
    fontSize: 15,
    color: "#3E588F",
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  addButton: {
    marginTop: 16,
    backgroundColor: "#3E588F",
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: "#3E588F",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 13,

    color: "#64748b",
    fontWeight: "600",
    marginBottom: 20,
    marginLeft: 4,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  inputGroup: {
    marginBottom: -2,
  },

  descriptionInput: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 18,
  },

  dateTimeSection: {
    marginBottom: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(230, 232, 236, 0.7)",
    marginVertical: 18,
  },

  // Add these to your existing eventsStyles StyleSheet

  timeInputLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
  },

  timeInputStart: {
    borderLeftWidth: 3,
    borderLeftColor: "#3E588F",
  },

  timeInputEnd: {
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },

  timeInputDue: {
    borderLeftWidth: 3,
    borderLeftColor: "#FF9800",
  },

  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },

  addButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "none",
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
  qrCodeImage: {
    width: 100,
    height: 100,
    marginTop: 10,
  },

  editContainer: {
    width: "100%",
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
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 40,
    height: 40,
    color: "black",
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

  editTitleInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  editTimeframeInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  editDescriptionInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },

  editButtonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  editActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#3E588F",
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: "#3E588F",
    marginTop: 5,
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
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
    textAlign: "lefts",
    paddingRight: 16,
    paddingBottom: 0,
  },
  yearLevelContainer: {
    marginVertical: 10,
    zIndex: 1000,
  },
  yearLevelButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  yearLevelButtonText: {
    fontSize: 16,
    color: "#333",
  },
  yearLevelDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
    zIndex: 1000,
  },
  yearLevelOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  yearLevelOptionText: {
    fontSize: 16,
    color: "#333",
  },
  createdByText: { color: "#659287" },
});
