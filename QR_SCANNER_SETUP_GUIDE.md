# QR Scanner Setup Guide for Expo Development Build

## 🎯 Overview

This guide provides a complete setup for implementing a robust QR scanner in your React Native Expo app using Expo Camera. The implementation includes proper error handling, safe navigation, and best practices for development builds.

## 📦 Required Dependencies

### Core Dependencies

```json
{
  "expo-camera": "~14.0.5",
  "expo-barcode-scanner": "~12.9.3",
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/stack": "^6.3.20",
  "react-native-gesture-handler": "~2.14.0",
  "react-native-safe-area-context": "4.8.2",
  "react-native-screens": "~3.29.0",
  "@react-native-async-storage/async-storage": "1.21.0",
  "lucide-react-native": "^0.263.1"
}
```

### Installation Commands

```bash
# Install Expo Camera
npx expo install expo-camera

# Install Navigation dependencies
npx expo install @react-navigation/native @react-navigation/stack
npx expo install react-native-gesture-handler react-native-safe-area-context react-native-screens

# Install other dependencies
npx expo install @react-native-async-storage/async-storage
npm install lucide-react-native

# For development builds
npx expo install expo-dev-client
```

## ⚙️ Configuration Files

### app.json Configuration

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "This app needs access to camera to scan QR codes for organization access."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": ["CAMERA"]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to scan QR codes."
        }
      ]
    ]
  }
}
```

### metro.config.js (if needed)

```javascript
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = config;
```

## 🚀 Navigation Setup

### App.js Navigation Structure

```javascript
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import QRLoginScreen from "./screens/QRLoginScreen";
import LoginScreen from "./screens/LoginScreen";
import EntryScreen from "./screens/EntryScreen";
// ... other imports

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="EntryScreen"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="EntryScreen" component={EntryScreen} />
        <Stack.Screen name="QRLoginScreen" component={QRLoginScreen} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        {/* ... other screens */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
```

## 🔧 Development Build Setup

### 1. Create Development Build

```bash
# For Android
npx expo prebuild
npx expo run:android

# For iOS
npx expo prebuild
npx expo run:ios
```

### 2. Development Client Configuration

```bash
# Install development client
npx expo install expo-dev-client

# Start development server
npx expo start --dev-client
```

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. "Cannot read property 'back' of undefined" Error

**Cause**: Navigation object not properly initialized or component trying to access navigation before it's ready.

**Solution**: Use safe navigation helpers:

```javascript
const safeNavigate = useCallback(
  (routeName, params = {}) => {
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate(routeName, params);
      } else {
        console.warn("Navigation not available");
        // Fallback
        if (navigation && navigation.reset) {
          navigation.reset({
            index: 0,
            routes: [{ name: routeName, params }],
          });
        }
      }
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Unable to navigate. Please try again.");
    }
  },
  [navigation]
);
```

#### 2. Camera Permission Issues

**Symptoms**: Camera not initializing, permission denied errors.

**Solutions**:

```javascript
// Check permission status
const checkPermission = async () => {
  const { status } = await Camera.getCameraPermissionsAsync();
  return status === "granted";
};

// Request permission with proper error handling
const requestPermission = async () => {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Permission request failed:", error);
    return false;
  }
};
```

#### 3. Camera Not Initializing in Development Build

**Solutions**:

1. **Check app.json permissions**:

```json
{
  "expo": {
    "android": {
      "permissions": ["CAMERA"]
    },
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Camera access needed for QR scanning"
      }
    }
  }
}
```

2. **Rebuild development build**:

```bash
npx expo prebuild --clean
npx expo run:android  # or run:ios
```

#### 4. Component Unmounting Issues

**Solution**: Use refs to track component mount state:

```javascript
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);

// Check before state updates
if (isMountedRef.current) {
  setState(newValue);
}
```

#### 5. Multiple Scans Prevention

**Solution**: Use proper state management:

```javascript
const [scanned, setScanned] = useState(false);
const [loading, setLoading] = useState(false);

const handleBarCodeScanned = useCallback(
  async ({ data }) => {
    if (loading || scanned || !isMountedRef.current) {
      return; // Prevent multiple scans
    }

    setScanned(true);
    setLoading(true);

    try {
      // Process scan
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  },
  [loading, scanned]
);
```

## 🔍 Debugging Tips

### 1. Enable Detailed Logging

```javascript
// Add to your QR scanner component
console.log("Camera permission status:", hasPermission);
console.log("Camera ready state:", cameraReady);
console.log("Scan state:", { loading, scanned });
```

### 2. Test Camera Permissions

```javascript
// Test permission flow
const testPermissions = async () => {
  const current = await Camera.getCameraPermissionsAsync();
  console.log("Current permission:", current);

  if (current.status !== "granted") {
    const request = await Camera.requestCameraPermissionsAsync();
    console.log("Request result:", request);
  }
};
```

### 3. Check Navigation State

```javascript
// Debug navigation
console.log("Navigation object:", navigation);
console.log("Can go back:", navigation?.canGoBack?.());
```

## 📱 Testing Checklist

### Pre-Testing Setup

- [ ] Development build created and installed
- [ ] Camera permissions granted
- [ ] Navigation properly configured
- [ ] Firebase connection established
- [ ] QR codes generated for testing

### Testing Scenarios

1. **Permission Flow**:

   - [ ] App requests camera permission
   - [ ] Permission granted successfully
   - [ ] Permission denied handled gracefully

2. **Camera Initialization**:

   - [ ] Camera loads without errors
   - [ ] Camera ready callback fires
   - [ ] Camera mount errors handled

3. **QR Code Scanning**:

   - [ ] Valid QR code scanned successfully
   - [ ] Invalid QR code shows error
   - [ ] Multiple scans prevented
   - [ ] Organization data retrieved correctly

4. **Navigation**:

   - [ ] Safe navigation to LoginScreen
   - [ ] Back navigation works
   - [ ] Navigation errors handled

5. **Error Handling**:
   - [ ] Network errors handled
   - [ ] Firebase errors handled
   - [ ] Camera errors handled
   - [ ] User-friendly error messages

## 🚨 Common Pitfalls to Avoid

1. **Not checking component mount state** before updating state
2. **Not handling navigation errors** with try-catch blocks
3. **Not preventing multiple scans** during processing
4. **Not cleaning up camera resources** on unmount
5. **Not handling permission denial** gracefully
6. **Not testing on physical devices** (camera doesn't work in simulators)
7. **Not rebuilding development build** after permission changes

## 🔄 Performance Optimization

1. **Use useCallback** for event handlers
2. **Use useRef** for tracking mount state
3. **Prevent unnecessary re-renders** with proper dependencies
4. **Clean up subscriptions** and listeners
5. **Use proper camera settings** for your use case

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all dependencies are correctly installed
3. Ensure development build is properly configured
4. Test on physical device (not simulator)
5. Check Expo and React Navigation documentation
6. Review console logs for detailed error information

---

**Note**: This implementation is specifically designed for development builds and includes comprehensive error handling to prevent crashes and provide a smooth user experience.
