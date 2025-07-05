import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { auth } from "../config/firebaseconfig";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { Feather } from "@expo/vector-icons";

const Logout = ({
  visible = false,
  onCancel,
  onConfirm,
  standalone = false,
}) => {
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      await auth.signOut();

      // Reset the navigation stack to LoginScreen
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginScreen" }],
      });

      Toast.show({
        type: "success",
        text1: "Logged out",
        text2: "You have been logged out.",
      });
      if (onConfirm) onConfirm();
    } catch (error) {
      console.error("Error logging out:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to log out. Please try again.",
      });
    }
  };

  // Render overlay instead of Modal
  const renderLogoutConfirmOverlay = () =>
    visible ? (
      <View style={styles.fullScreenModalContainer}>
        <View style={styles.fullScreenModalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.logoutModalIconContainer}>
              <View style={styles.logoutModalIcon}>
                <Feather name="log-out" size={30} color="#203562" />
              </View>
            </View>
            <Text style={[styles.modalTitle, { textAlign: "center" }]}>
              Confirm Logout
            </Text>
            <Text style={styles.modalText}>
              Are you sure you want to log out of your account?
            </Text>
            <View style={styles.logoutModalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={onCancel}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutConfirmButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutConfirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    ) : null;

  if (standalone) {
    return (
      <>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => onCancel(true)}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        {renderLogoutConfirmOverlay()}
      </>
    );
  }

  return renderLogoutConfirmOverlay();
};

const styles = StyleSheet.create({
  fullScreenModalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: 9999,
  },
  fullScreenModalOverlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
  },
  modalContent: {
    width: "88%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  logoutModalIconContainer: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 12,
  },
  logoutModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#203562",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#203562",
    letterSpacing: 0.2,
  },
  modalText: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 12,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
    letterSpacing: 0.2,
  },
  logoutModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 8,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  modalCancelButtonText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  logoutConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutConfirmButtonText: {
    fontSize: 15,
    color: "white",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  logoutButton: {
    marginTop: 30,
    backgroundColor: "#16325B",
    padding: 15,
    borderRadius: 30,
    width: 300,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default Logout;
