// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ThemeProvider } from "./app/screens/ThemeContext/ThemeContext";

import MessageScreen from "@screens/MessageScreen";
import ConversationScreen from "@screens/ConversationScreen";

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Main">
          <Stack.Screen
            name="Main"
            component={MessageScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Conversation"
            component={ConversationScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default App;