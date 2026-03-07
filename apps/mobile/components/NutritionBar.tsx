import React from "react";
import { View, Text } from "react-native";

interface NutritionBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

export function NutritionBar({
  label,
  current,
  target,
  unit,
  color,
}: NutritionBarProps) {
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <View className="mb-3">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-text-secondary text-xs font-inter-medium">
          {label}
        </Text>
        <Text className="text-text-primary text-xs font-inter-semibold">
          {current} / {target} {unit}
        </Text>
      </View>
      <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

interface DailyNutritionProps {
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
}

export function DailyNutrition({
  calories,
  calorieTarget,
  protein,
  proteinTarget,
}: DailyNutritionProps) {
  return (
    <View className="bg-surface rounded-2xl p-4 mb-4 shadow-sm"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <Text className="text-text-primary text-sm font-inter-semibold mb-3">
        Daily Nutrition
      </Text>
      <NutritionBar
        label="Calories"
        current={calories}
        target={calorieTarget}
        unit="kcal"
        color="#FF6B35"
      />
      <NutritionBar
        label="Protein"
        current={protein}
        target={proteinTarget}
        unit="g"
        color="#2EC4B6"
      />
    </View>
  );
}
