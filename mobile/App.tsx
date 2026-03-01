/**
 * Gulf Watch Mobile App
 * Bottom tab navigation with News, Map, and Alerts screens
 * Expo + React Native
 *
 * To build for stores:
 *   npm install -g eas-cli
 *   eas login
 *   eas build --platform android   # APK
 *   eas build --platform ios       # IPA (requires Apple dev account)
 *   eas submit --platform android  # Submit to Google Play
 */

import 'expo-dev-client';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Text, View } from 'react-native';

import NewsScreen from './src/screens/NewsScreen';
import MapScreen from './src/screens/MapScreen';

const Tab = createBottomTabNavigator();

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Get Expo push token (for FCM/APNs integration)
  const token = await Notifications.getExpoPushTokenAsync();

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('military-alerts', {
      name: 'Military Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
    });
  }

  return token.data;
}

// Simple tab icon
function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, opacity: color === '#3b82f6' ? 1 : 0.5 }}>{emoji}</Text>
    </View>
  );
}

export default function App() {
  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token) console.log('Push token:', token);
    });
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b', borderBottomWidth: 1 },
          headerTintColor: '#f1f5f9',
          headerTitleStyle: { fontWeight: '700' },
          tabBarStyle: {
            backgroundColor: '#0f172a',
            borderTopColor: '#1e293b',
            borderTopWidth: 1,
            paddingBottom: Platform.OS === 'ios' ? 16 : 8,
            height: Platform.OS === 'ios' ? 80 : 60,
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#64748b',
        }}
      >
        <Tab.Screen
          name="News"
          component={NewsScreen}
          options={{
            title: '🌍 Gulf Watch',
            tabBarLabel: 'News Feed',
            tabBarIcon: ({ color }) => <TabIcon emoji="📰" color={color} />,
          }}
        />
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{
            title: '🗺️ Live Map',
            tabBarLabel: 'Map & Satellite',
            tabBarIcon: ({ color }) => <TabIcon emoji="🗺️" color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
