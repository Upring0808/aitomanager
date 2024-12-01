import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { eventsStyles } from "../styles/eventsStyles";
import { Button, Card } from "react-native-paper";

const ActionButton = ({ onPress, icon, color, style, accessibilityLabel }) => (
  <TouchableOpacity
    onPress={onPress}
    style={style}
    accessibilityLabel={accessibilityLabel}
    accessible
  >
    <FontAwesome name={icon} size={20} color={color} />
  </TouchableOpacity>
);

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
}) => {
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

  return (
    <Card style={eventsStyles.card}>
      <View style={eventsStyles.cardContent}>
        <View style={eventsStyles.dateTimeContainer}>
          <Text style={eventsStyles.dateText}>{formatDate(event.dueDate)}</Text>
          <Text style={eventsStyles.dayText}>{formatDay(event.dueDate)}</Text>
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
                  {String(event.description || "No description provided.")}
                </Text>
                <Text style={eventsStyles.createdByText}>
                  Created By: {String(event.createdBy || "Unknown")}
                </Text>
                <Text style={eventsStyles.timestampText}>
                  Created: {formatTimestamp(event.createdAt)}
                </Text>
              </View>
              <View style={eventsStyles.actionButtonsContainer}>
                <ActionButton
                  onPress={onStartEditing}
                  icon="edit"
                  color="#3E588F"
                  style={[eventsStyles.actionButton, eventsStyles.editButton]}
                />
                <ActionButton
                  onPress={onDelete}
                  icon="trash"
                  color="#CC2B52"
                  style={[eventsStyles.actionButton, eventsStyles.deleteButton]}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

export default AdminEventCard;
