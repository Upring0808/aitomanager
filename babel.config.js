module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Add module-resolver plugin to alias native firebase modules to our compatibility layer
      [
        "module-resolver",
        {
          alias: {
            "@react-native-firebase/app": "./firebaseCompat.js",
            "@react-native-firebase/auth": "./firebaseCompat.js",
            "@react-native-firebase/firestore": "./firebaseCompat.js",
            "@react-native-firebase/database": "./firebaseCompat.js",
            "@react-native-firebase/storage": "./firebaseCompat.js",
            "@react-native-firebase/app-check": "./firebaseCompat.js",
            "@react-native-firebase/messaging": "./firebaseCompat.js",
          },
        },
      ],
    ],
  };
};
