import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import {
  collection,
  onSnapshot,
  query,
  getDocs,
  where,
  Timestamp,
  addDoc,
  orderBy,
  limit,
  updateDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../../../config/firebaseconfig";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  Users,
  DollarSign,
} from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import Icon from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TIMELINE_HEIGHT = 660;
const EVENT_COLORS = [
  "#4F46E580",
  "#6D28D980",
  "#475569C0",
  "#22D3EE80",
  "#064E3BC0",
  "#14532DC0",
  "#713F12C0",
  "#78350FC0",
  "#762B91C0",
  "#3F3F46C0",
  "#5B21B6C0",
  "#4338CA80",
  "#1E293BC0",
  "#15803DC0",
  "#854D0EC0",
  "#831843C0",
  "#881337C0",
  "#57534EC0",
  "#525252C0",
  "#994F0FC0",
];

const screenWidth = Dimensions.get("window").width;

const THEME_COLORS = {
  primary: "#0A2463",
  textSecondary: "#4A5568",
  accent: "#3E92CC",
  fineColor: "#D92626",
};
const SPACING = 16;

// Define styles before components
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: "#0A2463",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  headerText: {
    color: "#FFFFFF",
  },
  headerGreeting: {
    fontSize: 15,
    opacity: 0.9,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  headerUsername: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  statsContainer: {
    marginBottom: 28,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  statsIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0A2463",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },
  statsTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1E293B",
    letterSpacing: 0.2,
  },
  statsValue: {
    fontSize: 34,
    fontWeight: "700",
    color: "#0A2463",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statsLabel: {
    fontSize: 15,
    color: "#64748B",
    letterSpacing: 0.2,
  },
  quickActionsContainer: {
    marginBottom: 28,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  quickActionCard: {
    width: "50%",
    padding: 8,
  },
  quickActionInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0A2463",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  quickActionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  quickActionDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  recentActivityContainer: {
    marginBottom: 20,
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: 0.2,
  },
  seeHistoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
  },
  seeHistoryText: {
    fontSize: 14,
    color: "#0A2463",
    fontWeight: "600",
    marginRight: 4,
    letterSpacing: 0.2,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: "#1E293B",
    marginBottom: 3,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  activityTime: {
    fontSize: 12,
    color: "#64748B",
    letterSpacing: 0.1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 0,
  },
  fullScreenModalContent: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 16,
    maxHeight: "100%",
  },
  formSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    letterSpacing: 0.2,
  },
  pickerContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 12,
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  picker: {
    height: 50,
    color: "#1E293B",
    fontSize: 16,
    paddingVertical: Platform.OS === "ios" ? 0 : 2,
    justifyContent: "center",
    lineHeight: 50,
  },
  pickerItem: {
    fontSize: 16,
    color: "#1E293B",
    height: 50,
    textAlign: "left",
    textAlignVertical: "center",
    lineHeight: 50,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.3,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 4,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#E2E8F0",
  },
  submitButton: {
    backgroundColor: "#0A2463",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    letterSpacing: 0.2,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  formGroup: {
    marginBottom: 20,
  },
  settingsGroup: {
    marginBottom: 28,
  },
  settingsGroupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  settingDescription: {
    fontSize: 14,
    color: "#64748B",
    letterSpacing: 0.1,
  },
  notificationModalContent: {
    width: "100%",
    maxHeight: "95%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  notificationList: {
    padding: 24,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  unreadNotification: {
    backgroundColor: "#EBF2F8",
    borderLeftWidth: 4,
    borderLeftColor: "#0A2463",
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#4A5568",
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  notificationTime: {
    fontSize: 12,
    color: "#718096",
    letterSpacing: 0.1,
  },
  emptyNotifications: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: "#94A3B8",
    marginTop: 16,
    letterSpacing: 0.2,
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 16,
    color: "#64748B",
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 1,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1E293B",
    letterSpacing: 0.2,
  },
  passwordToggle: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  passwordRequirements: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  requirementsTitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
    fontWeight: "600",
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 8,
  },
  requirementMet: {
    color: "#16a34a",
  },
  roleCard: {
    width: 120,
    height: 60,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  selectedRoleCard: {
    borderWidth: 2,
    backgroundColor: "#0A2463",
    borderColor: "#0A2463",
  },
});

// Add this before AddUserModal
const roleDetails = {
  student: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Student",
  },
  governor: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Governor",
  },
  vice_governor: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Vice Governor",
  },
  secretary: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Secretary",
  },
  assistant_secretary: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Assistant Secretary",
  },
  treasurer: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Treasurer",
  },
  assistant_treasurer: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Assistant Treasurer",
  },
  auditor: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Auditor",
  },
  business_manager: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Business Manager",
  },
  food_committee_chairperson: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Chairperson, Food Committee",
  },
  public_information_officer: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Public Information Officer",
  },
  gentleman_officer: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Gentleman Officer",
  },
  lady_officer: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "Lady Officer",
  },
  first_year_mayor: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "1st Year Mayor",
  },
  second_year_mayor: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "2nd Year Mayor",
  },
  third_year_mayor: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "3rd Year Mayor",
  },
  fourth_year_mayor: {
    color: "#F8FAFC",
    borderColor: "#E2E8F0",
    selectedColor: "#0A2463",
    label: "4th Year Mayor",
  },
};

// Define AddUserModal component before AdminHome
const AddUserModal = React.memo(
  ({
    visible,
    onClose,
    onSuccess,
    isAddingUser: parentIsAddingUser,
    setIsAddingUser: parentSetIsAddingUser,
    orgName,
  }) => {
    const [localUser, setLocalUser] = useState({
      fullName: "",
      studentId: "",
      yearLevel: "1",
      role: "student",
      password: "",
      email: "",
      phone: "",
    });
    const [isAdding, setIsAdding] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({
      length: false,
      number: false,
      letter: false,
    });
    const scrollRef = useRef(null);
    const modalHasLoadedRef = useRef(false);
    const formDataRef = useRef({
      fullName: "",
      studentId: "",
      yearLevel: "1",
      role: "student",
      password: "",
      email: "",
      phone: "",
    });

    // Optimize modal initialization
    useEffect(() => {
      if (visible && !modalHasLoadedRef.current) {
        setLocalUser(formDataRef.current);
        modalHasLoadedRef.current = true;
      } else if (!visible) {
        modalHasLoadedRef.current = false;
      }
    }, [visible]);

    // Memoize handlers
    const handleClose = useCallback(() => {
      formDataRef.current = { ...localUser };
      onClose();
      setFormErrors({});
    }, [localUser, onClose]);

    const checkPasswordStrength = useCallback((password) => {
      setPasswordStrength({
        length: password.length >= 6,
        number: /\d/.test(password),
        letter: /[a-zA-Z]/.test(password),
      });
    }, []);

    const validateForm = useCallback(() => {
      const errors = {};
      if (!localUser.fullName.trim()) errors.fullName = "Full name is required";
      if (!localUser.studentId.trim())
        errors.studentId = "Student ID is required";
      if (!localUser.email.trim()) errors.email = "Email is required";
      if (!localUser.password) errors.password = "Password is required";
      if (localUser.password && localUser.password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }
      if (localUser.password && !/\d/.test(localUser.password)) {
        errors.password = "Password must contain at least one number";
      }
      if (localUser.password && !/[a-zA-Z]/.test(localUser.password)) {
        errors.password = "Password must contain at least one letter";
      }
      if (!localUser.email.includes("@")) {
        errors.email = "Invalid email format";
      }
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }, [localUser]);

    const handleSubmit = useCallback(async () => {
      if (!validateForm()) {
        return;
      }

      setIsAdding(true);
      parentSetIsAddingUser?.(true);

      try {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        console.log("[DEBUG] AddUserModal: orgId", orgId);
        if (!orgId) {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "No organization selected. Cannot add student.",
          });
          setIsAdding(false);
          parentSetIsAddingUser?.(false);
          return;
        }
        // Username uniqueness check (org-specific)
        const usernameQuery = query(
          collection(db, "organizations", orgId, "users"),
          where("username", "==", localUser.fullName)
        );
        const usernameSnapshot = await getDocs(usernameQuery);
        if (!usernameSnapshot.empty) {
          Toast.show({
            type: "error",
            text1: "Warning",
            text2:
              "Username is already taken in this organization. Please choose another.",
          });
          setIsAdding(false);
          parentSetIsAddingUser?.(false);
          return;
        }
        // Create user in Firebase Auth
        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(
            auth,
            localUser.email,
            localUser.password
          );
          console.log("[DEBUG] AddUserModal: userCredential", userCredential);
        } catch (authError) {
          let errorMessage = "Authentication failed";
          switch (authError.code) {
            case "auth/email-already-in-use":
              errorMessage = "Email address is already in use";
              Toast.show({
                type: "error",
                text1: "Error",
                text2: errorMessage,
              });
              break;
            case "auth/invalid-email":
              errorMessage = "Invalid email address format";
              Toast.show({
                type: "error",
                text1: "Error",
                text2: errorMessage,
              });
              break;
            case "auth/weak-password":
              errorMessage = "Password should be at least 6 characters";
              Toast.show({
                type: "error",
                text1: "Error",
                text2: errorMessage,
              });
              break;
            default:
              console.error("Firebase Auth Error:", authError);
              Toast.show({
                type: "error",
                text1: "Error",
                text2: errorMessage,
              });
          }
          setIsAdding(false);
          parentSetIsAddingUser?.(false);
          return;
        }
        const userId = userCredential.user.uid;
        // Save user profile under organizations/{orgId}/users/{userId}
        const userData = {
          uid: userId,
          username: localUser.fullName,
          studentId: localUser.studentId,
          email: localUser.email,
          phone: localUser.phone || "",
          yearLevel: localUser.yearLevel,
          createdAt: new Date(),
        };
        try {
          await setDoc(
            doc(db, "organizations", orgId, "users", userId),
            userData
          );
          console.log(
            "[DEBUG] AddUserModal: Student written to Firestore",
            orgId,
            userId
          );
        } catch (err) {
          console.error(
            "[DEBUG] AddUserModal: Failed to write student to Firestore",
            err
          );
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Failed to write student to Firestore.",
          });
          setIsAdding(false);
          parentSetIsAddingUser?.(false);
          return;
        }
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Student added successfully!",
        });
        // ... existing code for activity log, clearing form, etc ...
        formDataRef.current = {
          fullName: "",
          studentId: "",
          yearLevel: "1",
          role: "student",
          password: "",
          email: "",
          phone: "",
        };
        onSuccess?.();
        onClose();
      } catch (error) {
        console.error("[DEBUG] AddUserModal: Unexpected error", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "An error occurred. Please try again.",
        });
      } finally {
        setIsAdding(false);
        parentSetIsAddingUser?.(false);
      }
    }, [
      localUser,
      validateForm,
      onClose,
      onSuccess,
      parentSetIsAddingUser,
      orgName,
    ]);

    return (
      <Modal
        visible={visible}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={handleClose}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          >
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={[
                      styles.headerIcon,
                      { marginRight: 10, backgroundColor: "#0A246320" },
                    ]}
                  >
                    <Icon name="person-add-outline" size={20} color="#0A2463" />
                  </View>
                  <Text style={[styles.modalTitle, { fontSize: 20 }]}>
                    Add New Student
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[
                    styles.headerActionButton,
                    { backgroundColor: "#F1F5F9" },
                  ]}
                >
                  <Icon name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={scrollRef}
                style={[styles.modalBody, { flex: 1 }]}
                contentContainerStyle={{ paddingBottom: 10, flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                bounces={true}
              >
                {/* Form sections */}
                <View style={[styles.formSection, { marginBottom: 16 }]}>
                  <Text style={styles.formSectionTitle}>Basic Information</Text>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Student ID <Text style={{ color: "#EF4444" }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.studentId && styles.inputError,
                      ]}
                      value={localUser.studentId}
                      onChangeText={(text) =>
                        setLocalUser((prev) => ({
                          ...prev,
                          studentId: text.toUpperCase(),
                        }))
                      }
                      placeholder="Enter student ID"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                    />
                    {formErrors.studentId && (
                      <Text style={styles.errorText}>
                        {formErrors.studentId}
                      </Text>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Full Name <Text style={{ color: "#EF4444" }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.fullName && styles.inputError,
                      ]}
                      value={localUser.fullName}
                      onChangeText={(text) =>
                        setLocalUser((prev) => ({
                          ...prev,
                          fullName: text,
                        }))
                      }
                      placeholder="Enter full name"
                      placeholderTextColor="#94A3B8"
                    />
                    {formErrors.fullName && (
                      <Text style={styles.errorText}>
                        {formErrors.fullName}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={[styles.formSection, { marginBottom: 16 }]}>
                  <Text style={styles.formSectionTitle}>Account Details</Text>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Email Address <Text style={{ color: "#EF4444" }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.email && styles.inputError,
                      ]}
                      value={localUser.email}
                      onChangeText={(text) =>
                        setLocalUser((prev) => ({ ...prev, email: text }))
                      }
                      placeholder="Enter email address"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {formErrors.email && (
                      <Text style={styles.errorText}>{formErrors.email}</Text>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Password <Text style={{ color: "#EF4444" }}>*</Text>
                    </Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          formErrors.password && styles.inputError,
                        ]}
                        value={localUser.password}
                        onChangeText={(text) => {
                          setLocalUser((prev) => ({
                            ...prev,
                            password: text,
                          }));
                          checkPasswordStrength(text);
                        }}
                        placeholder="Enter password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Icon
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.passwordRequirements}>
                      <Text style={styles.requirementsTitle}>
                        Password Requirements:
                      </Text>
                      <View style={styles.requirementItem}>
                        <Icon
                          name={
                            passwordStrength.length
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={16}
                          color={
                            passwordStrength.length ? "#16a34a" : "#64748B"
                          }
                        />
                        <Text
                          style={[
                            styles.requirementText,
                            passwordStrength.length && styles.requirementMet,
                          ]}
                        >
                          At least 6 characters
                        </Text>
                      </View>
                      <View style={styles.requirementItem}>
                        <Icon
                          name={
                            passwordStrength.number
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={16}
                          color={
                            passwordStrength.number ? "#16a34a" : "#64748B"
                          }
                        />
                        <Text
                          style={[
                            styles.requirementText,
                            passwordStrength.number && styles.requirementMet,
                          ]}
                        >
                          At least one number
                        </Text>
                      </View>
                      <View style={styles.requirementItem}>
                        <Icon
                          name={
                            passwordStrength.letter
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={16}
                          color={
                            passwordStrength.letter ? "#16a34a" : "#64748B"
                          }
                        />
                        <Text
                          style={[
                            styles.requirementText,
                            passwordStrength.letter && styles.requirementMet,
                          ]}
                        >
                          At least one letter
                        </Text>
                      </View>
                    </View>
                    {formErrors.password && (
                      <Text style={styles.errorText}>
                        {formErrors.password}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>
                    Additional Information
                  </Text>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Year Level</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={localUser.yearLevel}
                        onValueChange={(value) =>
                          setLocalUser((prev) => ({
                            ...prev,
                            yearLevel: value,
                          }))
                        }
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                        mode="dropdown"
                        dropdownIconColor="#1E293B"
                      >
                        {[1, 2, 3, 4].map((year) => (
                          <Picker.Item
                            key={year}
                            label={`Year ${year}`}
                            value={year.toString()}
                            color="#1E293B"
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Role</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 8 }}
                      contentContainerStyle={{ paddingRight: 16 }}
                    >
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {Object.entries(roleDetails).map(([role, details]) => (
                          <TouchableOpacity
                            key={role}
                            style={[
                              styles.roleCard,
                              {
                                backgroundColor:
                                  localUser.role === role
                                    ? details.selectedColor
                                    : details.color,
                                borderColor:
                                  localUser.role === role
                                    ? details.selectedColor
                                    : details.borderColor,
                              },
                              localUser.role === role &&
                                styles.selectedRoleCard,
                            ]}
                            onPress={() =>
                              setLocalUser((prev) => ({ ...prev, role }))
                            }
                          >
                            <Text
                              style={{
                                color:
                                  localUser.role === role
                                    ? "#FFFFFF"
                                    : "#475569",
                                fontWeight:
                                  localUser.role === role ? "700" : "600",
                                fontSize: 15,
                                textAlign: "center",
                              }}
                            >
                              {details.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleClose}
                  disabled={isAdding}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleSubmit}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Add Student</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  }
);

// Define NotificationCenter component
const NotificationCenter = React.memo(() => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notificationsRef = collection(db, "notifications");
        const q = query(
          notificationsRef,
          orderBy("timestamp", "desc"),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const notificationList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(notificationList);
        setUnreadCount(notificationList.filter((n) => !n.read).length);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, { read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return formatTimeAgo(date);
  };

  return (
    <Modal
      visible={showNotifications}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={() => setShowNotifications(false)}
    >
      <View style={styles.modalContainer}>
        <SafeAreaView
          style={styles.notificationModalContent}
          edges={["top", "bottom"]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={[
                  styles.headerIcon,
                  { marginRight: 10, backgroundColor: "#0A246320" },
                ]}
              >
                <Icon name="notifications-outline" size={20} color="#0A2463" />
              </View>
              <Text style={[styles.modalTitle, { fontSize: 20 }]}>
                Notifications
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowNotifications(false)}
              style={[
                styles.headerActionButton,
                { backgroundColor: "#F1F5F9" },
              ]}
            >
              <Icon name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.notificationList}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.read && styles.unreadNotification,
                  ]}
                  onPress={() => markAsRead(notification.id)}
                >
                  <View
                    style={[
                      styles.notificationIcon,
                      {
                        backgroundColor: `${getActivityColor(
                          notification.type
                        )}20`,
                      },
                    ]}
                  >
                    <Icon
                      name={getActivityIcon(notification.type)}
                      size={20}
                      color={getActivityColor(notification.type)}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatNotificationTime(notification.timestamp)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyNotifications}>
                <Icon
                  name="notifications-off-outline"
                  size={48}
                  color="#94A3B8"
                />
                <Text style={styles.emptyNotificationsText}>
                  No notifications yet
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
});

const AdminHome = ({ userData }) => {
  const navigation = useNavigation();
  const [username, setUsername] = useState("");
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekDays, setWeekDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [scrollY] = useState(new Animated.Value(0));
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [totalStudentFines, setTotalStudentFines] = useState(0);
  const [finesLoading, setFinesLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: "",
    studentId: "",
    yearLevel: "1",
    role: "student",
    password: "",
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    autoGenerateReports: false,
    fineReminderDays: 7,
    theme: "light",
  });
  const [allUsers, setAllUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [orgName, setOrgName] = useState("");

  // Add new state for animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchEvents()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    checkUserAndFetchData();
    setupRealtimeUpdates(); // Start real-time listener
    fetchAllUsers(); // Fetch all users when component mounts
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const setupRealtimeUpdates = useCallback(
    (orgId) => {
      if (!orgId) return () => {};
      const eventsRef = collection(db, "organizations", orgId, "events");
      const q = query(eventsRef);
      return onSnapshot(q, (snapshot) => {
        const allEvents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
        }));
        // ... existing event update logic ...
      });
    },
    [selectedDate, generateWeekDays]
  );

  useEffect(() => {
    let unsubscribe = () => {};
    (async () => {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      unsubscribe = setupRealtimeUpdates(orgId);
    })();
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [selectedDate, generateWeekDays, setupRealtimeUpdates]);

  const timeToDecimalHours = (timeStr) => {
    const [time, period] = (typeof timeStr === "string" ? timeStr : "").split(
      " "
    );
    const [hours, minutes] = (typeof time === "string" ? time : "")
      .split(":")
      .map(Number);
    let decimalHours = hours;

    if (minutes) {
      decimalHours += minutes / 60;
    }

    if (period === "PM" && hours !== 12) {
      decimalHours += 12;
    } else if (period === "AM" && hours === 12) {
      decimalHours = minutes / 60;
    }

    return decimalHours;
  };

  const checkUserAndFetchData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) return;
        const adminDoc = await getDocs(
          query(
            collection(db, "organizations", orgId, "admins"),
            where("uid", "==", currentUser.uid)
          )
        );
        if (!adminDoc.empty) {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

  const generateWeekDays = useCallback(
    (startDate) => {
      return Array.from({ length: 7 }, (_, i) => {
        const date = addDays(startDate, i);
        return {
          date,
          dayNumber: format(date, "d"),
          dayName: format(date, "E"),
          isSelected: isSameDay(date, selectedDate),
          isToday: isSameDay(date, new Date()),
          hasEvents: false, // This will be set separately in updateWeekDaysWithEvents
        };
      });
    },
    [selectedDate]
  );

  const fetchEvents = useCallback(async () => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const eventsRef = collection(db, "organizations", orgId, "events");
      const eventsSnapshot = await getDocs(eventsRef);
      const allFetchedEvents = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
      }));
      // ... existing code ...
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, [selectedDate, generateWeekDays]);

  const handlePreviousWeek = useCallback(() => {
    const newWeekStart = subWeeks(weekStart, 1);
    setWeekStart(newWeekStart);

    // Immediately update the week days with events for the new week
    const daysWithEvents = generateWeekDays(newWeekStart).map((day) => ({
      ...day,
      hasEvents: allEvents.some((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isSameDay(eventDate, day.date);
      }),
    }));
    setWeekDays(daysWithEvents);
  }, [weekStart, generateWeekDays, allEvents]);

  const handleNextWeek = useCallback(() => {
    const newWeekStart = addWeeks(weekStart, 1);
    setWeekStart(newWeekStart);

    // Immediately update the week days with events for the new week
    const daysWithEvents = generateWeekDays(newWeekStart).map((day) => ({
      ...day,
      hasEvents: allEvents.some((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isSameDay(eventDate, day.date);
      }),
    }));
    setWeekDays(daysWithEvents);
  }, [weekStart, generateWeekDays, allEvents]);

  const handleDateSelect = useCallback(
    (date) => {
      setSelectedDate(date);
      // Filter events for the selected date
      const selectedDayEvents = allEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        return isSameDay(eventDate, date);
      });
      setEvents(selectedDayEvents);
    },
    [allEvents]
  );

  useEffect(() => {
    fetchEvents(); // Fetch events for the current week on mount
  }, [fetchEvents]);

  const getSectionTitle = useCallback(() => {
    const today = new Date();
    const isToday = isSameDay(selectedDate, today);
    const formattedDate = format(selectedDate, "MMM d, yyyy");

    return isToday ? "Schedule Today" : `Schedule: ${formattedDate}`;
  }, [selectedDate]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good Morning, ";
    } else if (hour < 17) {
      return "Good Afternoon, ";
    } else {
      return "Good Evening, ";
    }
  };

  useEffect(() => {
    checkUserAndFetchData();
    const unsubscribe = setupRealtimeUpdates();
    return () => unsubscribe();
  }, [setupRealtimeUpdates]);

  useEffect(() => {
    // Initialize weekDays when component mounts
    const initWeekDays = () => {
      const days = generateWeekDays(weekStart);

      // If we have events already, mark the days with events
      if (allEvents.length > 0) {
        const daysWithEvents = days.map((day) => ({
          ...day,
          hasEvents: allEvents.some((event) => {
            const eventDate = event.dueDate?.toDate() || new Date();
            return isSameDay(eventDate, day.date);
          }),
        }));
        setWeekDays(daysWithEvents);
      } else {
        setWeekDays(days);
      }
    };

    initWeekDays();
  }, [weekStart, allEvents, generateWeekDays]);

  const updateWeekDaysWithEvents = useCallback(
    (eventsInWeek) => {
      console.log("Updating week days with events:", eventsInWeek.length);

      // Generate week days
      const days = generateWeekDays(weekStart);

      // Mark which days have events
      const weekDaysWithEvents = days.map((day) => {
        const hasEvents = eventsInWeek.some((event) => {
          const eventDate = event.dueDate?.toDate() || new Date();
          return isSameDay(eventDate, day.date);
        });

        console.log(`Day ${format(day.date, "EEE")} has events: ${hasEvents}`);

        return {
          ...day,
          hasEvents,
        };
      });

      // Update state with the new week days that have events marked
      setWeekDays(weekDaysWithEvents);
    },
    [generateWeekDays, weekStart]
  );

  // Make sure updateWeekDaysWithEvents is called when weekStart changes
  useEffect(() => {
    if (allEvents.length > 0) {
      // Filter events for the current week
      const eventsInWeek = allEvents.filter((event) => {
        const eventDate = event.dueDate?.toDate() || new Date();
        const start = weekStart;
        const end = addDays(start, 6);
        return isWithinInterval(eventDate, { start, end });
      });

      // Update which days have events
      updateWeekDaysWithEvents(eventsInWeek);
    }
  }, [weekStart, allEvents, updateWeekDaysWithEvents]);

  useEffect(() => {
    const fetchTotalFines = async () => {
      setFinesLoading(true);
      try {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) return;
        // Get all users (students)
        const usersSnapshot = await getDocs(
          collection(db, "organizations", orgId, "users")
        );
        const userIds = usersSnapshot.docs.map((doc) => doc.id);
        // Get all fines
        const finesSnapshot = await getDocs(
          collection(db, "organizations", orgId, "fines")
        );
        let total = 0;
        finesSnapshot.forEach((doc) => {
          const data = doc.data();
          // Only count fines for users (students), not admins, and only unpaid
          if (userIds.includes(data.userId) && data.status !== "paid") {
            total += data.amount;
          }
        });
        setTotalStudentFines(total);
      } catch (e) {
        setTotalStudentFines(0);
      }
      setFinesLoading(false);
    };
    fetchTotalFines();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const usersCollection = collection(db, "organizations", orgId, "users");
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllUsers(usersList);
    } catch (error) {
      console.error("Error fetching all users:", error);
    }
  };

  const fetchRecentActivities = useCallback(async () => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const activitiesRef = collection(db, "activities");
      const q = query(activitiesRef, orderBy("timestamp", "desc"), limit(50));
      const snapshot = await getDocs(q);

      const activities = (
        await Promise.all(
          snapshot.docs.map(async (docSnapshot) => {
            const activityData = docSnapshot.data();
            const details = activityData.details || {};
            // Only include activities for this org
            if (details.orgId && details.orgId !== orgId) return null;
            if (!details.orgId && activityData.type !== "settings_updated")
              return null;
            // ... existing user/event/admin lookup logic ...
            const activity = {
              id: docSnapshot.id,
              type: activityData.type,
              timestamp: activityData.timestamp?.toDate(),
              details: details,
            };
            // ... existing user/event/admin lookup logic ...
            return activity;
          })
        )
      ).filter(Boolean);
      setRecentActivities(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch activities",
        position: "bottom",
      });
    }
  }, [allUsers]);

  useEffect(() => {
    // Only call fetchRecentActivities if allUsers has data
    if (allUsers.length > 0) {
      fetchRecentActivities();
    }
  }, [allUsers, fetchRecentActivities]);

  const formatTimeAgo = (timestamp) => {
    if (
      !timestamp ||
      !(timestamp instanceof Date) ||
      isNaN(timestamp.getTime())
    )
      return "";
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const formatActivityDescription = (activity) => {
    if (!activity || !activity.details) {
      return "Activity details not available";
    }
    const details = activity.details;
    const adminLabel = orgName ? `${orgName} Admin` : "Admin";
    switch (activity.type) {
      case "student_added":
        return `New ${details.studentRole || "student"} ${
          details.studentName || "Unknown"
        } added by ${
          details.issuedBy && details.issuedBy !== "System"
            ? details.issuedBy
            : adminLabel
        } (${details.adminRole || adminLabel})`;
      case "fine_added":
        return `Fine of ₱${details.amount || "0"} added to ${
          details.studentName || "Unknown"
        } for ${details.eventTitle || "Unknown Event"} by ${
          details.issuedBy && details.issuedBy !== "System"
            ? details.issuedBy
            : adminLabel
        } (${details.adminRole || adminLabel})`;
      case "fine_paid": {
        const paidDate = details.paidAt?.toDate();
        const studentName = details.studentName || "Unknown";
        const eventTitle = details.eventTitle || "Unknown Event";
        const displayDate =
          paidDate && !isNaN(paidDate.getTime())
            ? format(paidDate, "MMM d, yyyy")
            : "Unknown Date";
        return `Fine of ₱${
          details.amount || "0"
        } paid by ${studentName} for ${eventTitle} on ${displayDate}`;
      }
      case "role_changed":
        return `Role changed for ${details.studentName || "Unknown"} from ${
          details.oldRole || "Unknown"
        } to ${details.newRole || "Unknown"} by ${
          details.issuedBy && details.issuedBy !== "System"
            ? details.issuedBy
            : adminLabel
        } (${details.adminRole || adminLabel})`;
      case "event_added":
        return `New event "${details.eventTitle || "Untitled Event"}" (${
          details.eventTimeframe || "No timeframe"
        }) created by ${
          details.issuedBy && details.issuedBy !== "System"
            ? details.issuedBy
            : adminLabel
        } (${details.adminRole || adminLabel})`;
      case "settings_updated":
        return `Settings updated by ${
          details.issuedBy && details.issuedBy !== "System"
            ? details.issuedBy
            : adminLabel
        } (${details.adminRole || adminLabel})`;
      default:
        return activity.description || "No description available";
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "student_added":
        return "person-add-outline";
      case "fine_added":
        return "cash-outline";
      case "fine_paid":
        return "checkmark-circle-outline";
      case "event_added":
        return "calendar-outline";
      case "role_changed":
        return "swap-horizontal-outline";
      case "settings_updated":
        return "settings-outline";
      default:
        return "information-circle-outline";
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "student_added":
        return "#0A2463";
      case "fine_added":
        return "#D92626";
      case "fine_paid":
        return "#16a34a";
      case "event_added":
        return "#2E7D32";
      case "role_changed":
        return "#6D28D9";
      case "settings_updated":
        return "#64748B";
      default:
        return "#64748B";
    }
  };

  const SettingsModal = () => (
    <Modal
      visible={showSettingsModal}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={() => setShowSettingsModal(false)}
    >
      <View style={styles.modalContainer}>
        <SafeAreaView
          style={styles.fullScreenModalContent}
          edges={["top", "bottom"]}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Admin Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingHorizontal: 0 }}
            >
              <View style={styles.settingsGroup}>
                <Text style={styles.settingsGroupTitle}>Notifications</Text>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>
                      Enable Notifications
                    </Text>
                    <Text style={styles.settingDescription}>
                      Receive alerts for new activities
                    </Text>
                  </View>
                  <Switch
                    value={settings.notifications}
                    onValueChange={(value) =>
                      setSettings({ ...settings, notifications: value })
                    }
                  />
                </View>
              </View>

              <View style={styles.settingsGroup}>
                <Text style={styles.settingsGroupTitle}>Reports</Text>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>
                      Auto-generate Reports
                    </Text>
                    <Text style={styles.settingDescription}>
                      Generate weekly reports automatically
                    </Text>
                  </View>
                  <Switch
                    value={settings.autoGenerateReports}
                    onValueChange={(value) =>
                      setSettings({ ...settings, autoGenerateReports: value })
                    }
                  />
                </View>
              </View>

              <View style={styles.settingsGroup}>
                <Text style={styles.settingsGroupTitle}>Fine Management</Text>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Fine Reminder Days</Text>
                    <Text style={styles.settingDescription}>
                      Days before sending fine reminders
                    </Text>
                  </View>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={settings.fineReminderDays.toString()}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          fineReminderDays: parseInt(value),
                        })
                      }
                      style={styles.picker}
                      mode="dropdown"
                    >
                      {[3, 5, 7, 10, 14].map((days) => (
                        <Picker.Item
                          key={days}
                          label={`${days} days`}
                          value={days.toString()}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={() => {
                  // Save settings to Firestore
                  setShowSettingsModal(false);
                }}
              >
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );

  const RecentActivitySection = () => (
    <View style={styles.recentActivityContainer}>
      <Text style={styles.sectionTitle}>Latest Updates</Text>
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <Icon name="time-outline" size={20} color="#64748B" />
          <Text style={styles.activityTitle}>Recent Activities</Text>
        </View>
        <View style={styles.activityList}>
          {(Array.isArray(recentActivities) ? recentActivities : []).slice(0, 3).map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View
                style={[
                  styles.activityIcon,
                  { backgroundColor: `${getActivityColor(activity.type)}20` },
                ]}
              >
                <Icon
                  name={getActivityIcon(activity.type)}
                  size={16}
                  color={getActivityColor(activity.type)}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  {formatActivityDescription(activity)}
                </Text>
                <Text style={styles.activityTime}>
                  {formatTimeAgo(activity.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const ActivityHistorySection = () => (
    <View style={styles.recentActivityContainer}>
      <Text style={styles.sectionTitle}>Activity History</Text>
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <Icon name="list-outline" size={20} color="#64748B" />
          <Text style={styles.activityTitle}>Detailed Logs</Text>
        </View>
        <View style={styles.activityList}>
          {recentActivities.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View
                style={[
                  styles.activityIcon,
                  { backgroundColor: `${getActivityColor(activity.type)}20` },
                ]}
              >
                <Icon
                  name={getActivityIcon(activity.type)}
                  size={16}
                  color={getActivityColor(activity.type)}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  {formatActivityDescription(activity)}
                </Text>
                <Text style={styles.activityTime}>
                  {format(activity.timestamp, "MMM d, yyyy 'at' h:mm a")}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const QuickActionCard = React.memo(
    ({ title, description, icon, onPress, color, disabled }) => (
      <TouchableOpacity
        style={[
          styles.quickActionCard,
          { backgroundColor: color, opacity: disabled ? 0.5 : 1 },
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <View style={styles.quickActionContent}>
          <View style={styles.quickActionIconContainer}>
            <Icon name={icon} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.quickActionTextContainer}>
            <Text style={styles.quickActionTitle}>{title}</Text>
            <Text style={styles.quickActionDescription}>{description}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  );

  const handleAddUserSuccess = useCallback(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (userData && (userData.username || userData.fullName)) {
      setUsername(userData.username || userData.fullName);
    } else {
      (async () => {
        const name = await AsyncStorage.getItem("selectedOrgName");
        setOrgName(name || "");
        setUsername(name ? name + " Admin" : "Admin");
      })();
    }
  }, [userData]);

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Icon
                  name="shield-checkmark-outline"
                  size={24}
                  color="#FFD700"
                />
              </View>
              <View>
                <Text style={[styles.headerText, styles.headerGreeting]}>
                  {getGreeting()}
                </Text>
                <Text style={[styles.headerText, styles.headerUsername]}>
                  {typeof username === "string" && username
                    ? username.split(" ")[0]
                    : "User"}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => setShowSettingsModal(true)}
              >
                <Icon name="settings-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => setShowNotifications(true)}
              >
                <Icon name="notifications-outline" size={20} color="#FFFFFF" />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <View style={styles.statsIcon}>
                <Icon name="wallet-outline" size={24} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.statsTitle}>Total Student Fines</Text>
                <Text style={styles.statsValue}>
                  ₱
                  {typeof totalStudentFines === "number"
                    ? totalStudentFines.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })
                    : "0.00"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <View style={styles.quickActionCard}>
              <TouchableOpacity
                style={styles.quickActionInner}
                onPress={() => setShowAddUserModal(true)}
                disabled={isAddingUser}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#0A2463" },
                  ]}
                >
                  <Icon name="person-add-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.quickActionTitle}>Add Student</Text>
                <Text style={styles.quickActionDescription}>
                  Register new student account
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickActionCard}>
              <TouchableOpacity
                style={styles.quickActionInner}
                onPress={() =>
                  navigation.navigate("ActivityHistory", {
                    activities: recentActivities,
                  })
                }
                disabled={isAddingUser}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#2E7D32" },
                  ]}
                >
                  <Icon name="time-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.quickActionTitle}>Activity History</Text>
                <Text style={styles.quickActionDescription}>
                  View recent system activities
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickActionCard}>
              <TouchableOpacity
                style={styles.quickActionInner}
                onPress={() => navigation.navigate("Reports")}
                disabled={isAddingUser}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#2E7D32" },
                  ]}
                >
                  <Icon name="bar-chart-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.quickActionTitle}>View Reports</Text>
                <Text style={styles.quickActionDescription}>
                  Generate and view reports
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickActionCard}>
              <TouchableOpacity
                style={styles.quickActionInner}
                onPress={() => navigation.navigate("StudentOverview")}
                disabled={isAddingUser}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#6D28D9" },
                  ]}
                >
                  <Icon name="people-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.quickActionTitle}>Student Overview</Text>
                <Text style={styles.quickActionDescription}>
                  View student statistics
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.recentActivityContainer}>
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityTitle}>Recent Activities</Text>
              <TouchableOpacity
                style={styles.seeHistoryButton}
                onPress={() =>
                  navigation.navigate("ActivityHistory", {
                    activities: recentActivities,
                  })
                }
              >
                <Text style={styles.seeHistoryText}>See History</Text>
                <Icon name="chevron-forward" size={16} color="#0A2463" />
              </TouchableOpacity>
            </View>
            <View style={styles.activityList}>
              {recentActivities.slice(0, 3).map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View
                    style={[
                      styles.activityIcon,
                      {
                        backgroundColor: `${getActivityColor(activity.type)}20`,
                      },
                    ]}
                  >
                    <Icon
                      name={getActivityIcon(activity.type)}
                      size={16}
                      color={getActivityColor(activity.type)}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>
                      {formatActivityDescription(activity)}
                    </Text>
                    <Text style={styles.activityTime}>
                      {formatTimeAgo(activity.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <AddUserModal
        visible={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSuccess={handleAddUserSuccess}
        isAddingUser={isAddingUser}
        setIsAddingUser={setIsAddingUser}
        orgName={orgName}
      />
      <SettingsModal />
      <NotificationCenter />
    </View>
  );
};

export default AdminHome;
