import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Index from "./components/Index";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Toast from "react-native-toast-message";
import CustomToast from "./Toast/CustomToast";
import AdminLogin from "./admin/AdminLogin";
import RegisterAdmin from "./admin/RegisterAdmin";
import AdminDashboard from "./admin/AdminDashboard";

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Index"
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
