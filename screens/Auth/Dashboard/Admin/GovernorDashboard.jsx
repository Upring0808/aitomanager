import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, TextInput } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect, CommonActions } from "@react-navigation/native";
import { useOfficer } from "../../../../context/OfficerContext";

// Import your admin screens
import AdminHome from "./AdminHome";
import AdminEvents from "./AdminEvents";
import AdminFines from "./AdminFines";
import AdminPeople from "./AdminPeople";

const TABS = [
  { key: "home", label: "Home", icon: "home-outline", component: AdminHome },
  { key: "events", label: "Events", icon: "calendar-outline", component: AdminEvents },
  { key: "fines", label: "Fines", icon: "cash-outline", component: AdminFines },
  { key: "people", label: "People", icon: "people-outline", component: AdminPeople },
  { key: "profile", label: "Profile", icon: "person-outline", component: null },
];

const GovernorDashboard = (props) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { signOutOfficer, changeOfficerCredential, officerLoading } = useOfficer();
  const [activeTab, setActiveTab] = useState("home");
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showChangeCredential, setShowChangeCredential] = useState(false);
  const [oldCredential, setOldCredential] = useState("");
  const [newCredential, setNewCredential] = useState("");
  const [credError, setCredError] = useState("");
  const [credSuccess, setCredSuccess] = useState("");
  const [userData, setUserData] = useState(props.userData || null);
  const [showOfficerNote, setShowOfficerNote] = useState(false);

  // On mount, set userData from route.params if present
  useEffect(() => {
    if (route.params && route.params.userData) {
      setUserData(route.params.userData);
    }
  }, [route.params]);

  // Show officer note modal every time the dashboard is focused
  useFocusEffect(
    React.useCallback(() => {
      setShowOfficerNote(true);
    }, [userData?.role])
  );

  const handleSwitch = () => {
    setShowSwitchModal(false);
    signOutOfficer();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Dashboard" }],
      })
    );
  };

  const handleChangeCredential = async () => {
    setCredError("");
    setCredSuccess("");
    if (!oldCredential || !newCredential || newCredential.length < 4) {
      setCredError("Please enter valid credentials (min 4 chars).");
      return;
    }
    const result = await changeOfficerCredential(userData.role, oldCredential, newCredential);
    if (result.success) {
      setCredSuccess("Credential updated successfully.");
      setOldCredential("");
      setNewCredential("");
      setShowChangeCredential(false);
    } else {
      setCredError(result.error || "Failed to update credential.");
    }
  };

  const renderProfile = () => (
    <View style={styles.profileContainer}>
      <Text style={styles.profileTitle}>Student Info</Text>
      <Text style={styles.profileLabel}>Name:</Text>
      <Text style={styles.profileValue}>{userData?.username || "-"}</Text>
      <Text style={styles.profileLabel}>Email:</Text>
      <Text style={styles.profileValue}>{userData?.email || "-"}</Text>
      <Text style={styles.profileLabel}>Year Level:</Text>
      <Text style={styles.profileValue}>{userData?.yearLevel || "-"}</Text>
      <Text style={styles.profileLabel}>Student ID:</Text>
      <Text style={styles.profileValue}>{userData?.studentId || "-"}</Text>
      <TouchableOpacity
        style={styles.credButton}
        onPress={() => setShowChangeCredential(true)}
      >
        <Feather name="key" size={18} color="#fff" />
        <Text style={styles.credButtonText}>Change Officer Credential</Text>
      </TouchableOpacity>
      {credSuccess ? <Text style={{ color: "green" }}>{credSuccess}</Text> : null}
      {/* Change Credential Modal */}
      <Modal visible={showChangeCredential} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Officer Credential</Text>
            <Text style={styles.inputLabel}>Old Credential</Text>
            <TextInput
              value={oldCredential}
              onChangeText={setOldCredential}
              placeholder="Enter old password/PIN"
              secureTextEntry
              style={styles.input}
            />
            <Text style={styles.inputLabel}>New Credential</Text>
            <TextInput
              value={newCredential}
              onChangeText={setNewCredential}
              placeholder="Enter new password/PIN"
              secureTextEntry
              style={styles.input}
            />
            {credError ? <Text style={{ color: "red" }}>{credError}</Text> : null}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowChangeCredential(false)} style={styles.cancelBtn}>
                <Text style={{ color: "#203562" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChangeCredential} style={styles.saveBtn} disabled={officerLoading}>
                <Text style={{ color: "#fff" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const ActiveComponent = TABS.find(tab => tab.key === activeTab)?.component;

  return (
    <View style={styles.container}>
      {/* Officer Mode Note Modal */}
      <Modal visible={showOfficerNote} transparent animationType="fade" statusBarTranslucent={true}>
        <View style={styles.fullScreenOverlay} pointerEvents="auto">
          <View style={styles.noteModalContent}>
            {/* Visual Icon */}
            <View style={styles.noteModalIconContainer}>
              <Ionicons name="shield-checkmark" size={36} color="#203562" />
            </View>
            <Text style={styles.noteModalTitle}>Officer Mode</Text>
            <Text style={styles.noteModalText}>
              You are logged in as <Text style={{ fontWeight: 'bold' }}>{userData?.role ? userData.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Officer'}</Text>.
            </Text>
            <Text style={styles.noteModalText}>
              You are authorized to access officer features. Please use this mode responsibly.
            </Text>
            <TouchableOpacity style={styles.noteModalButton} onPress={() => setShowOfficerNote(false)}>
              <Text style={styles.noteModalButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Header with switch icon */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Logged as {userData?.role ? userData.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Officer'}
        </Text>
        <TouchableOpacity onPress={() => setShowSwitchModal(true)}>
          <Ionicons name="swap-horizontal" size={28} color="#203562" />
        </TouchableOpacity>
      </View>
      {/* Tab navigation */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.activeTabBtn]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={22} color={activeTab === tab.key ? "#fff" : "#203562"} />
            <Text style={[styles.tabLabel, activeTab === tab.key && { color: "#fff" }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Main content */}
      <View style={styles.content}>
        {activeTab === "profile"
          ? renderProfile()
          : ActiveComponent
            ? activeTab === "home"
              ? <ActiveComponent navigation={navigation} route={{ params: {} }} userData={userData} />
              : <ActiveComponent navigation={navigation} route={{ params: {} }} />
            : null}
      </View>
      {/* Switch confirmation modal */}
      <Modal visible={showSwitchModal} transparent animationType="fade" statusBarTranslucent={true}>
        <View style={styles.fullScreenOverlay} pointerEvents="auto">
          <View style={styles.noteModalContent}>
            {/* Visual Icon */}
            <View style={styles.noteModalIconContainer}>
              <Ionicons name="swap-horizontal" size={36} color="#203562" />
            </View>
            <Text style={styles.noteModalTitle}>Switch to Student Mode?</Text>
            <Text style={[styles.noteModalText, { textAlign: 'center', marginBottom: 18 }]}>You will return to your student dashboard.</Text>
            <View style={styles.switchModalButtonRow}>
              <TouchableOpacity onPress={() => setShowSwitchModal(false)} style={[styles.noteModalButton, { backgroundColor: '#e0e0e0' }] }>
                <Text style={[styles.noteModalButtonText, { color: '#203562' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSwitch} style={styles.noteModalButton}>
                <Text style={styles.noteModalButtonText}>Switch</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#fff", elevation: 2 , paddingTop:40},
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#203562" },
  tabBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#fff", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tabBtn: { alignItems: "center", padding: 8, borderRadius: 8 },
  activeTabBtn: { backgroundColor: "#203562" },
  tabLabel: { fontSize: 12, color: "#203562", marginTop: 2 },
  content: { flex: 1, backgroundColor: "#f8fafc" },
  profileContainer: { padding: 24 },
  profileTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#203562" },
  profileLabel: { fontWeight: "bold", marginTop: 8 },
  profileValue: { marginBottom: 4 },
  credButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#203562", padding: 10, borderRadius: 6, marginTop: 16 },
  credButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", padding: 24, borderRadius: 12, width: 300 },
  modalTitle: { fontWeight: "bold", fontSize: 18, marginBottom: 12 },
  inputLabel: { fontWeight: "bold", marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, marginBottom: 12 },
  cancelBtn: { padding: 10 },
  saveBtn: { backgroundColor: "#203562", padding: 10, borderRadius: 6 },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  noteModalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    maxWidth: 280,
    width: '90%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  noteModalIconContainer: {
    marginBottom: 10,
    backgroundColor: '#e6eaf3',
    borderRadius: 24,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#203562',
    textAlign: 'center',
    width: '100%',
  },
  noteModalText: {
    fontSize: 16,
    color: '#203562',
    textAlign: 'center',
    marginBottom: 10,
  },
  noteModalButton: {
    marginTop: 18,
    backgroundColor: '#203562',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  noteModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchModalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    marginTop: 6,
    gap: 10,
  },
});

export default GovernorDashboard; 