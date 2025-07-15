/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Track admin online status
exports.updateAdminStatus = onRequest(async (request, response) => {
  try {
    const { isOnline, adminId } = request.body;
    
    if (!adminId) {
      response.status(400).json({ error: 'Admin ID is required' });
      return;
    }

    const db = admin.firestore();
    const adminStatusRef = db.collection('adminStatus').doc('main');
    
    await adminStatusRef.set({
      isOnline: isOnline,
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
      adminId: adminId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    response.json({ success: true });
  } catch (error) {
    logger.error('Error updating admin status:', error);
    response.status(500).json({ error: 'Failed to update admin status' });
  }
});

// Auto-update admin status when they send messages
exports.onAdminMessage = onDocumentCreated('messages', async (event) => {
  try {
    const messageData = event.data.data();
    
    // Only update status if it's an admin message
    if (messageData.senderRole === 'admin') {
      const db = admin.firestore();
      const adminStatusRef = db.collection('adminStatus').doc('main');
      
      await adminStatusRef.set({
        isOnline: true,
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
        adminId: messageData.senderId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    logger.error('Error updating admin status on message:', error);
  }
});

// Set admin offline after 5 minutes of inactivity
exports.setAdminOffline = onRequest(async (request, response) => {
  try {
    const db = admin.firestore();
    const adminStatusRef = db.collection('adminStatus').doc('main');
    
    await adminStatusRef.set({
      isOnline: false,
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    response.json({ success: true });
  } catch (error) {
    logger.error('Error setting admin offline:', error);
    response.status(500).json({ error: 'Failed to set admin offline' });
  }
});

// Scheduled function to auto-fine absentees after event end
exports.autoFineAbsentees = onSchedule("every 5 minutes", async (event) => {
  const db = admin.firestore();
  try {
    // Get all organizations
    const orgsSnapshot = await db.collection("organizations").get();
    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      // Get fine settings
      const fineSettingsSnap = await db
        .collection("organizations")
        .doc(orgId)
        .collection("settings")
        .doc("fineSettings")
        .get();
      const fineSettings = fineSettingsSnap.exists
        ? fineSettingsSnap.data()
        : { studentFine: 50, officerFine: 100 };
      // Get all events that have ended and not processed for fines
      const now = admin.firestore.Timestamp.now();
      const eventsSnap = await db
        .collection("organizations")
        .doc(orgId)
        .collection("events")
        .where("dueDate", "<=", now)
        .where("finesProcessed", "!=", true)
        .get();
      for (const eventDoc of eventsSnap.docs) {
        const event = eventDoc.data();
        const eventId = eventDoc.id;
        // Parse event end time from timeframe
        let eventEnd = null;
        if (event.dueDate && event.timeframe) {
          const date = event.dueDate.toDate ? event.dueDate.toDate() : new Date(event.dueDate.seconds * 1000);
          let match = event.timeframe.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
          if (match) {
            const endStr = match[2];
            eventEnd = parseLocalDateTime(date, endStr);
          } else {
            match = event.timeframe.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
            if (match) {
              const endStr = match[2];
              eventEnd = parseLocalDateTime(date, endStr);
            } else {
              eventEnd = date;
            }
          }
        }
        if (!eventEnd || new Date() < eventEnd) {
          // Event not ended yet
          continue;
        }
        // Get all users (students and officers)
        const usersSnap = await db
          .collection("organizations")
          .doc(orgId)
          .collection("users")
          .get();
        const attendees = event.attendees || [];
        for (const userDoc of usersSnap.docs) {
          const user = userDoc.data();
          const userId = userDoc.id;
          if (attendees.includes(userId)) continue; // Attended
          // Determine fine amount
          let amount = 0;
          if (user.role && user.role !== "student") {
            amount = fineSettings.officerFine || 100;
          } else {
            amount = fineSettings.studentFine || 50;
          }
          // Check if already fined for this event
          const finesSnap = await db
            .collection("organizations")
            .doc(orgId)
            .collection("fines")
            .where("userId", "==", userId)
            .where("eventId", "==", eventId)
            .get();
          if (!finesSnap.empty) continue; // Already fined
          // Create fine
          await db
            .collection("organizations")
            .doc(orgId)
            .collection("fines")
            .add({
              userId,
              userFullName: user.fullName || "Unknown User",
              userStudentId: user.studentId || "No ID",
              userRole: user.role || "student",
              eventId,
              eventTitle: event.title || "Unknown Event",
              eventDueDate: event.dueDate || null,
              eventTimeframe: event.timeframe || "No timeframe",
              amount,
              status: "unpaid",
              createdAt: admin.firestore.Timestamp.now(),
              description: `Fine for missing ${event.title || "an event"}`,
              issuedBy: {
                uid: "system",
                username: "System",
                role: "system",
              },
            });
          logger.log(`Fined ${user.fullName || userId} for missing event ${event.title}`);
        }
        // Mark event as processed
        await eventDoc.ref.update({ finesProcessed: true });
        logger.log(`Processed fines for event ${event.title}`);
      }
    }
  } catch (error) {
    logger.error("Error in autoFineAbsentees:", error);
  }
});

// Helper to parse local date/time string (copied from frontend logic)
function parseLocalDateTime(date, timeStr) {
  let hours = 0, minutes = 0;
  if (/AM|PM/i.test(timeStr)) {
    const [time, modifier] = timeStr.split(/\s+/);
    let [h, m] = time.split(":").map(Number);
    if (modifier.toUpperCase() === "PM" && h !== 12) h += 12;
    if (modifier.toUpperCase() === "AM" && h === 12) h = 0;
    hours = h;
    minutes = m;
  } else {
    [hours, minutes] = timeStr.split(":").map(Number);
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}
