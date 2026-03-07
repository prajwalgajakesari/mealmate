import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/store/useAuthStore";
import "../global.css";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasCompletedOnboarding, restoreSession } =
    useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === "(onboarding)";
    const inTabs = segments[0] === "(tabs)";

    if (!isAuthenticated) {
      // For now, allow access — auth screens can be added later
      return;
    }

    if (isAuthenticated && !hasCompletedOnboarding && !inOnboarding) {
      router.replace("/(onboarding)/diet");
    } else if (isAuthenticated && hasCompletedOnboarding && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, hasCompletedOnboarding, isLoading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthGuard>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FAFAFA" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="cart"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="recipe/[id]" />
      </Stack>
    </AuthGuard>
  );
}
