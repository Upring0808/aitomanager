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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  doc as firestoreDoc,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatUTCTime, formatUTCRelativeTime } from '../../../../utils/timeUtils';
import { LogBox } from 'react-native';
import debounce from 'lodash.debounce';
import StudentPresenceService from '../../../../services/StudentPresenceService';
LogBox.ignoreLogs(['Text strings must be rendered within a <Text> component']);

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionSheetMessageId, setActionSheetMessageId] = useState(null);
  const [actionSheetAnim] = useState(new Animated.Value(0));
  const [adminStatus, setAdminStatus] = useState({ isOnline: false, lastActive: null });
  const [keyboardHeight] = useState(new Animated.Value(0));
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setCurrentUser(user);
      fetchMessages(user.uid);
      markMessagesAsRead(user.uid);
    }
  }, []);

  useEffect(() => {
    // Listen for admin status
    const adminStatusRef = firestoreDoc(db, 'adminStatus', 'main');
    const unsubscribeAdmin = onSnapshot(adminStatusRef, (docSnap) => {
      if (docSnap.exists()) {
        setAdminStatus({
          isOnline: docSnap.data().isOnline,
          lastActive: docSnap.data().lastActive,
        });
      }
    });
    return () => {
      unsubscribeAdmin();
    };
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

  const getOrgId = async () => {
    return await AsyncStorage.getItem('selectedOrgId');
  };

  const markMessagesAsRead = async (userId) => {
    try {
      const orgId = await getOrgId();
      const messagesRef = collection(db, 'organizations', orgId, 'messages');
      const messagesQuery = query(
        messagesRef,
        where('participants', 'array-contains', userId),
        where('read', '==', false),
        where('senderRole', '==', 'admin')
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

  const fetchMessages = async (userId) => {
    setLoading(true);
    const orgId = await getOrgId();
    const messagesRef = collection(db, 'organizations', orgId, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', userId),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = [];
      snapshot.forEach((doc) => {
        messageList.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() ? doc.data().timestamp.toDate() : new Date(),
        });
      });
      setMessages(messageList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching messages:', error);
      setLoading(false);
    });
    return unsubscribe;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    const messageContent = newMessage.trim();
    setNewMessage('');
    const tempMessage = {
      id: `temp_${Date.now()}`,
      senderId: currentUser.uid,
      senderName: 'You',
      senderRole: 'student',
      content: messageContent,
      timestamp: new Date(),
      participants: [currentUser.uid, 'admin'],
      type: 'text',
      read: false,
      status: 'sending',
    };
    setMessages(prev => [...prev, tempMessage]);
    try {
      const orgId = await getOrgId();
      const userDoc = await getDoc(doc(db, 'organizations', orgId, 'users', currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const messageData = {
        senderId: currentUser.uid,
        senderName: userData.fullName || userData.username || 'Student',
        senderRole: 'student',
        content: messageContent,
        timestamp: serverTimestamp(),
        participants: [currentUser.uid, 'admin'],
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
    if (!messageToRetry) return;
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, status: 'sending' }
        : msg
    ));
    try {
      const orgId = await getOrgId();
      const userDoc = await getDoc(doc(db, 'organizations', orgId, 'users', currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const messageData = {
        senderId: currentUser.uid,
        senderName: userData.fullName || userData.username || 'Student',
        senderRole: 'student',
        content: messageToRetry.content,
        timestamp: serverTimestamp(),
        participants: [currentUser.uid, 'admin'],
        type: 'text',
        read: false,
        status: 'delivered',
        deliveredAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'organizations', orgId, 'messages'), messageData);
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, id: docRef.id, status: 'delivered', deliveredAt: new Date() }
          : msg
      ));
    } catch (error) {
      console.error('Error retrying message:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status: 'failed' }
          : msg
      ));
    }
  };

  const handleDeleteMessage = (messageId, senderId) => {
    if (currentUser?.uid === senderId) {
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

  // Memoized message component
  const MemoMessage = memo(({ item, handleDeleteMessage, retryMessage, currentUser }) => {
    const isMyMessage = item.senderId === currentUser?.uid;
    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}
      >
        <TouchableOpacity
          onLongPress={() => handleDeleteMessage(item.id, item.senderId)}
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
              <MaterialIcons name="check" size={12} color="rgba(255, 255, 255, 0.7)" style={styles.checkmark} />
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

  const renderMessage = useCallback(({ item }) => (
    <MemoMessage item={item} handleDeleteMessage={handleDeleteMessage} retryMessage={retryMessage} currentUser={currentUser} />
  ), [currentUser]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="message" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation with an admin to get help or ask questions.
      </Text>
    </View>
  );

  // Debounced scroll to end
  const scrollToEnd = useRef(null);
  useEffect(() => {
    scrollToEnd.current = debounce(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => scrollToEnd.current?.cancel && scrollToEnd.current.cancel();
  }, []);

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

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
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
          style={styles.sendButton}
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContainer: {
 
    // flex: 1, // Remove this line
    // backgrotundColor: 'red', // Remove debug color
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
    // paddingBottom:55, // Removed to allow KeyboardAvoidingView to handle keyboard
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#e0f2fe',
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
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
  lastSeenText: {
    fontSize: 12,
    color: '#64748b',
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

export default ChatScreen; 