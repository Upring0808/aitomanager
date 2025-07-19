import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, Image, Keyboard, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../../../../config/firebaseconfig';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, serverTimestamp, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const EventCommentsScreen = ({ route }) => {
  const { eventId } = route.params || {};
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // commentId
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [userProfiles, setUserProfiles] = useState({});
  const [likeState, setLikeState] = useState({}); // local like state
  const scrollViewRef = useRef();
  const insets = useSafeAreaInsets();
  // Store reply context (can be for comment or sub-comment)
  // { commentId, userName, text, isSubReply, subReplyIdx }
  const [replyContext, setReplyContext] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({}); // Track expanded state for replies
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Debug: log current user and profile
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      console.log('[EventCommentsScreen] Current user:', user.uid, user.displayName, user.email);
    }
  }, []);

  // Keyboard event listeners for input bar positioning
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch event title
  useEffect(() => {
    (async () => {
      const orgId = await AsyncStorage.getItem('selectedOrgId');
      if (!orgId || !eventId) return;
      const eventRef = doc(db, 'organizations', orgId, 'events', eventId);
      const eventSnap = await getDoc(eventRef);
      if (eventSnap.exists()) {
        setEventTitle(eventSnap.data().title || 'Event');
      } else {
        setEventTitle('Event');
      }
    })();
  }, [eventId]);

  // Fetch user profiles for avatars/usernames
  useEffect(() => {
    (async () => {
      const orgId = await AsyncStorage.getItem('selectedOrgId');
      if (!orgId || !comments.length) return;
      const userIds = Array.from(new Set([
        ...comments.map(c => c.userId),
        ...comments.flatMap(c => (c.replies || []).map(r => r.adminId)),
      ]));
      const profiles = {};
      for (const uid of userIds) {
        if (!uid) continue;
        const userRef = doc(db, 'organizations', orgId, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          profiles[uid] = userSnap.data();
        }
      }
      setUserProfiles(profiles);
    })();
  }, [comments]);

  useEffect(() => {
    const checkAdmin = async () => {
      const orgId = await AsyncStorage.getItem('selectedOrgId');
      const user = auth.currentUser;
      if (!orgId || !user) return;
      const userDoc = doc(db, 'organizations', orgId, 'users', user.uid);
      const userSnap = await (await import('firebase/firestore')).getDoc(userDoc);
      setIsAdmin(userSnap.exists() && userSnap.data().role === 'admin');
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    let unsubscribe;
    (async () => {
      const orgId = await AsyncStorage.getItem('selectedOrgId');
      if (!orgId || !eventId) return;
      const commentsRef = collection(db, 'organizations', orgId, 'events', eventId, 'comments');
      const q = query(commentsRef, orderBy('timestamp', 'asc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setComments(data);
        setLoading(false);
      });
    })();
    return () => unsubscribe && unsubscribe();
  }, [eventId]);

  // Helper to fetch comments (for manual refresh)
  const fetchComments = async () => {
    const orgId = await AsyncStorage.getItem('selectedOrgId');
    if (!orgId || !eventId) return;
    const commentsRef = collection(db, 'organizations', orgId, 'events', eventId, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setComments(data);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const orgId = await AsyncStorage.getItem('selectedOrgId');
    const user = auth.currentUser;
    if (!orgId || !user) return;
    // Only use username from userProfiles, fallback to 'Unknown'
    const isUserAdmin = userProfiles[user.uid]?.role === 'admin';
    const username = userProfiles[user.uid]?.username || 'Unknown';
    const commentsRef = collection(db, 'organizations', orgId, 'events', eventId, 'comments');
    await addDoc(commentsRef, {
      text: newComment,
      userId: user.uid,
      userName: username,
      timestamp: serverTimestamp(),
      isAdmin: isUserAdmin,
      replies: [],
    });
    setNewComment('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
  };

  const handleReply = (commentId, subReplyIdx = null) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      let userName, text, isSubReply = false;
      if (subReplyIdx !== null && Array.isArray(comment.replies) && comment.replies[subReplyIdx]) {
        userName = comment.replies[subReplyIdx].adminName || 'User';
        text = comment.replies[subReplyIdx].text;
        isSubReply = true;
      } else {
        userName = comment.userName;
        text = comment.text;
      }
      setReplyContext({
        commentId,
        userName,
        text,
        isSubReply,
        subReplyIdx,
      });
      setReplyText('');
    }
  };

  // Fix: always use replyContext.commentId if present
  const handleSendReply = async (commentIdParam) => {
    if (!replyText.trim() || sendingReply) return;
    if (!replyContext || !replyContext.commentId) {
      Alert.alert('Reply Error', 'No comment selected to reply to. Please tap Reply again.');
      return;
    }
    setSendingReply(true);
    const orgId = await AsyncStorage.getItem('selectedOrgId');
    const user = auth.currentUser;
    if (!orgId || !user) { setSendingReply(false); return; }
    const isUserAdmin = userProfiles[user.uid]?.role === 'admin';
    const username = userProfiles[user.uid]?.username || 'Unknown';
    const commentId = replyContext.commentId;
    const commentRef = doc(db, 'organizations', orgId, 'events', eventId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) { setSendingReply(false); return; }
    const commentData = commentSnap.data();
    let replies = Array.isArray(commentData.replies) ? [...commentData.replies] : [];
    let replyTo = replyContext && replyContext.isSubReply && replyContext.subReplyIdx !== undefined
      ? replies[replyContext.subReplyIdx] : null;
    try {
      // Add new reply with real timestamp
      replies.push({
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        text: replyText,
        adminId: user.uid,
        adminName: username,
        isAdmin: isUserAdmin,
        timestamp: new Date(),
        replyTo: replyTo ? {
          adminId: replyTo.adminId,
          adminName: replyTo.adminName,
          text: replyTo.text,
        } : undefined,
      });
      await updateDoc(commentRef, { replies });
      setReplyContext(null);
      setReplyText('');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
      // Manually refresh comments to ensure UI updates
      fetchComments();
    } catch (err) {
      Alert.alert('Reply Error', 'Failed to send reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  // Delete a comment (top-level)
  const handleDeleteComment = async (commentId, ownerId) => {
    const user = auth.currentUser;
    const isUserAdmin = userProfiles[user.uid]?.role === 'admin';
    if (!isUserAdmin && user.uid !== ownerId) return;
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const orgId = await AsyncStorage.getItem('selectedOrgId');
        if (!orgId) return;
        const commentRef = doc(db, 'organizations', orgId, 'events', eventId, 'comments', commentId);
        await deleteDoc(commentRef);
        fetchComments();
      }}
    ]);
  };

  // Delete a reply (nested)
  const handleDeleteReply = async (commentId, replyIdx, replyOwnerId) => {
    const user = auth.currentUser;
    const isUserAdmin = userProfiles[user.uid]?.role === 'admin';
    if (!isUserAdmin && user.uid !== replyOwnerId) return;
    Alert.alert('Delete Reply', 'Are you sure you want to delete this reply?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const orgId = await AsyncStorage.getItem('selectedOrgId');
        if (!orgId) return;
        const commentRef = doc(db, 'organizations', orgId, 'events', eventId, 'comments', commentId);
        const commentSnap = await getDoc(commentRef);
        if (!commentSnap.exists()) return;
        let replies = Array.isArray(commentSnap.data().replies) ? [...commentSnap.data().replies] : [];
        replies.splice(replyIdx, 1);
        await updateDoc(commentRef, { replies });
        fetchComments();
      }}
    ]);
  };

  // Local like toggle (visual only)
  const toggleLike = (id) => {
    setLikeState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Format timestamp (date and hour:minute, no seconds)
  const formatTimestamp = (ts) => {
    if (!ts) return '';
    let dateObj = ts;
    if (typeof ts.toDate === 'function') dateObj = ts.toDate();
    return format(dateObj, 'MMM d, h:mm a');
  };

  const renderAvatar = (profile, fallbackName) => {
    if (profile && profile.avatarUrl) {
      return <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />;
    }
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarInitial}>{getInitials(fallbackName)}</Text>
      </View>
    );
  };

  const user = auth.currentUser;
  // Helper to toggle expanded replies for a comment
  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f8fa' }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 64}
        enabled
      >
        <View style={{ flex: 1 }}>
          {/* Simple, modern event title header (no color, no banner) */}
          <View style={[styles.simpleHeaderCard, { paddingVertical: 18, paddingHorizontal: 20, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }] }>
            <FontAwesome name="calendar" size={18} color="#888" style={{ marginRight: 10 }} />
            <Text style={[styles.simpleEventTitle, { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#203562', paddingRight: 10 }]} numberOfLines={2} ellipsizeMode="tail">{eventTitle}</Text>
          </View>
          <ScrollView
            contentContainerStyle={[styles.container, { paddingBottom: 60, paddingTop: 8 }]}
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <ActivityIndicator size="large" color="#203562" style={{ marginTop: 40 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.placeholder}>No comments yet. Be the first to comment!</Text>
            ) : (
              comments.map(comment => {
                const replies = Array.isArray(comment.replies) ? comment.replies : [];
                const isExpanded = expandedReplies[comment.id];
                const repliesToShow = isExpanded ? replies : replies.slice(0, 2);
                const hiddenCount = replies.length - repliesToShow.length;
                const isReplyingToThis = replyContext && replyContext.commentId === comment.id;
                return (
                  <TouchableOpacity
                    key={comment.id}
                    style={[styles.commentRow, isReplyingToThis && { backgroundColor: '#eaf2ff', borderRadius: 10 }]}
                    onLongPress={() => handleDeleteComment(comment.id, comment.userId)}
                    delayLongPress={400}
                    activeOpacity={1}
                  >
                    {renderAvatar(userProfiles[comment.userId], comment.userName)}
                    <View style={styles.commentBubbleWrap}>
                      <View style={styles.commentBubble}>
                        <View style={styles.commentHeaderRow}>
                          <Text style={styles.commentUserName}>{comment.userName}</Text>
                          {comment.isAdmin && (
                            <FontAwesome name="check-circle" size={13} color="#3ea6ff" style={{ marginLeft: 4 }} />
                          )}
                          <Text style={styles.commentTimestamp}>{formatTimestamp(comment.timestamp)}</Text>
                        </View>
                        <Text style={styles.commentText}>{comment.text}</Text>
                      </View>
                      {/* Show reply for admins on any comment, and for users on others' comments */}
                      {user && ((isAdmin) || comment.userId !== user.uid) && (
                        <View style={styles.commentActionsRow}>
                          <TouchableOpacity onPress={() => handleReply(comment.id)} style={styles.actionBtn}>
                            <MaterialIcons name="reply" size={18} color="#203562" />
                            <Text style={styles.replyActionText}>Reply</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {/* Replies */}
                      {replies.length > 0 && (
                        <View style={styles.repliesContainer}>
                          {repliesToShow.map((reply, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.replyRow}
                              onLongPress={() => handleDeleteReply(comment.id, idx, reply.adminId)}
                              delayLongPress={400}
                              activeOpacity={1}
                            >
                              {renderAvatar(userProfiles[reply.adminId], reply.adminName)}
                              <View style={styles.replyBubbleWrap}>
                                <View style={styles.replyBubble}>
                                  <View style={styles.replyHeaderRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                      <Text style={styles.replyUserName}>{reply.adminName}</Text>
                                      {reply.isAdmin && (
                                        <FontAwesome name="check-circle" size={13} color="#3ea6ff" style={{ marginLeft: 4 }} />
                                      )}
                                    </View>
                                    <Text style={styles.replyTimestamp}>{formatTimestamp(reply.timestamp)}</Text>
                                  </View>
                                  {/* If this reply is in response to another reply, show context */}
                                  {reply.replyTo && (
                                    <Text style={styles.replyingToLabel} numberOfLines={1}>
                                      Replying to {reply.replyTo.adminName}: {reply.replyTo.text.length > 30 ? reply.replyTo.text.slice(0, 30) + '…' : reply.replyTo.text}
                                    </Text>
                                  )}
                                  <Text style={styles.replyText}>{reply.text}</Text>
                                  {/* Allow replying to sub-comments: admins can reply to any, users only to others' */}
                                  {user && ((isAdmin) || reply.adminId !== user.uid) && (
                                    <TouchableOpacity onPress={() => handleReply(comment.id, idx)} style={[styles.actionBtn, { alignSelf: 'flex-end', marginTop: 2 }]}> 
                                      <MaterialIcons name="reply" size={16} color="#203562" />
                                      <Text style={styles.replyActionText}>Reply</Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))}
                          {/* View replies button for 3+ replies */}
                          {replies.length > 2 && (
                            <TouchableOpacity onPress={() => toggleReplies(comment.id)} style={{ marginTop: 2, marginLeft: 8 }}>
                              <Text style={{ color: '#3ea6ff', fontSize: 13, fontWeight: 'bold' }}>
                                {isExpanded ? 'Hide replies' : `View replies (${hiddenCount})`}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
        {/* Messenger-style reply context above main input */}
        {replyContext && (
          <View style={styles.replyContextBar}>
            <Text style={styles.replyingToLabel} numberOfLines={1}>
              Replying to {replyContext.userName}: {replyContext.text.length > 30 ? replyContext.text.slice(0, 30) + '…' : replyContext.text}
            </Text>
            <TouchableOpacity onPress={() => { setReplyContext(null); setReplyText(''); }} style={styles.replyCancelBtn}>
              <FontAwesome name="close" size={16} color="#888" />
            </TouchableOpacity>
          </View>
        )}
        {/* Add comment input (all users) - minimal pill style */}
        {replyContext ? (
        <View style={[
          styles.inputRowPill,
            { paddingBottom: (keyboardVisible ? insets.bottom + 8 : insets.bottom + 8), backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e3e6ee' }
        ]}>
          {renderAvatar(userProfiles[user?.uid], user?.displayName || user?.email || 'User')}
          <View style={styles.inputPillContainer}>
            <TextInput
              style={styles.inputPill}
                value={replyText}
                onChangeText={setReplyText}
                placeholder={`Reply to ${replyContext.userName}...`}
              returnKeyType="send"
                onSubmitEditing={() => handleSendReply()}
              placeholderTextColor="#b0b8c1"
            />
              <TouchableOpacity
                style={[styles.sendBtnPill, (sendingReply || !replyText.trim()) && { opacity: 0.5 }]}
                onPress={() => handleSendReply()}
                disabled={sendingReply || !replyText.trim()}
              >
              <FontAwesome name="arrow-up" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        ) : (
          <View style={[
            styles.inputRowPill,
            { paddingBottom: (keyboardVisible ? insets.bottom + 8 : insets.bottom + 8), backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e3e6ee' }
          ]}>
            {renderAvatar(userProfiles[user?.uid], user?.displayName || user?.email || 'User')}
            <View style={styles.inputPillContainer}>
              <TextInput
                style={styles.inputPill}
                value={newComment}
                onChangeText={setNewComment}
                placeholder={'Add comment...'}
                returnKeyType="send"
                onSubmitEditing={handleAddComment}
                placeholderTextColor="#b0b8c1"
              />
              <TouchableOpacity
                style={[styles.sendBtnPill, (!newComment.trim()) && { opacity: 0.5 }]}
                onPress={handleAddComment}
                disabled={!newComment.trim()}
              >
                <FontAwesome name="arrow-up" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerCard: { 
    borderRadius: 18, margin: 12, marginBottom: 0, padding: 18, shadowColor: '#203562', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, alignItems: 'center' 
  },
  eventTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', letterSpacing: 0.2, textShadowColor: '#20356244', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  placeholder: { fontSize: 16, color: '#aaa', alignSelf: 'center', marginTop: 40 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e3e6ee', marginRight: 12 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e3e6ee', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarInitial: { color: '#203562', fontWeight: 'bold', fontSize: 17 },
  commentBubbleWrap: { flex: 1 },
  commentBubble: { backgroundColor: '#fff', borderRadius: 14, padding: 12, shadowColor: '#203562', shadowOpacity: 0.04, shadowRadius: 2, elevation: 1, borderWidth: 1, borderColor: '#e3e6ee' },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, justifyContent: 'space-between' },
  commentUserName: { fontWeight: 'bold', color: '#203562', fontSize: 15 },
  commentTimestamp: { color: '#b0b8c1', fontSize: 12, marginLeft: 8 },
  commentText: { fontSize: 16, color: '#222', marginTop: 2 },
  commentActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  replyActionText: { color: '#203562', fontWeight: 'bold', fontSize: 13, marginLeft: 3 },
  repliesContainer: { marginTop: 8, paddingLeft: 36, borderLeftWidth: 2, borderLeftColor: '#20356222' },
  replyRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  replyBubbleWrap: { flex: 1 },
  replyBubble: { backgroundColor: '#f7f8fa', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e3e6ee' },
  replyHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, justifyContent: 'space-between' },
  replyUserName: { fontWeight: 'bold', color: '#203562', fontSize: 14 },
  replyTimestamp: { color: '#b0b8c1', fontSize: 11, marginLeft: 8 },
  replyText: { color: '#203562', fontSize: 15, marginTop: 2 },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  replyInput: { flex: 1, borderWidth: 1, borderColor: '#20356244', borderRadius: 8, padding: 8, marginRight: 8, backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 0, borderColor: 'transparent', borderRadius: 8, padding: 10, backgroundColor: 'transparent' },
  sendBtn: { backgroundColor: '#203562', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  sendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  inputRowModern: {
    backgroundColor: '#fff',
    borderRadius: 22,
    margin: 12,
    marginBottom: 8,
    shadowColor: '#203562',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e3e6ee',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputModern: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: 16,
    color: '#203562',
    paddingVertical: 10,
  },
  sendBtnModern: {
    marginLeft: 8,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#203562',
    elevation: 2,
  },
  inputRowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginBottom: 4,
    marginTop: 2,
    backgroundColor: 'transparent',
    height: 50, // Fixed height for input bar
  },
  inputPillContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 22,
    paddingLeft: 12,
    paddingRight: 4,
    minHeight: 36,
    height: 36, // Fixed height for input field
  },
  inputPill: {
    flex: 1,
    fontSize: 15,
    color: '#203562',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    paddingRight: 8,
    height: 36, // Fixed height for TextInput
    textAlignVertical: 'center',
  },
  sendBtnPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#203562',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  replyingToLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
    marginLeft: 2,
  },
  replyContextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginHorizontal: 16,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e3e6ee',
  },
  replyCancelBtn: {
    marginLeft: 8,
    padding: 4,
  },
  simpleHeaderCard: {
    borderRadius: 14,
    margin: 12,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e3e6ee',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  simpleEventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    letterSpacing: 0.1,
  },
  simpleEventSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    fontWeight: '400',
  },
});

export default EventCommentsScreen; 