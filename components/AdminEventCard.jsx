import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Animated,
  Dimensions,
  Modal,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { eventsStyles } from "../styles/eventsStyles";
import { Button, Card } from "react-native-paper";

const { width, height } = Dimensions.get("window");

const AdminEventCard = ({
  event,
  isEditing,
  newTitle,
  newTimeframe,
  newDescription,
  onEditTitle,
  onEditTimeframe,
  onEditDescription,
  onSave,
  onCancel,
  onDelete,
  onStartEditing,
  onNavigateToAttendance,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const translateYAnim = useRef(new Animated.Value(-10)).current;

  // Animation for showing/hiding the dropdown
  useEffect(() => {
    if (showMenu) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMenu]);

  // Close menu when clicking outside
  const handleOutsidePress = () => {
    if (showMenu) {
      setShowMenu(false);
    }
  };

  // Safely handle dates
  const formatDate = (dateObj) => {
    if (!dateObj || !dateObj.seconds) return "No Date";
    try {
      const date = new Date(dateObj.seconds * 1000);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatDay = (dateObj) => {
    if (!dateObj || !dateObj.seconds) return "No Day";
    try {
      const date = new Date(dateObj.seconds * 1000);
      return date.toLocaleDateString("en-US", { weekday: "long" });
    } catch (error) {
      return "Invalid Day";
    }
  };

  const formatTimestamp = (timestampObj) => {
    if (!timestampObj || !timestampObj.seconds) return "Unknown";
    try {
      const date = new Date(timestampObj.seconds * 1000);
      return date.toLocaleString();
    } catch (error) {
      return "Invalid Timestamp";
    }
  };

  const handleEditPress = () => {
    setShowMenu(false);
    onStartEditing();
  };

  const handleDeletePress = () => {
    setShowMenu(false);
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  const handleCardPress = () => {
    if (onNavigateToAttendance) {
      onNavigateToAttendance();
    }
  };

  const handleMenuPress = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <>
      {/* Full screen overlay to catch outside clicks when menu is open */}
      {showMenu && (
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: width,
              height: height,
              zIndex: 999,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      <View style={{ position: "relative", marginBottom: 16 }}>
        <TouchableOpacity onPress={handleCardPress} activeOpacity={0.7}>
          <Card style={eventsStyles.card}>
            <View style={eventsStyles.cardContent}>
              <View style={eventsStyles.dateTimeContainer}>
                <Text style={eventsStyles.dateText}>
                  {formatDate(event.dueDate)}
                </Text>
                <Text style={eventsStyles.dayText}>
                  {formatDay(event.dueDate)}
                </Text>
              </View>
              <View style={eventsStyles.intersection} />
              <View style={eventsStyles.eventDetails}>
                {isEditing ? (
                  <View style={eventsStyles.editContainer}>
                    <TextInput
                      value={newTitle}
                      onChangeText={onEditTitle}
                      style={eventsStyles.editTitleInput}
                      placeholder="Edit Event Title"
                      accessibilityLabel="Edit the title of the event"
                    />
                    <TextInput
                      value={newTimeframe}
                      onChangeText={onEditTimeframe}
                      style={eventsStyles.editTimeframeInput}
                      placeholder="Edit Timeframe"
                      accessibilityLabel="Edit the timeframe of the event"
                    />
                    <TextInput
                      value={newDescription}
                      onChangeText={onEditDescription}
                      style={eventsStyles.editDescriptionInput}
                      placeholder="Edit Description"
                      multiline
                      accessibilityLabel="Edit the description of the event"
                    />
                    <Button
                      onPress={onSave}
                      style={eventsStyles.saveButton}
                      accessibilityLabel="Save changes"
                    >
                      <Text style={eventsStyles.saveButtonText}>Save</Text>
                    </Button>
                    <Button
                      onPress={onCancel}
                      style={eventsStyles.cancelButton}
                      accessibilityLabel="Cancel changes"
                    >
                      <Text style={eventsStyles.cancelButtonText}>Cancel</Text>
                    </Button>
                  </View>
                ) : (
                  <View style={eventsStyles.eventRow}>
                    <View style={eventsStyles.eventTitleContainer}>
                      <Text style={eventsStyles.eventTitle}>
                        {String(event.title || "")}
                      </Text>
                      <Text style={eventsStyles.eventTimeframe}>
                        {String(event.timeframe || "")}
                      </Text>
                      <Text style={eventsStyles.eventDescription}>
                        {String(
                          event.description || "No description provided."
                        )}
                      </Text>
                      <Text style={eventsStyles.createdByText}>
                        Created By: {String(event.createdBy || "Unknown")}
                      </Text>
                      <Text style={eventsStyles.timestampText}>
                        Created: {formatTimestamp(event.createdAt)}
                      </Text>
                    </View>
                    <View style={eventsStyles.cardActions}>
                      <TouchableOpacity
                        onPress={handleMenuPress}
                        style={eventsStyles.menuButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <FontAwesome name="ellipsis-v" size={16} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          if (onNavigateToAttendance) {
                            onNavigateToAttendance();
                          }
                        }}
                        style={eventsStyles.arrowButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <FontAwesome
                          name="chevron-right"
                          size={16}
                          color="#3652AD"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Animated Dropdown Menu - Fixed positioning */}
        {(showMenu || fadeAnim._value > 0) && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: -65,
                right: 75,
                backgroundColor: "white",
                borderRadius: 12,
                padding: 8,
                minWidth: 160,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 8,
                zIndex: 1000,
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: translateYAnim },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={eventsStyles.menuItem}
              onPress={handleEditPress}
              activeOpacity={0.7}
            >
              <FontAwesome name="edit" size={16} color="#3652AD" />
              <Text style={eventsStyles.menuItemText}>Edit Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[eventsStyles.menuItem, eventsStyles.deleteMenuItem]}
              onPress={handleDeletePress}
              activeOpacity={0.7}
            >
              <FontAwesome name="trash" size={16} color="#dc3545" />
              <Text
                style={[eventsStyles.menuItemText, eventsStyles.deleteMenuText]}
              >
                Delete Event
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </>
  );
};

export default AdminEventCard;
