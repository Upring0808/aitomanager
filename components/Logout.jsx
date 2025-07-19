import React, { useState } from "react";
import { TouchableOpacity, Text, View, StyleSheet, Platform, StatusBar, Modal } from "react-native";
import { auth, db } from "../config/firebaseconfig";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { Feather } from "@expo/vector-icons";
import studentStatusService from "../services/StudentStatusService";
import adminStatusService from "../services/AdminStatusService";
import userPresenceService from "../services/UserPresenceService";
import studentPresenceService from "../services/StudentPresenceService";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const Logout = ({
  visible = false,
  onCancel,
  onConfirm,
  standalone = false,
  isAdmin = false,
}) => {
  const navigation = useNavigation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    // Prevent multiple simultaneous logout attempts
    if (isLoggingOut) {
      console.log("[Logout] Logout already in progress, ignoring duplicate request");
      return;
    }

    setIsLoggingOut(true);
    
    try {
      // Use the onConfirm callback if provided, otherwise use default logout
      if (onConfirm) {
        console.log("[Logout] Using provided onConfirm callback");
        await onConfirm();
      } else {
        console.log("[Logout] Using default logout flow");
        // Optimized cleanup sequence
        const user = auth.currentUser;
        
        // Step 1: Force offline status immediately
        if (isAdmin) {
          console.log("[Logout] Forcing admin offline immediately");
          await adminStatusService.forceOffline();
        } else {
          console.log("[Logout] Forcing student offline immediately");
          await studentStatusService.forceOffline();
          await studentPresenceService.removeStudentCompletely();
          // Direct Firestore update for immediate effect
          if (user) {
            try {
              const studentStatusRef = doc(db, 'studentStatus', user.uid);
              await setDoc(studentStatusRef, {
                isOnline: false,
                lastActive: serverTimestamp(),
                studentId: user.uid,
                studentName: user.displayName || 'Student',
                updatedAt: serverTimestamp()
              }, { merge: true });
              console.log("[Logout] Direct Firestore update completed for user:", user.uid);
            } catch (error) {
              console.error("[Logout] Error in direct Firestore update:", error);
            }
          }
        }
        // Step 1.5: Clean up presence service before sign out
        try {
          console.log("[Logout] Cleaning up userPresenceService before signOut");
          await userPresenceService.cleanup();
        } catch (error) {
          console.error("[Logout] Error cleaning up userPresenceService before signOut:", error);
        }
        // Step 2: Sign out from Firebase Auth
        console.log("[Logout] Signing out from Firebase Auth");
        await auth.signOut();
        
        // Step 3: Clean up services
        try {
          console.log("[Logout] Cleaning up services");
          if (isAdmin) {
            await adminStatusService.cleanup();
          } else {
            await studentStatusService.cleanup();
          }
        } catch (error) {
          console.error("[Logout] Error cleaning up services:", error);
        }
        
        // Step 4: Navigate to LoginScreen with fresh state
        console.log("[Logout] Navigating to LoginScreen");
        // Set a flag to prevent auth state conflicts during navigation reset
        navigation.setParams({ isLoggingOut: true });
        navigation.reset({
          index: 0,
          routes: [{ name: "LoginScreen" }],
        });

        Toast.show({
          type: "success",
          text1: "Logged out",
          text2: "You have been logged out.",
        });
      }
    } catch (error) {
      console.error("Error logging out:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to log out. Please try again.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Render overlay instead of Modal
  const renderLogoutConfirmOverlay = () =>
    visible ? (
      <Modal visible transparent animationType="fade" statusBarTranslucent={true}>
        <View style={styles.fullScreenModalOverlay} pointerEvents="auto">
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
                style={[styles.logoutConfirmButton, isLoggingOut && styles.logoutConfirmButtonDisabled]}
                onPress={handleLogout}
                disabled={isLoggingOut}
              >
                <Text style={styles.logoutConfirmButtonText}>
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
  },
  fullScreenModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: 9999,
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
  logoutConfirmButtonDisabled: {
    opacity: 0.7,
    backgroundColor: "#E0E0E0",
    shadowColor: "#A0A0A0",
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
