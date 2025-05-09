// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for CJS modules
config.resolver.sourceExts.push("cjs");

// Disable package.json exports to avoid Firebase module conflicts
config.resolver.unstable_enablePackageExports = false;

// Force Firebase modules to be loaded as ESM
config.resolver.resolveRequest = (context, moduleImport, platform) => {
  // Always import the ESM version of all `@firebase/*` packages
  if (
    moduleImport.startsWith("@firebase/") ||
    moduleImport === "firebase/auth"
  ) {
    return context.resolveRequest(
      {
        ...context,
        isESMImport: true, // Mark the import method as ESM
      },
      moduleImport,
      platform
    );
  }
  return context.resolveRequest(context, moduleImport, platform);
};

// Create aliases for firebase packages to prevent duplicate instances
config.resolver.extraNodeModules = {
  "@react-native-firebase/app": path.resolve(__dirname, "./firebaseCompat.js"),
  "@react-native-firebase/auth": path.resolve(__dirname, "./firebaseCompat.js"),
  "@react-native-firebase/firestore": path.resolve(
    __dirname,
    "./firebaseCompat.js"
  ),
  "@react-native-firebase/database": path.resolve(
    __dirname,
    "./firebaseCompat.js"
  ),
  "@react-native-firebase/storage": path.resolve(
    __dirname,
    "./firebaseCompat.js"
  ),
  "@react-native-firebase/app-check": path.resolve(
    __dirname,
    "./firebaseCompat.js"
  ),
  "@react-native-firebase/messaging": path.resolve(
    __dirname,
    "./firebaseCompat.js"
  ),

  // Make sure these modules are properly resolved
  "firebase/auth": path.resolve(__dirname, "node_modules/firebase/auth"),
  "@firebase/auth": path.resolve(__dirname, "node_modules/@firebase/auth"),
  "@firebase/app": path.resolve(__dirname, "node_modules/@firebase/app"),
  "@firebase/firestore": path.resolve(
    __dirname,
    "node_modules/@firebase/firestore"
  ),
  "@firebase/database": path.resolve(
    __dirname,
    "node_modules/@firebase/database"
  ),
  "@firebase/storage": path.resolve(
    __dirname,
    "node_modules/@firebase/storage"
  ),
  "@react-native-async-storage/async-storage": path.resolve(
    __dirname,
    "node_modules/@react-native-async-storage/async-storage"
  ),
  react: path.resolve(__dirname, "node_modules/react"),
  "react-native": path.resolve(__dirname, "node_modules/react-native"),
};

// Enable symlinks for better module resolution
config.resolver.enableWorkerThreads = true;
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

// Increase watchFolders to include the root for better monorepo support
config.watchFolders = [path.resolve(__dirname)];

module.exports = config;
