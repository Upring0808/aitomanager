/**
 * Fallback styles to use system fonts when custom fonts are not available
 */

import { StyleSheet } from "react-native";
import { Platform } from "react-native";

// System fonts for different platforms
const systemFonts = {
  regular: Platform.select({
    ios: "System",
    android: "normal",
    default: "sans-serif",
  }),
  bold: Platform.select({
    ios: "System",
    android: "bold",
    default: "sans-serif-medium",
  }),
  italic: Platform.select({
    ios: "System",
    android: "italic",
    default: "sans-serif-italic",
  }),
};

// Create a mapping from custom fonts to system fonts
export const fontMapping = {
  "Poppins-Regular": systemFonts.regular,
  "Satisfy-Regular": systemFonts.regular,
  "Lato-Regular": systemFonts.regular,
  "Lato-Bold": systemFonts.bold,
};

// Common text styles using system fonts
export const textStyles = StyleSheet.create({
  heading: {
    fontFamily: systemFonts.bold,
    fontSize: 22,
    fontWeight: "bold",
  },
  subheading: {
    fontFamily: systemFonts.regular,
    fontSize: 18,
    fontWeight: "500",
  },
  body: {
    fontFamily: systemFonts.regular,
    fontSize: 16,
  },
  button: {
    fontFamily: systemFonts.bold,
    fontSize: 16,
    fontWeight: "bold",
  },
  caption: {
    fontFamily: systemFonts.regular,
    fontSize: 12,
  },
});

// Helper function to replace custom fonts in a style object
export const withSystemFonts = (style = {}) => {
  if (style.fontFamily && fontMapping[style.fontFamily]) {
    return {
      ...style,
      fontFamily: fontMapping[style.fontFamily],
    };
  }
  return style;
};
