import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../../../config/firebaseconfig';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setCurrentUser(user);
      fetchNotifications(user.uid);
      markNotificationsAsRead(user.uid);
    }
  }, []);

  const markNotificationsAsRead = async (userId) => {
    try {
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = query(
        notificationsRef,
        where('recipients', 'array-contains', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(notificationsQuery);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const fetchNotifications = (userId) => {
    setLoading(true);
    
    // Fetch notifications from Firestore
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipients', 'array-contains', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationList = [];
      snapshot.forEach((doc) => {
        notificationList.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() ? doc.data().timestamp.toDate() : new Date(),
        });
      });
      setNotifications(notificationList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
      // If no notifications collection exists, create sample notifications
      createSampleNotifications(userId);
    });

    return unsubscribe;
  };

  const createSampleNotifications = async (userId) => {
    // Create sample notifications for demonstration
    const sampleNotifications = [
      {
        id: '1',
        title: 'Welcome to Fivent!',
        message: 'Welcome to the student portal. You can now track events, fines, and communicate with admins.',
        type: 'welcome',
        timestamp: new Date(),
        read: false,
      },
      {
        id: '2',
        title: 'New Event: Student Orientation',
        message: 'A new event has been scheduled for tomorrow at 2:00 PM. Don\'t forget to attend!',
        type: 'event',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        read: false,
      },
      {
        id: '3',
        title: 'Fine Payment Reminder',
        message: 'You have an outstanding fine of ₱50.00. Please settle it as soon as possible.',
        type: 'fine',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        read: true,
      },
    ];
    setNotifications(sampleNotifications);
    setLoading(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'event':
        return 'event';
      case 'fine':
        return 'payment';
      case 'welcome':
        return 'celebration';
      case 'announcement':
        return 'announcement';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'event':
        return '#007BFF';
      case 'fine':
        return '#ef4444';
      case 'welcome':
        return '#10b981';
      case 'announcement':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const renderNotification = (notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationCard,
        !notification.read && styles.unreadCard
      ]}
    >
      <View style={[
        styles.notificationIcon,
        { backgroundColor: getNotificationColor(notification.type) + '20' }
      ]}>
        <MaterialIcons 
          name={getNotificationIcon(notification.type)} 
          size={24} 
          color={getNotificationColor(notification.type)} 
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationTime}>
            {notification.timestamp?.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
        {!notification.read && (
          <View style={styles.unreadIndicator} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>
        You'll see important updates, announcements, and reminders here.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length > 0 ? (
            notifications.map(renderNotification)
          ) : (
            renderEmptyState()
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unreadCard: {
    borderColor: '#007BFF',
    backgroundColor: '#f0f7ff',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007BFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});

export default NotificationsScreen; 