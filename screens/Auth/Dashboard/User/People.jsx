import React, { useEffect, useState, useCallback, memo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  RefreshControl,
  Platform,
  Modal,
  FlatList,
  AppState,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
} from "react-native";
import { db, storage, database, auth } from "../../../../config/firebaseconfig";
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import {
  ref as databaseRef,
  onValue,
  off,
  get as dbGet,
  set,
  update,
  serverTimestamp,
} from "firebase/database";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import userPresenceService from "../../../../services/UserPresenceService";
import { useOnlineStatus } from "../../../../contexts/OnlineStatusContext";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../../../context/AuthContext";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Import Haptics conditionally to prevent crashes
let Haptics;
try {
  Haptics = require("expo-haptics");
} catch (error) {
  // Create a mock implementation if Haptics is not available
  Haptics = {
    ImpactFeedbackStyle: { Light: null, Medium: null, Heavy: null },
    NotificationFeedbackType: { Success: null, Warning: null, Error: null },
    selectionAsync: () => Promise.resolve(),
    impactAsync: () => Promise.resolve(),
    notificationAsync: () => Promise.resolve(),
  };
}

import { YearLevel } from "./../../../../components/YearLevel";

const { width, height } = Dimensions.get("window");
const SPACING = 16;
const AVATAR_SIZE = 50;
const THEME_COLOR = "#0A2463"; // Navy blue theme color
const THEME_SECONDARY = "#3E92CC"; // Lighter blue for accents
const HEADER_HEIGHT = 20;
const SCROLL_THRESHOLD = 20;
const PULL_THRESHOLD = 50;

// Safely trigger haptic feedback with error handling
const safeHaptics = {
  impactAsync: (style) => {
    try {
      Haptics.impactAsync(style);
    } catch (error) {
      // Silently handle haptics errors
    }
  },
  selectionAsync: () => {
    try {
      Haptics.selectionAsync();
    } catch (error) {
      // Silently handle haptics errors
    }
  },
};

const SearchBar = memo(
  ({
    onSearch,
    searchQuery,
    onClear,
    visible,
    onClose,
    getFilteredPeople,
    officers,
    students,
  }) => {
    const navigation = useNavigation();
    // Refs for component state management
    const inputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const mountedRef = useRef(true);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const keyboardShowListener = useRef(null);
    const keyboardHideListener = useRef(null);

    // Animation values for smooth transitions - initialize based on visible prop
    const [slideAnim] = useState(new Animated.Value(visible ? 0 : 100));
    const [fadeAnim] = useState(new Animated.Value(visible ? 1 : 0));

    // Setup keyboard listeners and component lifecycle
    useEffect(() => {
      // Mark component as mounted
      mountedRef.current = true;

      // Only set up listeners when overlay is visible
      if (!visible) return;

      // Create keyboard event listeners
      keyboardShowListener.current = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
        (event) => {
          if (mountedRef.current) {
            setKeyboardVisible(true);
            // Store keyboard height to adjust content
            if (event && event.endCoordinates) {
              setKeyboardHeight(event.endCoordinates.height);
            }
          }
        }
      );

      keyboardHideListener.current = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
        () => {
          if (mountedRef.current) {
            setKeyboardVisible(false);
            setKeyboardHeight(0);
          }
        }
      );

      // Focus input only once when the search modal becomes visible
      if (visible && inputRef.current) {
        try {
          // Use a small timeout to ensure the component is fully mounted
          setTimeout(() => {
            if (inputRef.current && mountedRef.current) {
              inputRef.current.focus();
            }
          }, 100);
        } catch (error) {
          console.log("[SearchBar] Error focusing input:", error);
        }
      }

      // Cleanup function
      return () => {
        // Remove keyboard listeners
        if (keyboardShowListener.current) {
          keyboardShowListener.current.remove();
        }
        if (keyboardHideListener.current) {
          keyboardHideListener.current.remove();
        }
      };
    }, [visible]);

    // Handle animations when visibility changes with improved cleanup
    useEffect(() => {
      let slideAnimation;
      let fadeAnimation;

      if (visible) {
        // Show the search overlay with animation
        const parallelAnimation = Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]);

        parallelAnimation.start();
      } else {
        // Hide the search overlay with animation
        // First dismiss keyboard before starting animation
        Keyboard.dismiss();

        // Use a simple timing animation instead of parallel for more stability
        fadeAnimation = Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        });

        fadeAnimation.start(() => {
          // Only perform cleanup if component is still mounted
          if (mountedRef.current) {
            // Animation is complete, ensure keyboard is dismissed
            Keyboard.dismiss();
            // Notify parent that animation is complete
            if (onClose && typeof onClose === "function") {
              // This is just a notification, the actual state change happens in the parent
              onClose();
            }
          }
        });

        // Animate slide separately to avoid conflicts
        slideAnimation = Animated.timing(slideAnim, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        });

        slideAnimation.start();
      }

      // Cleanup function to stop animations
      return () => {
        if (fadeAnimation) {
          fadeAnimation.stop();
        }
        if (slideAnimation) {
          slideAnimation.stop();
        }
      };
    }, [visible, slideAnim, fadeAnim, onClose]);

    // Initialize animations when component mounts
    useEffect(() => {
      // Set initial animation values based on visibility
      slideAnim.setValue(visible ? 0 : 100);
      fadeAnim.setValue(visible ? 1 : 0);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        mountedRef.current = false;
      };
    }, []);

    // Handle close with proper keyboard dismissal and prevent freezing
    const handleClose = useCallback(() => {
      // First dismiss keyboard
      Keyboard.dismiss();

      // Set a small timeout to prevent UI thread blocking
      setTimeout(() => {
        // Don't stop animations directly, let them complete naturally
        // Just call onClose which will trigger the animation in the useEffect
        if (mountedRef.current) {
          onClose();
        }
      }, 50);
    }, [onClose]);

    // Handle clear search with focus retention
    const handleClear = useCallback(() => {
      onClear();
      // Maintain focus after clearing
      if (inputRef.current) {
        setTimeout(() => {
          if (inputRef.current && mountedRef.current) {
            inputRef.current.focus();
          }
        }, 50);
      }
    }, [onClear]);

    // Handle search input changes - debounced to prevent excessive rerenders
    const handleSearchChange = useCallback(
      (text) => {
        // Important: This prevents excessive re-rendering during typing
        onSearch(text);
      },
      [onSearch]
    );

    // Filter officers and students based on search query
    const filteredOfficers =
      searchQuery.length > 0
        ? officers.filter((item) =>
            item.username?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : [];

    const filteredStudents =
      searchQuery.length > 0
        ? students.filter((item) =>
            item.username?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : [];

    // Don't render anything if not visible and animation is complete
    if (!visible && (!fadeAnim || fadeAnim._value === 0)) return null;

    // Add effect to hide header/tabs visibility
    useEffect(() => {
      if (visible) {
        // Hide header and tabs when search is active
        navigation.setOptions({
          headerShown: false,
          tabBarStyle: { display: "none" },
        });
      } else {
        // Show header and tabs when search is closed
        navigation.setOptions({
          headerShown: true,
          tabBarStyle: { display: "flex" },
        });
      }
    }, [visible, navigation]);

    return (
      <Modal
        animationType="fade"
        visible={visible}
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" />
          <BlurView
            intensity={Platform.OS === "ios" ? 40 : 30}
            style={styles.blurContainer}
            tint="dark"
          >
            <TouchableOpacity
              style={styles.overlayBackdrop}
              activeOpacity={1}
              onPress={handleClose}
            />

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardAvoidingView}
              keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
              <Animated.View
                style={[
                  styles.searchBarContainer,
                  {
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                {/* Minimalist Search Header */}
                <View style={styles.minimalistSearchHeader}>
                  <View style={styles.minimalistSearchContainer}>
                    <Ionicons
                      name="search"
                      size={20}
                      color={isFocused ? THEME_SECONDARY : "#94A3B8"}
                    />
                    <TextInput
                      ref={inputRef}
                      style={styles.minimalistSearchInput}
                      placeholder="Search people..."
                      placeholderTextColor="#94A3B8"
                      onChangeText={handleSearchChange}
                      value={searchQuery}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      returnKeyType="search"
                      selectionColor={THEME_SECONDARY}
                      keyboardType="default"
                      keyboardAppearance="dark"
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                      blurOnSubmit={false}
                      enablesReturnKeyAutomatically={true}
                    />
                    {searchQuery.length > 0 ? (
                      <TouchableOpacity
                        onPress={handleClear}
                        style={styles.clearButton}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={handleClose}
                        style={styles.clearButton}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      >
                        <Ionicons name="close" size={22} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Search Results Modal */}
                {searchQuery.length > 0 && (
                  <View
                    style={[
                      styles.searchResultsModal,
                      keyboardVisible && {
                        maxHeight: height - keyboardHeight - 150,
                      },
                    ]}
                  >
                    <ScrollView
                      style={styles.searchResultsScrollView}
                      contentContainerStyle={styles.searchResultsScrollContent}
                      keyboardShouldPersistTaps="always"
                      keyboardDismissMode="none"
                      showsVerticalScrollIndicator={true}
                      indicatorStyle="white"
                    >
                      {/* Officers Section */}
                      {filteredOfficers.length > 0 && (
                        <View style={styles.searchResultSection}>
                          <View style={styles.searchResultSectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                              <Ionicons
                                name="people-circle"
                                size={20}
                                color={THEME_SECONDARY}
                                style={styles.sectionIcon}
                              />
                              <Text style={styles.searchResultSectionTitle}>
                                Officers
                              </Text>
                            </View>
                            <View style={styles.searchResultCountBadge}>
                              <Text style={styles.searchResultCountText}>
                                {filteredOfficers.length}
                              </Text>
                            </View>
                          </View>
                          {filteredOfficers.map((item) => (
                            <View
                              key={`officer-${item.id || item.uid}`}
                              style={styles.searchResultCard}
                            >
                              <PersonCard
                                item={item}
                                defaultAvatarUri={require("../../../../assets/aito.png")}
                              />
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Students Section */}
                      {filteredStudents.length > 0 && (
                        <View style={styles.searchResultSection}>
                          <View style={styles.searchResultSectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                              <Ionicons
                                name="school"
                                size={20}
                                color={THEME_SECONDARY}
                                style={styles.sectionIcon}
                              />
                              <Text style={styles.searchResultSectionTitle}>
                                Students
                              </Text>
                            </View>
                            <View style={styles.searchResultCountBadge}>
                              <Text style={styles.searchResultCountText}>
                                {filteredStudents.length}
                              </Text>
                            </View>
                          </View>
                          {filteredStudents.map((item) => (
                            <View
                              key={`student-${item.id || item.uid}`}
                              style={styles.searchResultCard}
                            >
                              <PersonCard
                                item={item}
                                defaultAvatarUri={require("../../../../assets/aito.png")}
                              />
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Empty State */}
                      {filteredOfficers.length === 0 &&
                        filteredStudents.length === 0 && (
                          <View style={styles.emptySearchContainer}>
                            <Ionicons
                              name="search-outline"
                              size={50}
                              color="#A0AEC0"
                            />
                            <Text style={styles.emptySearchTitle}>
                              No matches found
                            </Text>
                            <Text style={styles.emptySearchSubtitle}>
                              Try a different search term or check your spelling
                            </Text>
                          </View>
                        )}
                    </ScrollView>
                  </View>
                )}
              </Animated.View>
            </KeyboardAvoidingView>
          </BlurView>
        </View>
      </Modal>
    );
  }
);

const PersonCard = memo(({ item, defaultAvatarUri, isOnlineProp }) => {
  const { user } = useAuth();
  const [lastSeenText, setLastSeenText] = useState("");
  const [userOnlineStatus, setUserOnlineStatus] = useState(false);
  const presenceRef = useRef(null);
  const isMounted = useRef(true);
  const appState = useRef(AppState.currentState);

  // Use the Firebase user ID consistently
  // Prioritize uid if available as that's the Firebase Auth ID
  const userId = item.uid || item.id;

  const { getIsUserOnline } = useOnlineStatus();

  // Check if this is the current user
  const isCurrentUser = user && userId === user.uid;

  // Add app state listener for current user
  useEffect(() => {
    if (!isCurrentUser) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appState.current = nextAppState;
      // For current user, update online status based on app state
      if (isCurrentUser) {
        setUserOnlineStatus(nextAppState === "active");
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isCurrentUser]);

  // Load online status on mount and refresh periodically with improved error handling
  useEffect(() => {
    if (!userId) return; // Skip if no userId
    if (isCurrentUser) {
      // Current user's status depends on app state
      setUserOnlineStatus(appState.current === "active");
      return;
    }

    let intervalId = null;
    isMounted.current = true;

    const checkUserStatus = async () => {
      if (!isMounted.current) return;

      try {
        // If prop is provided, use it, otherwise check real-time status
        if (isOnlineProp !== undefined) {
          setUserOnlineStatus(isOnlineProp);
        } else {
          // Check if user is online - with validation
          if (!userId || typeof userId !== "string" || userId.trim() === "") {
            // Invalid user ID - skip the check
            console.log(
              "[PersonCard] Skipping status check for invalid userId"
            );
            return;
          }

          try {
            const isOnline = await getIsUserOnline(userId);
            if (isMounted.current) {
              setUserOnlineStatus(isOnline);
            }
          } catch (statusError) {
            // Silently handle status check errors
            console.log("[PersonCard] Could not check online status");
          }
        }

        // If user is offline, get last seen time
        if (
          !userOnlineStatus &&
          userId &&
          typeof userId === "string" &&
          userId.trim() !== ""
        ) {
          try {
            const presenceData = await userPresenceService.getUserPresence(
              userId
            );
            if (isMounted.current && presenceData && presenceData.last_active) {
              setLastSeenText(
                userPresenceService.formatLastSeen(presenceData.last_active)
              );
            }
          } catch (presenceError) {
            // Silently handle presence data errors
            console.log("[PersonCard] Could not fetch last seen data");
          }
        }
      } catch (error) {
        // Only log non-permission errors
        if (
          !error.message?.includes("Permission denied") &&
          !error.message?.includes("permission_denied") &&
          !error.message?.includes("Invalid token")
        ) {
          console.error("[PersonCard] Error checking user status:", error);
        }
      }
    };

    // Check immediately
    checkUserStatus();

    // Refresh status periodically with a slightly longer interval
    intervalId = setInterval(checkUserStatus, 20000); // Check every 20 seconds

    return () => {
      isMounted.current = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [userId, isCurrentUser, isOnlineProp, getIsUserOnline]);

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.avatarContainer}>
          <Image
            source={item.avatarUrl ? { uri: item.avatarUrl } : defaultAvatarUri}
            style={styles.avatar}
            defaultSource={defaultAvatarUri}
          />
          <View
            style={[
              styles.statusIndicator,
              userOnlineStatus
                ? styles.onlineIndicator
                : styles.offlineIndicator,
            ]}
          />
        </View>

        <View style={styles.userInfo}>
          <View style={styles.usernameRow}>
            <View style={styles.usernameContainer}>
              <Text style={styles.username} numberOfLines={1}>
                {item.username}
              </Text>
            </View>

            {isCurrentUser && (
              <View style={styles.currentUserBadge}>
                <Text style={styles.currentUserText}>You</Text>
              </View>
            )}
          </View>

          <View style={styles.userDetailsRow}>
            {userOnlineStatus ? (
              <View style={styles.statusTextContainer}>
                <Ionicons
                  name="wifi"
                  size={12}
                  color="#10B981"
                  style={styles.statusIcon}
                />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            ) : lastSeenText ? (
              <View style={styles.lastSeenContainer}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color="#94A3B8"
                  style={styles.statusIcon}
                />
                <Text style={styles.lastSeenText}>
                  Last seen {lastSeenText}
                </Text>
              </View>
            ) : null}

            {item.yearLevel && (
              <View style={styles.badgeContainer}>
                <Ionicons
                  name="ribbon-outline"
                  size={14}
                  color="#6B7280"
                  style={styles.badgeIcon}
                />
                <Text style={styles.badgeText}>Year {item.yearLevel}</Text>
              </View>
            )}

            {item.role && (
              <View style={[styles.badgeContainer, styles.roleBadge]}>
                <Ionicons
                  name="star-outline"
                  size={14}
                  color="#6B7280"
                  style={styles.badgeIcon}
                />
                <Text style={styles.badgeText}>{item.role}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});

const Section = memo(({ title, data, defaultAvatarUri, showCount = true }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const heightAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-90deg"],
  });

  const ListEmptyComponent = useCallback(
    () => <Text style={styles.emptyText}>No {title.toLowerCase()} found</Text>,
    [title]
  );

  const toggleExpand = () => {
    safeHaptics.selectionAsync();
    setIsExpanded((prev) => !prev);
  };

  // Get appropriate icon based on section title
  const getSectionIcon = () => {
    switch (title.toLowerCase()) {
      case "officers":
        return "person-circle";
      case "students":
        return "school-outline";
      default:
        return "people-outline";
    }
  };

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <View style={styles.sectionTitleContainer}>
          <Ionicons
            name={getSectionIcon()}
            size={22}
            color={THEME_COLOR}
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>{title}</Text>

          {showCount && data.length > 0 && (
            <View style={styles.countContainer}>
              <Text style={styles.countNumber}>{data.length}</Text>
            </View>
          )}
        </View>

        <Animated.View
          style={{
            transform: [{ rotate: rotateInterpolate }],
          }}
        >
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </Animated.View>
      </TouchableOpacity>

      {data.length > 0 && (
        <Animated.View
          style={{
            maxHeight: heightAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 4000],
            }),
            opacity: heightAnim,
            overflow: "hidden",
          }}
        >
          <View style={styles.listContainer}>
            {data.map((item) => (
              <PersonCard
                key={item.id || item.uid}
                item={item}
                defaultAvatarUri={defaultAvatarUri}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {data.length === 0 && <ListEmptyComponent />}
    </View>
  );
});

// Add checkDirectNetworkStatus function
const checkDirectNetworkStatus = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  } catch (error) {
    console.log("[People] Network check error:", error);
    return false;
  }
};

const People = ({
  initialData = { officers: [], students: [] },
  isDataPreloaded = false,
  showLogoutModal,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerColor = "#ffffff";
  // Initialize with preloaded data immediately, filtering out users without names
  const [users, setUsers] = useState(() => {
    if (isDataPreloaded) {
      console.log("[People] Initial preloaded data:", {
        totalOfficers: initialData.officers.length,
        totalStudents: initialData.students.length,
        officersWithoutNames: initialData.officers.filter(
          (o) => !o.username || o.username.trim() === ""
        ).length,
        studentsWithoutNames: initialData.students.filter(
          (s) => !s.username || s.username.trim() === ""
        ).length,
      });

      // Strict filtering for valid users
      const validOfficers = initialData.officers.filter(
        (officer) =>
          officer.username &&
          officer.username.trim() !== "" &&
          officer.username !== "Unknown" &&
          officer.role &&
          officer.role !== "student"
      );

      const validStudents = initialData.students.filter(
        (student) =>
          student.username &&
          student.username.trim() !== "" &&
          student.username !== "Unknown" &&
          (!student.role || student.role === "student")
      );

      console.log("[People] Filtered preloaded data:", {
        validOfficers: validOfficers.length,
        validStudents: validStudents.length,
        totalValid: validOfficers.length + validStudents.length,
        skippedOfficers: initialData.officers.length - validOfficers.length,
        skippedStudents: initialData.students.length - validStudents.length,
      });

      return [...validOfficers, ...validStudents];
    }
    return [];
  });
  const [filteredUsers, setFilteredUsers] = useState(() => {
    if (isDataPreloaded) {
      const validOfficers = initialData.officers.filter(
        (officer) => officer.username && officer.username.trim() !== ""
      );
      const validStudents = initialData.students.filter(
        (student) => student.username && student.username.trim() !== ""
      );
      return [...validOfficers, ...validStudents];
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSearchFAB, setShowSearchFAB] = useState(true);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [appActive, setAppActive] = useState(true);
  const appStateRef = useRef(AppState.currentState);
  const isInitialMount = useRef(true);
  const unsubscribeRef = useRef(null);
  const isMounted = useRef(true);
  const defaultAvatarUri = require("../../../../assets/aito.png");

  const { isOnline, refreshStatus, getIsUserOnline, forceConnectionCheck } =
    useOnlineStatus();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const lastScrollY = useRef(0);
  const fabOpacity = useRef(new Animated.Value(1)).current;
  const cleanupListeners = useRef([]);

  const fetchPeople = useCallback(async () => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) {
        console.log("[People] No organization selected in fetchPeople");
        return;
      }

      console.log("[People] Fetching people for organization:", orgId);
      const usersQuery = query(
        collection(db, "organizations", orgId, "users"),
        orderBy("username")
      );

      const querySnapshot = await getDocs(usersQuery);
      console.log("[People] Fetched", querySnapshot.docs.length, "users");

      const usersData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          if (
            !data.username ||
            data.username.trim() === "" ||
            data.username === "Unknown"
          ) {
            return null;
          }
          const avatarUrl = data.avatarUrl || (await getAvatarUrl(data.uid));
          return {
            id: doc.id,
            ...data,
            username: data.username,
            avatarUrl,
            yearLevel: data.yearLevel || "N/A",
            bio: data.bio || null,
            role: data.role || "student",
            email: data.email || null,
          };
        })
      );

      const validUsers = usersData.filter(
        (user) =>
          user !== null &&
          user.username &&
          user.username.trim() !== "" &&
          user.username !== "Unknown"
      );

      setUsers(validUsers);
      setFilteredUsers(validUsers);
    } catch (error) {
      console.error("[People] Error fetching people:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load people",
        position: "bottom",
      });
    }
  }, []);

  // Remove this old useEffect as it's now handled in the main real-time listener

  // Set up real-time listener for users only if not using preloaded data
  useEffect(() => {
    if (isDataPreloaded) return;

    console.log("[People] Setting up real-time listener for users");

    let unsubscribe;
    (async () => {
      try {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) {
          console.log("[People] No organization selected");
          return;
        }

        console.log("[People] Fetching users for organization:", orgId);
        const usersQuery = query(
          collection(db, "organizations", orgId, "users"),
          orderBy("username")
        );

        unsubscribe = onSnapshot(
          usersQuery,
          async (snapshot) => {
            if (!isMounted.current) return;

            console.log(
              "[People] Received snapshot with",
              snapshot.docs.length,
              "users"
            );

            try {
              const usersData = await Promise.all(
                snapshot.docs.map(async (doc) => {
                  const data = doc.data();
                  // Strict validation for valid users
                  if (
                    !data.username ||
                    data.username.trim() === "" ||
                    data.username === "Unknown"
                  ) {
                    console.log("[People] Skipping invalid user:", {
                      id: doc.id,
                      data: { ...data, password: undefined }, // Exclude sensitive data
                    });
                    return null;
                  }
                  const avatarUrl =
                    data.avatarUrl || (await getAvatarUrl(data.uid));
                  return {
                    id: doc.id,
                    ...data,
                    username: data.username,
                    avatarUrl,
                    yearLevel: data.yearLevel || "N/A",
                    bio: data.bio || null,
                    role: data.role || "student",
                    email: data.email || null,
                  };
                })
              );

              if (isMounted.current) {
                // Strict filtering for valid users
                const validUsers = usersData.filter(
                  (user) =>
                    user !== null &&
                    user.username &&
                    user.username.trim() !== "" &&
                    user.username !== "Unknown"
                );

                console.log("[People] Processed users data:", {
                  total: usersData.length,
                  valid: validUsers.length,
                  invalid: usersData.length - validUsers.length,
                  byRole: {
                    officers: validUsers.filter(
                      (u) => u.role && u.role !== "student"
                    ).length,
                    students: validUsers.filter(
                      (u) => !u.role || u.role === "student"
                    ).length,
                  },
                });

                setUsers(validUsers);
                setFilteredUsers(validUsers);
              }
            } catch (error) {
              console.error("[People] Error processing users data:", error);
            }
          },
          (error) => {
            console.error("[People] Error in snapshot listener:", error);
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "Failed to load users",
              position: "bottom",
            });
          }
        );

        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error("[People] Error setting up listener:", error);
      }
    })();

    return () => {
      if (unsubscribeRef.current) {
        console.log("[People] Cleaning up real-time listener");
        unsubscribeRef.current();
      }
    };
  }, [isDataPreloaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Manual fetch on mount if no data is loaded
  useEffect(() => {
    if (!isDataPreloaded && users.length === 0 && !loading) {
      console.log("[People] No data loaded, triggering manual fetch");
      fetchPeople();
    }
  }, [isDataPreloaded, users.length, loading, fetchPeople]);

  const getGroupedUsers = useCallback(() => {
    console.log("[People] getGroupedUsers called with:", {
      isDataPreloaded,
      initialDataLength:
        initialData?.officers?.length + initialData?.students?.length,
      filteredUsersLength: filteredUsers.length,
      usersLength: users.length,
    });

    const grouped = isDataPreloaded
      ? {
          officers: initialData.officers.filter(
            (officer) =>
              officer.username &&
              officer.username.trim() !== "" &&
              officer.username !== "Unknown" &&
              officer.role &&
              officer.role !== "student"
          ),
          students: initialData.students.filter(
            (student) =>
              student.username &&
              student.username.trim() !== "" &&
              student.username !== "Unknown" &&
              (!student.role || student.role === "student")
          ),
        }
      : {
          officers: filteredUsers.filter(
            (user) =>
              user.role &&
              user.role !== "student" &&
              user.username &&
              user.username.trim() !== "" &&
              user.username !== "Unknown"
          ),
          students: filteredUsers.filter(
            (user) =>
              (!user.role || user.role === "student") &&
              user.username &&
              user.username.trim() !== "" &&
              user.username !== "Unknown"
          ),
        };

    console.log("[People] Grouped users result:", {
      officers: grouped.officers.length,
      students: grouped.students.length,
      total: grouped.officers.length + grouped.students.length,
      skippedOfficers:
        filteredUsers.length -
        grouped.officers.length -
        grouped.students.length,
    });

    return grouped;
  }, [isDataPreloaded, initialData, filteredUsers]);

  const handleRefresh = async () => {
    if (!isMounted.current) return;

    console.log("[People] Starting refresh");
    setRefreshing(true);
    try {
      if (forceConnectionCheck) {
        setCheckingConnection(true);
        await forceConnectionCheck();
        setCheckingConnection(false);
      }

      // Only fetch new data if not using preloaded data
      if (!isDataPreloaded) {
        console.log("[People] Fetching fresh data");

        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) {
          console.log("[People] No organization selected during refresh");
          return;
        }

        const usersQuery = query(
          collection(db, "organizations", orgId, "users"),
          orderBy("username")
        );
        const querySnapshot = await getDocs(usersQuery);
        console.log("[People] Fetched", querySnapshot.docs.length, "users");

        const usersData = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const data = doc.data();
            // Strict validation for valid users
            if (
              !data.username ||
              data.username.trim() === "" ||
              data.username === "Unknown"
            ) {
              console.log("[People] Skipping invalid user during refresh:", {
                id: doc.id,
                data: { ...data, password: undefined }, // Exclude sensitive data
              });
              return null;
            }
            const avatarUrl = data.avatarUrl || (await getAvatarUrl(data.uid));
            return {
              id: doc.id,
              ...data,
              username: data.username,
              avatarUrl,
              yearLevel: data.yearLevel || "N/A",
              bio: data.bio || null,
              role: data.role || "student",
              email: data.email || null,
            };
          })
        );

        if (isMounted.current) {
          // Strict filtering for valid users
          const validUsers = usersData.filter(
            (user) =>
              user !== null &&
              user.username &&
              user.username.trim() !== "" &&
              user.username !== "Unknown"
          );

          console.log("[People] Processed refresh data:", {
            total: usersData.length,
            valid: validUsers.length,
            invalid: usersData.length - validUsers.length,
            byRole: {
              officers: validUsers.filter((u) => u.role && u.role !== "student")
                .length,
              students: validUsers.filter(
                (u) => !u.role || u.role === "student"
              ).length,
            },
          });

          setUsers(validUsers);
          setFilteredUsers(validUsers);
        }
      }

      if (refreshStatus) {
        await refreshStatus();
      }
    } catch (error) {
      console.error("[People] Error refreshing:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to refresh data",
        position: "bottom",
      });
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
        setCheckingConnection(false);
        console.log("[People] Refresh completed");
      }
    }
  };

  const getAvatarUrl = async (userId) => {
    if (!userId) return null;

    try {
      const avatarRef = ref(storage, `avatars/${userId}`);
      return await getDownloadURL(avatarRef);
    } catch (error) {
      // Silently handle missing avatars
      return null;
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const toggleSearchModal = useCallback(() => {
    if (showSearchModal) {
      // First dismiss keyboard
      Keyboard.dismiss();

      // Close overlay with a slight delay to ensure keyboard is dismissed properly
      setTimeout(() => {
        setShowSearchModal(false);
        clearSearch();

        // Give time for animations to complete before re-enabling scroll
        setTimeout(() => {
          try {
            // Re-enable scrolling after the search modal is fully closed
            if (scrollViewRef.current) {
              scrollViewRef.current.setNativeProps({ scrollEnabled: true });
            }
          } catch (error) {
            console.log("Error re-enabling scroll:", error);
          }
        }, 300);
      }, 100);
    } else {
      safeHaptics.selectionAsync();

      // Disable scrolling in the main list when search is active
      try {
        if (scrollViewRef.current) {
          scrollViewRef.current.setNativeProps({ scrollEnabled: false });
        }
      } catch (error) {
        console.log("Error disabling scroll:", error);
      }

      // Show search modal
      setShowSearchModal(true);
    }
  }, [showSearchModal, clearSearch]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;

        if (
          currentScrollY > lastScrollY.current &&
          currentScrollY > SCROLL_THRESHOLD
        ) {
          Animated.timing(fabOpacity, {
            toValue: 0.4,
            duration: 300,
            useNativeDriver: true,
          }).start();
        } else if (currentScrollY < lastScrollY.current) {
          Animated.timing(fabOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }

        lastScrollY.current = currentScrollY;
      },
    }
  );

  const renderSectionHeader = (title, count) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Ionicons
          name={title.toLowerCase() === "officers" ? "people-circle" : "school"}
          size={22}
          color={THEME_COLOR}
          style={styles.sectionIcon}
        />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.countContainer}>
        <Text style={styles.countNumber}>{count}</Text>
      </View>
    </View>
  );

  const renderUserCard = (item) => (
    <PersonCard key={item.id} item={item} defaultAvatarUri={defaultAvatarUri} />
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color={THEME_COLOR} />
        <Text style={styles.loadingText}>Loading People...</Text>
      </View>
    );
  }

  // Debug logging for render
  const { officers, students } = getGroupedUsers();
  console.log("[People] Render state:", {
    loading,
    usersLength: users.length,
    filteredUsersLength: filteredUsers.length,
    officersLength: officers.length,
    studentsLength: students.length,
    totalUsers: officers.length + students.length,
  });

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "transparent",
          paddingTop: insets.top,
        }}
        edges={["top", "left", "right"]}
      >
        {/* Extend header background behind status bar */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + 80, // Adjust 80 to your header height
            backgroundColor: headerColor,
            zIndex: 0,
          }}
        />
        <StatusBar
          barStyle="light-content"
          backgroundColor={headerColor}
          translucent={false}
        />

        <FlatList
          ref={scrollViewRef}
          data={[]}
          renderItem={null}
          ListHeaderComponent={() => {
            return (
              <View>
                {officers.length > 0 && (
                  <View style={styles.sectionContainer}>
                    {renderSectionHeader("Officers", officers.length)}
                    {officers.map((item) => (
                      <View key={item.id || item.uid}>
                        {renderUserCard(item)}
                      </View>
                    ))}
                  </View>
                )}
                {students.length > 0 && (
                  <View style={styles.sectionContainer}>
                    {renderSectionHeader("Students", students.length)}
                    {students.map((item) => (
                      <View key={item.id || item.uid}>
                        {renderUserCard(item)}
                      </View>
                    ))}
                  </View>
                )}

                {/* Empty state when no users */}
                {officers.length === 0 && students.length === 0 && !loading && (
                  <View style={styles.emptyContainer}>
                    <Ionicons
                      name="people-outline"
                      size={60}
                      color="#CBD5E1"
                      style={{ marginBottom: 16 }}
                    />
                    <Text style={styles.emptyTitle}>No People Found</Text>
                    <Text style={styles.emptySubtitle}>
                      {loading
                        ? "Loading people..."
                        : "No users have registered in this organization yet."}
                    </Text>
                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={handleRefresh}
                      disabled={refreshing}
                    >
                      <Ionicons
                        name="refresh"
                        size={20}
                        color="#FFFFFF"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.refreshButtonText}>
                        {refreshing ? "Refreshing..." : "Refresh"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={[
            styles.contentContainer,
            !isOnline && styles.contentContainerOffline,
          ]}
          showsVerticalScrollIndicator={true}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          overScrollMode="always"
          bounces={true}
          scrollEnabled={!showSearchModal}
          removeClippedSubviews={false}
          initialNumToRender={20}
          maxToRenderPerBatch={30}
          windowSize={15}
          updateCellsBatchingPeriod={50}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || checkingConnection}
              onRefresh={handleRefresh}
              colors={[THEME_COLOR]}
              tintColor={THEME_COLOR}
            />
          }
        />

        <Animated.View style={[styles.searchFAB, { opacity: fabOpacity }]}>
          <TouchableOpacity
            onPress={toggleSearchModal}
            activeOpacity={0.8}
            style={styles.searchFABTouchable}
          >
            <Ionicons name="search" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {showSearchModal && (
          <SearchBar
            visible={showSearchModal}
            onClose={toggleSearchModal}
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
            onClear={clearSearch}
            officers={getGroupedUsers().officers}
            students={getGroupedUsers().students}
          />
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  searchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: "transparent",
  },
  blurContainer: {
    flex: 1,
    flexDirection: "column",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)", // Darker backdrop for better contrast
  },
  keyboardAvoidingView: {
    flex: 1,
    width: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchBarContainer: {
    width: "100%",
    zIndex: 1001,
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  minimalistSearchHeader: {
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1002,
  },
  minimalistSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: SPACING,
    height: 50,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  minimalistSearchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontWeight: "500",
  },
  searchFAB: {
    position: "absolute",
    bottom: SPACING,
    right: SPACING,
    zIndex: 100,
  },
  searchFABTouchable: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME_COLOR,
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 20,
    marginRight: 10,
  },
  contentContainer: {
    paddingBottom: SPACING * 2,
    paddingTop: SPACING,
    paddingHorizontal: SPACING,
    flexGrow: 1,
  },
  searchResultsModal: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginHorizontal: SPACING,
    marginTop: Platform.OS === "ios" ? 90 : StatusBar.currentHeight + 70,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
    height: height * 0.8, // Changed from maxHeight to fixed height
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchResultSection: {
    paddingHorizontal: SPACING,
    paddingTop: SPACING / 2, // Reduced top padding
    marginBottom: SPACING / 2, // Reduced bottom margin
  },
  searchResultSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING / 2, // Reduced margin
    paddingHorizontal: SPACING / 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    paddingBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIcon: {
    marginRight: 8,
  },
  searchResultSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  searchResultCountBadge: {
    backgroundColor: THEME_SECONDARY,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  searchResultCountText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  searchResultsScrollView: {
    flex: 1,
    width: "100%",
  },
  searchResultsScrollContent: {
    paddingBottom: SPACING * 4,
    paddingTop: SPACING,
    flexGrow: 1, // Added to ensure content fills available space
  },
  section: {
    paddingHorizontal: 0,
    paddingTop: 0,
    marginBottom: SPACING / 2,
    width: "100%",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING / 2, // Reduced margin
    marginTop: 0,
    paddingVertical: 8, // Increased for better touch area
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME_COLOR,
    letterSpacing: -0.5,
  },
  countContainer: {
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(62, 146, 204, 0.1)", // Updated to use theme color with opacity
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  countNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME_SECONDARY,
  },
  listContainer: {
    width: "100%",
    paddingBottom: SPACING,
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
    width: "100%",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12, // Reduced padding
    backgroundColor: "white",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 8,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 26,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  userInfo: {
    flex: 1,
    marginLeft: 8,
    justifyContent: "center",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  usernameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  username: {
    fontSize: 16, // Slightly increased
    fontWeight: "600", // Bolder
    color: "#111827",
    letterSpacing: -0.3,
  },
  userDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },
  badgeContainer: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  roleBadge: {
    backgroundColor: "rgba(62, 146, 204, 0.1)",
  },
  statusIndicator: {
    position: "absolute",
    width: 15, // Slightly larger
    height: 15, // Slightly larger
    borderRadius: 8,
    borderWidth: 2.5, // Thicker border
    borderColor: "#FFFFFF",
    bottom: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  onlineIndicator: {
    backgroundColor: "#10B981", // A nicer green
    borderColor: "#FFFFFF",
  },
  offlineIndicator: {
    backgroundColor: "#CBD5E1",
    borderColor: "#FFFFFF",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8", // More modern gray
    fontSize: 15,
    marginTop: SPACING,
    fontWeight: "500",
  },
  emptyContainer: {
    paddingTop: SPACING * 4,
    paddingBottom: SPACING * 4,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: SPACING,
    marginBottom: SPACING / 2,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  lastSeenText: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 6, // Increased from 4 to 6
    marginRight: 8, // Added for spacing
    fontStyle: "italic",
  },
  statusTextContainer: {
    marginRight: 8,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  onlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981", // Matching the status indicator
  },
  currentUserBadge: {
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 3, // Slightly increased
    borderRadius: 10,
    marginLeft: 8,
  },
  currentUserText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  youLabel: {
    fontStyle: "italic",
    color: THEME_SECONDARY,
    fontWeight: "500",
  },
  contentContainerOffline: {
    paddingTop: 0, // Adjust for offline banner
  },
  statusIcon: {
    marginRight: 4,
  },
  lastSeenContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    marginRight: 8,
  },
  badgeIcon: {
    marginRight: 4,
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING * 2,
    marginTop: SPACING * 3,
  },
  emptySearchTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4A5568",
    marginTop: SPACING * 1.5,
    marginBottom: SPACING / 2,
    textAlign: "center",
  },
  emptySearchSubtitle: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

export default People;
