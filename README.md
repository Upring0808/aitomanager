# Firebase Auth App - Online/Offline Functionality

This application implements robust real-time presence detection using Firebase Realtime Database.

## Online/Offline Functionality Overview

The application provides real-time online/offline status tracking with the following features:

1. **Real-time presence detection**: Users appear online when actively using the app
2. **Automatic offline detection**: Users are marked offline when they close the app or lose connectivity
3. **Last seen timestamps**: Shows when offline users were last active
4. **Accurate status updates**: Handles network interruptions gracefully
5. **Central state management**: Uses React Context for app-wide access to online status
6. **Error resilience**: Properly handles permission errors without app crashes

## Key Components

1. **UserPresenceService.js**: Core service that manages Firebase presence

   - Handles connection state changes
   - Sets up onDisconnect handlers for server-side detection
   - Manages user activity tracking
   - Cleans up inactive users
   - Provides user presence information

2. **OnlineStatusContext.js**: React Context for app-wide status management

   - Tracks device network connectivity
   - Monitors Firebase connection state
   - Provides online status for all users
   - Exposes APIs for components to access status information

3. **People.jsx**: UI component that displays users with status indicators
   - Shows online/offline status indicators
   - Displays "last seen" information for offline users
   - Updates when users' status changes

## How to Test the Implementation

1. **Normal Usage**:

   - The app should show your status as online when using it
   - Other users should appear online when they're using the app
   - Users should appear offline shortly after closing the app

2. **Network Interruptions**:

   - Put your device in airplane mode - you should see the offline banner
   - When you restore connectivity, your online status should update without requiring a restart

3. **Multiple Devices**:

   - If you log in on multiple devices, you should appear online as long as at least one device is active
   - Last seen timestamps should update based on your most recent activity

4. **Background/Foreground**:
   - When you put the app in the background, you should remain online for a short period
   - After some time without activity, you'll be marked as offline
   - When you bring the app back to the foreground, you should automatically go online again

## Troubleshooting

If you encounter issues with online/offline functionality:

1. **Permissions**: Ensure your Firebase database rules allow access to the `/status` path
2. **Network**: Check your device's network connectivity
3. **App Restart**: Sometimes a full app restart can resolve lingering status issues
4. **Firebase Console**: You can directly view the status nodes in the Firebase Console under Realtime Database

## Technical Implementation Notes

- The system uses Firebase's `.info/connected` special location to detect connection state
- `onDisconnect()` handlers ensure users are marked offline even if they lose connection abruptly
- Regular heartbeats update the "last active" timestamp to track user activity
- We use a combination of device network state and Firebase connection state for accurate detection
- Inactive users who appear online but haven't updated their status are automatically cleaned up
