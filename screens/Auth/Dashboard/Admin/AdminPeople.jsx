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
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { db, auth } from "../../../../config/firebaseconfig";
import {
  collection,
  query,
  getDocs,
  orderBy,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";

const THEME_COLOR = "#0A2463";
const THEME_SECONDARY = "#3E92CC";
const SPACING = 16;

const AdminPeople = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersQuery = query(collection(db, "users"), orderBy("username"));
      const querySnapshot = await getDocs(usersQuery);
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsers(usersData);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleUserPress = (user) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const AddUserModal = ({ visible, onClose }) => {
    const [formData, setFormData] = useState({
      username: "",
      email: "",
      password: "",
      yearLevel: "1",
      role: "student",
    });
    const [loading, setLoading] = useState(false);

    const handleCreateUser = async () => {
      if (!formData.username || !formData.email || !formData.password) {
        Toast.show({
          type: "error",
          text1: "Missing Information",
          text2: "Please fill in all required fields",
          position: "bottom",
        });
        return;
      }

      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        await addDoc(collection(db, "users"), {
          uid: userCredential.user.uid,
          username: formData.username,
          email: formData.email,
          yearLevel: formData.yearLevel,
          role: formData.role,
          createdAt: serverTimestamp(),
        });

        Toast.show({
          type: "success",
          text1: "User Created",
          text2: "New user has been added successfully",
          position: "bottom",
        });

        onClose();
        fetchUsers();
      } catch (error) {
        console.error("Error creating user:", error);
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
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New User</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(text) =>
                    setFormData({ ...formData, username: text })
                  }
                  placeholder="Enter username"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) =>
                    setFormData({ ...formData, password: text })
                  }
                  placeholder="Enter password"
                  secureTextEntry
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Year Level</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.yearLevel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, yearLevel: value })
                    }
                    style={styles.picker}
                  >
                    {[1, 2, 3, 4, 5].map((year) => (
                      <Picker.Item
                        key={year}
                        label={`Year ${year}`}
                        value={year.toString()}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Role</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Student" value="student" />
                    <Picker.Item label="Treasurer" value="treasurer" />
                    <Picker.Item label="Secretary" value="secretary" />
                  </Picker>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleCreateUser}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Create User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const RoleAssignmentModal = ({ visible, onClose, user }) => {
    const [selectedRole, setSelectedRole] = useState(user?.role || "student");
    const [loading, setLoading] = useState(false);

    const handleUpdateRole = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, {
          role: selectedRole,
          updatedAt: serverTimestamp(),
        });

        Toast.show({
          type: "success",
          text1: "Role Updated",
          text2: "User role has been updated successfully",
          position: "bottom",
        });

        onClose();
        fetchUsers();
      } catch (error) {
        console.error("Error updating role:", error);
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
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update User Role</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

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
                <Text style={styles.label}>Current Role</Text>
                <View style={styles.currentRoleContainer}>
                  <Text style={styles.currentRole}>
                    {user?.role || "Student"}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>New Role</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedRole}
                    onValueChange={(value) => setSelectedRole(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Student" value="student" />
                    <Picker.Item label="Treasurer" value="treasurer" />
                    <Picker.Item label="Secretary" value="secretary" />
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleUpdateRole}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Update Role</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddUserModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userCard}
            onPress={() => handleUserPress(item)}
          >
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
                <Text style={styles.yearLevel}>Year {item.yearLevel}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CBD5E1" />
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[THEME_COLOR]}
            tintColor={THEME_COLOR}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptySubtitle}>
              Add new users to get started
            </Text>
          </View>
        }
      />

      <AddUserModal
        visible={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
      />

      <RoleAssignmentModal
        visible={showRoleModal}
        onClose={() => setShowRoleModal(false)}
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  addButton: {
    backgroundColor: THEME_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING,
    backgroundColor: "#FFFFFF",
    marginHorizontal: SPACING,
    marginVertical: SPACING / 2,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  userEmail: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  studentBadge: {
    backgroundColor: "#E2E8F0",
  },
  officerBadge: {
    backgroundColor: "#DBEAFE",
  },
  badgeText: {
    fontSize: 12,
    color: "#475569",
    textTransform: "capitalize",
  },
  yearLevel: {
    fontSize: 12,
    color: "#64748B",
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME_COLOR,
  },
  modalBody: {
    padding: SPACING,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: SPACING,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
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
  input: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  pickerContainer: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: "#1E293B",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginLeft: SPACING,
  },
  cancelButton: {
    backgroundColor: "#E2E8F0",
  },
  submitButton: {
    backgroundColor: THEME_COLOR,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING,
  },
  currentRoleContainer: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 8,
  },
  currentRole: {
    fontSize: 16,
    color: "#1E293B",
    textTransform: "capitalize",
  },
});

export default AdminPeople;
