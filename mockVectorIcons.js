/**
 * This file creates mock implementations of vector icons
 * to prevent font loading errors in Expo Vector Icons
 */
import React from "react";
import { Text, View } from "react-native";

// Create a mock icon component that doesn't use custom fonts
const createMockIconSet = (glyphMap, fontName) => {
  const IconComponent = ({
    name,
    size = 20,
    color = "black",
    style = {},
    ...props
  }) => {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            overflow: "hidden",
          },
          style,
        ]}
        {...props}
      >
        <Text style={{ color, fontSize: size / 2, fontWeight: "bold" }}>
          {name ? name.charAt(0).toUpperCase() : "?"}
        </Text>
      </View>
    );
  };

  // Add necessary static methods
  IconComponent.button = ({
    onPress,
    name,
    color,
    size,
    style,
    children,
    ...props
  }) => {
    return (
      <View style={style} {...props}>
        <IconComponent name={name} size={size} color={color} />
        {children}
      </View>
    );
  };

  IconComponent.getImageSource = () => Promise.resolve({ uri: "" });
  IconComponent.loadFont = () => Promise.resolve();
  IconComponent.hasIcon = () => true;
  IconComponent.getRawGlyphMap = () => ({});
  IconComponent.getFontFamily = () => "";

  return IconComponent;
};

// Create mock classes for all the icon sets
const AntDesign = createMockIconSet({}, "AntDesign");
const Entypo = createMockIconSet({}, "Entypo");
const EvilIcons = createMockIconSet({}, "EvilIcons");
const Feather = createMockIconSet({}, "Feather");
const FontAwesome = createMockIconSet({}, "FontAwesome");
const FontAwesome5 = createMockIconSet({}, "FontAwesome5");
const Foundation = createMockIconSet({}, "Foundation");
const Ionicons = createMockIconSet({}, "Ionicons");
const MaterialIcons = createMockIconSet({}, "MaterialIcons");
const MaterialCommunityIcons = createMockIconSet({}, "MaterialCommunityIcons");
const Octicons = createMockIconSet({}, "Octicons");
const SimpleLineIcons = createMockIconSet({}, "SimpleLineIcons");
const Zocial = createMockIconSet({}, "Zocial");

// Export all the mock icon components
export {
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  FontAwesome,
  FontAwesome5,
  Foundation,
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  Octicons,
  SimpleLineIcons,
  Zocial,
  createMockIconSet,
};

// Export a default object that combines all icon sets
export default {
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  FontAwesome,
  FontAwesome5,
  Foundation,
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  Octicons,
  SimpleLineIcons,
  Zocial,
  createIconSet: createMockIconSet,
};
