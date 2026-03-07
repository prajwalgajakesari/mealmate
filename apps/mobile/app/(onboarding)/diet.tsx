import React, { useState } from "react";
import { View, Text, Pressable, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const DIET_OPTIONS = [
  {
    value: "vegetarian",
    label: "Vegetarian",
    icon: "leaf-outline" as const,
    description: "No meat or fish",
    color: "#10B981",
  },
  {
    value: "non-veg",
    label: "Non-Vegetarian",
    icon: "restaurant-outline" as const,
    description: "Everything included",
    color: "#EF4444",
  },
  {
    value: "vegan",
    label: "Vegan",
    icon: "nutrition-outline" as const,
    description: "No animal products",
    color: "#22C55E",
  },
  {
    value: "jain",
    label: "Jain",
    icon: "flower-outline" as const,
    description: "No root vegetables, no onion/garlic",
    color: "#F59E0B",
  },
  {
    value: "eggetarian",
    label: "Eggetarian",
    icon: "ellipse-outline" as const,
    description: "Vegetarian + eggs",
    color: "#F97316",
  },
];

export default function DietScreen() {
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
                step === 1 ? "bg-primary" : "bg-gray-200"
              }`}
            />
          ))}
        </View>

        <Text className="text-text-primary text-2xl font-inter-bold mb-2">
          What's your diet type?
        </Text>
        <Text className="text-text-secondary text-base font-inter mb-8">
          We'll personalize your meal plans accordingly
        </Text>

        <View className="gap-3">
          {DIET_OPTIONS.map((option) => (
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

      {/* Continue button */}
      <View className="px-6 pb-8">
        <Pressable
          onPress={() => {
            if (selected) router.push("/(onboarding)/goals");
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
