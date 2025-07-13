import "react-native-gesture-handler";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  StatusBar,
  Platform,
  SafeAreaView,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
// Import BackHandler conditionally based on platform
let BackHandler;
if (Platform.OS !== "web") {
  BackHandler = require("react-native").BackHandler;
} else {
  // Create a mock BackHandler for web to prevent errors
  BackHandler = {
    addEventListener: () => ({ remove: () => {} }),
    remove: () => {},
  };
}

import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as SplashScreen from "expo-splash-screen";

// Direct import for firebase/auth to avoid the modular instance error
import {
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import Firebase services with newer approach
import { getAuth, getDatabase, getDb, getStorage } from "./firebase";
import { collection, query, where, getDocs, onSnapshot, writeBatch, doc, onSnapshot as firestoreOnSnapshot, orderBy, limit } from "firebase/firestore";
import { auth, db } from "./config/firebaseconfig";
import { formatUTCRelativeTime } from "./utils/timeUtils";

// Import services
import userPresenceService from "./services/UserPresenceService";
import adminStatusService from "./services/AdminStatusService";
import FontLoader from "./FontLoader";
import studentStatusService from "./services/StudentStatusService";

// Import context providers
import { OnlineStatusProvider } from "./contexts/OnlineStatusContext";
import { AuthProvider } from "./context/AuthContext";

// Import font patches
try {
  require("./patchFonts");
} catch (e) {
  console.warn("Error loading font patches:", e);
}

// Import screens
import Index from "./components/Index";
import LandingScreen from "./screens/LandingScreen";
import LoginScreen from "./screens/LoginScreen";
import Register from "./screens/Auth/Register";
import RegisterAdmin from "./screens/Auth/RegisterAdmin";
import AdminLogin from "./screens/Auth/AdminLogin";
import Dashboard from "./components/Dashboard";
import AdminDashboard from "./components/AdminDashboard";
import Toast from "react-native-toast-message";

// Import Dashboard screens for nested navigation
import Home from "./screens/Auth/Dashboard/User/Home";
import Fines from "./screens/Auth/Dashboard/User/Fines";
import People from "./screens/Auth/Dashboard/User/People";
import Profile from "./screens/Auth/Dashboard/User/Profile";
import Events from "./screens/Auth/Dashboard/User/Events";
import ChatScreen from "./screens/Auth/Dashboard/User/ChatScreen";
import HelpScreen from "./screens/Auth/Dashboard/User/HelpScreen";
import NotificationsScreen from "./screens/Auth/Dashboard/User/NotificationsScreen";

// Import Admin Dashboard screens for nested navigation
import AdminHome from "./screens/Auth/Dashboard/Admin/AdminHome";
import AdminFines from "./screens/Auth/Dashboard/Admin/AdminFines";
import AdminPeople from "./screens/Auth/Dashboard/Admin/AdminPeople";
import AdminProfile from "./screens/Auth/Dashboard/Admin/AdminProfile";
import AdminEvents from "./screens/Auth/Dashboard/Admin/AdminEvents";
import AdminAttendance from "./screens/Auth/Dashboard/Admin/AdminAttendance";
import EventQR from "./screens/Auth/Dashboard/Admin/EventQR";
import EventAttendance from "./screens/Auth/Dashboard/Admin/EventAttendance";
import ActivityHistory from "./screens/Auth/Dashboard/Admin/ActivityHistory";
import AdminReports from "./screens/Auth/Dashboard/Admin/AdminReports";
import StudentOverview from "./screens/Auth/Dashboard/Admin/StudentOverview";
import CreateOrganizationScreen from "./screens/CreateOrganizationScreen";
import OrgCodeVerificationScreen from "./screens/OrgCodeVerificationScreen";
import EntryScreen from "./screens/EntryScreen";
import QRLoginScreen from "./screens/QRLoginScreen";
import FineSettingsScreen from "./screens/Auth/Dashboard/Admin/FineSettingsScreen";
import AdminChatScreen from "./screens/Auth/Dashboard/Admin/AdminChatScreen";
import { useNavigation } from '@react-navigation/native';

// Override default Text component to use system fonts
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = { fontFamily: undefined };

const Stack = createStackNavigator();

// Custom header component for Chat screen with admin status
const ChatHeaderTitle = () => {
  const [adminStatus, setAdminStatus] = useState({ isOnline: false, lastActive: null });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Listen to admin status changes
    const adminStatusRef = doc(db, 'adminStatus', 'main');
    const unsubscribe = firestoreOnSnapshot(adminStatusRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setAdminStatus({
          isOnline: data.isOnline || false,
          lastActive: data.lastActive?.toDate() || null,
        });
      } else {
        setAdminStatus({
          isOnline: false,
          lastActive: null,
        });
      }
    }, (error) => {
      console.error('Error fetching admin status:', error);
      setAdminStatus({
        isOnline: false,
        lastActive: null,
      });
    });

    // Add interval to update 'now' every 10 seconds for more responsive updates
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const formatLastActive = (lastActive) => {
    return formatUTCRelativeTime(lastActive);
  };

  return (
    <View style={styles.chatHeaderContainer}>
      <View style={styles.chatHeaderContent}>
        <View style={styles.chatHeaderAvatar}>
          <MaterialIcons name="admin-panel-settings" size={20} color="#007BFF" />
        </View>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>Admin</Text>
          <View style={styles.chatHeaderStatusRow}>
            <View style={[
              styles.chatHeaderStatusIndicator,
              { backgroundColor: adminStatus.isOnline ? '#10b981' : '#64748b' }
            ]} />
            <Text style={styles.chatHeaderStatusText}>
              {adminStatus.isOnline ? 'Active now' : 'Offline'}
            </Text>
            {!adminStatus.isOnline && adminStatus.lastActive && (
              <Text style={styles.chatHeaderLastActiveText}>
                • {formatLastActive(adminStatus.lastActive)}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

// Custom header component for Chat screen with custom positioning
const ChatHeader = () => {
  const navigation = useNavigation();
  const [adminStatus, setAdminStatus] = useState({ isOnline: false, lastActive: null });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Listen to admin status changes with real-time updates
    const adminStatusRef = doc(db, 'adminStatus', 'main');
    const unsubscribe = firestoreOnSnapshot(adminStatusRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setAdminStatus({
          isOnline: data.isOnline || false,
          lastActive: data.lastActive?.toDate() || null,
        });
      } else {
        setAdminStatus({
          isOnline: false,
          lastActive: null,
        });
      }
    }, (error) => {
      console.error('Error fetching admin status:', error);
      setAdminStatus({
        isOnline: false,
        lastActive: null,
      });
    });

    // Add interval to update 'now' every 10 seconds for more responsive updates
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const formatLastActive = (lastActive) => {
    return formatUTCRelativeTime(lastActive);
  };

  return (
    <SafeAreaView style={{ backgroundColor: '#fff' }}>
      <View style={styles.customChatHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        
        <View style={styles.customChatHeaderContent}>
          <View style={styles.chatHeaderAvatar}>
            <MaterialIcons name="admin-panel-settings" size={20} color="#007BFF" />
          </View>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>Admin</Text>
            <View style={styles.chatHeaderStatusRow}>
              <View style={[
                styles.chatHeaderStatusIndicator,
                { backgroundColor: adminStatus.isOnline ? '#10b981' : '#64748b' }
              ]} />
              <Text style={styles.chatHeaderStatusText}>
                {adminStatus.isOnline ? 'Active now' : 'Offline'}
              </Text>
              {!adminStatus.isOnline && adminStatus.lastActive && (
                <Text style={styles.chatHeaderLastActiveText}>
                  • {formatLastActive(adminStatus.lastActive)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};





// Custom header component for user screens with notification badges
const UserHeaderRight = () => {
  const navigation = useNavigation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Fetch unread counts
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // Listen for unread messages
      const messagesRef = collection(db, 'messages');
      const messagesQuery = query(
        messagesRef,
        where('participants', 'array-contains', user.uid),
        where('read', '==', false),
        where('senderRole', '==', 'admin')
      );
      
      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        setUnreadMessages(snapshot.size);
      });
      
      // Listen for unread notifications
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = query(
        notificationsRef,
        where('recipients', 'array-contains', user.uid),
        where('read', '==', false)
      );
      
      const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        setUnreadNotifications(snapshot.size);
      });
      
      return () => {
        unsubscribeMessages();
        unsubscribeNotifications();
      };
    }
  }, []);
  
  return (
    <View style={styles.headerRightContainer}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('Help')}
        style={styles.headerIconButton}
        activeOpacity={0.7}
      >
        <MaterialIcons name="help" size={22} color="#0A2463" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => navigation.navigate('Chat')}
        style={styles.headerIconButton}
        activeOpacity={0.7}
      >
        <MaterialIcons name="chat" size={22} color="#0A2463" />
        {unreadMessages > 0 && (
          <View style={styles.modernBadge}>
            <Text style={styles.modernBadgeText}>
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => navigation.navigate('Notifications')}
        style={styles.headerIconButton}
        activeOpacity={0.7}
      >
        <MaterialIcons name="notifications-active" size={22} color="#0A2463" />
        {unreadNotifications > 0 && (
          <View style={styles.modernBadge}>
            <Text style={styles.modernBadgeText}>
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

// Custom header title component with iconic Fivent branding
const FiventHeaderTitle = () => {
  return (
    <View style={styles.fiventHeaderContainer}>
      <Image 
        source={require('./assets/fivent1.png')} 
        style={styles.fiventLogo}
        resizeMode="contain"
      />
      <Text style={styles.fiventBrandText}>ivent</Text>
    </View>
  );
};

// Custom header component for admin screens with notification badges
const AdminHeaderRight = () => {
  const navigation = useNavigation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Fetch unread student messages
  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const messagesQuery = query(
      messagesRef,
      where('senderRole', '==', 'student'),
      where('read', '==', false)
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setUnreadMessages(snapshot.size);
    });
    
    return unsubscribe;
  }, []);
  
  return (
    <View style={styles.headerRightContainer}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('AdminChat')}
        style={styles.headerIconButton}
        activeOpacity={0.7}
      >
        <MaterialIcons name="chat" size={22} color="#0A2463" />
        {unreadMessages > 0 && (
          <View style={styles.modernBadge}>
            <Text style={styles.modernBadgeText}>
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

// Create navigators for Dashboard and AdminDashboard
const DashboardNavigator = () => {
  const DashboardStack = createStackNavigator();
  
  // Student status management for all student screens
  const [isNavigatorMounted, setIsNavigatorMounted] = useState(false);
  
  // Initialize student status when navigator mounts
  useEffect(() => {
    const initializeStudentStatus = async () => {
      try {
        if (auth.currentUser) {
          console.log("[DashboardNavigator] Initializing student status for user:", auth.currentUser.uid);
          await studentStatusService.initialize();
          setIsNavigatorMounted(true);
          console.log("[DashboardNavigator] Student status initialized successfully");
        }
      } catch (error) {
        console.error("[DashboardNavigator] Error initializing student status:", error);
      }
    };

    initializeStudentStatus();

    // Cleanup student status when navigator unmounts (only on logout)
    return () => {
      const cleanupStudentStatus = async () => {
        try {
          console.log("[DashboardNavigator] Starting student status cleanup");
          console.log("[DashboardNavigator] Current user:", auth.currentUser?.uid);
          await studentStatusService.cleanup();
          console.log("[DashboardNavigator] Student status cleaned up successfully");
        } catch (error) {
          console.error("[DashboardNavigator] Error cleaning up student status:", error);
        }
      };
      console.log("[DashboardNavigator] Navigator unmounting, calling cleanup");
      cleanupStudentStatus();
    };
  }, []);

  // Keep student online while navigator is mounted
  useEffect(() => {
    if (!isNavigatorMounted || !auth.currentUser) return;

    // StudentStatusService handles periodic updates automatically
    // No need for additional periodic updates here
    console.log("[DashboardNavigator] Student status management active");
  }, [isNavigatorMounted]);
  
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: true }}>
      <DashboardStack.Screen 
        name="Fivent" 
        component={Dashboard}
        options={{
          headerTitle: () => <FiventHeaderTitle />,
          headerRight: () => <UserHeaderRight />,
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <DashboardStack.Screen 
        name="Home" 
        component={Home}
        options={{
          headerRight: () => <UserHeaderRight />,
        }}
      />
      <DashboardStack.Screen 
        name="Fines" 
        component={Fines}
        options={{
          headerRight: () => <UserHeaderRight />,
        }}
      />
      <DashboardStack.Screen 
        name="People" 
        component={People}
        options={{
          headerRight: () => <UserHeaderRight />,
        }}
      />
      <DashboardStack.Screen 
        name="Profile" 
        component={Profile}
        options={{
          headerRight: () => <UserHeaderRight />,
        }}
      />
      <DashboardStack.Screen 
        name="Events" 
        component={Events}
        options={{
          headerRight: () => <UserHeaderRight />,
        }}
      />
      <DashboardStack.Screen name="Chat" component={ChatScreen} 
        options={{
          header: () => <ChatHeader />,
        }}
      />
      <DashboardStack.Screen name="Help" component={HelpScreen} 
        options={{
          title: "Help & Support",
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#007BFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <DashboardStack.Screen name="Notifications" component={NotificationsScreen} 
        options={{
          title: "Notifications",
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#007BFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </DashboardStack.Navigator>
  );
};

// Create AdminDashboard navigator
const AdminDashboardNavigator = () => {
  const AdminDashboardStack = createStackNavigator();
  
  // Admin status management for all admin screens
  const [isNavigatorMounted, setIsNavigatorMounted] = useState(false);
  
  // Initialize admin status when navigator mounts
  useEffect(() => {
    const initializeAdminStatus = async () => {
      try {
        if (auth.currentUser) {
          console.log("[AdminDashboardNavigator] Initializing admin status for user:", auth.currentUser.uid);
          await adminStatusService.initialize();
          setIsNavigatorMounted(true);
          console.log("[AdminDashboardNavigator] Admin status initialized successfully");
        }
      } catch (error) {
        console.error("[AdminDashboardNavigator] Error initializing admin status:", error);
      }
    };

    initializeAdminStatus();

    // Cleanup admin status when navigator unmounts (only on logout)
    return () => {
      const cleanupAdminStatus = async () => {
        try {
          console.log("[AdminDashboardNavigator] Cleaning up admin status");
          await adminStatusService.cleanup();
          console.log("[AdminDashboardNavigator] Admin status cleaned up successfully");
        } catch (error) {
          console.error("[AdminDashboardNavigator] Error cleaning up admin status:", error);
        }
      };
      cleanupAdminStatus();
    };
  }, []);

  // Keep admin online while navigator is mounted
  useEffect(() => {
    if (!isNavigatorMounted || !auth.currentUser) return;

    // AdminStatusService handles periodic updates automatically
    // No need for additional periodic updates here
    console.log("[AdminDashboardNavigator] Admin status management active");
  }, [isNavigatorMounted]);
  
  return (
    <AdminDashboardStack.Navigator screenOptions={{ headerShown: true }}>
      <AdminDashboardStack.Screen
        name="AdminDashboardMain"
        component={AdminDashboard}
        options={{
          headerRight: () => <AdminHeaderRight />,
        }}
      />
      <AdminDashboardStack.Screen name="AdminHome" component={AdminHome} />
      <AdminDashboardStack.Screen name="AdminFines" component={AdminFines} />
      <AdminDashboardStack.Screen name="AdminPeople" component={AdminPeople} />
      <AdminDashboardStack.Screen
        name="AdminProfile"
        component={AdminProfile}
      />
      <AdminDashboardStack.Screen name="AdminEvents" component={AdminEvents} />
      <AdminDashboardStack.Screen
        name="AdminAttendance"
        component={AdminAttendance}
      />
      <AdminDashboardStack.Screen name="EventQR" component={EventQR} />
      <AdminDashboardStack.Screen
        name="EventAttendance"
        component={EventAttendance}
      />
      <AdminDashboardStack.Screen
        name="ActivityHistory"
        component={ActivityHistory}
      />
      <AdminDashboardStack.Screen name="Reports" component={AdminReports} />
      <AdminDashboardStack.Screen
        name="StudentOverview"
        component={StudentOverview}
      />
      <AdminDashboardStack.Screen name="AdminChat" component={AdminChatScreen} 
        options={{
          headerShown: false,
        }}
      />
    </AdminDashboardStack.Navigator>
  );
};

// Utility function to clear Firebase storage
const clearFirebaseStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const firebaseKeys = keys.filter(
      (key) =>
        key.startsWith("@firebase:") ||
        key.startsWith("@FirebaseAuth:") ||
        key.startsWith("@MockFirebaseAuth:") ||
        key.includes("firebaseLocalStorage")
    );

    if (firebaseKeys.length > 0) {
      console.log("[App] Clearing Firebase storage keys:", firebaseKeys);
      await AsyncStorage.multiRemove(firebaseKeys);
    }
  } catch (error) {
    console.error("[App] Error clearing Firebase storage:", error);
  }
};

// Create LoadingScreen component
const LoadingScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={{ marginTop: 20 }}>Initializing application...</Text>
    </View>
  );
};

const App = () => {
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const appState = useRef(AppState.currentState);
  const navigationRef = useRef(null);
  const authInitialized = useRef(false);
  const navigationInitialized = useRef(false);

  // Handle navigation ready
  const handleNavigationReady = () => {
    console.log("[App] Navigation container is ready");
    setIsNavigationReady(true);
    navigationInitialized.current = true;
  };

  // Handle user state changes using Firebase web SDK
  useEffect(() => {
    // Check if auth is initialized
    const auth = getAuth();
    if (!auth) {
      console.error(
        "[App] Auth is not initialized yet, cannot subscribe to auth changes"
      );
      setInitializing(false);
      setFirebaseReady(true);
      return () => {};
    }

    console.log("[App] Setting up auth state listener");

    try {
      // Use direct import of onAuthStateChanged
      const unsubscribe = firebaseOnAuthStateChanged(
        auth,
        async (currentUser) => {
          console.log(
            "[App] Auth state changed, user:",
            currentUser ? currentUser.uid : null,
            "isResetting:",
            isResetting
          );

          // If we're in the middle of a reset, don't process auth changes
          if (isResetting) {
            console.log("[App] Skipping auth change during navigation reset");
            return;
          }

          // Check if we're in the middle of a logout process
          if (navigationRef.current) {
            const currentRoute = navigationRef.current.getCurrentRoute();
            if (currentRoute?.params?.isLoggingOut) {
              console.log("[App] Skipping auth change during logout process");
              return;
            }
          }

          setUser(currentUser);
          setUserLoggedIn(!!currentUser);

          if (currentUser) {
            try {
              // Check if user is an admin
              const db = getDb();
              const adminQuery = query(
                collection(db, "admin"),
                where("uid", "==", currentUser.uid)
              );
              const adminSnapshot = await getDocs(adminQuery);
              const isAdminUser = !adminSnapshot.empty;
              setIsAdmin(isAdminUser);

              // Initialize presence service for logged-in user
              console.log("[App] Initializing presence service for new login");
              await userPresenceService.initialize();

              // Force multiple updates to ensure it registers
              console.log("[App] Forcing multiple online status updates");
              userPresenceService.forceOnlineUpdate();
              setTimeout(() => userPresenceService.forceOnlineUpdate(), 1000);
              setTimeout(() => userPresenceService.forceOnlineUpdate(), 3000);
            } catch (error) {
              console.error("[App] Error initializing presence:", error);
            }
          } else {
            // User logged out, cleanup services
            console.log(
              "[App] Cleaning up services for logged out user"
            );
            try {
              await userPresenceService.cleanup();
            } catch (error) {
              console.error("[App] Error cleaning up presence service:", error);
            }
            setIsAdmin(false);
          }

          if (initializing) {
            setInitializing(false);
            setFirebaseReady(true);
            authInitialized.current = true;
          }
        }
      );

      return unsubscribe; // unsubscribe on unmount
    } catch (error) {
      console.error("[App] Error setting up auth listener:", error);
      setInitializing(false);
      setFirebaseReady(true);
      return () => {};
    }
  }, [initializing, isResetting]);

  // Handle app state changes (background, active, inactive)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log(
        "[App] App state changed from",
        appState.current,
        "to",
        nextAppState
      );

      // App came back to foreground from background
      if (appState.current === "background" && nextAppState === "active") {
        if (userLoggedIn) {
          console.log("[App] App came to foreground, refreshing online status");
          userPresenceService.forceOnlineUpdate();
        }
      }

      // App is going to background - ensure we have disconnect handler setup
      if (appState.current === "active" && nextAppState === "background") {
        if (userLoggedIn) {
          console.log(
            "[App] App going to background, ensuring disconnect handler is set"
          );
          // Web SDK handles disconnect through onDisconnect
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [userLoggedIn]);

  // Force presence update on an interval
  useEffect(() => {
    if (!userLoggedIn) return;

    const updatePresence = () => {
      console.log("[App] Forcing presence update from interval");
      userPresenceService.forceOnlineUpdate();
    };

    // Update status immediately
    updatePresence();

    // Then set interval for regular updates
    const interval = setInterval(updatePresence, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [userLoggedIn]);

  // Main navigation structure with better conditional rendering
  const renderNavigationContent = () => {
    // Show loading screen while Firebase initializes
    if (initializing || !firebaseReady) {
      return (
        <Stack.Screen
          name="Loading"
          component={LoadingScreen}
          options={{ gestureEnabled: false }}
        />
      );
    }

    return (
      <>
        <Stack.Screen name="EntryScreen" component={EntryScreen} />
        <Stack.Screen name="LandingScreen" component={LandingScreen} />
        <Stack.Screen
          name="OrgCodeVerification"
          component={OrgCodeVerificationScreen}
        />
        <Stack.Screen name="QRLoginScreen" component={QRLoginScreen} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="RegisterAdmin" component={RegisterAdmin} />
        <Stack.Screen name="AdminLogin" component={AdminLogin} />
        <Stack.Screen name="Dashboard" component={DashboardNavigator} />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardNavigator}
        />
        <Stack.Screen name="FineSettingsScreen" component={FineSettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EventAttendance" component={EventAttendance} />
        <Stack.Screen
          name="CreateOrganization"
          component={CreateOrganizationScreen}
        />
      </>
    );
  };

  // Show loading screen while Firebase initializes auth state
  if (initializing || !firebaseReady) {
    return <LoadingScreen />;
  }

  // Wrap the app content with FontLoader
  return (
    <AuthProvider>
      <OnlineStatusProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={handleNavigationReady}
          fallback={<LoadingScreen />}
        >
          <StatusBar
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent={true}
          />
          <FontLoader>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                cardStyleInterpolator: ({ current, layouts }) => {
                  return {
                    cardStyle: {
                      transform: [
                        {
                          translateX: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.width, 0],
                          }),
                        },
                      ],
                    },
                  };
                },
              }}
              initialRouteName="EntryScreen"
            >
              {renderNavigationContent()}
            </Stack.Navigator>
          </FontLoader>
          <Toast />
        </NavigationContainer>
      </OnlineStatusProvider>
    </AuthProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  fiventHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fiventLogo: {
    width: 50,
    height: 50,
    right:10,
    
  },
  fiventBrandText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#203562',
    letterSpacing: 1.5,
    fontFamily: 'Lato-Bold',
    textTransform: 'lowercase',
    right:24,
    top:3,
  },
  headerRightContainer: {
    flexDirection: 'row',
    marginRight: 16,
    alignItems: 'center',
    gap: 20,
  },
  headerIconButton: {
    position: 'relative',
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  modernBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#D92626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#D92626',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  modernBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Lato-Bold',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatHeaderContainer: {
    
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 0,
    backgroundColor: '#fff',
    width: '100%',
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
  },
  chatHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  chatHeaderStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chatHeaderStatusText: {
    fontSize: 14,
    color: '#64748b',
  },
  chatHeaderLastActiveText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },
  customChatHeader: {
    paddingTop:39,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 0,
    backgroundColor: '#fff',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 10,
    marginLeft: 5,
  },
  customChatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingLeft: 5,
  },
});
