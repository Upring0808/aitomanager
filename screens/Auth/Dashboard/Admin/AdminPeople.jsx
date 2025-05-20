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
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
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
      <Animated.View
        style={[
          styles.searchOverlay,
          {
            opacity: fadeAnim,
            zIndex: 9999,
          },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />
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
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
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
                              name="shield-checkmark"
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
      </Animated.View>
    );
  }
);

const PersonCard = memo(({ item, defaultAvatarUri, isOnlineProp }) => {
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
  const isCurrentUser = auth.currentUser && userId === auth.currentUser.uid;

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
        return "shield-outline";
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

const AdminPeople = () => {
  const [officers, setOfficers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false); // Initialize to false
  const [showSearchFAB, setShowSearchFAB] = useState(true);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [appActive, setAppActive] = useState(true);
  const appStateRef = useRef(AppState.currentState);

  const { isOnline, refreshStatus, getIsUserOnline, forceConnectionCheck } =
    useOnlineStatus();

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const lastScrollY = useRef(0);
  const fabOpacity = useRef(new Animated.Value(1)).current;
  const cleanupListeners = useRef([]);
  const isMounted = useRef(true);

  const defaultAvatarUri = require("../../../../assets/aito.png");

  // Define filterAndSortData callback early to ensure consistent hook order
  const filterAndSortData = useCallback(
    (data) => {
      let filteredData = data;

      if (searchQuery) {
        filteredData = data.filter((item) =>
          item.username.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return [...filteredData].sort((a, b) => {
        const comparison = a.username.localeCompare(b.username);
        return true ? comparison : -comparison; // Always sort A-Z
      });
    },
    [searchQuery]
  );

  // Define getFilteredPeople callback early to ensure consistent hook order
  const getFilteredPeople = useCallback(
    (query) => {
      if (!query || query.trim() === "") return [];

      const normalizedQuery = query.toLowerCase().trim();
      const allPeople = [...officers, ...students];

      // Prioritize exact matches first, then partial matches
      return allPeople
        .filter((person) => {
          const username = person.username?.toLowerCase() || "";
          return username.includes(normalizedQuery);
        })
        .sort((a, b) => {
          const aUsername = a.username?.toLowerCase() || "";
          const bUsername = b.username?.toLowerCase() || "";

          // Sort exact matches first
          const aExactMatch = aUsername === normalizedQuery;
          const bExactMatch = bUsername === normalizedQuery;

          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;

          // Then sort by starts with
          const aStartsWith = aUsername.startsWith(normalizedQuery);
          const bStartsWith = bUsername.startsWith(normalizedQuery);

          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;

          // Finally sort alphabetically
          return aUsername.localeCompare(bUsername);
        });
    },
    [officers, students]
  );

  // Initialize the presence service when the component mounts
  useEffect(() => {
    const initializePresence = async () => {
      try {
        // Initialize presence service
        await userPresenceService.initialize();

        // Force refresh online status
        refreshStatus();

        // Also force a connection check to ensure we have accurate online status
        if (forceConnectionCheck) {
          await forceConnectionCheck();
        }
      } catch (error) {
        // Only log meaningful errors
        if (
          !error.message?.includes("Permission denied") &&
          !error.message?.includes("permission_denied")
        ) {
          console.error("[People] Failed to initialize presence:", error);
        }
      }
    };

    initializePresence();

    // Cleanup function
    return () => {
      isMounted.current = false;

      // Clean up any component-specific presence listeners
      if (cleanupListeners.current.length > 0) {
        cleanupListeners.current.forEach((cleanup) => {
          if (typeof cleanup === "function") {
            cleanup();
          }
        });
        cleanupListeners.current = [];
      }
    };
  }, [refreshStatus, forceConnectionCheck]);

  // Enhanced direct network status check function
  const checkDirectNetworkStatus = async () => {
    // First check if we have network connectivity
    try {
      console.log("[People] Performing direct network check");
      const response = await fetch("https://www.google.com", {
        method: "HEAD",
        // Short timeout to avoid hanging
        timeout: 5000,
      });
      const isConnected = response.ok;
      console.log(
        "[People] Direct network check result:",
        isConnected ? "CONNECTED" : "DISCONNECTED"
      );
      return isConnected;
    } catch (e) {
      console.log("[People] Direct network check failed:", e.message);
      return false;
    }
  };

  // Enhanced handleForceConnectionCheck function with better error handling
  const handleForceConnectionCheck = async () => {
    if (!isMounted.current) return;

    setCheckingConnection(true);

    try {
      console.log("[People] Manual connection check requested by user");

      // Try direct network check first
      const hasNetwork = await checkDirectNetworkStatus();

      if (!hasNetwork) {
        console.log("[People] Direct network check confirmed we're offline");
        Toast.show({
          type: "error",
          text1: "No Internet Connection",
          text2: "Please check your network settings",
          position: "bottom",
          visibilityTime: 3000,
        });
        setCheckingConnection(false);
        return false;
      }

      // If network is available, try Firebase connection check with error handling
      let result = false;
      try {
        if (forceConnectionCheck) {
          console.log(
            "[People] Network available, checking Firebase connection"
          );
          result = await forceConnectionCheck();
        }
      } catch (firebaseError) {
        // Silently handle Firebase connection errors
        console.log(
          "[People] Firebase connection check failed with error:",
          firebaseError.message?.includes("Invalid token")
            ? "Invalid token"
            : firebaseError.message || "Unknown error"
        );
        // Continue with the process despite the error
      }

      // Force status refresh
      try {
        await refreshStatus();
      } catch (refreshError) {
        // Silently handle refresh errors
        console.log("[People] Status refresh failed, continuing");
      }

      // Update UI with result
      if (isMounted.current) {
        if (result) {
          console.log("[People] Successfully reconnected");
          Toast.show({
            type: "success",
            text1: "Connected",
            text2: "You are now online",
            position: "bottom",
            visibilityTime: 1500,
          });
        } else {
          console.log(
            "[People] Firebase connection limited but network is available"
          );
          Toast.show({
            type: "info",
            text1: "Connection Limited",
            text2: "Limited connectivity to the server",
            position: "bottom",
            visibilityTime: 3000,
          });
        }
      }

      return result;
    } catch (error) {
      // Filter out common Firebase errors to reduce console noise
      if (
        !error.message?.includes("Invalid token") &&
        !error.message?.includes("permission_denied")
      ) {
        console.error(
          "[People] Error checking connection:",
          error.message || error
        );
      } else {
        console.log("[People] Connection check encountered a handled error");
      }

      // If there's an error, trigger another network check to verify
      setTimeout(() => {
        if (isMounted.current) {
          refreshStatus();
        }
      }, 2000);
      return false;
    } finally {
      if (isMounted.current) {
        setCheckingConnection(false);
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

  const fetchOfficers = async () => {
    if (!isMounted.current) return;

    try {
      const officersQuery = query(collection(db, "admin"), orderBy("username"));
      const officersSnapshot = await getDocs(officersQuery);

      const officersData = await Promise.all(
        officersSnapshot.docs.map(async (doc) => {
          if (!isMounted.current) return null;

          const data = doc.data();
          const avatarUrl = data.avatarUrl || (await getAvatarUrl(data.uid));
          return {
            id: doc.id,
            ...data,
            username: data.username || "Unknown",
            avatarUrl,
            role: data.role || "Officer",
            bio: data.bio || null,
          };
        })
      );

      if (isMounted.current) {
        setOfficers(officersData.filter(Boolean));
      }
    } catch (error) {
      console.error("[People] Error fetching officers:", error);
      if (isMounted.current) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to fetch officers.",
        });
        setOfficers([]);
      }
    }
  };

  const fetchStudents = async () => {
    if (!isMounted.current) return;

    try {
      const usersQuery = query(collection(db, "users"), orderBy("username"));
      const usersSnapshot = await getDocs(usersQuery);

      const usersData = await Promise.all(
        usersSnapshot.docs.map(async (doc) => {
          if (!isMounted.current) return null;

          const data = doc.data();
          const avatarUrl = data.avatarUrl || (await getAvatarUrl(data.uid));
          return {
            id: doc.id,
            ...data,
            username: data.username || "Unknown",
            avatarUrl,
            yearLevel: data.yearLevel || "N/A",
            bio: data.bio || null,
          };
        })
      );

      if (isMounted.current) {
        setStudents(usersData.filter(Boolean));
      }
    } catch (error) {
      console.error("[People] Error fetching students:", error);
      if (isMounted.current) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to fetch students.",
        });
        setStudents([]);
      }
    }
  };

  const fetchData = async () => {
    if (!isMounted.current) return;

    setLoading(true);
    try {
      await Promise.all([fetchOfficers(), fetchStudents()]);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    if (!isMounted.current) return;

    setRefreshing(true);
    try {
      // First force a connection check to make sure online status is accurate
      if (forceConnectionCheck) {
        setCheckingConnection(true);
        await forceConnectionCheck();
        setCheckingConnection(false);
      }

      // Then fetch data and refresh online status in parallel
      await Promise.all([fetchData(), refreshStatus()]);

      // Removed toast notification as requested
    } catch (error) {
      console.error("[People] Error refreshing:", error);
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
        setCheckingConnection(false);
      }
    }
  };

  // filterAndSortData is now defined at the top of the component

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Effect to ensure FlatList scrolling is properly managed
  useEffect(() => {
    // When search modal is closed, ensure scrolling is enabled
    if (!showSearchModal && scrollViewRef.current) {
      // Small delay to ensure animations are complete
      const timer = setTimeout(() => {
        try {
          scrollViewRef.current.setNativeProps({ scrollEnabled: true });
        } catch (error) {
          console.log("Error in scroll effect:", error);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [showSearchModal]);

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

      // Note: The keyboard focus happens in the SearchBar component
    }
  }, [showSearchModal, clearSearch]);

  // Enhanced scroll handler to smoothly adjust FAB opacity based on scroll position
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
          // Scrolling DOWN - reduce opacity but don't hide completely
          Animated.timing(fabOpacity, {
            toValue: 0.4, // Reduce opacity instead of hiding completely
            duration: 300, // Slightly longer for smoother transition
            useNativeDriver: true,
          }).start();
        } else if (currentScrollY < lastScrollY.current) {
          // Scrolling UP - show FAB
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

  // Add this activity tracker - updates user's last active time periodically
  useEffect(() => {
    const activityInterval = setInterval(() => {
      if (isMounted.current && auth.currentUser) {
        userPresenceService.updateLastActive().catch((error) => {
          // Silently handle permission errors
          if (
            !error?.message?.includes("Permission denied") &&
            !error?.message?.includes("permission_denied")
          ) {
            console.warn("[People] Error updating activity:", error);
          }
        });
      }
    }, 30 * 1000); // Update every 30 seconds while the screen is open

    return () => clearInterval(activityInterval);
  }, []);

  // Add a periodic check for connection status to handle cases where status gets out of sync
  useEffect(() => {
    // Function to check and verify online status
    const verifyOnlineStatus = async () => {
      try {
        // Only check if we're shown as offline but might actually be online
        if (!isOnline) {
          console.log(
            "[People] Detected offline status, verifying if it's accurate..."
          );

          // First check direct network connectivity
          const hasNetwork = await checkDirectNetworkStatus();

          if (!hasNetwork) {
            console.log("[People] No network connectivity confirmed");
            return;
          }

          // We have network, so try Firebase connection
          if (forceConnectionCheck) {
            const actuallyConnected = await forceConnectionCheck();

            if (actuallyConnected) {
              console.log(
                "[People] Successfully reconnected after verification"
              );
              // Force data refresh since we're actually online
              await fetchData();
            }
          }
        }
      } catch (error) {
        console.error(
          "[People] Error verifying online status:",
          error.message || error
        );
      }
    };

    // Check immediately if showing offline
    if (!isOnline) {
      verifyOnlineStatus();
    }

    // Set up interval for periodic checks (less frequent than normal heartbeats)
    const checkInterval = setInterval(() => {
      if (isMounted.current) {
        verifyOnlineStatus();
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(checkInterval);
    };
  }, [isOnline, forceConnectionCheck]);

  useEffect(() => {
    fetchData();

    // Register for presence callbacks
    const unregisterCallbacks = userPresenceService.registerConnectionCallbacks(
      {
        onOnline: () => {
          if (isMounted.current) {
            // Refresh data when we come back online
            fetchData();
          }
        },
      }
    );

    // Store for cleanup
    cleanupListeners.current.push(unregisterCallbacks);

    // Setup cleanup
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Add an AppState listener to detect when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const isActive = nextAppState === "active";
      setAppActive(isActive);

      if (isActive && appStateRef.current !== "active") {
        // App came to foreground, refresh data and presence
        console.log("[People] App came to foreground, refreshing");
        handleRefresh();

        // Update presence to online when app comes to foreground
        if (auth.currentUser) {
          userPresenceService
            .updatePresenceWithAppState("active")
            .catch((err) => {
              // Silent error handling
            });
        }
      } else if (!isActive) {
        // App went to background, update presence to reflect this
        console.log("[People] App went to background");
        if (auth.currentUser) {
          // Mark the user with app state when app goes to background
          userPresenceService
            .updatePresenceWithAppState(nextAppState)
            .catch((err) => {
              // Silent error handling
            });
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color={THEME_COLOR} />
        <Text style={styles.loadingText}>Loading People...</Text>
      </View>
    );
  }

  const getFilteredSections = () => {
    let sections = [];

    sections.push({
      id: "officers",
      title: "Officers",
      data: filterAndSortData(officers),
    });

    sections.push({
      id: "students",
      title: "Students",
      data: filterAndSortData(students),
    });

    return sections;
  };

  // getFilteredPeople is now defined at the top of the component

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Animated.FlatList
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.contentContainer,
          !isOnline && styles.contentContainerOffline,
        ]}
        data={getFilteredSections()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Section
            title={item.title}
            data={item.data}
            defaultAvatarUri={defaultAvatarUri}
            showCount={!searchQuery}
          />
        )}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        overScrollMode="never"
        bounces={true}
        scrollEnabled={!showSearchModal} // Disable scrolling when search modal is open
        removeClippedSubviews={false} // Prevent issues with clipped views
        refreshControl={
          <RefreshControl
            refreshing={refreshing || checkingConnection}
            onRefresh={handleRefresh}
            colors={[THEME_COLOR]}
            tintColor={THEME_COLOR}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search</Text>
          </View>
        }
      />

      {/* Floating Search Button with simple fade animation */}
      <Animated.View style={[styles.searchFAB, { opacity: fabOpacity }]}>
        <TouchableOpacity
          onPress={toggleSearchModal}
          activeOpacity={0.8}
          style={styles.searchFABTouchable}
        >
          <Ionicons name="search" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Search Modal - Only render when showSearchModal is true */}
      {showSearchModal && (
        <SearchBar
          visible={showSearchModal}
          onClose={toggleSearchModal}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          onClear={clearSearch}
          getFilteredPeople={getFilteredPeople}
          officers={officers}
          students={students}
        />
      )}
    </View>
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
    backgroundColor: "#f8f9fa", // Slightly lighter background
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  searchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Added semi-transparent background
  },
  blurContainer: {
    flex: 1,
    flexDirection: "column",
  },
  overlayBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  keyboardAvoidingView: {
    flex: 1,
    width: "100%",
  },
  searchBarContainer: {
    width: "100%",
    zIndex: 1001,
    flex: 1,
  },
  minimalistSearchHeader: {
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
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
    bottom: SPACING * 2,
    right: SPACING * 2,
    zIndex: 100,
  },
  searchFABTouchable: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME_COLOR,
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  contentContainer: {
    paddingBottom: SPACING * 1.5, // Further increased padding to prevent cropping
    paddingTop: SPACING,
  },
  searchResultsModal: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginHorizontal: SPACING,
    marginTop: SPACING,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
    maxHeight: height * 0.6, // Reduced maximum height
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
    paddingBottom: SPACING * 2, // Reduced bottom padding
  },
  section: {
    paddingHorizontal: SPACING,
    paddingTop: 0,
    marginBottom: SPACING, // Reduced from SPACING * 2
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
    paddingBottom: SPACING * 3, // Increased padding at bottom of list
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)", // Lighter border
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, // Reduced shadow opacity
    shadowRadius: 6, // Increased shadow radius for softer effect
    elevation: 3,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16, // Increased padding for better spacing
    backgroundColor: "white",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 4, // Added margin
  },
  avatar: {
    width: 52, // Slightly larger
    height: 52, // Slightly larger
    borderRadius: 26,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
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
});

export default AdminPeople;
