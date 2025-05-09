/**
 * Notifications Setup
 * Sets up the notifications handler for the app
 */

import * as Notifications from "expo-notifications";

// Configure default notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Export for use in other files
export default Notifications;
