import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Index from "./components/Index";
import Register from "./screens/Auth/Register";
import Login from "./screens/Auth/Login";
import RegisterAdmin from "./screens/Auth/RegisterAdmin";
import AdminLogin from "./screens/Auth/AdminLogin";
import Dashboard from "./components/Dashboard";
import AdminDashboard from "./components/AdminDashboard";
import Toast from "react-native-toast-message";

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AdminDashboard"
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        <Stack.Screen name="Index" component={Index} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="AdminLogin" component={AdminLogin} />
        <Stack.Screen name="RegisterAdmin" component={RegisterAdmin} />
        <Stack.Screen
          name="Dashboard"
          component={Dashboard}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboard}
          options={{ gestureEnabled: false }}
        />
      </Stack.Navigator>
      <Toast
        config={{
          custom: (internalState) => <CustomToast {...internalState} />,
        }}
      />
    </NavigationContainer>
  );
};

export default App;
