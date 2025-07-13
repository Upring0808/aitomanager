import React, { useState, useEffect, useRef } from 'react';
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
  SafeAreaView,
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
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import studentPresenceService from '../../../../services/StudentPresenceService';
import { formatUTCTime, formatUTCRelativeTime } from '../../../../utils/timeUtils';



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

  const fetchConversations = () => {
    setLoading(true);
    
    // Query all messages to get unique student conversations
    const messagesRef = collection(db, 'messages');
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
          
          // Update student presence when they send a message
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

  const fetchMessages = (studentId) => {
    const messagesRef = collection(db, 'messages');
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
    
    // Mark messages from this student as read
    try {
      const messagesRef = collection(db, 'messages');
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
    
    // Create temporary message with "sending" status
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

    // Add temporary message to UI immediately
    setMessages(prev => [...prev, tempMessage]);

    try {
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

      // Add message to Firestore
      const docRef = await addDoc(collection(db, 'messages'), messageData);

      // Update the temporary message with the real message data
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? { ...msg, id: docRef.id, status: 'delivered', deliveredAt: new Date() }
          : msg
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update the temporary message to show failed status
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

    // Update status to sending
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, status: 'sending' }
        : msg
    ));

    try {
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

      // Add message to Firestore
      const docRef = await addDoc(collection(db, 'messages'), messageData);

      // Remove the failed message and add the new one
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setMessages(prev => [...prev, {
        id: docRef.id,
        ...messageData,
        timestamp: new Date(),
        deliveredAt: new Date(),
      }]);

    } catch (error) {
      console.error('Error retrying message:', error);
      
      // Update the message to show failed status again
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'failed' }
          : msg
      ));
    }
  };

  const renderMessageStatus = (message) => {
    if (message.senderRole === 'admin') {
      return (
        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, styles.myTimestamp]}>
            {formatUTCTime(message.timestamp)}
          </Text>
          {message.status === 'sending' && (
            <MaterialIcons name="schedule" size={12} color="rgba(255, 255, 255, 0.7)" style={styles.checkmark} />
          )}
          {message.status === 'delivered' && (
            <MaterialIcons name="done" size={12} color="rgba(255, 255, 255, 0.7)" style={styles.checkmark} />
          )}
          {message.status === 'failed' && (
            <TouchableOpacity style={styles.retryButton} onPress={() => retryMessage(message.id)}>
              <MaterialIcons name="refresh" size={12} color="#007BFF" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return (
      <Text style={[styles.timestamp, styles.otherTimestamp]}>
        {formatUTCTime(message.timestamp)}
      </Text>
    );
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderRole === 'admin';
    
    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
          {renderMessageStatus(item)}
        </View>
      </View>
    );
  };

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
            {item.lastMessage}
          </Text>
          {!studentStatus.isOnline && studentStatus.lastSeen && (
            <Text style={styles.lastSeenText}>
              Last seen {studentPresenceService.formatLastSeen(studentStatus.lastSeen)}
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
  return (
    <View style={styles.container}>
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
            <Text style={styles.studentName}>{selectedConversation.studentName}</Text>
            <View style={styles.studentStatusRow}>
              <View style={[
                styles.studentOnlineIndicator,
                { backgroundColor: studentStatuses[selectedConversation.studentId]?.isOnline ? '#10b981' : '#64748b' }
              ]} />
              <Text style={styles.studentStatusText}>
                {studentStatuses[selectedConversation.studentId]?.isOnline ? 'Active now' : 'Offline'}
              </Text>
              {!studentStatuses[selectedConversation.studentId]?.isOnline && studentStatuses[selectedConversation.studentId]?.lastSeen && (
                <Text style={styles.studentLastSeenText}>
                  • {formatUTCRelativeTime(new Date(studentStatuses[selectedConversation.studentId].lastSeen))}
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
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        style={styles.messagesContainer}
      />

      {/* Message Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputContainer}>
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
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
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
});

export default AdminChatScreen; 