import React, { useState, useRef } from "react";
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

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EventDetailsCard = ({ event }) => {
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

  const eventDate = event.dueDate
    ? new Date(event.dueDate.seconds * 1000)
    : null;

  const formattedDate = eventDate
    ? eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "No Date";

  const formattedDay = eventDate
    ? eventDate.toLocaleDateString("en-US", { weekday: "long" })
    : "No Day";

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
});

export default EventDetailsCard;
