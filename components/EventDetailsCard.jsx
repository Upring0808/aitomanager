import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
  StyleSheet,
} from "react-native";
import { Styles } from "../styles/Styles";
import { FontAwesome } from "@expo/vector-icons";
import { auth } from "../config/firebaseconfig";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper to parse local time for event timeframe
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

const EventDetailsCard = ({ event, onScanQR, hasAttended }) => {
  const [expanded, setExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const arrowRotation = useRef(new Animated.Value(0)).current;

  const toggleExpansion = () => {
    Animated.parallel([
      // Animate the height
      Animated.timing(animatedHeight, {
        toValue: expanded ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }),
      // Animate the arrow
      Animated.timing(arrowRotation, {
        toValue: expanded ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setExpanded(!expanded);
  };

  const heightInterpolation = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1000], // Max height value, will be limited by content
  });

  const rotation = arrowRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const eventDate = event.dueDate ? new Date(event.dueDate) : null;

  const formattedDate = eventDate
    ? eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "No Date";

  const formattedDay = eventDate
    ? eventDate.toLocaleDateString("en-US", { weekday: "long" })
    : "No Day";

  const isEventActive = () => {
    if (!event.dueDate || !event.timeframe) return false;
    const [eventStart, eventEnd] = getEventStartEnd(event);
    const now = new Date();
    return eventEnd && now <= eventEnd;
  };

  const canScan = isEventActive() && !hasAttended;

  return (
    <View style={Styles.cardContainer}>
      <View style={Styles.card}>
        <View style={Styles.cardContent}>
          {/* Admin info */}
          <View style={Styles.adminInfoContainer}>
            <FontAwesome name="share" size={10} color="#608BC1" />
            <Text style={Styles.adminText}>{event.createdBy}</Text>
          </View>

          <View style={Styles.dateTimeContainer}>
            <Text style={Styles.dateText}>{formattedDate}</Text>
            <Text style={Styles.dayText}>{formattedDay}</Text>
          </View>

          <View style={Styles.intersection} />

          <View style={Styles.eventDetails}>
            <View style={Styles.eventRow}>
              <View style={Styles.eventTitleContainer}>
                <Text style={Styles.eventTitle}>{event.title}</Text>
                <Text style={Styles.eventTimeframe}>{event.timeframe}</Text>
              </View>
              <TouchableOpacity onPress={toggleExpansion} activeOpacity={0.7}>
                <Animated.View
                  style={[
                    Styles.arrowContainer,
                    {
                      transform: [{ rotate: rotation }],
                    },
                  ]}
                >
                  <FontAwesome name="chevron-down" size={15} color="#333" />
                </Animated.View>
              </TouchableOpacity>
            </View>

            <Animated.View
              style={[
                Styles.eventDescription,
                {
                  maxHeight: heightInterpolation,
                  opacity: animatedHeight,
                  overflow: "hidden",
                },
              ]}
            >
              <View style={expandedStyles.content}>
                <Text style={Styles.descriptionSubheading}>
                  About the event
                </Text>
                <Text style={Styles.eventDescriptionText}>
                  {event.description}
                </Text>

                {/* Attendance Status and QR Scanner */}
                <View style={expandedStyles.attendanceSection}>
                  {hasAttended ? (
                    <View style={expandedStyles.attendedBadge}>
                      <FontAwesome
                        name="check-circle"
                        size={16}
                        color="#28a745"
                      />
                      <Text style={expandedStyles.attendedText}>Attended</Text>
                    </View>
                  ) : !isEventActive() ? (
                    <View style={expandedStyles.expiredBadge}>
                      <FontAwesome name="clock-o" size={16} color="#dc3545" />
                      <Text style={expandedStyles.expiredText}>
                        Event Ended
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={expandedStyles.scanButton}
                      onPress={() => onScanQR && onScanQR(event)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="qrcode" size={16} color="white" />
                      <Text style={expandedStyles.scanButtonText}>
                        Scan QR to Attend
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};

const expandedStyles = StyleSheet.create({
  content: {
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
  expiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220,53,69,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  expiredText: {
    color: "#dc3545",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#203562",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});

export default EventDetailsCard;
