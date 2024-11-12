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
  PanResponder,
  searchTranslateY,
} from "react-native";
import { db, storage } from "../../../../config/firebaseconfig";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const SPACING = 16;
const AVATAR_SIZE = 50;
const HEADER_HEIGHT = 80;
const SCROLL_THRESHOLD = 50;

// SearchBar, SortButton, PersonCard components remain the same...

const SearchBar = memo(({ onSearch }) => (
  <View style={styles.searchContainer}>
    <Ionicons name="search" size={20} color="#666" />
    <TextInput
      style={styles.searchInput}
      placeholder="Search by username..."
      placeholderTextColor="#666"
      onChangeText={onSearch}
    />
  </View>
));
const SortButton = memo(({ isAscending, onToggleSort }) => (
  <TouchableOpacity
    style={styles.sortButton}
    onPress={onToggleSort}
    activeOpacity={0.7}
  >
    <Text style={styles.sortText}>{isAscending ? "A-Z" : "Z-A"}</Text>
    <Ionicons
      name={isAscending ? "arrow-down" : "arrow-up"}
      size={20}
      color={isAscending ? "#007AFF" : "#666"}
    />
  </TouchableOpacity>
));

const PersonCard = memo(({ item, defaultAvatarUri }) => (
  <View style={styles.card}>
    <Image
      source={item.avatarUrl ? { uri: item.avatarUrl } : defaultAvatarUri}
      style={styles.avatar}
      defaultSource={defaultAvatarUri}
    />
    <View style={styles.userInfo}>
      <Text style={styles.username} numberOfLines={1}>
        {item.username}
      </Text>
    </View>
  </View>
));

const Section = memo(({ title, data, defaultAvatarUri, showCount = true }) => {
  const ListEmptyComponent = useCallback(
    () => <Text style={styles.emptyText}>No {title.toLowerCase()} found</Text>,
    [title]
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionLine} />

        {showCount && data.length > 0 && (
          <View style={styles.countContainer}>
            <Text style={styles.countLabel}>Total</Text>
            <Text style={styles.countNumber}>{data.length}</Text>
          </View>
        )}
      </View>
      <View style={styles.listContainer}>
        {data.length === 0 ? (
          <ListEmptyComponent />
        ) : (
          data.map((item) => (
            <PersonCard
              key={item.id || item.uid}
              item={item}
              defaultAvatarUri={defaultAvatarUri}
            />
          ))
        )}
      </View>
    </View>
  );
});

const People = () => {
  const [officers, setOfficers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAscending, setIsAscending] = useState(true);
  const [showSearch, setShowSearch] = useState(true);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerAnimatedValue = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef(null);
  const isScrolling = useRef(false);
  const lastScrollY = useRef(0);
  const timeoutRef = useRef(null);

  // Improved header animation with spring configuration
  const toggleHeader = (show) => {
    Animated.spring(headerAnimatedValue, {
      toValue: show ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        if (!isScrolling.current) {
          isScrolling.current = true;
        }

        // Determine scroll direction and toggle header
        if (
          currentScrollY > lastScrollY.current &&
          currentScrollY > SCROLL_THRESHOLD
        ) {
          // Scrolling down
          if (showSearch) {
            setShowSearch(false);
            toggleHeader(false);
          }
        } else if (
          currentScrollY < lastScrollY.current ||
          currentScrollY < SCROLL_THRESHOLD
        ) {
          // Scrolling up or near top
          if (!showSearch) {
            setShowSearch(true);
            toggleHeader(true);
          }
        }

        lastScrollY.current = currentScrollY;

        // Set timeout to detect scroll end
        timeoutRef.current = setTimeout(() => {
          isScrolling.current = false;
          // If we're at the top, always show the header
          if (currentScrollY <= SCROLL_THRESHOLD) {
            setShowSearch(true);
            toggleHeader(true);
          }
        }, 150);
      },
    }
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const defaultAvatarUri = require("../../../../assets/aito.png");

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 0 && !showSearch;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0 && gestureState.dy <= PULL_THRESHOLD) {
        searchTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy >= PULL_THRESHOLD) {
        Animated.spring(searchTranslateY, {
          toValue: PULL_THRESHOLD,
          useNativeDriver: true,
        }).start();
        setShowSearch(true);
      } else {
        Animated.spring(searchTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

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
        return isAscending ? comparison : -comparison;
      });
    },
    [searchQuery, isAscending]
  );

  const filteredOfficers = filterAndSortData(officers);
  const filteredStudents = filterAndSortData(students);

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3E588Faa" />
      </View>
    );
  }

  const headerTransform = {
    transform: [
      {
        translateY: headerAnimatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-HEADER_HEIGHT, 0],
          extrapolate: "clamp",
        }),
      },
    ],
    opacity: headerAnimatedValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.5, 1],
      extrapolate: "clamp",
    }),
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, headerTransform]}>
        <View style={styles.headerContent}>
          <SearchBar onSearch={setSearchQuery} />
          <SortButton
            isAscending={isAscending}
            onToggleSort={() => setIsAscending(!isAscending)}
          />
        </View>
      </Animated.View>
      <Animated.FlatList
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: HEADER_HEIGHT + SPACING },
        ]}
        data={[
          {
            id: "officers",
            title: "Officers",
            data: filterAndSortData(officers),
          },
          {
            id: "students",
            title: "Students",
            data: filterAndSortData(students),
          },
        ]}
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
        bounces={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    position: "absolute",
    top: -57,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    zIndex: 1000,
    paddingTop: 10, // Safe area padding
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING,
    paddingVertical: SPACING / 2,
    paddingBottom: SPACING,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: SPACING,
    height: 40,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING / 2,
    fontSize: 15,
    color: "#333",
    height: 40,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    marginLeft: SPACING,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  sortText: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  contentContainer: {
    paddingBottom: SPACING,
    marginTop: -57,
  },
  section: {
    paddingHorizontal: SPACING,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "500",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  sectionLine: {
    marginTop: 50,
    width: "100%",
    borderBottomWidth: 0.8,
    borderBottomColor: "#3E588Fcc",
    marginHorizontal: -100,
  },
  countContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  countLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
    fontWeight: "500",
  },
  countNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
  },
  listContainer: {
    width: "100%",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    padding: SPACING,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#F5F5F5",
  },
  userInfo: {
    flex: 1,
    marginLeft: SPACING,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    letterSpacing: -0.3,
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
});

export default People;
