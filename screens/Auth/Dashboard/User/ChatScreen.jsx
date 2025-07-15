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
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatUTCTime } from '../../../../utils/timeUtils';

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setCurrentUser(user);
      fetchMessages(user.uid);
      markMessagesAsRead(user.uid);
    }
  }, []);

  const markMessagesAsRead = async (userId) => {
    try {
      const messagesRef = collection(db, 'messages');
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

  const fetchMessages = (userId) => {
    setLoading(true);
    
    // Query messages where the student is the sender or receiver
    const messagesRef = collection(db, 'messages');
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
    
    // Create temporary message with "sending" status
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

    // Add temporary message to UI immediately
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Get user details from AsyncStorage or Firestore
      const orgId = await AsyncStorage.getItem('selectedOrgId');
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
      // Get user details
      const orgId = await AsyncStorage.getItem('selectedOrgId');
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

      // Add message to Firestore
      const docRef = await addDoc(collection(db, 'messages'), messageData);

      // Update the message with success
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, id: docRef.id, status: 'delivered', deliveredAt: new Date() }
          : msg
      ));

    } catch (error) {
      console.error('Error retrying message:', error);
      
      // Update the message to show failed status
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'failed' }
          : msg
      ));
    }
  };

  const handleDeleteMessage = async (messageId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message for everyone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'messages', messageId));
              setMessages(prev => prev.filter(msg => msg.id !== messageId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete message.');
              console.error('Error deleting message:', error);
            }
          },
        },
      ]
    );
  };

  const renderMessageStatus = (item) => {
    const isMyMessage = item.senderId === currentUser?.uid;
    
    if (!isMyMessage) return null;

    switch (item.status) {
      case 'sending':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#64748b" />
            <Text style={styles.statusText}>Sending...</Text>
          </View>
        );
      case 'failed':
        return (
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
        );
      default:
        return null;
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === currentUser?.uid;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}
      >
        <TouchableOpacity
          onLongPress={() => handleDeleteMessage(item.id)}
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
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.timestamp,
              isMyMessage ? styles.myTimestamp : styles.otherTimestamp
            ]}>
              {formatUTCTime(item.timestamp)}
            </Text>
            {isMyMessage && item.status === 'delivered' && (
              <MaterialIcons name="check" size={12} color="rgba(255, 255, 255, 0.7)" style={styles.checkmark} />
            )}
          </View>
        </TouchableOpacity>
        {renderMessageStatus(item)}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="message" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation with an admin to get help or ask questions.
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0} // Adjust if you have a header
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Messages List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={renderEmptyState}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            style={styles.messagesContainer}
          />
        )}

        {/* Message Input */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContainer: {
    flex: 1,
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
});

export default ChatScreen; 