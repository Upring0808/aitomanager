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

  // Fetch organizations from Firestore
  const fetchOrganizations = () => {
    setLoading(true);
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    const organizationsRef = collection(db, "organizations");
    // Listen for real-time updates
    const unsubscribe = onSnapshot(organizationsRef, async (querySnapshot) => {
      const orgsData = [];
      for (const docSnap of querySnapshot.docs) {
        try {
          const orgId = docSnap.id;
          // Get info subcollection
          const infoRef = collection(db, "organizations", orgId, "info");
          const infoSnapshot = await getDocs(infoRef);
          let orgInfo = {
            id: orgId,
            name: orgId.replace(/_/g, " "),
            logo_url: null,
            icon: "Building",
          };
          if (!infoSnapshot.empty) {
            const infoDoc = infoSnapshot.docs[0];
            const infoData = infoDoc.data();
            orgInfo = {
              ...orgInfo,
              name: infoData.name || orgInfo.name,
              logo_url: infoData.logo_url || null,
              icon: infoData.icon || "Building",
              description: infoData.description || "",
              email: infoData.email || "",
            };
          }
          orgsData.push(orgInfo);
        } catch (error) {
          console.error(
            `[LandingScreen] Error processing org ${docSnap.id}:`,
            error
          );
        }
      }
      setOrganizations(orgsData);
      setFilteredOrganizations(orgsData);
      setLoading(false);
    });
    return unsubscribe;
  };

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

  // Fetch organizations on component mount
  useEffect(() => {
    const unsubscribe = fetchOrganizations();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Render organization item
  const renderOrganizationItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.orgItem}
        onPress={() => handleJoinOrg(item)}
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
        </View>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search color={NAVY} size={20} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
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
        {/* Organizations List */}
        <View style={styles.orgListContainer}>
          <Text style={styles.sectionTitle}>Available Departments</Text>
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
    paddingTop: 32,
    backgroundColor: WHITE,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 10,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
    resizeMode: "contain",
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: NAVY_DARK,
    textAlign: "center",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 15,
    color: NAVY,
    textAlign: "center",
    fontStyle: "italic",
    opacity: 0.7,
  },
  searchSection: {
    marginBottom: 25,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: NAVY_DARK,
  },
  orgListContainer: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NAVY_DARK,
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: NAVY_DARK,
    marginTop: 10,
    fontSize: 16,
  },
  orgList: {
    paddingBottom: 20,
  },
  orgItem: {
    backgroundColor: WHITE,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  orgItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  orgIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f4f6fb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  orgLogoLarge: { width: 48, height: 48, borderRadius: 24 },
  orgInfo: {
    flex: 1,
    justifyContent: "center",
  },
  orgName: {
    fontSize: 16,
    fontWeight: "700",
    color: NAVY_DARK,
    marginBottom: 2,
  },
  orgDescription: {
    fontSize: 13,
    color: NAVY,
    opacity: 0.7,
    fontWeight: "400",
    marginTop: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: NAVY,
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  footer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 10,
  },
  footerText: {
    color: NAVY,
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
});

export default LandingScreen;
