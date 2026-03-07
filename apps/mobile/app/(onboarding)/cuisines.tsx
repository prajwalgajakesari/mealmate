import React, { useState } from "react";
import { View, Text, Pressable, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ChipSelect } from "@/components/ChipSelect";

const CUISINE_OPTIONS = [
  { value: "north_indian", label: "North Indian", icon: "flame-outline" as const },
  { value: "south_indian", label: "South Indian", icon: "leaf-outline" as const },
  { value: "mediterranean", label: "Mediterranean", icon: "globe-outline" as const },
  { value: "asian", label: "Asian", icon: "nutrition-outline" as const },
  { value: "continental", label: "Continental", icon: "restaurant-outline" as const },
];

export default function CuisinesScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  const toggleCuisine = (value: string) => {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-8">
        {/* Progress */}
        <View className="flex-row gap-1.5 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <View
              key={step}
              className={`flex-1 h-1 rounded-full ${
                step <= 4 ? "bg-primary" : "bg-gray-200"
              }`}
            />
          ))}
        </View>

        {/* Back */}
        <Pressable onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </Pressable>

        <Text className="text-text-primary text-2xl font-inter-bold mb-2">
          Pick your cuisines
        </Text>
        <Text className="text-text-secondary text-base font-inter mb-8">
          Select all that you enjoy — we'll mix them into your plans
        </Text>

        <ChipSelect
          options={CUISINE_OPTIONS}
          selected={selected}
          onToggle={toggleCuisine}
          multiSelect
        />

        {selected.length > 0 && (
          <Text className="text-text-secondary text-sm font-inter mt-4">
            {selected.length} cuisine{selected.length > 1 ? "s" : ""} selected
          </Text>
        )}
      </View>

      <View className="px-6 pb-8">
        <Pressable
          onPress={() => {
            if (selected.length > 0) router.push("/(onboarding)/platform");
          }}
          disabled={selected.length === 0}
          className={`py-4 rounded-2xl items-center ${
            selected.length > 0 ? "bg-primary" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-base font-inter-semibold ${
              selected.length > 0 ? "text-white" : "text-gray-400"
            }`}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
