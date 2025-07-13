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
