import { getAuth } from "../firebase";
import {
  ref,
  onValue,
  set,
  update,
  serverTimestamp,
  onDisconnect,
  get,
  getDatabase,
  off,
  query,
  limitToLast,
} from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

/**
 * StudentPresenceService: Handles real-time student presence tracking
 * for admin dashboard to show which students are online/offline
 */
class StudentPresenceService {
  constructor() {
    this.initialized = false;
    this.studentsRef = null;
    this.connectedRef = null;
    this.cleanupListeners = [];
    this.studentStatusCallbacks = [];
    this.authUnsubscribe = null;
    this.INACTIVE_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
  }

  /**
   * Gets current user ID or null if not logged in
   */
  getUserId() {
    return getAuth().currentUser ? getAuth().currentUser.uid : null;
  }

  /**
   * Initialize the student presence service
   */
  async initialize() {
    const uid = this.getUserId();
    if (!uid) {
      console.log("[StudentPresence] No user logged in, cannot initialize");
      return;
    }

    if (this.initialized) {
      console.log("[StudentPresence] Already initialized");
      return;
    }

    console.log("[StudentPresence] Initializing student presence service");

    try {
      // Perform cleanup first to ensure we start fresh
      await this.cleanup();

      // Set up connection monitoring
      this.setupConnectionMonitoring();
      
      // Set up auth state listener for automatic logout cleanup
      this.setupAuthStateListener();
      
      this.initialized = true;
      console.log("[StudentPresence] Successfully initialized");
    } catch (error) {
      console.error("[StudentPresence] Error initializing:", error);
    }
  }

  /**
   * Setup connection monitoring for real-time updates
   */
  setupConnectionMonitoring() {
    try {
      const db = getDatabase();
      this.connectedRef = ref(db, ".info/connected");
      
      const unsubscribe = onValue(this.connectedRef, (snapshot) => {
        const connected = snapshot.val();
        console.log("[StudentPresence] Connection state:", connected ? "Connected" : "Disconnected");
      });

      this.cleanupListeners.push(unsubscribe);
    } catch (error) {
      console.error("[StudentPresence] Error setting up connection monitoring:", error);
    }
  }

  /**
   * Setup auth state listener for automatic logout cleanup
   */
  setupAuthStateListener() {
    try {
      if (this.authUnsubscribe) {
        this.authUnsubscribe();
      }
      
      this.authUnsubscribe = onAuthStateChanged(getAuth(), async (user) => {
        if (!user && this.initialized) {
          console.log("[StudentPresence] User signed out, removing completely and cleaning up");
          try {
            await this.removeStudentCompletely();
            await this.cleanup();
          } catch (error) {
            console.error("[StudentPresence] Error during auth state cleanup:", error);
          }
        }
      });
      
      this.cleanupListeners.push(() => {
        if (this.authUnsubscribe) {
          this.authUnsubscribe();
          this.authUnsubscribe = null;
        }
      });
    } catch (error) {
      console.error("[StudentPresence] Error setting up auth state listener:", error);
    }
  }

  /**
   * Register callback for student status changes
   * @param {Function} callback - Function to call when student status changes
   * @returns {Function} - Unsubscribe function
   */
  registerStudentStatusCallback(callback) {
    if (typeof callback === "function") {
      this.studentStatusCallbacks.push(callback);
    }

    // Return unsubscribe function
    return () => {
      this.studentStatusCallbacks = this.studentStatusCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Get all online students
   */
  async getOnlineStudents() {
    try {
      // Check both Realtime Database and Firestore for comprehensive status
      const db = getDatabase();
      const studentsRef = ref(db, "studentPresence");
      
      return new Promise((resolve) => {
        const unsubscribe = onValue(studentsRef, async (snapshot) => {
          const students = snapshot.val();
          const onlineStudents = [];
          
          if (students) {
            const now = Date.now();
            Object.keys(students).forEach(studentId => {
              const studentData = students[studentId];
              if (studentData && studentData.lastSeen) {
                const lastSeen = studentData.lastSeen;
                const timeDiff = now - lastSeen;
                
                // Only consider student online if they were active in the last 2 minutes AND not explicitly marked offline
                if (timeDiff < this.INACTIVE_THRESHOLD && studentData.isOnline !== false) {
                  onlineStudents.push({
                    id: studentId,
                    name: studentData.name || 'Student',
                    lastSeen: lastSeen,
                    isOnline: true
                  });
                }
              }
            });
          }
          
          // Also check Firestore studentStatus collection
          try {
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('../config/firebaseconfig');
            
            const studentStatusQuery = query(
              collection(db, 'studentStatus'),
              where('isOnline', '==', true)
            );
            
            const statusSnapshot = await getDocs(studentStatusQuery);
            statusSnapshot.forEach((doc) => {
              const statusData = doc.data();
              const existingStudent = onlineStudents.find(s => s.id === statusData.studentId);
              
              if (!existingStudent) {
                onlineStudents.push({
                  id: statusData.studentId,
                  name: statusData.studentName || 'Student',
                  lastSeen: statusData.lastActive?.toMillis() || Date.now(),
                  isOnline: true
                });
              }
            });
          } catch (firestoreError) {
            console.error("[StudentPresence] Error checking Firestore status:", firestoreError);
          }
          
          resolve(onlineStudents);
        });

        this.cleanupListeners.push(unsubscribe);
      });
    } catch (error) {
      console.error("[StudentPresence] Error getting online students:", error);
      return [];
    }
  }

  /**
   * Get specific student's online status
   */
  async getStudentStatus(studentId) {
    try {
      const db = getDatabase();
      const studentRef = ref(db, `studentPresence/${studentId}`);
      
      return new Promise((resolve) => {
        const unsubscribe = onValue(studentRef, (snapshot) => {
          const studentData = snapshot.val();
          
          if (studentData && studentData.lastSeen) {
            const now = Date.now();
            const timeDiff = now - studentData.lastSeen;
            const isOnline = timeDiff < this.INACTIVE_THRESHOLD;
            
            resolve({
              id: studentId,
              name: studentData.name || 'Student',
              lastSeen: studentData.lastSeen,
              isOnline: isOnline
            });
          } else {
            resolve({
              id: studentId,
              name: 'Student',
              lastSeen: null,
              isOnline: false
            });
          }
        });

        this.cleanupListeners.push(unsubscribe);
      });
    } catch (error) {
      console.error("[StudentPresence] Error getting student status:", error);
      return {
        id: studentId,
        name: 'Student',
        lastSeen: null,
        isOnline: false
      };
    }
  }

  /**
   * Update student's last seen timestamp
   */
  async updateStudentLastSeen(studentId, studentName = 'Student') {
    try {
      const db = getDatabase();
      const studentRef = ref(db, `studentPresence/${studentId}`);
      
      await update(studentRef, {
        lastSeen: serverTimestamp(),
        name: studentName,
        updatedAt: serverTimestamp()
      });
      
      console.log("[StudentPresence] Updated last seen for student:", studentId);
    } catch (error) {
      console.error("[StudentPresence] Error updating student last seen:", error);
    }
  }

  /**
   * Clean up all listeners and references
   */
  async cleanup() {
    console.log("[StudentPresence] Cleaning up service");
    
    // Completely remove student from presence tracking
    try {
      await this.removeStudentCompletely();
    } catch (error) {
      console.error("[StudentPresence] Error removing student completely during cleanup:", error);
    }
    
    // Clean up all listeners
    this.cleanupListeners.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error("[StudentPresence] Error cleaning up listener:", error);
      }
    });
    
    this.cleanupListeners = [];
    this.studentStatusCallbacks = [];
    this.initialized = false;
    
    console.log("[StudentPresence] Cleanup completed");
  }

  /**
   * Format last seen timestamp for display in UTC (Philippines timezone)
   */
  formatLastSeen(lastSeen) {
    if (!lastSeen) return 'recently';
    let date;
    if (typeof lastSeen.toDate === 'function') {
      date = lastSeen.toDate();
    } else if (lastSeen instanceof Date) {
      date = lastSeen;
    } else {
      date = new Date(lastSeen);
    }
    if (!date || isNaN(date.getTime())) return 'recently';

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    // Format as 'Jul 18' in Asia/Manila time
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
  }

  async forceOffline() {
    try {
      const uid = this.getUserId();
      if (!uid) return;
      
      console.log("[StudentPresence] Forcing student offline:", uid);
      
      // Update Realtime Database
      const db = getDatabase();
      const studentRef = ref(db, `studentPresence/${uid}`);
      await update(studentRef, {
        lastSeen: Date.now(),
        isOnline: false,
        updatedAt: Date.now(),
      });
      
      // Also update Firestore studentStatus collection
      try {
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { db: firestoreDb } = await import('../config/firebaseconfig');
        
        const studentStatusRef = doc(firestoreDb, 'studentStatus', uid);
        await setDoc(studentStatusRef, {
          isOnline: false,
          lastActive: serverTimestamp(),
          studentId: uid,
          studentName: 'Student',
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        console.log("[StudentPresence] Updated Firestore studentStatus for:", uid);
      } catch (firestoreError) {
        console.error("[StudentPresence] Error updating Firestore studentStatus:", firestoreError);
      }
      
      // Remove the student from Realtime Database completely
      try {
        await set(ref(db, `studentPresence/${uid}`), null);
        console.log("[StudentPresence] Removed student from Realtime Database:", uid);
      } catch (removeError) {
        console.error("[StudentPresence] Error removing student from Realtime Database:", removeError);
      }
      
      console.log("[StudentPresence] Successfully forced student offline:", uid);
    } catch (error) {
      console.error("[StudentPresence] Error forcing student offline:", error);
    }
  }

  /**
   * Completely remove student from all presence tracking
   */
  async removeStudentCompletely() {
    try {
      const uid = this.getUserId();
      if (!uid) return;
      
      console.log("[StudentPresence] Completely removing student from presence tracking:", uid);
      
      // First, mark as offline in Realtime Database
      const db = getDatabase();
      const studentRef = ref(db, `studentPresence/${uid}`);
      await update(studentRef, {
        lastSeen: Date.now(),
        isOnline: false,
        updatedAt: Date.now(),
      });
      
      // Then remove completely from Realtime Database
      await set(studentRef, null);
      
      // Remove from Firestore studentStatus collection
      try {
        const { doc, deleteDoc } = await import('firebase/firestore');
        const { db: firestoreDb } = await import('../config/firebaseconfig');
        
        const studentStatusRef = doc(firestoreDb, 'studentStatus', uid);
        await deleteDoc(studentStatusRef);
        
        console.log("[StudentPresence] Removed student from Firestore studentStatus:", uid);
      } catch (firestoreError) {
        console.error("[StudentPresence] Error removing from Firestore studentStatus:", firestoreError);
      }
      
      console.log("[StudentPresence] Successfully removed student completely:", uid);
    } catch (error) {
      console.error("[StudentPresence] Error removing student completely:", error);
    }
  }
}

// Export singleton instance
const studentPresenceService = new StudentPresenceService();
export default studentPresenceService; 