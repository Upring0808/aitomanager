# AITO Check - Landing Page & Login Flow Setup

This document provides instructions for setting up the new AITO Check landing page and login flow for Batanes State College.

## Overview

The AITO Check app now includes:

- **LandingScreen**: Organization selection with search functionality
- **LoginScreen**: Firebase authentication with organization context
- **Dashboard**: Existing dashboard with user management

## Features Implemented

### Landing Page (`LandingScreen.js`)

- ✅ App logo and tagline "Connect to Your Org, Anytime!"
- ✅ Search bar with autocomplete for organizations
- ✅ Scrollable list of organizations from Firestore
- ✅ Organization icons and "Join Org" buttons
- ✅ Footer with "Powered by Batanes State College" and admin login
- ✅ Clean dark theme with Batanes State College colors
- ✅ Smooth animations and responsive design

### Login Screen (`LoginScreen.js`)

- ✅ Displays selected organization name and logo
- ✅ Email/username and password fields
- ✅ Firebase Authentication integration
- ✅ Error handling with specific error messages
- ✅ "Forgot Password?" and "Sign Up" links
- ✅ Navigation to dashboard on successful login
- ✅ Back navigation to landing page

### Technical Implementation

- ✅ React Native with JavaScript
- ✅ Firebase Firestore for organization data
- ✅ Firebase Authentication for login
- ✅ AsyncStorage for organization selection persistence
- ✅ React Navigation for screen transitions
- ✅ Responsive design for different screen sizes
- ✅ Error handling for network and auth failures

## Firebase Data Structure

### Organizations Collection

```
organizations (collection)
├── BSIT_Dept (document)
│   └── info (sub-collection/document)
│       ├── name: "BSIT Department"
│       ├── logo_url: "https://storage.googleapis.com/org_logos/bsit_logo.png"
│       └── icon: "BookOpen"
├── Nursing_Dept (document)
│   └── info (sub-collection/document)
│       ├── name: "Nursing Department"
│       ├── logo_url: "https://storage.googleapis.com/org_logos/nursing_logo.png"
│       └── icon: "Users"
└── Student_Council (document)
    └── info (sub-collection/document)
        ├── name: "Student Council"
        ├── logo_url: null
        └── icon: "GraduationCap"
```

## Setup Instructions

### 1. Firebase Configuration

The app already has Firebase configured in `firebase.js`. Ensure your Firebase project has:

- Firestore database enabled
- Authentication enabled with Email/Password sign-in method
- Storage bucket for organization logos (optional)

### 2. Create Organizations in Firestore

Add organization documents to the `organizations` collection:

```javascript
// Example: Add BSIT Department
const orgData = {
  info: {
    name: "BSIT Department",
    logo_url: "https://your-storage-url/bsit_logo.png", // Optional
    icon: "BookOpen", // Icon name from lucide-react-native
  },
};

// Add to Firestore
await addDoc(collection(db, "organizations", "BSIT_Dept", "info"), orgData);
```

### 3. Create User Accounts

Add user accounts to Firebase Authentication:

- Go to Firebase Console > Authentication > Users
- Add users with email and password
- Users can then log in through the app

### 4. Test the Flow

1. Launch the app - it should start at the LandingScreen
2. Search for organizations or browse the list
3. Click "Join Org" on any organization
4. Enter credentials on the LoginScreen
5. Successfully log in to access the Dashboard

## Navigation Flow

```
LandingScreen (Initial)
    ↓ (Select Organization)
LoginScreen
    ↓ (Successful Login)
Dashboard
    ↓ (Logout)
LandingScreen
```

## AsyncStorage Keys Used

The app stores the following data in AsyncStorage:

- `selectedOrgId`: Organization ID (e.g., "BSIT_Dept")
- `selectedOrgName`: Organization display name
- `selectedOrgLogo`: Organization logo URL (if available)
- `selectedOrgIcon`: Organization icon name
- `userEmail`: User's email after login
- `userId`: User's Firebase UID after login

## Error Handling

The app includes comprehensive error handling for:

- Network connectivity issues
- Firebase service unavailability
- Authentication failures with specific error messages
- Invalid organization selection
- Missing user credentials

## Styling and Theme

The app uses a consistent color scheme based on Batanes State College colors:

- Primary: `#16325B` (Dark Blue)
- Secondary: `#1e4a8a` (Medium Blue)
- Accent: `#2d5aa0` (Light Blue)
- Text: `#e0e7ff` (Light Blue Text)
- Background: Gradient from dark to light blue

## Dependencies

The following dependencies are already included in `package.json`:

- `@react-navigation/native` and `@react-navigation/stack`
- `@react-native-async-storage/async-storage`
- `firebase`
- `expo-linear-gradient`
- `lucide-react-native`

## Troubleshooting

### Common Issues

1. **Organizations not loading**: Check Firestore permissions and network connectivity
2. **Login failing**: Verify Firebase Authentication is enabled and user accounts exist
3. **Navigation errors**: Ensure all screen names match in App.js navigation setup
4. **Styling issues**: Check if all required dependencies are installed

### Debug Logs

The app includes comprehensive logging:

- `[LandingScreen]` - Organization loading and selection
- `[LoginScreen]` - Authentication and navigation
- `[App]` - Firebase initialization and auth state changes

## Future Enhancements

Potential improvements for future versions:

- Organization logo upload functionality
- User registration within organizations
- Password reset functionality
- Push notifications for organization updates
- Offline support with data caching
- Multi-language support
- Advanced search filters

## Support

For technical support or questions about the AITO Check app, please contact the development team or refer to the Firebase documentation for backend configuration.
