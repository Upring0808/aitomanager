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
} from "react-native";
import { db, storage, database, auth } from "../../../../config/firebaseconfig";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import {
  ref as databaseRef,
  onValue,
  off,
  get as dbGet,
} from "firebase/database";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import userPresenceService from "../../../../services/UserPresenceService";

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
      console.log("Haptics not available:", error);
    }
  },
  selectionAsync: () => {
    try {
      Haptics.selectionAsync();
    } catch (error) {
      console.log("Haptics not available:", error);
    }
  },
};

const SearchBar = memo(
  ({ onSearch, searchQuery, onClear, visible, onClose, getFilteredPeople }) => {
    const inputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (visible) {
        inputRef.current?.focus();
      }
    }, [visible]);

    if (!visible) return null;

    return (
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.searchModalContainer}>
          <View style={styles.searchModalContent}>
            <View
              style={[
                styles.searchContainer,
                isFocused && styles.searchContainerFocused,
              ]}
            >
              <Ionicons
                name="search"
                size={20}
                color={isFocused ? THEME_SECONDARY : "#94A3B8"}
              />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search people..."
                placeholderTextColor="#94A3B8"
                onChangeText={onSearch}
                value={searchQuery}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                returnKeyType="search"
                selectionColor={THEME_SECONDARY}
                autoFocus
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    onClear();
                    inputRef.current?.focus();
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onClose} style={styles.clearButton}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {searchQuery.length > 0 ? (
            <View style={styles.searchResultsContainer}>
              <FlatList
                data={getFilteredPeople(searchQuery)}
                keyExtractor={(item) => item.id || item.uid}
                renderItem={({ item }) => (
                  <View style={styles.searchResultCard}>
                    <PersonCard
                      item={item}
                      defaultAvatarUri={require("../../../../assets/aito.png")}
                      highlightQuery={searchQuery}
                    />
                  </View>
                )}
                contentContainerStyle={styles.searchResultsList}
                ListEmptyComponent={
                  <View style={styles.emptySearchContainer}>
                    <Ionicons name="search-outline" size={50} color="#CBD5E1" />
                    <Text style={styles.emptySearchTitle}>
                      No matches found
                    </Text>
                  </View>
                }
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={onClose}
              activeOpacity={1}
            />
          )}
        </View>
      </Modal>
    );
  }
);

const PersonCard = memo(({ item, defaultAvatarUri, highlightQuery = "" }) => {
  const [presenceState, setPresenceState] = useState({
    state: "offline",
    last_active: null,
  });
  const [lastSeenText, setLastSeenText] = useState("");
  const presenceRef = useRef(null);
  const isMounted = useRef(true);
  const userId = item.id || item.uid;

  // Log the current state for debugging
  useEffect(() => {
    console.log(`[PersonCard] User ${userId} presence state:`, presenceState);
  }, [presenceState, userId]);

  // Check if this is the current user
  const isCurrentUser = auth.currentUser && userId === auth.currentUser.uid;

  // Force online status for current user
  useEffect(() => {
    if (isCurrentUser) {
      console.log(
        `[PersonCard] This is the current user (${userId}), forcing online status`
      );
      setPresenceState({
        state: "online",
        last_active: Date.now(),
      });
    }
  }, [isCurrentUser, userId]);

  // Fetch user's presence state
  useEffect(() => {
    let intervalId = null;
    if (!userId) return;

    console.log(`[PersonCard] Setting up presence for user ${userId}`);

    // Create a reference to listen for real-time updates
    try {
      const statusRef = databaseRef(database, `status/${userId}`);
      presenceRef.current = statusRef;

      // Skip using get() and just use onValue with initial fetch
      onValue(
        statusRef,
        (snapshot) => {
          if (!isMounted.current) return;

          if (snapshot.exists()) {
            const data = snapshot.val();
            console.log(`[PersonCard] Presence update for ${userId}:`, data);

            // Always show current user as online
            if (isCurrentUser) {
              const currentUserData = { ...data, state: "online" };
              setPresenceState(currentUserData);
            } else {
              setPresenceState(data);
            }

            if (data.state === "offline" && data.last_active) {
              setLastSeenText(
                userPresenceService.formatLastSeen(data.last_active)
              );
            }
          } else {
            console.log(`[PersonCard] No presence data for ${userId}`);
            // For missing data, ensure current user still shows as online
            if (isCurrentUser) {
              setPresenceState({
                state: "online",
                last_active: Date.now(),
              });
            }
          }
        },
        (error) => {
          console.error(
            `[PersonCard] Error in presence listener for user ${userId}:`,
            error
          );
          // On error, ensure current user still shows as online
          if (isCurrentUser) {
            setPresenceState({
              state: "online",
              last_active: Date.now(),
            });
          }
        }
      );
    } catch (error) {
      console.error(
        `[PersonCard] Error setting up presence listener for user ${userId}:`,
        error
      );
      // On error, ensure current user still shows as online
      if (isCurrentUser) {
        setPresenceState({
          state: "online",
          last_active: Date.now(),
        });
      }
    }

    // Set up an interval to update the last seen text
    intervalId = setInterval(() => {
      if (
        isMounted.current &&
        presenceState.state === "offline" &&
        presenceState.last_active
      ) {
        setLastSeenText(
          userPresenceService.formatLastSeen(presenceState.last_active)
        );
      }
    }, 60000); // Update every minute

    return () => {
      isMounted.current = false;

      if (intervalId) {
        clearInterval(intervalId);
      }

      if (presenceRef.current) {
        try {
          off(presenceRef.current);
          presenceRef.current = null;
        } catch (error) {
          console.error(
            `[PersonCard] Error removing presence listener for user ${userId}:`,
            error
          );
        }
      }
    };
  }, [userId, isCurrentUser]);

  // Determine if user is online directly from state
  const isOnline = isCurrentUser || presenceState.state === "online";

  const highlightText = (text, query) => {
    if (!query || query.trim() === "") return text;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <Text key={i} style={styles.highlightedText}>
              {part}
            </Text>
          ) : (
            part
          )
        )}
      </>
    );
  };

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
              isOnline ? styles.onlineIndicator : styles.offlineIndicator,
            ]}
          />
        </View>

        <View style={styles.userInfo}>
          <View style={styles.usernameRow}>
            <Text style={styles.username} numberOfLines={1}>
              {highlightQuery
                ? highlightText(item.username, highlightQuery)
                : item.username}
            </Text>

            {isCurrentUser && (
              <View style={styles.currentUserBadge}>
                <Text style={styles.currentUserText}>You</Text>
              </View>
            )}
          </View>

          <View style={styles.userDetailsRow}>
            {isOnline ? (
              <View style={styles.statusTextContainer}>
                <Text style={styles.onlineText}>Online</Text>
              </View>
            ) : presenceState.last_active ? (
              <Text style={styles.lastSeenText}>Last seen {lastSeenText}</Text>
            ) : null}

            {item.yearLevel && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>Year {item.yearLevel}</Text>
              </View>
            )}

            {item.role && (
              <View style={[styles.badgeContainer, styles.roleBadge]}>
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

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <View style={styles.sectionTitleContainer}>
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
              outputRange: [0, 2000],
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

const People = () => {
  const [officers, setOfficers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSearchFAB, setShowSearchFAB] = useState(true);
  const [refreshingPresence, setRefreshingPresence] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const lastScrollY = useRef(0);
  const fabOpacity = useRef(new Animated.Value(1)).current;

  const defaultAvatarUri = require("../../../../assets/aito.png");

  // Initialize the presence service when the component mounts
  useEffect(() => {
    console.log("[People] Initializing presence service");
    userPresenceService.initialize().catch((err) => {
      console.error("[People] Failed to initialize presence service:", err);
    });

    // Force update status every time this screen is focused
    const updateOnFocus = () => {
      console.log("[People] Screen focused, forcing status update");
      userPresenceService.forceOnlineUpdate().catch((err) => {
        console.error("[People] Error updating status on focus:", err);
      });
    };

    // Call immediately
    updateOnFocus();

    // Clean up on unmount
    return () => {
      console.log("[People] Cleaning up presence service");
      userPresenceService.cleanup().catch((err) => {
        console.error("[People] Failed to cleanup presence service:", err);
      });
    };
  }, []);

  // Function to manually force presence update
  const refreshPresence = async () => {
    try {
      setRefreshingPresence(true);
      Toast.show({
        type: "info",
        text1: "Updating status...",
        position: "bottom",
      });

      await userPresenceService.forceOnlineUpdate();

      // Refresh the data to show updated status
      await fetchData();

      Toast.show({
        type: "success",
        text1: "Online status updated",
        position: "bottom",
      });
    } catch (error) {
      console.error("[People] Error refreshing presence:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update status",
        position: "bottom",
      });
    } finally {
      setRefreshingPresence(false);
    }
  };

  // Toggle debug info (show raw presence data)
  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
    Toast.show({
      type: "info",
      text1: showDebugInfo ? "Debug mode off" : "Debug mode on",
      position: "bottom",
    });
  };

  const getAvatarUrl = async (userId) => {
    try {
      const avatarRef = ref(storage, `avatars/${userId}`);
      return await getDownloadURL(avatarRef);
    } catch (error) {
      console.warn(`No avatar found for user ${userId}`);
      return null;
    }
  };

  const fetchOfficers = async () => {
    try {
      const officersQuery = query(collection(db, "admin"), orderBy("username"));
      const officersSnapshot = await getDocs(officersQuery);

      const officersData = await Promise.all(
        officersSnapshot.docs.map(async (doc) => {
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

      setOfficers(officersData.filter(Boolean));
    } catch (error) {
      console.error("Error fetching officers:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch officers.",
      });
      setOfficers([]);
    }
  };

  const fetchStudents = async () => {
    try {
      const usersQuery = query(collection(db, "users"), orderBy("username"));
      const usersSnapshot = await getDocs(usersQuery);

      const usersData = await Promise.all(
        usersSnapshot.docs.map(async (doc) => {
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

      setStudents(usersData.filter(Boolean));
    } catch (error) {
      console.error("Error fetching students:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch students.",
      });
      setStudents([]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchOfficers(), fetchStudents()]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchData(), userPresenceService.forceOnlineUpdate()]);
      Toast.show({
        type: "success",
        text1: "Refreshed",
        position: "bottom",
        visibilityTime: 1500,
      });
    } catch (error) {
      console.error("[People] Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const clearSearch = () => {
    setSearchQuery("");
  };

  const toggleSearchModal = () => {
    setShowSearchModal(!showSearchModal);
    if (showSearchModal) {
      clearSearch();
    } else {
      safeHaptics.selectionAsync();
    }
  };

  // Add scroll handler to hide/show FAB with simple fade
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
          // Scrolling DOWN - hide FAB
          Animated.timing(fabOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else if (currentScrollY < lastScrollY.current) {
          // Scrolling UP - show FAB
          Animated.timing(fabOpacity, {
            toValue: 1,
            duration: 200,
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
      userPresenceService.updateLastActive();
    }, 3 * 60 * 1000); // Update every 3 minutes while the screen is open

    return () => clearInterval(activityInterval);
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

  // Helper function to get all people for search results
  const getFilteredPeople = (query) => {
    if (!query) return [];

    const allPeople = [...officers, ...students];
    return allPeople.filter((item) =>
      item.username.toLowerCase().includes(query.toLowerCase())
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Debug info panel */}
      {showDebugInfo && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Debug Info</Text>
          <Text style={styles.debugText}>
            Current user: {auth.currentUser ? auth.currentUser.uid : "None"}
          </Text>
          <Text style={styles.debugText}>
            UserLoggedIn: {auth.currentUser ? "Yes" : "No"}
          </Text>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={refreshPresence}
          >
            <Text style={styles.debugButtonText}>Force Status Update</Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.FlatList
        ref={scrollViewRef}
        contentContainerStyle={styles.contentContainer}
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

      {/* Presence Refresh Button */}
      <View style={styles.presenceFAB}>
        <TouchableOpacity
          onPress={refreshPresence}
          disabled={refreshingPresence}
          activeOpacity={0.8}
          style={[
            styles.presenceFABTouchable,
            refreshingPresence && styles.presenceFABDisabled,
          ]}
        >
          {refreshingPresence ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="wifi" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Debug Button */}
      <View style={styles.debugFAB}>
        <TouchableOpacity
          onPress={toggleDebugInfo}
          activeOpacity={0.8}
          style={[
            styles.debugFABTouchable,
            showDebugInfo && styles.debugFABActive,
          ]}
        >
          <Ionicons name="bug" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Modal */}
      <SearchBar
        visible={showSearchModal}
        onClose={toggleSearchModal}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        onClear={clearSearch}
        getFilteredPeople={getFilteredPeople}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  contentContainer: {
    paddingBottom: SPACING * 4,
    paddingTop: SPACING,
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
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  searchModalContainer: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.98)",
  },
  searchModalContent: {
    backgroundColor: "#FFF",
    paddingVertical: SPACING,
    paddingHorizontal: SPACING,
    paddingTop:
      Platform.OS === "android"
        ? StatusBar.currentHeight + SPACING || SPACING
        : SPACING,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  searchResultsContainer: {
    flex: 1,
  },
  searchResultsList: {
    paddingHorizontal: SPACING,
    paddingTop: SPACING,
  },
  searchResultCard: {
    marginBottom: 8,
  },
  emptySearchContainer: {
    paddingTop: SPACING * 10,
    alignItems: "center",
  },
  emptySearchTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: SPACING,
  },
  modalOverlay: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: SPACING,
    height: 50,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  searchContainerFocused: {
    borderColor: THEME_SECONDARY,
  },
  clearButton: {
    padding: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING / 2,
    fontSize: 16,
    color: "#333",
    height: 50,
  },
  highlightedText: {
    backgroundColor: "rgba(62, 146, 204, 0.2)",
    color: THEME_COLOR,
    fontWeight: "bold",
  },
  section: {
    paddingHorizontal: SPACING,
    paddingTop: 0,
    marginBottom: SPACING,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING,
    marginTop: 0,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: THEME_COLOR,
    letterSpacing: -0.5,
  },
  countContainer: {
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
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
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "white",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  },
  username: {
    fontSize: 15,
    fontWeight: "500",
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
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  roleBadge: {
    backgroundColor: "rgba(62, 146, 204, 0.15)",
  },
  statusIndicator: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
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
    backgroundColor: "#4CAF50",
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
  },
  emptyText: {
    textAlign: "center",
    color: "#95A5A6",
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
    marginBottom: 4,
    fontStyle: "italic",
  },
  statusTextContainer: {
    marginRight: 8,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  presenceFAB: {
    position: "absolute",
    bottom: SPACING * 2,
    left: SPACING * 2,
    zIndex: 100,
  },
  presenceFABTouchable: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME_SECONDARY,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  presenceFABDisabled: {
    backgroundColor: "#94A3B8",
  },
  currentUserBadge: {
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  currentUserText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  debugFAB: {
    position: "absolute",
    bottom: SPACING * 6,
    left: SPACING * 2,
    zIndex: 100,
  },
  debugFABTouchable: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#64748B",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  debugFABActive: {
    backgroundColor: "#EF4444",
  },
  debugPanel: {
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: SPACING,
    margin: SPACING,
    borderRadius: 8,
    zIndex: 999,
  },
  debugTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },
  debugText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginBottom: 4,
  },
  debugButton: {
    backgroundColor: "#3E92CC",
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 8,
  },
  debugButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});

export default People;
