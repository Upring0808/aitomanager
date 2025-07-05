# EAS Build Guide for QR Scanner Testing

## 🎯 Overview

This guide explains how to build and test your QR scanner using EAS (Expo Application Services) builds, which provide a fully standalone app experience similar to production.

## 🔄 Build Types Comparison

| Build Type      | Purpose            | Network               | Performance     | Distribution |
| --------------- | ------------------ | --------------------- | --------------- | ------------ |
| **Development** | Local testing      | Requires local server | Debug mode      | Internal     |
| **Preview**     | Standalone testing | Independent           | Optimized       | Internal     |
| **Production**  | App store release  | Independent           | Fully optimized | Public       |

## 🚀 Building with EAS

### 1. Install EAS CLI (if not already installed)

```bash
npm install -g @expo/eas-cli
```

### 2. Login to EAS

```bash
eas login
```

### 3. Configure EAS (already done)

Your `eas.json` is already configured with three build profiles:

- `development` - For development builds
- `preview` - For standalone testing
- `production` - For app store release

## 📱 Building for QR Scanner Testing

### Option 1: Preview Build (Recommended for Testing)

```bash
# Build for Android
eas build --platform android --profile preview

# Build for iOS
eas build --platform ios --profile preview

# Build for both platforms
eas build --platform all --profile preview
```

### Option 2: Production Build (Full Production Experience)

```bash
# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production
```

## 🔧 Build Configuration Details

### Preview Build Features:

- ✅ **Standalone app** - No development server needed
- ✅ **APK format** - Easy to install on Android devices
- ✅ **Internal distribution** - Share via Expo's internal distribution
- ✅ **Production-like environment** - Real Firebase, real APIs
- ✅ **Optimized performance** - Better than development builds

### Production Build Features:

- ✅ **Fully optimized** - Best performance
- ✅ **AAB format** - Android App Bundle for Play Store
- ✅ **App store ready** - Can be submitted to stores
- ✅ **Production environment** - Real production APIs

## 📋 Pre-Build Checklist

Before building, ensure:

- [ ] **Camera permissions** added to `app.json`
- [ ] **expo-camera plugin** configured
- [ ] **Firebase configuration** is production-ready
- [ ] **QR code generation** working in admin dashboard
- [ ] **Navigation setup** properly configured
- [ ] **All dependencies** installed and working

## 🏗️ Build Process

### 1. Start the Build

```bash
# For Android preview build
eas build --platform android --profile preview
```

### 2. Monitor Build Progress

- Build will be queued and processed on Expo's servers
- You'll receive a build URL to monitor progress
- Build typically takes 10-20 minutes

### 3. Download and Install

- Once complete, download the APK/IPA file
- Install on your physical device
- No development server needed!

## 🧪 Testing Your QR Scanner

### 1. Generate Test QR Codes

1. Open your app in development build or web
2. Navigate to Admin Dashboard → Profile
3. Generate QR codes for your organizations
4. Save QR codes to your device

### 2. Test QR Scanning

1. Install the EAS-built app on your device
2. Open the app (fully standalone!)
3. Navigate to "Scan QR Code"
4. Grant camera permissions
5. Scan the generated QR codes
6. Verify navigation to login screen

### 3. Test Scenarios

- ✅ **Valid QR code** - Should navigate to login
- ✅ **Invalid QR code** - Should show error message
- ✅ **No camera permission** - Should show permission request
- ✅ **Network issues** - Should handle gracefully
- ✅ **Back navigation** - Should work properly

## 🔍 Environment Variables

Your `eas.json` includes environment variables:

```json
{
  "preview": {
    "env": {
      "EXPO_PUBLIC_ENVIRONMENT": "preview"
    }
  },
  "production": {
    "env": {
      "EXPO_PUBLIC_ENVIRONMENT": "production"
    }
  }
}
```

You can use these in your app:

```javascript
// In your QR scanner or other components
const environment = process.env.EXPO_PUBLIC_ENVIRONMENT;
console.log("Running in environment:", environment);
```

## 📊 Build Comparison

| Feature                | Development Build     | EAS Preview Build | EAS Production Build |
| ---------------------- | --------------------- | ----------------- | -------------------- |
| **Network Dependency** | Requires local server | Independent       | Independent          |
| **Performance**        | Debug mode            | Optimized         | Fully optimized      |
| **Installation**       | Development client    | Direct APK/IPA    | App store            |
| **Testing**            | Local network only    | Anywhere          | Anywhere             |
| **Firebase**           | Development config    | Production config | Production config    |
| **Build Time**         | Instant               | 10-20 minutes     | 10-20 minutes        |
| **Distribution**       | Internal only         | Internal          | Public               |

## 🚨 Common Issues and Solutions

### 1. Build Fails Due to Permissions

**Solution**: Ensure `app.json` has proper camera permissions:

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

### 2. Camera Not Working in EAS Build

**Solution**:

- Rebuild with `--clear-cache` flag
- Ensure testing on physical device (not simulator)
- Check camera permissions in device settings

### 3. Firebase Connection Issues

**Solution**:

- Verify Firebase config is production-ready
- Check network connectivity
- Ensure Firebase project is properly configured

### 4. Navigation Errors in EAS Build

**Solution**:

- The safe navigation helpers should handle this
- Check console logs for specific errors
- Verify all navigation routes are properly defined

## 📱 Testing Checklist for EAS Build

### Pre-Testing:

- [ ] EAS build completed successfully
- [ ] APK/IPA downloaded and installed
- [ ] Camera permissions granted on device
- [ ] Test QR codes generated
- [ ] Firebase connection verified

### Testing Scenarios:

- [ ] App launches without errors
- [ ] QR scanner screen loads
- [ ] Camera initializes properly
- [ ] QR codes scan successfully
- [ ] Navigation works correctly
- [ ] Error handling works
- [ ] Back navigation functions
- [ ] App works offline (if applicable)

## 🔄 Development Workflow

### Recommended Workflow:

1. **Development**: Use development build for rapid iteration
2. **Testing**: Use EAS preview build for standalone testing
3. **Production**: Use EAS production build for release

### Commands:

```bash
# Development (local testing)
npx expo start --dev-client

# Preview build (standalone testing)
eas build --platform android --profile preview

# Production build (release)
eas build --platform android --profile production
```

## 📞 Support

If you encounter issues:

1. Check the build logs in EAS dashboard
2. Verify all configurations in `app.json` and `eas.json`
3. Test on physical device (not simulator)
4. Check Firebase configuration
5. Review console logs for detailed error information

---

**Note**: EAS builds provide the most accurate representation of how your app will behave in production, making them ideal for testing features like QR scanning that require real device capabilities.
