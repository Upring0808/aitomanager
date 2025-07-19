import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebaseconfig';
import { AppState } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';

class StudentStatusService {
  constructor() {
    this.isOnline = false;
    this.statusInterval = null;
    this.backgroundTimeout = null;
    this.lastActiveTime = null;
    this.appStateSubscription = null;
    this.authUnsubscribe = null;
  }

  // Set student as online
  async setOnline() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('[StudentStatusService] No current user, cannot set online');
        return;
      }

      console.log('[StudentStatusService] Setting student online for user:', user.uid);
      this.isOnline = true;
      this.lastActiveTime = Date.now();
      
      const studentStatusRef = doc(db, 'studentStatus', user.uid);
      await setDoc(studentStatusRef, {
        isOnline: true,
        lastActive: serverTimestamp(),
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Start periodic updates to keep student online
      this.startPeriodicUpdates();
      
      console.log('[StudentStatusService] Student set online successfully');
    } catch (error) {
      console.error('[StudentStatusService] Error setting student online:', error);
    }
  }

  // Set student as offline
  async setOffline() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('[StudentStatusService] No current user in setOffline');
        return;
      }

      console.log('[StudentStatusService] Setting student offline for user:', user.uid);
      this.isOnline = false;
      
      const studentStatusRef = doc(db, 'studentStatus', user.uid);
      await setDoc(studentStatusRef, {
        isOnline: false,
        lastActive: serverTimestamp(),
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Stop periodic updates
      this.stopPeriodicUpdates();
      this.clearBackgroundTimeout();
      
      console.log('[StudentStatusService] Student set offline successfully');
    } catch (error) {
      console.error('[StudentStatusService] Error setting student offline:', error);
    }
  }

  // Force student offline immediately (for logout)
  async forceOffline() {
    try {
      const user = auth.currentUser;
      const userId = user?.uid;
      
      console.log('[StudentStatusService] Forcing student offline for logout, user:', userId);
      console.log('[StudentStatusService] Current isOnline state:', this.isOnline);
      console.log('[StudentStatusService] Current statusInterval:', this.statusInterval);
      
      // Stop all timers first
      this.stopPeriodicUpdates();
      this.clearBackgroundTimeout();
      
      // Set offline flag immediately
      this.isOnline = false;
      
      // Update Firestore immediately if we have a user
      if (userId) {
        const studentStatusRef = doc(db, 'studentStatus', userId);
        await setDoc(studentStatusRef, {
          isOnline: false,
          lastActive: serverTimestamp(),
          studentId: userId,
          studentName: user.displayName || 'Student',
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log('[StudentStatusService] Firestore updated for user:', userId);
      } else {
        console.log('[StudentStatusService] No user ID available, skipping Firestore update');
      }

      // Remove app state listener
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
        console.log('[StudentStatusService] App state listener removed during forceOffline');
      }

      console.log('[StudentStatusService] Student forced offline successfully');
      console.log('[StudentStatusService] Final isOnline state:', this.isOnline);
      console.log('[StudentStatusService] Final statusInterval:', this.statusInterval);
    } catch (error) {
      console.error('[StudentStatusService] Error forcing student offline:', error);
      // Even if there's an error, make sure we're marked as offline locally
      this.isOnline = false;
      this.stopPeriodicUpdates();
      this.clearBackgroundTimeout();
    }
  }

  // Start periodic updates to keep student online
  startPeriodicUpdates() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }

    this.statusInterval = setInterval(async () => {
      console.log('[StudentStatusService] Periodic update check - isOnline:', this.isOnline, 'auth.currentUser:', !!auth.currentUser);
      if (this.isOnline && auth.currentUser) {
        try {
          const studentStatusRef = doc(db, 'studentStatus', auth.currentUser.uid);
          await setDoc(studentStatusRef, {
            isOnline: true,
            lastActive: serverTimestamp(),
            studentId: auth.currentUser.uid,
            studentName: auth.currentUser.displayName || 'Student',
            updatedAt: serverTimestamp()
          }, { merge: true });
          this.lastActiveTime = Date.now();
          console.log('[StudentStatusService] Periodic update completed for user:', auth.currentUser.uid);
        } catch (error) {
          console.error('[StudentStatusService] Error updating student status:', error);
        }
      } else {
        console.log('[StudentStatusService] Skipping periodic update - isOnline:', this.isOnline, 'hasUser:', !!auth.currentUser);
      }
    }, 30000); // Update every 30 seconds
  }

  // Stop periodic updates
  stopPeriodicUpdates() {
    console.log('[StudentStatusService] Stopping periodic updates, current interval:', this.statusInterval);
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
      console.log('[StudentStatusService] Periodic updates stopped');
    } else {
      console.log('[StudentStatusService] No periodic updates to stop');
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
    console.log('[StudentStatusService] App state changed to:', nextAppState);
    
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
        console.log('[StudentStatusService] Student going offline due to background timeout (1 hour)');
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
          console.log('[StudentStatusService] User signed out, forcing offline and cleaning up');
          try {
            await this.forceOffline();
            await this.cleanup();
          } catch (error) {
            console.error('[StudentStatusService] Error during auth state cleanup:', error);
          }
        }
      });
    } catch (error) {
      console.error('[StudentStatusService] Error setting up auth state listener:', error);
    }
  }

  // Initialize student status (called when student logs in)
  async initialize() {
    console.log('[StudentStatusService] Initializing student status service');
    await this.setOnline();
    
    // Set up app state listener
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    // Set up auth state listener for automatic logout cleanup
    this.setupAuthStateListener();
    
    console.log('[StudentStatusService] Student status service initialized successfully');
  }

  // Cleanup student status (called when student logs out)
  async cleanup() {
    console.log('[StudentStatusService] Starting cleanup');
    console.log('[StudentStatusService] Current user:', auth.currentUser?.uid);
    console.log('[StudentStatusService] Is online before cleanup:', this.isOnline);
    
    await this.forceOffline();
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
      console.log('[StudentStatusService] App state listener removed');
    }
    
    // Remove auth state listener
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
      console.log('[StudentStatusService] Auth state listener removed');
    }
    
    console.log('[StudentStatusService] Cleanup completed');
  }

  // Check if student is currently online
  getOnlineStatus() {
    return this.isOnline;
  }

  // Get last active time
  getLastActiveTime() {
    return this.lastActiveTime;
  }
}

// Create singleton instance
const studentStatusService = new StudentStatusService();
export default studentStatusService; 