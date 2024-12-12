import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Styles } from "../styles/Styles";

const DropdownPicker = ({
  options,
  selectedValue,
  onValueChange,
  formatOption = (value) => value, // Default formatter
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const arrowRotation = useRef(new Animated.Value(0)).current;
  const dropdownHeight = useRef(new Animated.Value(0)).current;

  // Dynamic height based on the number of options
  const optionHeight = 55; // Adjust based on your design
  const maxVisibleOptions = 5; // Maximum options to show before scrolling
  const calculatedHeight =
    Math.min(options.length, maxVisibleOptions) * optionHeight;

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    Animated.parallel([
      Animated.timing(arrowRotation, {
        toValue: showDropdown ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(dropdownHeight, {
        toValue: showDropdown ? 0 : calculatedHeight,
        friction: 12,
        tension: 40,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const rotateArrow = arrowRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={Styles.pickerWrapper}>
      <TouchableOpacity style={Styles.pickerButton} onPress={toggleDropdown}>
        <Text style={Styles.pickerText}>
          {formatOption(selectedValue) || "Select"}
        </Text>
        <Animated.View
          style={{
            transform: [{ rotate: rotateArrow }],
          }}
        >
          <FontAwesome name="chevron-down" size={12} color="#333" />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={[
          Styles.customDropdown,
          {
            height: dropdownHeight,
            opacity: dropdownHeight.interpolate({
              inputRange: [0, calculatedHeight],
              outputRange: [0, 1],
            }),
          },
        ]}
      >
        <View style={Styles.dropdownContent}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={Styles.customDropdownItem}
              onPress={() => {
                onValueChange(option);
                toggleDropdown();
              }}
            >
              <Text style={Styles.dropdownItemText}>
                {formatOption(option)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

export default DropdownPicker;
