import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Image, ActivityIndicator } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Styles } from "../styles/Styles";
import { db, auth } from '../config/firebaseconfig';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper functions for parsing event timeframe
function parseLocalDateTime(date, timeStr) {
  // timeStr: "21:00" or "9:00 PM"
  let hours = 0,
    minutes = 0;
  if (/AM|PM/i.test(timeStr)) {
    // 12-hour format
    const [time, modifier] = timeStr.split(/\s+/);
    let [h, m] = time.split(":").map(Number);
    if (modifier.toUpperCase() === "PM" && h !== 12) h += 12;
    if (modifier.toUpperCase() === "AM" && h === 12) h = 0;
    hours = h;
    minutes = m;
  } else {
    // 24-hour format
    [hours, minutes] = timeStr.split(":").map(Number);
  }
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0
  );
}

function getEventStartEnd(event) {
  if (!event.dueDate || !event.timeframe) return [null, null];
  const date = new Date(event.dueDate);
  // 12-hour
  let match = event.timeframe.match(
    /(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i
  );
  if (match) {
    const [_, startStr, endStr] = match;
    const startDate = parseLocalDateTime(date, startStr);
    const endDate = parseLocalDateTime(date, endStr);
    return [startDate, endDate];
  }
  // 24-hour
  match = event.timeframe.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (match) {
    const [_, startStr, endStr] = match;
    const startDate = parseLocalDateTime(date, startStr);
    const endDate = parseLocalDateTime(date, endStr);
    return [startDate, endDate];
  }
  return [date, date];
}

function isEventActive(event) {
  if (!event.dueDate || !event.timeframe) return false;
  const [eventStart, eventEnd] = getEventStartEnd(event);
  const now = new Date();
  return eventEnd && now <= eventEnd;
}

const getEventStatus = (event) => {
  if (!event.dueDate || !event.timeframe) return { color: '#adb5bd' };
  const [eventStart, eventEnd] = getEventStartEnd(event);
  const now = new Date();
  if (eventStart && now < eventStart) return { color: '#FFD600' };
  if (eventEnd && now > eventEnd) return { color: '#dc3545' };
  return { color: '#28a745' };
};

// Mock function to get student profile info by ID
const getStudentProfile = (id) => {
  // Replace with real lookup
  const mockProfiles = {
    "1": { id: "1", name: "Alice Smith", avatar: null },
    "2": { id: "2", name: "Bob Lee", avatar: null },
    "3": { id: "3", name: "Chris Kim", avatar: null },
    "4": { id: "4", name: "Dana Fox", avatar: null },
    "5": { id: "5", name: "Eve Lin", avatar: null },
  };
  return mockProfiles[id] || { id, name: `User ${id}`, avatar: null };
};

const markEventAsSeen = async (eventId, seenBy) => {
  try {
    const orgId = await AsyncStorage.getItem('selectedOrgId');
    const user = auth.currentUser;
    console.log('[Seen Debug] orgId:', orgId, 'user:', user?.uid, 'eventId:', eventId, 'seenBy:', seenBy);
    if (!orgId || !user) return;
    if (seenBy && seenBy.includes(user.uid)) {
      console.log('[Seen Debug] User already in seenBy, skipping update.');
      return; // Already seen
    }
    const eventRef = doc(db, 'organizations', orgId, 'events', eventId);
    await updateDoc(eventRef, {
      seenBy: arrayUnion(user.uid)
    });
    console.log('[Seen Debug] Added user to seenBy for event:', eventId);
  } catch (e) {
    console.log('[Seen Debug] Error updating seenBy:', e);
  }
};

const EventDetailsCard = ({ event, hasAttended, navigation, onAddComment }) => {
  // Debug log to check commentCount
  console.log('EventDetailsCard:', event.title, 'commentCount:', event.commentCount);
  const eventDate = event.dueDate ? new Date(event.dueDate) : null;
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "No Date";
  const formattedDay = eventDate
    ? eventDate.toLocaleDateString("en-US", { weekday: "long" })
    : "No Day";
  const isEventEnded = !isEventActive(event);
  const status = getEventStatus(event);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [seenProfiles, setSeenProfiles] = useState([]);
  const seenBy = Array.isArray(event.seenBy) ? event.seenBy : [];
  const initialProfiles = seenProfiles.slice(0, 3);
  const extraCount = seenProfiles.length - 3;

  useEffect(() => {
    markEventAsSeen(event.id, event.seenBy || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch real student profiles from Firestore when modal opens
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const orgId = await AsyncStorage.getItem('selectedOrgId');
      console.log('[Seen Debug] Fetching profiles for orgId:', orgId, 'seenBy:', seenBy);
      if (!orgId || !seenBy.length) {
        setSeenProfiles([]);
        setLoadingProfiles(false);
        return;
      }
      const profiles = [];
      for (const userId of seenBy) {
        const userRef = doc(db, 'organizations', orgId, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          profiles.push({
            id: userId,
            username: data.username || data.email || data.studentId || 'Unknown',
            avatarUrl: data.avatarUrl || null,
          });
          console.log('[Seen Debug] Found user profile:', userId, data);
        } else {
          console.log('[Seen Debug] No user profile found for:', userId);
        }
      }
      setSeenProfiles(profiles);
    } catch (e) {
      console.log('[Seen Debug] Error fetching profiles:', e);
      setSeenProfiles([]);
    }
    setLoadingProfiles(false);
  };

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.seenBy]);

  const handleOpenModal = async () => {
    setModalVisible(true);
    await fetchProfiles();
  };

  return (
    <View style={[Styles.cardContainer, isEventEnded && styles.endedEventCard]}> 
      <View style={[Styles.card, isEventEnded && styles.endedEventCardInner]}> 
        {/* Status Pill Dot */}
        <View style={[badgeStyles.statusDot, { backgroundColor: status.color }]} />
        <View style={Styles.cardContent}>
          {/* Admin info */}
          <View style={Styles.adminInfoContainer}>
            <FontAwesome name="share" size={10} color="#608BC1" />
            <Text style={Styles.adminText}>{event.createdBy}</Text>
          </View>

          <View style={Styles.dateTimeContainer}>
            <Text style={[Styles.dateText, isEventEnded && styles.endedDateText]}>{formattedDate}</Text>
            <Text style={[Styles.dayText, isEventEnded && styles.endedDayText]}>{formattedDay}</Text>
          </View>

          <View style={Styles.intersection} />

          <View style={Styles.eventDetails}>
            <View style={Styles.eventRow}>
              <View style={Styles.eventTitleContainer}>
                <Text style={[Styles.eventTitle, isEventEnded && styles.endedEventTitle]}>{event.title}</Text>
                <Text style={[Styles.eventTimeframe, isEventEnded && styles.endedEventTimeframe]}>{event.timeframe}</Text>
              </View>
            </View>

            <View style={styles.fullContent}>
                <Text style={Styles.descriptionSubheading}>
                  About the event
                </Text>
              <Text style={[Styles.eventDescriptionText, isEventEnded && styles.endedDescriptionText]}>
                  {event.description}
                </Text>

              {/* Remove attendance status section below */}
              {/* <View style={styles.attendanceSection}>
                  {hasAttended ? (
                  <View style={styles.attendedBadge}>
                      <FontAwesome
                        name="check-circle"
                        size={16}
                        color="#28a745"
                      />
                    <Text style={styles.attendedText}>Attended</Text>
                  </View>
                ) : isEventEnded ? (
                  <View style={styles.endedStatusBadge}>
                    <FontAwesome name="times-circle" size={16} color="#dc3545" />
                    <Text style={styles.endedStatusText}>Event Ended</Text>
                  </View>
                ) : (
                  <View style={styles.activeBadge}>
                    <FontAwesome name="calendar-check-o" size={16} color="#203562" />
                    <Text style={styles.activeText}>Active Event</Text>
                  </View>
                )}
              </View> */}
            </View>
          </View>
                    </View>
        {/* Attendance Status for Available Events */}
        {status.color === '#28a745' && (
          <View style={statusStyles.statusRowOuterContainer}>
            <View style={statusStyles.statusRowContainer}>
              <Text style={hasAttended ? statusStyles.attendedText : statusStyles.notAttendedText}>
                {hasAttended ? 'Attended' : 'Not attended'}
                      </Text>
                    </View>
          </View>
        )}
        {/* Seen Avatars Row - move outside cardContent, but inside card */}
        {seenBy.length > 0 && seenProfiles.length > 0 && (
          <View style={seenStyles.seenRowOuterContainer}>
            <View style={seenStyles.seenRowContainer}>
              <Text style={seenStyles.seenByText}>Seen by</Text>
              <TouchableOpacity onPress={handleOpenModal} activeOpacity={0.8} style={seenStyles.seenRow}>
                {initialProfiles.map((profile, idx) => (
                  <View key={profile.id} style={[seenStyles.avatar, { left: idx * 18 }]}> 
                    {profile.avatarUrl ? (
                      <Image source={{ uri: profile.avatarUrl }} style={seenStyles.avatarImg} />
                    ) : (
                      <Text style={seenStyles.avatarInitial}>{profile.username ? profile.username[0] : '?'}</Text>
                    )}
                  </View>
                ))}
                {extraCount > 0 && (
                  <View style={[seenStyles.avatar, seenStyles.extraBadge, { left: 3 * 18 }]}> 
                    <Text style={seenStyles.extraText}>{`+${extraCount}`}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* Add Event Comment Button */}
                    <TouchableOpacity
          style={commentStyles.addCommentBtnImproved}
          onPress={() => {
            if (navigation && navigation.navigate) {
              navigation.navigate('EventCommentsScreen', { eventId: event.id });
            } else {
              console.warn('Navigation not available for EventCommentsScreen');
            }
          }}
          activeOpacity={0.85}
        >
          {event.commentCount > 0 ? (
            <View style={commentStyles.inlineRow}>
              <Text style={commentStyles.addCommentTextImproved}>See comments</Text>
              <FontAwesome name="chevron-right" size={18} color="#203562" style={{ marginLeft: 8, marginTop: 1 }} />
            </View>
          ) : (
            <Text style={commentStyles.addCommentTextImproved}>Add comment</Text>
          )}
                    </TouchableOpacity>
        {/* Modal for full seen list */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={seenStyles.modalOverlay}>
            <View style={seenStyles.modalContent}>
              <Text style={seenStyles.modalTitle}>Seen by</Text>
              {loadingProfiles ? (
                <ActivityIndicator size="large" color="#203562" style={{ marginVertical: 30 }} />
              ) : (
                <FlatList
                  data={seenProfiles}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <View style={seenStyles.modalRow}>
                      <View style={seenStyles.modalAvatar}>
                        {item.avatarUrl ? (
                          <Image source={{ uri: item.avatarUrl }} style={seenStyles.avatarImg} />
                        ) : (
                          <Text style={seenStyles.avatarInitial}>{item.username ? item.username[0] : '?'}</Text>
                        )}
                      </View>
                      <Text style={seenStyles.modalName}>{item.username || item.id}</Text>
                    </View>
                  )}
                  style={{ maxHeight: 250 }}
                />
              )}
              <TouchableOpacity onPress={() => setModalVisible(false)} style={seenStyles.closeBtn}>
                <Text style={seenStyles.closeBtnText}>Close</Text>
              </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  endedEventCard: {
    // No opacity/fading for ended events
  },
  endedEventCardInner: {
    backgroundColor: '#f5f6fa',
    borderColor: 'rgba(32,53,98,0.08)',
    borderWidth: 1,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#203562',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  endedDateText: {
    color: "#6c757d",
  },
  endedDayText: {
    color: "#adb5bd",
  },
  endedEventTitle: {
    color: "#6c757d",
  },
  endedEventTimeframe: {
    color: "#adb5bd",
  },
  endedDescriptionText: {
    color: "#6c757d",
  },
  endedBadge: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(220,53,69,0.1)",
  },
  fullContent: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(62,88,143,0.03)",
    borderRadius: 8,
  },
  attendanceSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(62,88,143,0.1)",
  },
  attendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(40,167,69,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  attendedText: {
    color: "#28a745",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  endedStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220,53,69,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  endedStatusText: {
    color: "#dc3545",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(32,53,98,0.05)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  activeText: {
    color: "#203562",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});

const badgeStyles = StyleSheet.create({
  statusDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 12,
    borderRadius: 8,
    backgroundColor: '#28a745', // default, will be overridden
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
});

const seenStyles = StyleSheet.create({
  seenRowOuterContainer: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 14, paddingBottom: 8 },
  seenRowContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 60 },
  seenByText: { color: '#888', fontSize: 13, marginRight: 8, fontWeight: '500' },
  seenRow: { flexDirection: 'row', alignItems: 'center', minHeight: 28, position: 'relative' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e3e6ee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    position: 'absolute',
    zIndex: 2,
  },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarInitial: {
    color: '#203562',
    fontWeight: 'bold',
    fontSize: 15,
  },
  extraBadge: {
    backgroundColor: '#FFD600',
    zIndex: 1,
  },
  extraText: {
    color: '#203562',
    fontWeight: 'bold',
    fontSize: 13,
  },
  eyeIcon: {
    marginLeft: 3 * 18 + 32,
    marginRight: 6,
    zIndex: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: 280,
    alignItems: 'center',
    elevation: 8,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
    color: '#203562',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e3e6ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalName: {
    fontSize: 15,
    color: '#203562',
  },
  closeBtn: {
    marginTop: 16,
    backgroundColor: '#203562',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

const statusStyles = StyleSheet.create({
  statusRowOuterContainer: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start', paddingLeft: 14, paddingBottom: 8 },
  statusRowContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  attendedText: { color: '#28a745', fontSize: 13, fontWeight: '500' },
  notAttendedText: { color: '#888', fontSize: 13, fontWeight: '500' },
});

const commentStyles = StyleSheet.create({
  addCommentBtn: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12, // Added for touch area
    alignItems: 'center',
    // Removed borderTopWidth, borderColor, and backgroundColor for seamless blending
    marginTop: 2,
    marginBottom: 8, // Extra space from card edge
  },
  addCommentText: {
    color: '#203562',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  // Improved styles below
  addCommentBtnImproved: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f8fa',
    borderRadius: 18,
    marginTop: 2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e3e6ee',
    shadowColor: '#203562',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  addCommentTextImproved: {
    color: '#203562',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EventDetailsCard;

