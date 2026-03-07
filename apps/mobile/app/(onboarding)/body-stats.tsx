import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", description: "Desk job, no exercise" },
  { value: "light", label: "Lightly Active", description: "1-2 workouts/week" },
  { value: "moderate", label: "Moderately Active", description: "3-5 workouts/week" },
  { value: "very_active", label: "Very Active", description: "6-7 workouts/week" },
];

export default function BodyStatsScreen() {
  const router = useRouter();
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [activityLevel, setActivityLevel] = useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View className="flex-row gap-1.5 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <View
              key={step}
              className={`flex-1 h-1 rounded-full ${
                step <= 3 ? "bg-primary" : "bg-gray-200"
              }`}
            />
          ))}
        </View>

        {/* Back */}
        <Pressable onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </Pressable>

        <Text className="text-text-primary text-2xl font-inter-bold mb-2">
          Your body stats
        </Text>
        <Text className="text-text-secondary text-base font-inter mb-8">
          Optional — helps us calculate accurate nutrition targets
        </Text>

        {/* Height */}
        <View className="mb-5">
          <Text className="text-text-primary text-sm font-inter-medium mb-2">
            Height (cm)
          </Text>
          <TextInput
            className="bg-surface border border-gray-200 rounded-xl px-4 py-3.5 text-text-primary text-base font-inter"
            placeholder="e.g. 170"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
          />
        </View>

        {/* Weight */}
        <View className="mb-5">
          <Text className="text-text-primary text-sm font-inter-medium mb-2">
            Weight (kg)
          </Text>
          <TextInput
            className="bg-surface border border-gray-200 rounded-xl px-4 py-3.5 text-text-primary text-base font-inter"
            placeholder="e.g. 65"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />
        </View>

        {/* Age */}
        <View className="mb-5">
          <Text className="text-text-primary text-sm font-inter-medium mb-2">
            Age
          </Text>
          <TextInput
            className="bg-surface border border-gray-200 rounded-xl px-4 py-3.5 text-text-primary text-base font-inter"
            placeholder="e.g. 28"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
          />
        </View>

        {/* Activity Level */}
        <View className="mb-8">
          <Text className="text-text-primary text-sm font-inter-medium mb-3">
            Activity Level
          </Text>
          <View className="gap-2">
            {ACTIVITY_LEVELS.map((level) => (
              <Pressable
                key={level.value}
                onPress={() => setActivityLevel(level.value)}
                className={`flex-row items-center p-4 rounded-xl border ${
                  activityLevel === level.value
                    ? "bg-primary/5 border-primary"
                    : "bg-surface border-gray-200"
                }`}
              >
                <View className="flex-1">
                  <Text className="text-text-primary text-sm font-inter-semibold">
                    {level.label}
                  </Text>
                  <Text className="text-text-secondary text-xs font-inter mt-0.5">
                    {level.description}
                  </Text>
                </View>
                {activityLevel === level.value && (
                  <Ionicons name="checkmark-circle" size={20} color="#FF6B35" />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="px-6 pb-8 gap-3">
        <Pressable
          onPress={() => router.push("/(onboarding)/cuisines")}
          className="py-4 rounded-2xl items-center bg-primary"
        >
          <Text className="text-white text-base font-inter-semibold">
            Continue
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(onboarding)/cuisines")}
          className="py-3 items-center"
        >
          <Text className="text-text-secondary text-sm font-inter-medium">
            Skip for now
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
