import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ActionSheetIOS,
  Animated,
  Easing,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../../../config/firebaseconfig';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDoc,
  doc,
  updateDoc,
  getDocs,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import studentPresenceService from '../../../../services/StudentPresenceService';
import { formatUTCTime, formatUTCRelativeTime } from '../../../../utils/timeUtils';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Text strings must be rendered within a <Text> component']);


const AdminChatScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [studentStatuses, setStudentStatuses] = useState({});
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionSheetMessageId, setActionSheetMessageId] = useState(null);
  const [actionSheetAnim] = useState(new Animated.Value(0));
  const [keyboardHeight] = useState(new Animated.Value(0));
  const [keyboardVisible, setKeyboardVisible] = useState(false);


  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setCurrentUser(user);
      fetchConversations();
      
      // Initialize student presence with cleanup
      let cleanup;
      initializeStudentPresence().then((cleanupFn) => {
        cleanup = cleanupFn;
      });
      
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true);
      Animated.timing(keyboardHeight, {
        toValue: event.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const initializeStudentPresence = async () => {
    try {
      await studentPresenceService.initialize();
      
      // Set up real-time student status listener
      const unsubscribe = await fetchStudentStatuses();
      
      // Set up periodic status updates as backup
      const statusInterval = setInterval(async () => {
        try {
          const onlineStudents = await studentPresenceService.getOnlineStudents();
          const statusMap = {};
          
          onlineStudents.forEach(student => {
            statusMap[student.id] = {
              isOnline: student.isOnline,
              lastSeen: student.lastSeen
            };
          });
          
          setStudentStatuses(prev => ({ ...prev, ...statusMap }));
        } catch (error) {
          console.error('Error in periodic status update:', error);
        }
      }, 30000); // Update every 30 seconds
      
      return () => {
        if (unsubscribe) unsubscribe();
        clearInterval(statusInterval);
      };
    } catch (error) {
      console.error('Error initializing student presence:', error);
    }
  };

  const fetchStudentStatuses = async () => {
    try {
      // Get online students from presence service
      const onlineStudents = await studentPresenceService.getOnlineStudents();
      const statusMap = {};
      
      // Add online students
      onlineStudents.forEach(student => {
        statusMap[student.id] = {
          isOnline: student.isOnline,
          lastSeen: student.lastSeen
        };
      });
      
      // Also listen to Firestore studentStatus collection for real-time updates
      const studentStatusRef = collection(db, 'studentStatus');
      const studentStatusQuery = query(studentStatusRef);
      
      const unsubscribe = onSnapshot(studentStatusQuery, (snapshot) => {
        snapshot.forEach((doc) => {
          const statusData = doc.data();
          const studentId = statusData.studentId;
          
          if (studentId) {
            statusMap[studentId] = {
              isOnline: statusData.isOnline,
              lastSeen: statusData.lastActive?.toMillis() || Date.now()
            };
          }
        });
        
        setStudentStatuses(statusMap);
      });
      
      // Return unsubscribe function
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching student statuses:', error);
    }
  };

  const getOrgId = async () => {
    return await AsyncStorage.getItem('selectedOrgId');
  };

  const fetchConversations = async () => {
    setLoading(true);
    const orgId = await getOrgId();
    const messagesRef = collection(db, 'organizations', orgId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conversationsMap = new Map();
      snapshot.forEach((doc) => {
        const messageData = doc.data();
        const studentId = messageData.senderRole === 'student' ? messageData.senderId : null;
        if (studentId) {
          if (!conversationsMap.has(studentId)) {
            conversationsMap.set(studentId, {
              studentId,
              studentName: messageData.senderName || 'Student',
              lastMessage: messageData.content,
              lastMessageTime: messageData.timestamp?.toDate(),
              unreadCount: messageData.senderRole === 'student' && !messageData.read ? 1 : 0,
            });
          } else {
            const existing = conversationsMap.get(studentId);
            if (messageData.timestamp?.toDate() > existing.lastMessageTime) {
              existing.lastMessage = messageData.content;
              existing.lastMessageTime = messageData.timestamp?.toDate();
            }
            if (messageData.senderRole === 'student' && !messageData.read) {
              existing.unreadCount += 1;
            }
          }
          if (messageData.senderRole === 'student') {
            studentPresenceService.updateStudentLastSeen(studentId, messageData.senderName || 'Student');
          }
        }
      });
      const conversationsList = Array.from(conversationsMap.values());
      setConversations(conversationsList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    });
    return unsubscribe;
  };

  const fetchMessages = async (studentId) => {
    const orgId = await getOrgId();
    const messagesRef = collection(db, 'organizations', orgId, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', studentId),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = [];
      snapshot.forEach((doc) => {
        messageList.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
        });
      });
      setMessages(messageList);
    });
    return unsubscribe;
  };

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.studentId);
    try {
      const orgId = await getOrgId();
      const messagesRef = collection(db, 'organizations', orgId, 'messages');
      const messagesQuery = query(
        messagesRef,
        where('senderId', '==', conversation.studentId),
        where('senderRole', '==', 'student'),
        where('read', '==', false)
      );
      const snapshot = await getDocs(messagesQuery);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !selectedConversation) return;
    const messageContent = newMessage.trim();
    setNewMessage('');
    const tempMessage = {
      id: `temp_${Date.now()}`,
      senderId: currentUser.uid,
      senderName: 'Admin',
      senderRole: 'admin',
      content: messageContent,
      timestamp: new Date(),
      participants: [selectedConversation.studentId, currentUser.uid],
      type: 'text',
      read: false,
      status: 'sending',
    };
    setMessages(prev => [...prev, tempMessage]);
    try {
      const orgId = await getOrgId();
      const messageData = {
        senderId: currentUser.uid,
        senderName: 'Admin',
        senderRole: 'admin',
        content: messageContent,
        timestamp: serverTimestamp(),
        participants: [selectedConversation.studentId, currentUser.uid],
        type: 'text',
        read: false,
        status: 'delivered',
        deliveredAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'organizations', orgId, 'messages'), messageData);
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id
          ? { ...msg, id: docRef.id, status: 'delivered', deliveredAt: new Date() }
          : msg
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id
          ? { ...msg, status: 'failed' }
          : msg
      ));
    }
  };

  const retryMessage = async (messageId) => {
    const messageToRetry = messages.find(msg => msg.id === messageId);
    if (!messageToRetry || !selectedConversation) return;
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, status: 'sending' }
        : msg
    ));
    try {
      const orgId = await getOrgId();
      const messageData = {
        senderId: currentUser.uid,
        senderName: 'Admin',
        senderRole: 'admin',
        content: messageToRetry.content,
        timestamp: serverTimestamp(),
        participants: [selectedConversation.studentId, currentUser.uid],
        type: 'text',
        read: false,
        status: 'delivered',
        deliveredAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'organizations', orgId, 'messages'), messageData);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setMessages(prev => [...prev, {
        id: docRef.id,
        ...messageData,
        timestamp: new Date(),
        deliveredAt: new Date(),
      }]);
    } catch (error) {
      console.error('Error retrying message:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status: 'failed' }
          : msg
      ));
    }
  };

  const handleDeleteMessage = (messageId, senderRole) => {
    console.log('handleDeleteMessage called', { messageId, senderRole, currentUser });
    if (currentUser) {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Delete'],
            destructiveButtonIndex: 1,
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              confirmDeleteMessage(messageId);
            }
          }
        );
      } else {
        setActionSheetMessageId(messageId);
        setShowActionSheet(true);
      }
    }
  };

  const confirmDeleteMessage = async (messageId) => {
    // Optimistically remove the message from UI
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    setShowActionSheet(false);
    setActionSheetMessageId(null);
    try {
      const orgId = await getOrgId();
      await deleteDoc(doc(db, 'organizations', orgId, 'messages', messageId));
    } catch (error) {
      Alert.alert('Error', 'Failed to delete message.');
      console.error('Error deleting message:', error);
      // Optionally, re-add the message to UI if delete fails
      // (You can implement this if you want full consistency)
    }
  };

  // Show/hide action sheet with animation
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (showActionSheet) {
        Animated.timing(actionSheetAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(actionSheetAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    }
  }, [showActionSheet]);

  const { height: screenHeight } = Dimensions.get('window');
  const translateY = actionSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  // Memoized message component
  const MemoMessage = memo(({ item, handleDeleteMessage, retryMessage, currentUser }) => {
    const isMyMessage = item.senderRole === 'admin';
    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}
      >
        <TouchableOpacity
          onLongPress={() => {
            console.log('onLongPress called for message', item, 'currentUser:', currentUser);
            handleDeleteMessage(item.id, item.senderRole);
          }}
          delayLongPress={300}
          activeOpacity={0.8}
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myBubble : styles.otherBubble
          ]}
        >
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.content || ''}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.timestamp,
              isMyMessage ? styles.myTimestamp : styles.otherTimestamp
            ]}>
              {item.timestamp ? formatUTCTime(item.timestamp) : 'Now'}
            </Text>
            {isMyMessage && item.status === 'delivered' && (
              <MaterialIcons name="done" size={12} color="rgba(255, 255, 255, 0.7)" style={styles.checkmark} />
            )}
          </View>
        </TouchableOpacity>
        {isMyMessage && item.status === 'sending' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#64748b" />
            <Text style={styles.statusText}>Sending...</Text>
          </View>
        )}
        {isMyMessage && item.status === 'failed' && (
          <View style={styles.statusContainer}>
            <MaterialIcons name="error" size={14} color="#ef4444" />
            <Text style={styles.statusText}>Failed</Text>
            <TouchableOpacity 
              onPress={() => retryMessage(item.id)}
              style={styles.retryButton}
            >
              <MaterialIcons name="refresh" size={14} color="#007BFF" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  });

  // Debounced scroll to end
  const scrollToEnd = useRef(null);
  useEffect(() => {
    scrollToEnd.current = debounce(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => scrollToEnd.current?.cancel && scrollToEnd.current.cancel();
  }, []);

  const renderMessage = useCallback(({ item }) => (
    <MemoMessage item={item} handleDeleteMessage={handleDeleteMessage} retryMessage={retryMessage} currentUser={currentUser} />
  ), [currentUser]);

  const renderConversation = ({ item }) => {
    const studentStatus = studentStatuses[item.studentId] || { isOnline: false, lastSeen: null };
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => selectConversation(item)}
      >
        <View style={styles.conversationAvatar}>
          <MaterialIcons name="person" size={24} color="#007BFF" />
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.onlineIndicator,
                { backgroundColor: studentStatus.isOnline ? '#10b981' : '#64748b' }
              ]} />
              <Text style={styles.statusText}>
                {studentStatus.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'No message'}
          </Text>
          <Text style={styles.lastMessageTime}>
            {item.lastMessageTimestamp ? formatUTCRelativeTime(item.lastMessageTimestamp) : ''}
          </Text>
          {!studentStatus.isOnline && studentStatus.lastSeen && (
            <Text style={styles.lastSeenText}>
              {studentPresenceService.formatLastSeen(studentStatus.lastSeen)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="chat-bubble-outline" size={64} color="#94a3b8" />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        When students send messages, they will appear here.
      </Text>
    </View>
  );

  // Show conversation list
  if (!selectedConversation) {
    return (
      <View style={styles.container}>
        {/* React Native style header for conversation list */}
        <View style={styles.nativeHeader}>
          <TouchableOpacity
            style={styles.nativeBackButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Dashboard');
              }
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
          </TouchableOpacity>
          <Text style={styles.nativeHeaderTitle}>Student Conversations</Text>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.studentId}
            contentContainerStyle={styles.conversationsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
          />
        )}
      </View>
    );
  }

  // Show chat conversation
  if (selectedConversation) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
        {/* Student Info Header */}
        <View style={styles.studentInfoContainer}>
          <View style={styles.studentInfoContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Dashboard');
                }
              }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
            </TouchableOpacity>
            <View style={styles.studentAvatar}>
              <MaterialIcons name="person" size={20} color="#007BFF" />
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{selectedConversation?.studentName || 'Student'}</Text>
              <View style={styles.studentStatusRow}>
                <View style={[
                  styles.studentOnlineIndicator,
                  { backgroundColor: studentStatuses[selectedConversation.studentId]?.isOnline ? '#10b981' : '#64748b' }
                ]} />
                <Text style={styles.studentStatusText}>
                  {studentStatuses[selectedConversation.studentId]?.isOnline ? 'Active now' : 'Offline'}
                </Text>
                {!studentStatuses[selectedConversation.studentId]?.isOnline && (
                  <Text style={styles.studentLastSeenText}>
                    • {studentPresenceService.formatLastSeen(studentStatuses[selectedConversation.studentId]?.lastSeen)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: keyboardVisible ? 0 : 16 }
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToEnd.current?.()}
          ListEmptyComponent={renderEmptyState}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews={true}
        />

        {/* Message Input */}
        <Animated.View style={[styles.inputContainer, { marginBottom: Math.max(0, keyboardHeight - 8) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            placeholderTextColor="#999"
            textAlignVertical="top"
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <MaterialIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        {Platform.OS === 'android' && (
          <Modal
            visible={showActionSheet}
            transparent
            animationType="none"
            statusBarTranslucent={true}
            onRequestClose={() => {
              setShowActionSheet(false);
              setActionSheetMessageId(null);
            }}
          >
            {console.log('ActionSheet Modal rendered, showActionSheet:', showActionSheet)}
            <TouchableWithoutFeedback
              onPress={() => {
                setShowActionSheet(false);
                setActionSheetMessageId(null);
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.22)',
                  zIndex: 9999,
                  justifyContent: 'flex-end',
                }}
              >
                <TouchableWithoutFeedback>
                  <Animated.View
                    style={{
                      backgroundColor: '#fff',
                      borderTopLeftRadius: 22,
                      borderTopRightRadius: 22,
                      padding: 16,
                      transform: [{ translateY }],
                      zIndex: 10000,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: -2 },
                      shadowOpacity: 0.18,
                      shadowRadius: 12,
                      elevation: 12,
                    }}
                  >
                    <View style={{ alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0' }} />
                    </View>
                    <TouchableOpacity
                      style={{ paddingVertical: 12, alignItems: 'center' }}
                      onPress={() => {
                        confirmDeleteMessage(actionSheetMessageId);
                      }}
                    >
                      <Text style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ paddingVertical: 12, alignItems: 'center' }}
                      onPress={() => {
                        setShowActionSheet(false);
                        setActionSheetMessageId(null);
                      }}
                    >
                      <Text style={{ color: '#222', fontSize: 16 }}>Cancel</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </View>
    );
  }

  // Fallback: render nothing (should never hit)
  return (
    <View style={styles.container}>
      <Text style={styles.emptyTitle}>No conversation selected</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  nativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 16,
    paddingTop: 35,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  nativeBackButton: {
    padding: 8,
    marginRight: 12,
    top:8,
  },
  nativeHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    top:8,
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
  conversationsList: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  conversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  lastSeenText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#64748b',
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 18,
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  studentInfoContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 16,
    paddingTop:35,
  },
  studentInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    top:8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  studentOnlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  studentStatusText: {
    fontSize: 14,
    color: '#64748b',
  },
  studentLastSeenText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  studentSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 0, // Start at the very top
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: '#007BFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1e293b',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#64748b',
  },
  checkmark: {
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    minHeight: 60,
    
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    minHeight: 40,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#007BFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
  },
  retryText: {
    fontSize: 12,
    color: '#007BFF',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalModern: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    minWidth: 260,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  deleteModalCancel: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },
  deleteModalDelete: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: '#222',
    fontWeight: '500',
    fontSize: 15,
  },
  deleteModalDeleteText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
  },
  fixedInputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    zIndex: 10,
  },
});

// Helper debounce function
function debounce(func, wait) {
  let timeout;
  function debounced(...args) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
}

export default AdminChatScreen; 