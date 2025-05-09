module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ["./assets/fonts/"],
  dependencies: {
    "@react-native-firebase/app": {
      platforms: {
        android: null, // Placeholder for future native integration if needed
        ios: null,
      },
    },
    "@react-native-firebase/auth": {
      platforms: {
        android: null,
        ios: null,
      },
    },
    "@react-native-async-storage/async-storage": {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
