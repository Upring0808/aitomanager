import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth, db } from "../config/firebaseconfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto"; // For hashing credentials

const OfficerContext = createContext();

export const useOfficer = () => {
  const context = useContext(OfficerContext);
  if (!context) {
    throw new Error("useOfficer must be used within an OfficerProvider");
  }
  return context;
};

export const OfficerProvider = ({ children }) => {
  const [activeOfficerRole, setActiveOfficerRole] = useState(null); // e.g., 'treasurer', 'secretary', 'governor', 'vice_governor'
  const [officerLoading, setOfficerLoading] = useState(false);

  // Helper to hash credentials
  const hashCredential = async (credential) => {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      credential
    );
  };

  // Sign in as officer (checks credential)
  const signInAsOfficer = async (role, credential) => {
    setOfficerLoading(true);
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      const user = auth.currentUser;
      if (!user || !orgId) throw new Error("User or org not found");
      const userRef = doc(db, "organizations", orgId, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");
      const userData = userSnap.data();
      const officerCredentials = userData.officerCredentials || {};
      if (!officerCredentials[role]) throw new Error("No credential set for this role");
      const hashed = await hashCredential(credential);
      if (hashed === officerCredentials[role]) {
        setActiveOfficerRole(role);
        setOfficerLoading(false);
        return { success: true };
      } else {
        setOfficerLoading(false);
        return { success: false, error: "Incorrect credential" };
      }
    } catch (err) {
      setOfficerLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Set up officer credential (first time)
  const setupOfficerCredential = async (role, credential) => {
    setOfficerLoading(true);
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      const user = auth.currentUser;
      if (!user || !orgId) throw new Error("User or org not found");
      const userRef = doc(db, "organizations", orgId, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");
      const userData = userSnap.data();
      const officerCredentials = userData.officerCredentials || {};
      if (officerCredentials[role]) throw new Error("Credential already set for this role");
      const hashed = await hashCredential(credential);
      officerCredentials[role] = hashed;
      await updateDoc(userRef, { officerCredentials });
      setActiveOfficerRole(role);
      setOfficerLoading(false);
      return { success: true };
    } catch (err) {
      setOfficerLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Change officer credential (from officer dashboard)
  const changeOfficerCredential = async (role, oldCredential, newCredential) => {
    setOfficerLoading(true);
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      const user = auth.currentUser;
      if (!user || !orgId) throw new Error("User or org not found");
      const userRef = doc(db, "organizations", orgId, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");
      const userData = userSnap.data();
      const officerCredentials = userData.officerCredentials || {};
      const oldHashed = await hashCredential(oldCredential);
      if (officerCredentials[role] !== oldHashed) throw new Error("Old credential incorrect");
      const newHashed = await hashCredential(newCredential);
      officerCredentials[role] = newHashed;
      await updateDoc(userRef, { officerCredentials });
      setOfficerLoading(false);
      return { success: true };
    } catch (err) {
      setOfficerLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Sign out of officer mode
  const signOutOfficer = () => {
    setActiveOfficerRole(null);
  };

  // Check if officer credential is set
  const isOfficerCredentialSet = async (role) => {
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      const user = auth.currentUser;
      if (!user || !orgId) return false;
      const userRef = doc(db, "organizations", orgId, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return false;
      const userData = userSnap.data();
      const officerCredentials = userData.officerCredentials || {};
      return !!officerCredentials[role];
    } catch {
      return false;
    }
  };

  const value = {
    activeOfficerRole,
    officerLoading,
    signInAsOfficer,
    setupOfficerCredential,
    changeOfficerCredential,
    signOutOfficer,
    isOfficerCredentialSet,
  };

  return (
    <OfficerContext.Provider value={value}>
      {children}
    </OfficerContext.Provider>
  );
}; 