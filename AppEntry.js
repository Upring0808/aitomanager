/**
 * AppEntry.js - Main entry point for the application
 * Ensures Firebase is properly initialized before rendering the app
 */

import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { registerRootComponent } from "expo";
import { getAuth, getDb, getStorage, getDatabase } from "./firebase";
import App from "./App";

// Check if running in Expo Go
const isExpoGo = !!(global.__expo || global.__turboModuleProxy);

// InitializedApp component that handles Firebase initialization
const InitializedApp = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        // Initialize Firebase services by accessing them
        console.log("[AppEntry] Starting Firebase initialization");

        // Access each service to ensure initialization
        const auth = getAuth();
        const db = getDb();
        const storage = getStorage();
        const database = getDatabase();

        if (!auth) {
          throw new Error("Failed to initialize Firebase Auth");
        }

        console.log("[AppEntry] Firebase initialized successfully");
        setIsReady(true);
      } catch (err) {
        console.error("[AppEntry] Failed to initialize Firebase:", err);
        if (isExpoGo) {
          // In Expo Go, continue anyway with mock auth
          console.log(
            "[AppEntry] Continuing with mock auth in Expo Go despite error"
          );
          setIsReady(true);
        } else {
          setError(err.message);
        }
      }
    };

    prepareApp();
  }, []);

  if (error && !isExpoGo) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ color: "red", marginBottom: 10 }}>
          Failed to initialize app:
        </Text>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 20 }}>
          {isExpoGo
            ? "Initializing Firebase (Expo Go mode)..."
            : "Initializing Firebase..."}
        </Text>
      </View>
    );
  }

  return <App />;
};

// Register the initialized app component
registerRootComponent(InitializedApp);

export default InitializedApp;
