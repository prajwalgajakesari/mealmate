import React, { useState } from "react";
import { View, Text, Pressable, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const GOAL_OPTIONS = [
  {
    value: "lose_weight",
    label: "Lose Weight",
    icon: "trending-down-outline" as const,
    description: "Calorie deficit with balanced nutrition",
    color: "#2EC4B6",
  },
  {
    value: "build_muscle",
    label: "Build Muscle",
    icon: "barbell-outline" as const,
    description: "High protein, calorie surplus",
    color: "#FF6B35",
  },
  {
    value: "stay_healthy",
    label: "Stay Healthy",
    icon: "heart-outline" as const,
    description: "Balanced macros, wholesome meals",
    color: "#10B981",
  },
  {
    value: "no_preference",
    label: "No Preference",
    icon: "happy-outline" as const,
    description: "Just give me great food!",
    color: "#F59E0B",
  },
];

export default function GoalsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-8">
        {/* Progress */}
        <View className="flex-row gap-1.5 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <View
              key={step}
              className={`flex-1 h-1 rounded-full ${
                step <= 2 ? "bg-primary" : "bg-gray-200"
              }`}
            />
          ))}
        </View>

        {/* Back */}
        <Pressable onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </Pressable>

        <Text className="text-text-primary text-2xl font-inter-bold mb-2">
          What's your health goal?
        </Text>
        <Text className="text-text-secondary text-base font-inter mb-8">
          This helps us calculate the right calories and macros
        </Text>

        <View className="gap-3">
          {GOAL_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setSelected(option.value)}
              className={`flex-row items-center p-5 rounded-2xl border-2 ${
                selected === option.value
                  ? "bg-primary/5 border-primary"
                  : "bg-surface border-gray-100"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: `${option.color}15` }}
              >
                <Ionicons name={option.icon} size={24} color={option.color} />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary text-base font-inter-semibold">
                  {option.label}
                </Text>
                <Text className="text-text-secondary text-sm font-inter mt-0.5">
                  {option.description}
                </Text>
              </View>
              {selected === option.value && (
                <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View className="px-6 pb-8">
        <Pressable
          onPress={() => {
            if (selected) router.push("/(onboarding)/body-stats");
          }}
          disabled={!selected}
          className={`py-4 rounded-2xl items-center ${
            selected ? "bg-primary" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-base font-inter-semibold ${
              selected ? "text-white" : "text-gray-400"
            }`}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
