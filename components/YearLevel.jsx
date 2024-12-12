import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Animated,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

export const YearLevel = ({ selectedYearLevel, setSelectedYearLevel }) => {
  const yearLevels = ["all", "1", "2", "3", "4"];
  const [isOpen, setIsOpen] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isOpen ? 200 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const togglePicker = () => setIsOpen(!isOpen);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Year Level</Text>
      <TouchableOpacity onPress={togglePicker} style={styles.pickerButton}>
        <Text style={styles.selectedValue}>
          {selectedYearLevel === "all"
            ? "All Levels"
            : `Year ${selectedYearLevel}`}
        </Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={24}
          color="#007AFF"
        />
      </TouchableOpacity>
      <Animated.View style={[styles.pickerWrapper, { height: animatedHeight }]}>
        <Picker
          selectedValue={selectedYearLevel}
          onValueChange={(value) => {
            setSelectedYearLevel(value);
            setIsOpen(false);
          }}
          style={styles.picker}
        >
          {yearLevels.map((level) => (
            <Picker.Item
              key={level}
              label={level === "all" ? "All Levels" : `Year ${level}`}
              value={level}
            />
          ))}
        </Picker>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
    padding: 12,
    marginBottom: 8,
  },
  selectedValue: {
    fontSize: 18,
    fontWeight: "500",
    color: "#007AFF",
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
    overflow: "hidden",
  },
  picker: {
    height: 200,
    width: "100%",
    color: "#333",
  },
});
