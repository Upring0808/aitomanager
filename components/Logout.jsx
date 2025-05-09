import React from "react";
import { TouchableOpacity, Text, View, Modal, StyleSheet } from "react-native";
import { auth } from "../config/firebaseconfig";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

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
      // First navigate to Index
      navigation.navigate("Index");
      // Then reset the navigation stack to prevent going back
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "Index" }],
        });
      }, 100);

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

  const renderLogoutConfirmModal = () => (
    <Modal transparent={true} visible={visible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Logout</Text>
          <Text style={styles.modalText}>
            Are you sure you want to log out?
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalButton} onPress={onCancel}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#203562" }]}
              onPress={handleLogout}
            >
              <Text style={[styles.modalButtonText, { color: "white" }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (standalone) {
    return (
      <>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => onCancel(true)}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        {renderLogoutConfirmModal()}
      </>
    );
  }

  return renderLogoutConfirmModal();
};

const styles = StyleSheet.create({
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  modalButtonText: {
    fontSize: 16,
    color: "#000",
  },
});

export default Logout;
