# QR Scanner Testing Guide

## 🎯 Testing Options

### Option 1: Development Build (Recommended for Full Testing)

**Best for**: Testing real camera functionality and QR scanning

#### Steps:

1. **Create Development Build**:

   ```bash
   npx expo prebuild
   npx expo run:android  # or npx expo run:ios
   ```

2. **Test Real QR Scanning**:
   - Generate QR code using QRCodeGenerator
   - Use camera to scan the QR code
   - Verify organization detection and navigation

#### Benefits:

- ✅ Full camera access
- ✅ Real QR code scanning
- ✅ Production-like environment
- ✅ All features work as expected

---

### Option 2: Expo Go with Test Button (Quick Testing)

**Best for**: Testing logic and navigation without camera

#### Steps:

1. **Start Expo Go**:

   ```bash
   npx expo start
   ```

2. **Use Test Button**:
   - Navigate to QR Login screen
   - Tap "Test QR Scan (Expo Go)" button
   - Verify organization detection and navigation

#### Benefits:

- ✅ Quick testing in simulator
- ✅ No camera setup required
- ✅ Tests core logic and navigation
- ✅ Works immediately

---

## 🧪 Testing Scenarios

### Test Case 1: Valid Organization QR Code

**Expected Result**: Successfully navigates to login screen

**Test Data**:

```json
{
  "orgId": "BSIT_Dept",
  "organizationId": "BSIT_Dept",
  "name": "BSIT Department",
  "timestamp": "2024-01-XX...",
  "type": "organization_login"
}
```

**Steps**:

1. Generate QR code for BSIT_Dept organization
2. Scan QR code (or use test button)
3. Verify navigation to LoginScreen
4. Check AsyncStorage for organization data

### Test Case 2: Invalid QR Code

**Expected Result**: Shows error message and allows rescanning

**Test Data**: Invalid JSON or non-existent organization

**Steps**:

1. Scan invalid QR code
2. Verify error message appears
3. Confirm rescan functionality works

### Test Case 3: Camera Permission Denied

**Expected Result**: Shows permission request dialog

**Steps**:

1. Deny camera permission
2. Try to start scanning
3. Verify permission request dialog appears

---

## 📱 Device Testing Checklist

### Android Testing

- [ ] Camera permission granted
- [ ] QR code detection works
- [ ] Navigation to login screen
- [ ] Error handling for invalid codes
- [ ] Rescan functionality

### iOS Testing

- [ ] Camera permission granted
- [ ] QR code detection works
- [ ] Navigation to login screen
- [ ] Error handling for invalid codes
- [ ] Rescan functionality

### Simulator Testing (Expo Go)

- [ ] Test button works
- [ ] Navigation logic functions
- [ ] Error handling works
- [ ] AsyncStorage operations

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Camera Not Working in Expo Go

**Solution**: Use development build or test button

```bash
npx expo run:android  # or npx expo run:ios
```

#### 2. QR Code Not Detected

**Solutions**:

- Ensure good lighting
- Hold camera steady
- Check QR code quality
- Verify QR code format

#### 3. Organization Not Found

**Solutions**:

- Verify organization exists in Firebase
- Check organization ID format
- Ensure Firebase connection

#### 4. Navigation Issues

**Solutions**:

- Check AsyncStorage data
- Verify navigation setup
- Check console for errors

### Debug Commands

#### Check Dependencies

```bash
npx expo install --fix
```

#### Clear Cache

```bash
npx expo start --clear
```

#### Check Firebase Connection

```bash
# Verify in console logs
console.log("Firebase connection status")
```

---

## 📊 Test Results Template

| Test Case         | Environment       | Status | Notes |
| ----------------- | ----------------- | ------ | ----- |
| Valid QR Scan     | Development Build | ✅/❌  |       |
| Valid QR Scan     | Expo Go (Test)    | ✅/❌  |       |
| Invalid QR Code   | Development Build | ✅/❌  |       |
| Camera Permission | Development Build | ✅/❌  |       |
| Navigation        | Both              | ✅/❌  |       |
| Error Handling    | Both              | ✅/❌  |       |

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] All test cases pass
- [ ] Camera permissions work
- [ ] QR code generation works
- [ ] Error handling is robust
- [ ] UI/UX is polished
- [ ] Performance is acceptable

### Deployment Commands

```bash
# Create production build
npx expo build:android  # or npx expo build:ios

# Or use EAS Build
npx eas build --platform android
npx eas build --platform ios
```

---

**Note**: The test button in Expo Go is for development purposes only. Remove it before production deployment.
