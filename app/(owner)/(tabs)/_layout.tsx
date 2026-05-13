import React from "react";
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export default function OwnerLayout() {
  const OWNER_GREEN = "#4A6038";
  const INACTIVE_GRAY = "#C0CDB8";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: OWNER_GREEN,
        tabBarInactiveTintColor: INACTIVE_GRAY,
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 28 : 20,
          left: 20,
          right: 20,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: 24,
          height: 72,
          paddingBottom: Platform.OS === "ios" ? 20 : 12,
          paddingTop: 12,
          borderTopWidth: 0,
          shadowColor: "#1E261E",
          shadowOpacity: 0.12,
          shadowRadius: 24,
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800", marginTop: -4 },
      }}
      screenListeners={{
        tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "HOME",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "INVENTORY",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "package-variant" : "package-variant-closed"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "ANALYTICS",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "STORE",
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 name="store" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
