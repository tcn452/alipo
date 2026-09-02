import React from 'react';
import { Tabs } from 'expo-router';
import { Fuel, PlusCircle, Compass, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#064e3b',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Fuel Tracker',
          tabBarIcon: ({ color }) => <Fuel size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report Fuel',
          tabBarIcon: ({ color }) => <PlusCircle size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fleet"
        options={{
          title: 'Fleet & Dispatch',
          tabBarIcon: ({ color }) => <Compass size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
