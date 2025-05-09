/**
 * This file handles module resolution overrides for Metro bundler
 * to prevent font loading errors from vector icons
 */

const path = require("path");

// Maps module names to local files or node_modules
const moduleMap = {
  // Vector icons resolution
  "@expo/vector-icons": path.resolve(__dirname, "./mockVectorIcons.js"),
  "@expo/vector-icons/AntDesign": path.resolve(
    __dirname,
    "./mockVectorIcons.js"
  ),
  "@expo/vector-icons/Entypo": path.resolve(__dirname, "./mockVectorIcons.js"),
  "@expo/vector-icons/EvilIcons": path.resolve(
    __dirname,
    "./mockVectorIcons.js"
  ),
  "@expo/vector-icons/Feather": path.resolve(__dirname, "./mockVectorIcons.js"),
  "@expo/vector-icons/FontAwesome": path.resolve(
    __dirname,
    "./mockVectorIcons.js"
  ),
  "@expo/vector-icons/FontAwesome5": path.resolve(
    __dirname,
    "./mockVectorIcons.js"
  ),
  "@expo/vector-icons/Foundation": path.resolve(
    __dirname,
    "./mockVectorIcons.js"
  ),
  "@expo/vector-icons/Ionicons": path.resolve(
    __dirname,
    "./mockVectorIcons.js"
  ),
  "@expo/vector-icons/MaterialIcons": path.resolve(
    __dirname,
    "./mockVectorIcons.js"
  ),
  "@expo/vector-icons/MaterialCommunityIcons": path.resolve(
    __dirname,
    "./mockVectorIcons.js"
  ),
  "@expo/vector-icons/Octicons": path.resolve(
    __dirname,
    "./mockVectorIcons.js"
  ),
  "@expo/vector-icons/SimpleLineIcons": path.resolve(
    __dirname,
    "./mockVectorIcons.js"
  ),
  "@expo/vector-icons/Zocial": path.resolve(__dirname, "./mockVectorIcons.js"),
};

// Resolves font files to empty files
const emptyModule = path.resolve(__dirname, "./emptyModule.js");

// Check if the path is a font file
const isFontFile = (path) => {
  return /\.(ttf|otf|woff|woff2)$/.test(path);
};

// Resolver function for metro
function resolver(context, moduleName, platform) {
  // Handle vector icons mapping
  if (moduleMap[moduleName]) {
    return {
      filePath: moduleMap[moduleName],
      type: "sourceFile",
    };
  }

  // Handle font files
  if (isFontFile(moduleName)) {
    return {
      filePath: emptyModule,
      type: "sourceFile",
    };
  }

  // Let Metro handle normal resolution
  return context.resolveRequest(context, moduleName, platform);
}

module.exports = resolver;
