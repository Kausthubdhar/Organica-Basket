import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function OwnerStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* This contains the bottom tab bar */}
      <Stack.Screen name="(tabs)" />
      
      {/* This is a full-screen modal that covers the tabs */}
      <Stack.Screen 
        name="add-product" 
        options={{ 
          presentation: "modal",
          animation: "slide_from_bottom"
        }} 
      />
    </Stack>
  );
}
