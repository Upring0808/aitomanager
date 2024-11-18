import React, { useState } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Styles } from "../styles/Styles";
import { FontAwesome } from "@expo/vector-icons";

const EventDetailsCard = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  const [arrowRotation] = useState(new Animated.Value(0));
  const [contentHeight] = useState(new Animated.Value(0)); // Initialize height animation value

  const toggleExpansion = () => {
    setExpanded(!expanded);

    // Animate arrow rotation
    Animated.timing(arrowRotation, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate card content expansion/collapse
    Animated.timing(contentHeight, {
      toValue: expanded ? 0 : 1, // Toggle between 0 (collapsed) and 1 (expanded)
      duration: 300,
      useNativeDriver: false, // Use false for height animation
    }).start();
  };

  const rotation = arrowRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"], // Rotates smoothly between these angles
  });

  // Interpolate height for smooth transition
  const animatedHeight = contentHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 150], // Adjust 150 to the desired expanded height
  });

  const eventDate = event.dueDate
    ? new Date(event.dueDate.seconds * 1000)
    : null;
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "No Date";
  const formattedDay = eventDate
    ? eventDate.toLocaleDateString("en-US", { weekday: "long" })
    : "No Day";
  const createdAt = event.createdAt
    ? new Date(event.createdAt.seconds * 1000).toLocaleString()
    : "Unknown";

  return (
    <View style={Styles.cardContainer}>
      <View style={Styles.card}>
        <View style={Styles.cardContent}>
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
                <Text style={Styles.timestampText}>{createdAt}</Text>
              </View>
              <TouchableOpacity onPress={toggleExpansion}>
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
            {/* Animated container for expanding content */}
            <Animated.View
              style={{ height: animatedHeight, overflow: "hidden" }}
            >
              {expanded && (
                <View style={Styles.eventDescription}>
                  <Text style={Styles.descriptionSubheading}>
                    About the event
                  </Text>
                  <Text style={Styles.eventDescriptionText}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    euismod, nisl eget ultricies tincidunt, nisl nisl aliquam
                    nisl, eget aliquam nisl nisl eget nisl. Sed euismod, nisl
                    eget ultricies tincidunt, nisl nisl aliquam nisl, eget
                    aliquam nisl nisl eget nisl.
                  </Text>
                </View>
              )}
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default EventDetailsCard;
