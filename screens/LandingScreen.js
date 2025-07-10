import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Search,
  Building,
  BookOpen,
  Users,
  GraduationCap,
  ChevronRight,
  Shield,
  HelpCircle,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import orgPlaceholder from "../assets/aitoIcon.png";
import aitoIcon from "../assets/aitoIcon.png";
import aitoLogo from "../assets/fivent1.png";

// Firebase imports
import { getDb } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";

const { width, height } = Dimensions.get("window");

const NAVY = "#203562";
const NAVY_DARK = "#16325B";
const WHITE = "#fff";

const LandingScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [pendingOrg, setPendingOrg] = useState(null);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Secret access: tap counter for long-press or multi-tap
  const secretTapCount = useRef(0);
  const secretTimeout = useRef(null);

  // Real-time listeners cleanup ref
  const orgInfoUnsubsRef = useRef({});

  // Sample organization data for fallback
  const sampleOrganizations = [
    {
      id: "BSIT_Dept",
      name: "BSIT Department",
      logo_url: null,
      icon: "BookOpen",
    },
    {
      id: "Nursing_Dept",
      name: "Nursing Department",
      logo_url: null,
      icon: "Users",
    },
    {
      id: "Student_Council",
      name: "Student Council",
      logo_url: null,
      icon: "GraduationCap",
    },
    {
      id: "Admin_Office",
      name: "Admin Office",
      logo_url: null,
      icon: "Building",
    },
  ];

  // Get icon component by name
  const getIconComponent = (iconName) => {
    const icons = {
      BookOpen: BookOpen,
      Users: Users,
      GraduationCap: GraduationCap,
      Building: Building,
      Shield: Shield,
    };
    return icons[iconName] || Building;
  };

  // Real-time fetch organizations and their info
  useEffect(() => {
    setLoading(true);
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    const organizationsRef = collection(db, "organizations");
    // Listen for real-time updates to organizations
    const orgsUnsub = onSnapshot(organizationsRef, (querySnapshot) => {
      const orgsData = [];
      const newUnsubs = {};
      // Clean up previous info listeners
      Object.values(orgInfoUnsubsRef.current).forEach(
        (unsub) => unsub && unsub()
      );
      orgInfoUnsubsRef.current = {};
      let processed = 0;
      if (querySnapshot.empty) {
        setOrganizations([]);
        setFilteredOrganizations([]);
        setLoading(false);
        return;
      }
      querySnapshot.forEach((docSnap) => {
        const orgId = docSnap.id;
        // Listen to info/details doc in real time
        const infoDocRef = doc(db, "organizations", orgId, "info", "details");
        newUnsubs[orgId] = onSnapshot(infoDocRef, (infoDocSnap) => {
          let orgInfo = {
            id: orgId,
            name: orgId.replace(/_/g, " "),
            logo_url: null,
            icon: "Building",
            description: "",
            email: "",
          };
          if (infoDocSnap.exists()) {
            const infoData = infoDocSnap.data();
            orgInfo = {
              ...orgInfo,
              name: infoData.name || orgInfo.name,
              logo_url: infoData.logo_url || null,
              icon: infoData.icon || "Building",
              description: infoData.description || "",
              email: infoData.email || "",
            };
          }
          // Update or add org in orgsData
          const idx = orgsData.findIndex((o) => o.id === orgId);
          if (idx !== -1) {
            orgsData[idx] = orgInfo;
          } else {
            orgsData.push(orgInfo);
          }
          // Only update state after all orgs processed
          processed++;
          if (processed === querySnapshot.size) {
            setOrganizations([...orgsData]);
            setFilteredOrganizations((prev) => {
              // If search is active, re-filter
              if (searchQuery.trim()) {
                return orgsData.filter((org) =>
                  org.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
              }
              return [...orgsData];
            });
            setLoading(false);
          }
        });
      });
      orgInfoUnsubsRef.current = newUnsubs;
    });
    // Cleanup all listeners on unmount
    return () => {
      orgsUnsub && orgsUnsub();
      Object.values(orgInfoUnsubsRef.current).forEach(
        (unsub) => unsub && unsub()
      );
      orgInfoUnsubsRef.current = {};
    };
  }, [searchQuery]);

  // Filter organizations based on search query
  const filterOrganizations = (query) => {
    if (!query.trim()) {
      setFilteredOrganizations(organizations);
      return;
    }

    const filtered = organizations.filter((org) =>
      org.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredOrganizations(filtered);
  };

  // Handle search input change
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    setSearchLoading(true);

    // Debounce search
    setTimeout(() => {
      filterOrganizations(text);
      setSearchLoading(false);
    }, 300);
  };

  // Handle organization selection
  const handleJoinOrg = (organization) => {
    navigation.navigate("OrgCodeVerification", { organization });
  };

  // Handle admin login
  const handleAdminLogin = () => {
    navigation.navigate("AdminLogin");
  };

  const handleSecretAccess = () => {
    navigation.navigate("CreateOrganization");
  };

  // Animation effects
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Render organization item
  const renderOrganizationItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.orgItem}
        onPress={() => handleJoinOrg(item)}
        onLongPress={handleSecretAccess}
        activeOpacity={0.8}
      >
        <View style={styles.orgItemContent}>
          <View style={styles.orgIconContainer}>
            {item.logo_url ? (
              <Image
                source={{ uri: item.logo_url }}
                style={styles.orgLogoLarge}
              />
            ) : (
              <Image source={aitoIcon} style={styles.orgLogoLarge} />
            )}
          </View>
          <View style={styles.orgInfo}>
            <Text style={styles.orgName}>{item.name}</Text>
            <Text style={styles.orgDescription} numberOfLines={1}>
              {item.description || item.email || "No description"}
            </Text>
          </View>
          <ChevronRight color={NAVY} size={22} />
        </View>
      </TouchableOpacity>
    );
  };

  // Remove the visual accent (shield icon) and use a minimal, modern style
  return (
    <SafeAreaView
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: WHITE },
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={aitoLogo} style={styles.logoImage} />
          <Text style={styles.logo}>FIVENT</Text>
          <Text style={styles.tagline}>
            Connect to Your Department, Anytime!
          </Text>
          <TouchableOpacity
            style={styles.helpIconContainer}
            onPress={() => setShowHelpModal(true)}
            activeOpacity={0.7}
          >
            <HelpCircle color={NAVY_DARK} size={26} />
          </TouchableOpacity>
        </View>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainerIdeal}>
            <Search color={NAVY} size={18} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInputIdeal}
              placeholder="Find My Department"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchLoading && <ActivityIndicator size="small" color={NAVY} />}
          </View>
        </View>
        {/* Help Modal */}
        <Modal
          visible={showHelpModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowHelpModal(false)}
        >
          <View style={styles.helpModalOverlay}>
            <View style={styles.helpModalContent}>
              <Text style={styles.helpModalTitle}>Welcome to FIVENT</Text>
              <Text style={styles.helpModalSubtitle}>
                Fine & Event Management System
              </Text>
              <Text style={styles.helpModalText}>
                FIVENT is a platform for managing events, attendance, and fines
                related to absences in events. Key features include:
              </Text>
              <Text style={styles.helpModalBullet}>
                {"• "} Event creation and management
              </Text>
              <Text style={styles.helpModalBullet}>
                {"• "} Attendance tracking via QR code
              </Text>
              <Text style={styles.helpModalBullet}>
                {"• "} Fine management for absences in events
              </Text>
              <Text style={styles.helpModalBullet}>
                {"• "} Organization and department management
              </Text>
              <Text style={styles.helpModalBullet}>
                {"• "} Real-time updates and notifications
              </Text>
              <Text style={styles.helpModalText}>
                If you can't find your organization, please contact your
                department/org adviser or the officers for assistance.
              </Text>
              <TouchableOpacity
                style={styles.helpModalCloseBtn}
                onPress={() => setShowHelpModal(false)}
              >
                <Text style={styles.helpModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Organizations List */}
        <View style={styles.orgListContainerModern}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={NAVY} />
              <Text style={styles.loadingText}>Loading departments...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOrganizations}
              renderItem={renderOrganizationItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.orgList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? "No departments found"
                      : "No departments available"}
                  </Text>
                </View>
              }
            />
          )}
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10, // Reduced from 32 to 10 for less top white space
    backgroundColor: WHITE,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 0,
  },
  headerIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#eaf0fa",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  logoImage: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
  logo: {
    fontSize: 28, // Slightly smaller
    fontWeight: "bold",
    color: NAVY_DARK,
    textAlign: "center",
    letterSpacing: 1.5,
    marginBottom: 0, // Remove extra space
  },
  tagline: {
    fontSize: 13, // Slightly smaller
    color: NAVY,
    textAlign: "center",
    fontStyle: "italic",
    opacity: 0.7,
    marginBottom: 6, // Add a little space below tagline
  },
  searchSection: {
    marginBottom: 10,
    marginTop: 0,
  },
  searchContainerRefined: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6fb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInputRefined: {
    flex: 1,
    fontSize: 15,
    color: NAVY_DARK,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  visualAccentContainer: {
    alignItems: "center",
    marginBottom: 4,
    marginTop: 2,
  },
  orgListContainerRefined: {
    flex: 1,
    marginBottom: 10,
    backgroundColor: "#f7f9fc",
    borderRadius: 16,
    padding: 8,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  orgListContainer: {
    flex: 1,
    marginBottom: 10, // Reduced from 20
    backgroundColor: "#f7f9fc", // Subtle background for emphasis
    borderRadius: 16,
    padding: 8,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 17, // Slightly smaller
    fontWeight: "700",
    color: NAVY_DARK,
    marginBottom: 10, // Reduced from 15
    letterSpacing: 0.5,
    marginLeft: 4,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30, // Add some vertical padding
  },
  loadingText: {
    color: NAVY_DARK,
    marginTop: 10,
    fontSize: 15,
  },
  orgList: {
    paddingBottom: 10, // Reduced
  },
  orgItem: {
    backgroundColor: WHITE,
    borderRadius: 12,
    marginBottom: 10, // Reduced from 14
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  orgItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12, // Slightly tighter
  },
  orgIconContainer: {
    width: 44, // Slightly smaller
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f4f6fb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  orgLogoLarge: { width: 40, height: 40, borderRadius: 20 },
  orgInfo: {
    flex: 1,
    justifyContent: "center",
  },
  orgName: {
    fontSize: 17, // Emphasized
    fontWeight: "bold",
    color: NAVY_DARK,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  orgDescription: {
    fontSize: 13.5, // Slightly larger
    color: NAVY,
    opacity: 0.85, // More readable
    fontWeight: "500",
    marginTop: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30, // Reduced
  },
  emptyText: {
    color: NAVY,
    fontSize: 15,
    textAlign: "center",
    opacity: 0.7,
  },
  footer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8, // Reduced from 15
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 0, // Remove extra margin
  },
  footerText: {
    color: NAVY,
    fontSize: 11,
    opacity: 0.7,
    textAlign: "center",
  },
  searchContainerModern: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e3e7",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  searchInputModern: {
    flex: 1,
    fontSize: 15,
    color: NAVY_DARK,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  orgListContainerModern: {
    flex: 1,
    marginBottom: 10,
    backgroundColor: WHITE,
    borderRadius: 0,
    padding: 0,
    borderWidth: 0,
    shadowColor: "transparent",
    elevation: 0,
  },
  orgNotFoundNote: {
    marginTop: 8,
    marginBottom: 2,
    color: NAVY_DARK,
    fontSize: 13,
    textAlign: "center",
    opacity: 0.85,
    fontStyle: "italic",
    paddingHorizontal: 8,
  },
  searchContainerIdeal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e3e7",
    paddingHorizontal: 12,
    paddingVertical: 10, // More ideal height
    minHeight: 44,
  },
  searchInputIdeal: {
    flex: 1,
    fontSize: 16,
    color: NAVY_DARK,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  helpIconContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 4,
  },
  helpModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  helpModalContent: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 24,
    width: "85%",
    alignItems: "center",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  helpModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: NAVY_DARK,
    marginBottom: 6,
    textAlign: "center",
  },
  helpModalSubtitle: {
    fontSize: 15,
    color: NAVY,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  helpModalText: {
    fontSize: 14,
    color: NAVY_DARK,
    marginBottom: 8,
    textAlign: "center",
  },
  helpModalBullet: {
    fontSize: 14,
    color: NAVY,
    marginBottom: 2,
    alignSelf: "flex-start",
    marginLeft: 8,
  },
  helpModalCloseBtn: {
    marginTop: 18,
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  helpModalCloseText: {
    color: WHITE,
    fontWeight: "bold",
    fontSize: 15,
  },
});

export default LandingScreen;
