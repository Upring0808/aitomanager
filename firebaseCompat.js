/**
 * firebaseCompat.js - Compatibility layer for @react-native-firebase modules
 * This provides compatibility with code that imports from @react-native-firebase packages
 * Redirects those imports to use the Firebase Web SDK instead
 */

import { getAuth, getDb, getDatabase, getStorage } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import {
  ref,
  set,
  update,
  remove,
  push,
  child,
  get,
  query,
  orderByChild,
  limitToLast,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  serverTimestamp,
} from "firebase/database";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";

console.log("[FirebaseCompat] Initializing compatibility layer");

// Mock @react-native-firebase/auth
const mockAuth = () => {
  console.log(
    "[FirebaseCompat] Creating auth mock with currentUser:",
    !!getAuth().currentUser
  );
  return {
    currentUser: getAuth().currentUser,
    _getRecaptchaConfig: () => {
      console.log("[FirebaseCompat] Mock _getRecaptchaConfig called");
      return null;
    },
    onAuthStateChanged: (callback) => {
      console.log("[FirebaseCompat] Setting up auth state change listener");
      const unsubscribe = onAuthStateChanged(getAuth(), callback);
      return unsubscribe;
    },
    createUserWithEmailAndPassword: (email, password) => {
      console.log("[FirebaseCompat] Calling createUserWithEmailAndPassword");
      return createUserWithEmailAndPassword(getAuth(), email, password);
    },
    signInWithEmailAndPassword: (email, password) => {
      console.log("[FirebaseCompat] Calling signInWithEmailAndPassword");
      return signInWithEmailAndPassword(getAuth(), email, password);
    },
    signOut: () => {
      console.log("[FirebaseCompat] Calling signOut");
      return signOut(getAuth());
    },
    sendPasswordResetEmail: (email) => {
      console.log("[FirebaseCompat] Calling sendPasswordResetEmail");
      return sendPasswordResetEmail(getAuth(), email);
    },
    // Access to currentUser methods
    updateProfile: (data) => {
      console.log("[FirebaseCompat] Calling updateProfile");
      return updateProfile(getAuth().currentUser, data);
    },
    updateEmail: (email) => {
      console.log("[FirebaseCompat] Calling updateEmail");
      return updateEmail(getAuth().currentUser, email);
    },
    updatePassword: (password) => {
      console.log("[FirebaseCompat] Calling updatePassword");
      return updatePassword(getAuth().currentUser, password);
    },
    delete: () => {
      console.log("[FirebaseCompat] Calling delete");
      return deleteUser(getAuth().currentUser);
    },
    reauthenticateWithCredential: (credential) => {
      console.log("[FirebaseCompat] Calling reauthenticateWithCredential");
      return reauthenticateWithCredential(getAuth().currentUser, credential);
    },
    EmailAuthProvider: {
      credential: (email, password) => {
        console.log("[FirebaseCompat] Creating email credential");
        return EmailAuthProvider.credential(email, password);
      },
    },
  };
};

// Mock @react-native-firebase/database
const mockDatabase = () => {
  console.log("[FirebaseCompat] Creating database mock");
  return {
    ref: (path) => {
      const reference = ref(getDatabase(), path);
      return {
        set: (data) => set(reference, data),
        update: (data) => update(reference, data),
        remove: () => remove(reference),
        push: () => {
          const newRef = push(reference);
          return {
            key: newRef.key,
            set: (data) => set(newRef, data),
          };
        },
        child: (childPath) => {
          const childRef = child(reference, childPath);
          return {
            set: (data) => set(childRef, data),
            update: (data) => update(childRef, data),
            remove: () => remove(childRef),
          };
        },
        once: (eventType) => {
          if (eventType === "value") {
            return get(reference).then((snapshot) => {
              return {
                val: () => snapshot.val(),
                exists: () => snapshot.exists(),
              };
            });
          }
        },
        on: (eventType, callback) => {
          if (eventType === "value") {
            return onValue(reference, (snapshot) => {
              callback({
                val: () => snapshot.val(),
                exists: () => snapshot.exists(),
              });
            });
          } else if (eventType === "child_added") {
            return onChildAdded(reference, callback);
          } else if (eventType === "child_changed") {
            return onChildChanged(reference, callback);
          } else if (eventType === "child_removed") {
            return onChildRemoved(reference, callback);
          }
        },
        off: () => {
          // No direct equivalent in v9, handled by returned unsubscribe function
        },
        orderByChild: (path) => {
          const queryRef = query(reference, orderByChild(path));
          return {
            limitToLast: (n) => {
              const limitedQuery = query(queryRef, limitToLast(n));
              return {
                once: (eventType) => {
                  if (eventType === "value") {
                    return get(limitedQuery).then((snapshot) => {
                      return {
                        val: () => snapshot.val(),
                        exists: () => snapshot.exists(),
                      };
                    });
                  }
                },
              };
            },
          };
        },
      };
    },
    ServerValue: {
      TIMESTAMP: serverTimestamp(),
    },
  };
};

// Mock @react-native-firebase/firestore
const mockFirestore = () => {
  console.log("[FirebaseCompat] Creating firestore mock");
  return {
    collection: (path) => {
      const collectionRef = collection(getDb(), path);
      return {
        doc: (docId) => {
          const documentRef = doc(getDb(), path, docId);
          return {
            set: (data) => setDoc(documentRef, data),
            update: (data) => updateDoc(documentRef, data),
            delete: () => deleteDoc(documentRef),
            get: () =>
              getDoc(documentRef).then((docSnapshot) => {
                return {
                  data: () => docSnapshot.data(),
                  exists: () => docSnapshot.exists(),
                  id: docSnapshot.id,
                };
              }),
            onSnapshot: (callback) =>
              onSnapshot(documentRef, (docSnapshot) => {
                callback({
                  data: () => docSnapshot.data(),
                  exists: () => docSnapshot.exists(),
                  id: docSnapshot.id,
                });
              }),
          };
        },
        add: (data) => addDoc(collectionRef, data),
        get: () =>
          getDocs(collectionRef).then((querySnapshot) => {
            return {
              docs: querySnapshot.docs.map((doc) => ({
                data: () => doc.data(),
                id: doc.id,
                exists: () => true,
              })),
              empty: querySnapshot.empty,
              size: querySnapshot.size,
            };
          }),
        where: (field, operator, value) => {
          const queryRef = firestoreQuery(
            collectionRef,
            where(field, operator, value)
          );
          return {
            get: () =>
              getDocs(queryRef).then((querySnapshot) => {
                return {
                  docs: querySnapshot.docs.map((doc) => ({
                    data: () => doc.data(),
                    id: doc.id,
                    exists: () => true,
                  })),
                  empty: querySnapshot.empty,
                  size: querySnapshot.size,
                };
              }),
            orderBy: (field, direction = "asc") => {
              const orderedQuery = firestoreQuery(
                queryRef,
                orderBy(field, direction)
              );
              return {
                limit: (n) => {
                  const limitedQuery = firestoreQuery(orderedQuery, limit(n));
                  return {
                    get: () =>
                      getDocs(limitedQuery).then((querySnapshot) => {
                        return {
                          docs: querySnapshot.docs.map((doc) => ({
                            data: () => doc.data(),
                            id: doc.id,
                            exists: () => true,
                          })),
                          empty: querySnapshot.empty,
                          size: querySnapshot.size,
                        };
                      }),
                  };
                },
              };
            },
          };
        },
      };
    },
    Timestamp: {
      now: () => Timestamp.now(),
      fromDate: (date) => Timestamp.fromDate(date),
    },
  };
};

// Mock @react-native-firebase/storage
const mockStorage = () => {
  console.log("[FirebaseCompat] Creating storage mock");
  return {
    ref: (path) => {
      const reference = storageRef(getStorage(), path);
      return {
        putFile: (filePath) => {
          console.log("Storage putFile called with:", filePath);
          // This is more complex to mock as it requires file handling
          // For now, return a mock upload task
          return {
            on: (event, onProgress, onError, onComplete) => {
              // Mock successful upload after a short delay
              setTimeout(() => {
                if (onComplete) {
                  onComplete({
                    ref: reference,
                    metadata: {},
                  });
                }
              }, 500);
            },
            then: (callback) => {
              setTimeout(() => {
                callback({
                  ref: reference,
                  metadata: {},
                });
              }, 500);
              return {
                catch: () => {},
              };
            },
          };
        },
        put: (blob) => uploadBytes(reference, blob),
        getDownloadURL: () => getDownloadURL(reference),
        delete: () => deleteObject(reference),
        list: () =>
          listAll(reference).then((result) => {
            return {
              items: result.items,
              prefixes: result.prefixes,
            };
          }),
      };
    },
  };
};

// Mock @react-native-firebase/app
const mockApp = () => {
  console.log("[FirebaseCompat] Creating app mock");
  return {
    app: getAuth().app,
    apps: [getAuth().app],
    initializeApp: () => getAuth().app,
  };
};

// Mock @react-native-firebase/app-check
const mockAppCheck = () => {
  console.log("[FirebaseCompat] Creating app-check mock");
  return {
    activate: () => Promise.resolve(),
    setTokenAutoRefreshEnabled: () => {},
  };
};

// Mock @react-native-firebase/messaging
const mockMessaging = () => {
  console.log("[FirebaseCompat] Creating messaging mock");
  return {
    onMessage: () => () => {},
    getToken: () => Promise.resolve("mock-token"),
    hasPermission: () => Promise.resolve(true),
    requestPermission: () => Promise.resolve(true),
    subscribeToTopic: () => Promise.resolve(),
    unsubscribeFromTopic: () => Promise.resolve(),
  };
};

// Create instances
console.log("[FirebaseCompat] Creating module instances");
const authInstance = mockAuth();

// Ensure _getRecaptchaConfig is directly accessible on the auth instance
if (typeof authInstance._getRecaptchaConfig !== "function") {
  console.log(
    "[FirebaseCompat] Adding missing _getRecaptchaConfig method to auth instance"
  );
  authInstance._getRecaptchaConfig = () => {
    console.log("[FirebaseCompat] _getRecaptchaConfig called from instance");
    return null;
  };
}

const databaseInstance = mockDatabase();
const firestoreInstance = mockFirestore();
const storageInstance = mockStorage();
const appInstance = mockApp();
const appCheckInstance = mockAppCheck();
const messagingInstance = mockMessaging();

// Create export factories
const exportedModules = {
  auth: () => authInstance,
  database: () => databaseInstance,
  firestore: () => firestoreInstance,
  storage: () => storageInstance,
  app: () => appInstance,
  "app-check": () => appCheckInstance,
  messaging: () => messagingInstance,
};

// Export for all the different module patterns
for (const [name, factory] of Object.entries(exportedModules)) {
  // Add the module factory as both a property and default
  module.exports[name] = factory;

  // Handle specific module exports
  if (name === "auth") {
    // Ensure the auth factory function returns an object with _getRecaptchaConfig
    const wrappedAuthFactory = () => {
      const auth = factory();
      // Double-check that _getRecaptchaConfig exists on the returned auth object
      if (typeof auth._getRecaptchaConfig !== "function") {
        console.log(
          "[FirebaseCompat] Adding _getRecaptchaConfig to auth export"
        );
        auth._getRecaptchaConfig = () => {
          console.log(
            "[FirebaseCompat] _getRecaptchaConfig called from export"
          );
          return null;
        };
      }
      return auth;
    };

    module.exports = wrappedAuthFactory; // For direct import of auth
    module.exports.default = wrappedAuthFactory; // For ES6 default import
  } else {
    // Create separate module exports for each type
    const moduleExport = factory;
    moduleExport.default = factory;
    module.exports[name] = moduleExport;
  }
}

// Add common properties
module.exports.__esModule = true;

console.log("[FirebaseCompat] Compatibility layer initialized");
