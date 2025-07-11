import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const tabWidth = width / 5;
const underlineWidth = tabWidth * 0.8;

// Add these styles to your dashboardStyles object
export const dashboardStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "red",
  },
  container: {
    flex: 1,
    // Removed justifyContent: 'space-between' and backgroundColor to prevent layout jumps
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    // Removed position: 'relative' and negative padding to keep footer fixed
  },
  underline: {
    height: 2,
    backgroundColor: "#3652AD",
    position: "absolute",
    top: -1,
    width: underlineWidth,
    left: 0,
    right: 0,
    marginLeft: "auto",
    marginRight: "auto",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 1,
    paddingTop: 10,
  },
  tabText: {
    fontSize: 10,
    color: "#aaa",
    marginBottom: -5,
  },
  activeTabText: {
    fontSize: 10,
    color: "#3652AD",
    fontWeight: "600",
    marginBottom: -5,
  },
  avatar: {
    width: 26.5,
    height: 26.5,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#EEEDED",
  },

  // Tab styles
  activeTab: {
    // Add any specific styles for active tab
  },
  tabIconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  // Notification badge
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: -5,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    zIndex: 1,
  },
  notificationText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
});

export const constants = {
  tabWidth,
  underlineWidth,
};
