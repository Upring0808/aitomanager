import React, { useState, useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";

// FontLoader component that simulates font loading without actually using custom fonts
// This provides a safe way to handle font loading without crashing the app
const FontLoader = ({ children }) => {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Keep splash screen visible while we prepare the app
        await SplashScreen.preventAutoHideAsync();

        console.log("App preparation started, skipping font loading for now");

        // Simulate a brief delay to let other initialization happen
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mark app as ready
        setAppReady(true);

        // Hide splash screen
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn("Error in app preparation:", e);
        setAppReady(true);
      }
    };

    prepare();
  }, []);

  if (!appReady) {
    return null;
  }

  // Render children once app is ready
  return children;
};

export default FontLoader;
