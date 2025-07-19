import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  RefreshControl,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { db } from "../../../../config/firebaseconfig";
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_COLOR = "#0A2463";
const THEME_SECONDARY = "#3E92CC";
const SPACING = 16;

const AdminPeople = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const usersQuery = query(
        collection(db, "organizations", orgId, "users"),
        orderBy("username")
      );
      const querySnapshot = await getDocs(usersQuery);
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch users",
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter((user) => {
        const username = (user.username || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const role = (user.role || "").toLowerCase();
        const searchLower = searchQuery.toLowerCase();

        return (
          username.includes(searchLower) ||
          email.includes(searchLower) ||
          role.includes(searchLower)
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const getGroupedUsers = () => {
    const officers = filteredUsers.filter(
      (user) => user.role && user.role !== "student"
    );
    const students = filteredUsers.filter(
      (user) => !user.role || user.role === "student"
    );
    return { officers, students };
  };

  const renderSectionHeader = (title, count) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCount}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
  );

  const handleDeleteUser = async (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      await deleteDoc(
        doc(db, "organizations", orgId, "users", selectedUser.id)
      );
      Toast.show({
        type: "success",
        text1: "User Deleted",
        text2: "User has been deleted successfully",
        position: "bottom",
      });
      setShowDeleteModal(false);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to delete user",
        position: "bottom",
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleUserPress = (user) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const RoleAssignmentModal = ({ visible, onClose, user }) => {
    const [selectedRole, setSelectedRole] = useState(user?.role || "student");
    const [selectedYear, setSelectedYear] = useState(
      user?.yearLevel?.toString() || "1"
    );
    const [loading, setLoading] = useState(false);

    const roleDetails = {
      student: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      governor: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      vice_governor: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      secretary: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      assistant_secretary: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      treasurer: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      assistant_treasurer: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      auditor: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      business_manager: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      food_committee_chairperson: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      public_information_officer: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      gentleman_officer: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      lady_officer: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      first_year_mayor: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      second_year_mayor: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      third_year_mayor: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
      fourth_year_mayor: {
        color: "#F8FAFC",
        borderColor: "#E2E8F0",
        selectedColor: "#0A2463",
      },
    };

    const handleUpdateRole = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) return;
        const userRef = doc(db, "organizations", orgId, "users", user.id);
        await updateDoc(userRef, {
          role: selectedRole,
          yearLevel: parseInt(selectedYear),
          updatedAt: serverTimestamp(),
        });

        Toast.show({
          type: "success",
          text1: "Profile Updated",
          text2: "User profile has been updated successfully",
          position: "bottom",
        });

        onClose();
        fetchUsers();
      } catch (error) {
        console.error("Error updating user:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message,
          position: "bottom",
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={24}
                  color={THEME_COLOR}
                />
                <Text style={styles.modalTitle}>Update User Profile</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalBody}>
                <View style={styles.userInfoContainer}>
                  <Image
                    source={
                      user?.avatarUrl
                        ? { uri: user.avatarUrl }
                        : require("../../../../assets/aito.png")
                    }
                    style={styles.userAvatar}
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user?.username}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Current Year Level</Text>
                  <View style={styles.currentRoleContainer}>
                    <Text style={styles.currentRole}>
                      Year {user?.yearLevel || "Not Set"}
                    </Text>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Select Year Level</Text>
                  <View style={styles.yearLevelContainer}>
                    {[1, 2, 3, 4].map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.yearLevelButton,
                          selectedYear === year.toString() &&
                            styles.selectedYearLevelButton,
                        ]}
                        onPress={() => setSelectedYear(year.toString())}
                      >
                        <Text
                          style={[
                            styles.yearLevelButtonText,
                            selectedYear === year.toString() &&
                              styles.selectedYearLevelButtonText,
                          ]}
                        >
                          Year {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Current Role</Text>
                  <View
                    style={[
                      styles.currentRoleContainer,
                      {
                        backgroundColor:
                          roleDetails[user?.role || "student"].color,
                      },
                    ]}
                  >
                    <Text style={styles.currentRole}>
                      {user?.role
                        ? user.role
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ")
                        : "Student"}
                    </Text>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.roleHeaderContainer}>
                    <Text style={styles.label}>Select New Role</Text>
                    <View style={styles.slideNotice}>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#64748B"
                      />
                      <Text style={styles.slideNoticeText}>
                        Slide to see more
                      </Text>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.roleScrollView}
                    contentContainerStyle={styles.roleScrollContent}
                  >
                    <View style={styles.roleOptionsContainer}>
                      {Object.entries(roleDetails).map(([role, details]) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleCard,
                            selectedRole === role && styles.selectedRoleCard,
                            {
                              backgroundColor:
                                selectedRole === role
                                  ? details.selectedColor
                                  : details.color,
                              borderColor:
                                selectedRole === role
                                  ? details.selectedColor
                                  : details.borderColor,
                            },
                          ]}
                          onPress={() => setSelectedRole(role)}
                        >
                          <Text
                            style={[
                              styles.roleCardTitle,
                              selectedRole === role &&
                                styles.selectedRoleCardTitle,
                            ]}
                          >
                            {role
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
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
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  selectedRole === user?.role &&
                    selectedYear === user?.yearLevel?.toString() &&
                    styles.disabledButton,
                ]}
                onPress={handleUpdateRole}
                disabled={
                  loading ||
                  (selectedRole === user?.role &&
                    selectedYear === user?.yearLevel?.toString())
                }
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Update Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const DeleteConfirmationModal = ({ visible, onClose, user }) => {
    if (!user) return null;

    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={32} color="#EF4444" />
              <Text style={styles.deleteModalTitle}>Delete User</Text>
            </View>

            <View style={styles.deleteModalBody}>
              <Text style={styles.deleteModalText}>
                Are you sure you want to delete this user?
              </Text>
              <View style={styles.deleteUserInfo}>
                <Image
                  source={
                    user.avatarUrl
                      ? { uri: user.avatarUrl }
                      : require("../../../../assets/aito.png")
                  }
                  style={styles.deleteUserAvatar}
                />
                <View style={styles.deleteUserDetails}>
                  <Text style={styles.deleteUserName}>{user.username}</Text>
                  <Text style={styles.deleteUserEmail}>{user.email}</Text>
                  {user.role && (
                    <View
                      style={[
                        styles.badge,
                        user.role === "student"
                          ? styles.studentBadge
                          : styles.officerBadge,
                      ]}
                    >
                      <Text style={styles.badgeText}>{user.role}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.deleteModalFooter}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelDeleteButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelDeleteButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderUserCard = (item) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.userCardContent}>
        <Image
          source={
            item.avatarUrl
              ? { uri: item.avatarUrl }
              : require("../../../../assets/aito.png")
          }
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.username}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userDetails}>
            {item.role && (
              <View
                style={[
                  styles.badge,
                  item.role === "student"
                    ? styles.studentBadge
                    : styles.officerBadge,
                ]}
              >
                <Text style={styles.badgeText}>{item.role}</Text>
              </View>
            )}
            <Text style={styles.yearLevel}>Year {item.yearLevel}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteUser(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading people...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.stickyHeader}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#64748B"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={() => {
          const { officers, students } = getGroupedUsers();
          return (
            <View style={{ paddingBottom:10 }}>
              {officers.length > 0 && (
                <View style={styles.sectionContainer}>
                  {renderSectionHeader("Officers", officers.length)}
                  <View style={styles.sectionDivider} />
                  {officers.map((item, idx) => (
                    <View key={item.id}>{renderUserCard(item)}</View>
                  ))}
                </View>
              )}
              {students.length > 0 && (
                <View style={styles.sectionContainer}>
                  {renderSectionHeader("Students", students.length)}
                  <View style={styles.sectionDivider} />
                  {students.map((item, idx) => (
                    <View key={item.id}>{renderUserCard(item)}</View>
                  ))}
                </View>
              )}
            </View>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[THEME_COLOR]}
            tintColor={THEME_COLOR}
          />
        }
        contentContainerStyle={{ paddingBottom: 60, paddingTop: 8 }}
        ListFooterComponent={() => (
          <View style={styles.fadeBottom} pointerEvents="none" />
        )}
      />

      <RoleAssignmentModal
        visible={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        user={selectedUser}
      />

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        user={selectedUser}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC", // Use neutral background matching the app
  },
  stickyHeader: {
    backgroundColor: '#F8FAFC',
    zIndex: 10,
    paddingTop: 8,
    paddingBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: SPACING,
    marginBottom: 8,
    paddingHorizontal: SPACING,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: "#1E293B",
  },
  clearButton: {
    padding: 4,
  },
  sectionContainer: {
    marginBottom: SPACING,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME_COLOR,
    letterSpacing: 0.2,
  },
  sectionCount: {
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  userCard: {
    marginHorizontal: SPACING,
    marginVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  userCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 6,
  },
  userDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  studentBadge: {
    backgroundColor: "#F1F5F9",
  },
  officerBadge: {
    backgroundColor: "#DBEAFE",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    textTransform: "capitalize",
  },
  yearLevel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
    marginTop: SPACING,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modalContent: {
    width: "90%",
    height: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  modalHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeButton: {
    padding: 4,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  modalBody: {
    padding: SPACING,
    paddingBottom: SPACING / 2,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: SPACING,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  formGroup: {
    marginBottom: SPACING,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  currentRoleContainer: {
    padding: SPACING,
    borderRadius: 12,
    marginBottom: SPACING,
  },
  currentRole: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  roleHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  slideNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  slideNoticeText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 4,
  },
  roleScrollView: {
    height: 100,
    marginBottom: 16,
  },
  roleScrollContent: {
    paddingRight: 16,
  },
  roleOptionsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
  },
  roleCard: {
    width: 140,
    height: 60,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  roleCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    lineHeight: 18,
  },
  selectedRoleCard: {
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  selectedRoleCardTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginLeft: SPACING,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cancelButton: {
    backgroundColor: "#F1F5F9",
  },
  submitButton: {
    backgroundColor: THEME_COLOR,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING,
    padding: SPACING,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    padding: 4,
  },
  deleteModalContent: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  deleteModalHeader: {
    alignItems: "center",
    padding: SPACING,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FEF2F2",
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EF4444",
    marginTop: 8,
  },
  deleteModalBody: {
    padding: SPACING,
  },
  deleteModalText: {
    fontSize: 16,
    color: "#1E293B",
    textAlign: "center",
    marginBottom: SPACING,
  },
  deleteUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: SPACING,
    borderRadius: 12,
  },
  deleteUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  deleteUserDetails: {
    flex: 1,
  },
  deleteUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  deleteUserEmail: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },
  deleteModalFooter: {
    flexDirection: "row",
    padding: SPACING,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: SPACING,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelDeleteButton: {
    backgroundColor: "#F1F5F9",
  },
  confirmDeleteButton: {
    backgroundColor: "#EF4444",
  },
  cancelDeleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  yearLevelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  yearLevelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  selectedYearLevelButton: {
    backgroundColor: THEME_COLOR,
    borderColor: THEME_COLOR,
  },
  yearLevelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  selectedYearLevelButtonText: {
    color: "#FFFFFF",
  },
  modalScrollView: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
    marginBottom: 8,
    opacity: 0.5,
  },
  fadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    zIndex: 20,
    backgroundColor: 'transparent',
    // Fade effect using a gradient
    // If using expo-linear-gradient, replace with a LinearGradient component
    // Otherwise, fallback to a semi-transparent overlay
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    opacity: 0.7,
  },
});

export default AdminPeople;
