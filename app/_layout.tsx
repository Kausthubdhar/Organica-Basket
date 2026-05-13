import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { View, ActivityIndicator } from "react-native";
import { Session } from "@supabase/supabase-js";
import { decode, encode } from "base64-arraybuffer";
import ModernAlert from "../components/ModernAlert";
import { CartProvider } from "../context/CartContext";

// Polyfill for libraries that expect global Base64 (like xlsx)
if (typeof (global as any).Base64 === "undefined") {
  (global as any).Base64 = {
    atob: (str: string) => decode(str),
    btoa: (buffer: ArrayBuffer) => encode(buffer),
  };
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);
  // Tracks whether the profile is currently being fetched
  const [profileLoading, setProfileLoading] = useState(false);
  // Tracks the last user ID we fetched for, to avoid redundant fetches
  const lastFetchedUserId = useRef<string | null>(null);

  // ─── Profile Fetcher ───────────────────────────────────────────────────────
  const fetchProfile = useCallback(async (userId: string, force = false) => {
    // Skip if we already fetched for this user and don't need a forced refresh
    if (!force && lastFetchedUserId.current === userId && isOnboarded === true) return;

    setProfileLoading(true);
    lastFetchedUserId.current = userId;

    const { data } = await supabase
      .from("profiles")
      .select("is_onboarded, role")
      .eq("id", userId)
      .single();

    setIsOnboarded(data?.is_onboarded ?? false);
    setRole(data?.role ?? null);
    setProfileLoading(false);
  }, []);

  // ─── Step 1: Auth Listener ────────────────────────────────────────────────
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === "SIGNED_OUT") {
        // Wipe all state immediately on sign out
        setIsOnboarded(null);
        setRole(null);
        lastFetchedUserId.current = null;
        router.replace("/");
        return;
      }

      // On sign in, immediately fetch profile
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user?.id) {
        fetchProfile(session.user.id, true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ─── Step 2: Initial profile fetch when session is first loaded ───────────
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchProfile(session.user.id);
  }, [session?.user?.id]);

  // ─── Step 3: Realtime subscription – re-fetches when profile is updated ───
  // This is the KEY FIX: when the onboarding form upserts the profile,
  // this fires and updates isOnboarded/role BEFORE the navigation runs.
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`profile-watch-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setIsOnboarded(updated.is_onboarded ?? false);
          setRole(updated.role ?? null);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // ─── Step 4: Navigation Guard ─────────────────────────────────────────────
  useEffect(() => {
    // Navigation Guard logic

    // Don't navigate while auth or profile state is still resolving
    if (session === undefined) return;
    if (profileLoading) return;

    // No session → enforce landing page
    if (session === null) {
      const isPublicPage =
        segments[0] === ("login" as any) ||
        !segments[0];
      if (!isPublicPage) {
        router.replace("/login");
      }
      return;
    }

    // Session exists but profile not fetched yet
    if (isOnboarded === null) return;

    // Not onboarded → enforce onboarding
    if (!isOnboarded) {
      if (segments[0] !== "onboarding-form") {
        router.replace("/onboarding-form");
      }
      return;
    }

    // Fully onboarded → route by role
    const userRole = role || 'customer'; 
    
    if (userRole === "owner") {
      if (segments[0] !== "(owner)") {
        setTimeout(() => router.replace("/(owner)" as any), 100);
      }
    } else {
      // Shoppers can access the (shopper) tabs and the shop/[id] pages
      if (segments[0] !== "(shopper)" && segments[0] !== "shop") {
        setTimeout(() => router.replace("/(shopper)" as any), 100);
      }
    }
  }, [session, isOnboarded, role, segments[0], profileLoading]);

  // ─── Splash while loading ─────────────────────────────────────────────────
  if (session === undefined || (session !== null && isOnboarded === null)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F6E9" }}>
        <ActivityIndicator size="large" color="#4A6038" />
      </View>
    );
  }

  return (
    <CartProvider>
      <Stack key={role || "guest"}>
        {/* Public Screens */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding-form" options={{ headerShown: false }} />
        <Stack.Screen name="shop/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="order-success" options={{ headerShown: false }} />

        {/* Role-Locked Stacks: Only one is visible at a time to prevent leaks */}
        {role === "owner" ? (
          <Stack.Screen name="(owner)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="(shopper)" options={{ headerShown: false }} />
        )}
      </Stack>
      <ModernAlert />
    </CartProvider>
  );
}
