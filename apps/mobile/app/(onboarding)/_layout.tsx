import React from "react";
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FAFAFA" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="diet" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="body-stats" />
      <Stack.Screen name="cuisines" />
      <Stack.Screen name="platform" />
    </Stack>
  );
}
