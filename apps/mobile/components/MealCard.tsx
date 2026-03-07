import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Meal } from "@/store/usePlanStore";

const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

interface MealCardProps {
  meal: Meal;
}

export function MealCard({ meal }: MealCardProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/recipe/${meal.recipe_id}`)}
      className="bg-surface rounded-2xl p-4 mb-3 shadow-sm"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center mb-2">
        <Ionicons
          name={MEAL_ICONS[meal.type] ?? "restaurant-outline"}
          size={16}
          color="#6B7280"
        />
        <Text className="text-text-secondary text-xs font-inter-medium ml-1 uppercase tracking-wide">
          {MEAL_LABELS[meal.type] ?? meal.type}
        </Text>
      </View>

      <View className="flex-row">
        {meal.image_url ? (
          <Image
            source={{ uri: meal.image_url }}
            className="w-16 h-16 rounded-xl mr-3"
            resizeMode="cover"
          />
        ) : (
          <View className="w-16 h-16 rounded-xl mr-3 bg-primary/10 items-center justify-center">
            <Ionicons name="restaurant" size={28} color="#FF6B35" />
          </View>
        )}

        <View className="flex-1">
          <Text
            className="text-text-primary text-base font-inter-semibold"
            numberOfLines={1}
          >
            {meal.name}
          </Text>
          <Text className="text-text-secondary text-sm font-inter mt-0.5">
            {meal.cuisine}
          </Text>

          <View className="flex-row mt-2 gap-3">
            <View className="flex-row items-center">
              <Ionicons name="flame-outline" size={14} color="#FF6B35" />
              <Text className="text-text-secondary text-xs font-inter ml-1">
                {meal.calories} kcal
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="barbell-outline" size={14} color="#2EC4B6" />
              <Text className="text-text-secondary text-xs font-inter ml-1">
                {meal.protein}g protein
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text className="text-text-secondary text-xs font-inter ml-1">
                {meal.prep_time_min} min
              </Text>
            </View>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#6B7280"
          style={{ alignSelf: "center" }}
        />
      </View>
    </Pressable>
  );
}
