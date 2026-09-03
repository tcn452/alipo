import React from 'react';
import { Tabs } from 'expo-router';
import { Home, PlusCircle, Truck, Menu } from 'lucide-react-native';
import { palette } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.forest,
        tabBarInactiveTintColor: '#8A918C',
        sceneStyle: { backgroundColor: palette.ivory },
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.line,
          height: 70,
          paddingBottom: 10,
          paddingTop: 9,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => <PlusCircle size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fleet"
        options={{
          title: 'Fleet',
          tabBarIcon: ({ color }) => <Truck size={21} color={color} />,
          headerShown: true,
          headerStyle: { backgroundColor: palette.forest },
          headerTintColor: palette.white,
          headerTitle: 'Fleet & Dispatch',
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Menu size={21} color={color} />,
          headerShown: true,
          headerStyle: { backgroundColor: palette.forest },
          headerTintColor: palette.white,
          headerTitle: 'More',
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
    </Tabs>
  );
}
