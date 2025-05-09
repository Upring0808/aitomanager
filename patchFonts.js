/**
 * patchFonts.js - Patches React Native to use system fonts
 * instead of loading custom fonts, which helps prevent errors.
 *
 * This approach doesn't use process.on which causes errors
 * in some environments like Expo on iOS.
 */

import { Text, TextInput } from "react-native";

// Simple approach - just override default font family
if (Text.defaultProps === undefined) {
  Text.defaultProps = {};
}
Text.defaultProps.style = { fontFamily: undefined };

if (TextInput.defaultProps === undefined) {
  TextInput.defaultProps = {};
}
TextInput.defaultProps.style = { fontFamily: undefined };

console.log(
  "[Font Patch] Successfully patched React Native components to use system fonts"
);

// Export an empty object to allow importing
export default {};
