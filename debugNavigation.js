/**
 * Navigation Debug Script
 * Use this to debug navigation issues in your QR scanner
 */

// Test navigation object structure
const testNavigationObject = (navigation) => {
  console.log("🔍 Navigation Debug Results");
  console.log("============================");

  console.log("\n📱 Navigation Object Check:");
  console.log("Navigation exists:", !!navigation);
  console.log("Navigation type:", typeof navigation);

  if (navigation) {
    console.log("\n🧭 Navigation Methods:");
    console.log("navigate:", typeof navigation.navigate);
    console.log("goBack:", typeof navigation.goBack);
    console.log("canGoBack:", typeof navigation.canGoBack);
    console.log("reset:", typeof navigation.reset);
    console.log("push:", typeof navigation.push);
    console.log("pop:", typeof navigation.pop);

    console.log("\n🔧 Navigation Properties:");
    console.log("isFocused:", navigation.isFocused);
    console.log("getState:", typeof navigation.getState);
    console.log("dispatch:", typeof navigation.dispatch);

    // Test canGoBack if it exists
    if (typeof navigation.canGoBack === "function") {
      try {
        const canGoBack = navigation.canGoBack();
        console.log("canGoBack() result:", canGoBack);
      } catch (error) {
        console.error("canGoBack() error:", error);
      }
    }
  }

  console.log("\n🚨 Common Issues:");
  console.log("- Navigation object is null/undefined");
  console.log("- Navigation methods are not functions");
  console.log("- Navigation not properly initialized");
  console.log("- Component mounted before navigation ready");
  console.log("- Navigation context not provided");

  console.log("\n✅ Solutions:");
  console.log("1. Check if NavigationContainer is properly set up");
  console.log("2. Ensure useNavigation is called within navigation context");
  console.log("3. Add navigation ready checks");
  console.log("4. Use safe navigation helpers");
  console.log("5. Check component mounting order");
};

// Test navigation safety helpers
const testSafeNavigation = (navigation) => {
  console.log("\n🛡️ Safe Navigation Test:");

  const safeNavigate = (routeName, params = {}) => {
    try {
      if (!navigation) {
        console.warn("❌ Navigation object is null");
        return false;
      }

      if (navigation.navigate && typeof navigation.navigate === "function") {
        console.log("✅ Navigation.navigate available");
        return true;
      } else {
        console.warn("❌ Navigation.navigate not available");
        return false;
      }
    } catch (error) {
      console.error("❌ Navigation error:", error);
      return false;
    }
  };

  const safeGoBack = () => {
    try {
      if (!navigation) {
        console.warn("❌ Navigation object is null for go back");
        return false;
      }

      if (navigation.canGoBack && typeof navigation.canGoBack === "function") {
        const canGoBack = navigation.canGoBack();
        console.log("✅ canGoBack() result:", canGoBack);
        return canGoBack;
      } else {
        console.warn("❌ canGoBack not available");
        return false;
      }
    } catch (error) {
      console.error("❌ Go back error:", error);
      return false;
    }
  };

  const navigateResult = safeNavigate("TestScreen");
  const goBackResult = safeGoBack();

  console.log("Safe navigate result:", navigateResult);
  console.log("Safe go back result:", goBackResult);
};

// Export for use in components
module.exports = {
  testNavigationObject,
  testSafeNavigation,
};

// Usage example:
// In your QR scanner component:
// import { testNavigationObject, testSafeNavigation } from './debugNavigation';
//
// useEffect(() => {
//   testNavigationObject(navigation);
//   testSafeNavigation(navigation);
// }, [navigation]);
