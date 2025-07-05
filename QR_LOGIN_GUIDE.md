# QR Login Feature Guide

## Overview

The QR Login feature allows organization members to quickly access their organization's login screen by scanning a QR code. This eliminates the need to manually search for and select their organization.

## How It Works

### For Organization Admins

1. **Generate QR Code**:

   - Go to Admin Profile in your organization dashboard
   - Scroll down to the "QR Code Access" section
   - Tap "Generate QR Code"
   - A modal will appear with your organization's QR code

2. **Share QR Code**:

   - Save the QR code to your device's gallery
   - Share it via messaging apps, email, or print it
   - Display it in your organization's physical location

3. **QR Code Content**:
   The QR code contains:
   ```json
   {
     "orgId": "your_organization_id",
     "organizationId": "your_organization_id",
     "name": "Your Organization Name",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "type": "organization_login"
   }
   ```

### For Organization Members

1. **Access QR Login**:

   - Open the FIVENT FLOW app
   - On the entry screen, tap "Scan QR Code"
   - Grant camera permission when prompted

2. **Scan QR Code**:

   - Point your camera at the organization's QR code
   - The app will automatically detect and process the QR code
   - You'll be redirected to the login screen for that specific organization

3. **Login Process**:
   - Enter your credentials as usual
   - The organization context is already set from the QR code scan

## Technical Implementation

### Firebase Integration

- **Free Tier Compatible**: This feature works with Firebase's free tier
- **No Additional Costs**: Uses existing Firestore collections and authentication
- **Secure**: QR codes only contain organization IDs, not sensitive data

### Security Features

- **Organization Validation**: QR codes are validated against existing organizations in Firebase
- **Error Handling**: Invalid or non-existent organization QR codes show appropriate error messages
- **Permission Management**: Camera permissions are properly requested and handled

### File Structure

```
screens/
├── QRLoginScreen.js          # Main QR scanning screen
├── EntryScreen.js            # Updated with QR login button

components/
└── QRCodeGenerator.jsx       # QR code generation modal

screens/Auth/Dashboard/Admin/
└── AdminProfile.jsx          # Updated with QR generation section
```

## Benefits

### For Organizations

- **Faster Onboarding**: New members can quickly access the app
- **Reduced Friction**: No need to search through organization lists
- **Professional Image**: Modern QR-based access method
- **Easy Distribution**: QR codes can be shared digitally or printed

### For Users

- **Quick Access**: Instant organization selection
- **No Manual Search**: Eliminates the need to find your organization
- **Consistent Experience**: Same login flow after QR scan
- **Offline Capable**: QR codes work without internet connection

## Troubleshooting

### Common Issues

1. **Camera Permission Denied**

   - Go to device settings
   - Find FIVENT FLOW app
   - Enable camera permissions
   - Restart the app

2. **QR Code Not Detected**

   - Ensure good lighting
   - Hold device steady
   - Make sure QR code is not damaged or blurry
   - Try adjusting distance from QR code

3. **Organization Not Found Error**

   - Verify the QR code is for the correct organization
   - Check if the organization still exists in the system
   - Contact your organization admin for a new QR code

4. **App Crashes on Scan**
   - Update to the latest version of the app
   - Clear app cache and restart
   - Check device storage space

### Support

If you encounter issues:

1. Check this guide first
2. Contact your organization administrator
3. Ensure you're using the latest version of FIVENT FLOW

## Future Enhancements

Potential improvements for the QR login feature:

- **Dynamic QR Codes**: Time-limited QR codes for enhanced security
- **Analytics**: Track QR code usage and login patterns
- **Custom Branding**: Organization logos embedded in QR codes
- **Batch Generation**: Generate multiple QR codes for different purposes
- **QR Code History**: Track which QR codes have been used

## Technical Notes

### Dependencies Used

- `expo-camera`: For QR code scanning (includes barcode scanning functionality)
- `react-native-qrcode-svg`: For QR code generation
- `react-native-view-shot`: For capturing QR codes as images
- `expo-media-library`: For saving QR codes to gallery

### Firebase Collections Used

- `organizations/{orgId}`: Organization documents
- `organizations/{orgId}/info/details`: Organization information

### Permissions Required

- Camera access for QR scanning
- Media library access for saving QR codes

---

_This feature is designed to work seamlessly with your existing Firebase setup and requires no additional configuration beyond the standard organization setup._
