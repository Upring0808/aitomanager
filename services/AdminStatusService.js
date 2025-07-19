import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebaseconfig';
import { AppState } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';

class AdminStatusService {
  constructor() {
    this.isOnline = false;
    this.statusInterval = null;
    this.backgroundTimeout = null;
    this.lastActiveTime = null;
    this.appStateSubscription = null;
    this.authUnsubscribe = null;
  }

  // Set admin as online
  async setOnline() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('[AdminStatusService] No current user, cannot set online');
        return;
      }

      console.log('[AdminStatusService] Setting admin online for user:', user.uid);
      this.isOnline = true;
      this.lastActiveTime = Date.now();
      
      const adminStatusRef = doc(db, 'adminStatus', 'main');
      await setDoc(adminStatusRef, {
        isOnline: true,
        lastActive: serverTimestamp(),
        adminId: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Start periodic updates to keep admin online
      this.startPeriodicUpdates();
      
      console.log('[AdminStatusService] Admin set online successfully');
    } catch (error) {
      console.error('[AdminStatusService] Error setting admin online:', error);
    }
  }

  // Set admin as offline
  async setOffline() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      this.isOnline = false;
      
      const adminStatusRef = doc(db, 'adminStatus', 'main');
      await setDoc(adminStatusRef, {
        isOnline: false,
        lastActive: serverTimestamp(),
        adminId: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Stop periodic updates
      this.stopPeriodicUpdates();
      this.clearBackgroundTimeout();
      
      console.log('Admin set offline');
    } catch (error) {
      console.error('Error setting admin offline:', error);
    }
  }

  // Force admin offline immediately (for logout)
  async forceOffline() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log('[AdminStatusService] Forcing admin offline for logout');
      this.isOnline = false;
      
      const adminStatusRef = doc(db, 'adminStatus', 'main');
      await setDoc(adminStatusRef, {
        isOnline: false,
        lastActive: serverTimestamp(),
        adminId: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Also try to completely remove the admin status document
      try {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(adminStatusRef);
        console.log('[AdminStatusService] Completely removed admin status document');
      } catch (deleteError) {
        console.log('[AdminStatusService] Could not delete admin status document (may not exist):', deleteError.message);
      }

      console.log('[AdminStatusService] Admin forced offline successfully');
    } catch (error) {
      console.error('[AdminStatusService] Error forcing admin offline:', error);
    }
  }

  // Start periodic updates to keep admin online
  startPeriodicUpdates() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }

    this.statusInterval = setInterval(async () => {
      if (this.isOnline && auth.currentUser) {
        try {
          const adminStatusRef = doc(db, 'adminStatus', 'main');
          await setDoc(adminStatusRef, {
            isOnline: true,
            lastActive: serverTimestamp(),
            adminId: auth.currentUser.uid,
            updatedAt: serverTimestamp()
          }, { merge: true });
          this.lastActiveTime = Date.now();
        } catch (error) {
          console.error('Error updating admin status:', error);
        }
      }
    }, 30000); // Update every 30 seconds
  }

  // Stop periodic updates
  stopPeriodicUpdates() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  // Clear background timeout
  clearBackgroundTimeout() {
    if (this.backgroundTimeout) {
      clearTimeout(this.backgroundTimeout);
      this.backgroundTimeout = null;
    }
  }

  // Handle app state changes
  handleAppStateChange = (nextAppState) => {
    console.log('App state changed to:', nextAppState);
    
    if (nextAppState === 'active') {
      // App came to foreground
      this.clearBackgroundTimeout();
      if (this.isOnline && auth.currentUser) {
        this.setOnline(); // Refresh online status
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background - set timeout to go offline after 1 hour
      this.clearBackgroundTimeout();
      this.backgroundTimeout = setTimeout(() => {
        console.log('Admin going offline due to background timeout (1 hour)');
        this.setOffline();
      }, 60 * 60 * 1000); // 1 hour in milliseconds
    }
  };

  /**
   * Setup auth state listener for automatic logout cleanup
   */
  setupAuthStateListener() {
    try {
      if (this.authUnsubscribe) {
        this.authUnsubscribe();
      }
      
      this.authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user && this.isOnline) {
          console.log('[AdminStatusService] User signed out, forcing offline and cleaning up');
          try {
            await this.forceOffline();
            await this.cleanup();
          } catch (error) {
            console.error('[AdminStatusService] Error during auth state cleanup:', error);
          }
        }
      });
    } catch (error) {
      console.error('[AdminStatusService] Error setting up auth state listener:', error);
    }
  }

  // Initialize admin status (called when admin logs in)
  async initialize() {
    console.log('[AdminStatusService] Initializing admin status service');
    
    // Check if already initialized
    if (this.isOnline) {
      console.log('[AdminStatusService] Already initialized, skipping');
      return;
    }
    
    await this.setOnline();
    
    // Set up app state listener
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    // Set up auth state listener for automatic logout cleanup
    this.setupAuthStateListener();
    
    console.log('[AdminStatusService] Admin status service initialized successfully');
  }

  // Cleanup admin status (called when admin logs out)
  async cleanup() {
    console.log('[AdminStatusService] Starting cleanup');
    
    // Force offline first
    await this.forceOffline();
    
    // Stop all timers
    this.stopPeriodicUpdates();
    this.clearBackgroundTimeout();
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Remove auth state listener
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
    
    // Set local state to offline
    this.isOnline = false;
    
    console.log('[AdminStatusService] Cleanup completed');
  }

  // Check if admin is currently online
  getOnlineStatus() {
    return this.isOnline;
  }

  // Get last active time
  getLastActiveTime() {
    return this.lastActiveTime;
  }
}

// Create singleton instance
const adminStatusService = new AdminStatusService();
export default adminStatusService; 