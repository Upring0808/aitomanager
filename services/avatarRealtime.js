import { auth, storage, db } from "../config/firebaseconfig";
import { ref, getDownloadURL, listAll, getMetadata } from "firebase/storage";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

export const avatarRealtime = {
  // Fetches the initial avatar URL from Storage and updates Firestore
  fetchAvatar: async (user) => {
    if (!user) return { avatarUrl: null, error: null };

    try {
      const avatarFolderRef = ref(storage, `avatars/${user.uid}`);
      const listResult = await listAll(avatarFolderRef);

      if (listResult.items.length > 0) {
        const itemsWithMetadata = await Promise.all(
          listResult.items.map(async (item) => {
            const metadata = await getMetadata(item);
            return { item, metadata };
          })
        );

        // Sort by creation time to get the most recent
        itemsWithMetadata.sort(
          (a, b) =>
            new Date(b.metadata.timeCreated) - new Date(a.metadata.timeCreated)
        );

        const mostRecentItem = itemsWithMetadata[0].item;
        const url = await getDownloadURL(mostRecentItem);

        // Update Firestore with the latest avatar URL
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          {
            avatarUrl: url,
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        );

        return { avatarUrl: url, error: null };
      }

      return { avatarUrl: null, error: null };
    } catch (error) {
      console.error("Error fetching avatar:", error);
      return { avatarUrl: null, error };
    }
  },

  // Subscribe to real-time avatar updates
  subscribeToAvatarUpdates: (user, callback) => {
    if (!user) return () => {};

    const userDocRef = doc(db, "users", user.uid);

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          callback(data?.avatarUrl || null);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error("Error with Firestore avatar subscription:", error);
        callback(null);
      }
    );

    return unsubscribe;
  },

  updateAvatarUrl: async (user) => {
    try {
      avatarUrl;
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          avatarUrl,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating avatar URL in Firestore:", error);
    }
  },

  // Authentication state listener
  setupAuthListener: (callback) => {
    return onAuthStateChanged(auth, callback);
  },

  // Handle user logout
  logout: async () => {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error) {
      console.error("Error during logout:", error);
      return { error };
    }
  },
};

export default avatarRealtime;
