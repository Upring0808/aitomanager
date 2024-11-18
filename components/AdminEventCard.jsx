import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { eventsStyles } from "../styles/eventsStyles";
import { Button, Card } from "react-native-paper";

const AdminEventCard = ({
  event,
  isEditing,
  newTitle,
  newTimeframe,
  onEditTitle,
  onEditTimeframe,
  onSave,
  onCancel,
  onDelete,
  onStartEditing, // New handler to start editing
}) => {
  const eventDate = event.dueDate
    ? new Date(event.dueDate.seconds * 1000)
    : null;

  const formattedDate = eventDate
    ? eventDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "No Date";
  const formattedDay = eventDate
    ? eventDate.toLocaleDateString("en-US", { weekday: "long" })
    : "No Day";

  const createdAt = event.createdAt
    ? new Date(event.createdAt.seconds * 1000).toLocaleString()
    : "Unknown";

  return (
    <Card style={eventsStyles.card}>
      <View style={eventsStyles.cardContent}>
        <View style={eventsStyles.dateTimeContainer}>
          <Text style={eventsStyles.dateText}>{formattedDate}</Text>
          <Text style={eventsStyles.dayText}>{formattedDay}</Text>
        </View>
        <View style={eventsStyles.intersection} />
        <View style={eventsStyles.eventDetails}>
          {isEditing ? (
            <View style={eventsStyles.editContainer}>
              <TextInput
                value={newTitle}
                onChangeText={onEditTitle}
                style={eventsStyles.editTitleInput} // Applying updated input field styles
                placeholder="Edit Event Title"
              />
              <TextInput
                value={newTimeframe}
                onChangeText={onEditTimeframe}
                style={eventsStyles.editTimeframeInput} // Applying updated input field styles
                placeholder="Edit Timeframe"
              />
              <Button onPress={onSave} style={eventsStyles.saveButton}>
                <Text style={eventsStyles.saveButtonText}>Save</Text>
              </Button>
              <Button onPress={onCancel} style={eventsStyles.cancelButton}>
                <Text style={eventsStyles.cancelButtonText}>Cancel</Text>
              </Button>
            </View>
          ) : (
            <View style={eventsStyles.eventRow}>
              <View style={eventsStyles.eventTitleContainer}>
                <Text style={eventsStyles.eventTitle}>{event.title}</Text>
                <Text style={eventsStyles.eventTimeframe}>
                  {event.timeframe}
                </Text>
                <Text style={eventsStyles.timestampText}>{createdAt}</Text>
              </View>
              <View style={eventsStyles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[eventsStyles.actionButton, eventsStyles.editButton]}
                  onPress={onStartEditing} // Use a dedicated handler to start editing
                >
                  <FontAwesome name="edit" size={20} color="#3E588F" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[eventsStyles.actionButton, eventsStyles.deleteButton]}
                  onPress={onDelete}
                >
                  <FontAwesome name="trash" size={20} color="#CC2B52" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

export default AdminEventCard;
