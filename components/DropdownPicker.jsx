import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Modal, Dimensions, TouchableWithoutFeedback } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Styles } from "../styles/Styles";

const DropdownPicker = ({
  options,
  selectedValue,
  onValueChange,
  formatOption = (value) => value, // Default formatter
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState(null);
  const arrowRotation = useRef(new Animated.Value(0)).current;
  const buttonRef = useRef();

  // Dynamic height based on the number of options
  const optionHeight = 55; // Adjust based on your design
  const maxVisibleOptions = 5; // Maximum options to show before scrolling
  const calculatedHeight =
    Math.min(options.length, maxVisibleOptions) * optionHeight;

  const toggleDropdown = () => {
    if (!showDropdown) {
      // Measure button position for dropdown placement
      buttonRef.current?.measureInWindow((x, y, width, height) => {
        setDropdownLayout({ x, y: y + height, width });
      });
    }
    setShowDropdown(!showDropdown);
    Animated.timing(arrowRotation, {
      toValue: showDropdown ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const rotateArrow = arrowRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={Styles.pickerWrapper}>
      <TouchableOpacity
        style={Styles.pickerButton}
        onPress={toggleDropdown}
        ref={buttonRef}
        activeOpacity={0.85}
      >
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

      {/* Dropdown menu in Modal for top-layer rendering */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={toggleDropdown}
      >
        <TouchableWithoutFeedback onPress={toggleDropdown}>
          <View style={{ flex: 1, backgroundColor: "transparent" }}>
            {dropdownLayout && (
              <View
                style={[
                  Styles.customDropdown,
                  {
                    position: "absolute",
                    top: 120,
                    left: dropdownLayout.x,
                    width: dropdownLayout.width,
                    height: calculatedHeight,
                    zIndex: 9999,
                    marginTop: 0, // ensure flush with parent
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
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={Styles.dropdownItemText}>
                        {formatOption(option)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default DropdownPicker;
