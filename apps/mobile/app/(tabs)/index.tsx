import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { usePlanStore, MealRecipe } from "@/store/usePlanStore";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: "#F59E0B",
  lunch: "#FF6B35",
  dinner: "#6366F1",
};

function MealCard({ type, meal }: { type: string; meal: MealRecipe }) {
  const color = MEAL_COLORS[type] ?? "#FF6B35";
  return (
    <View
      className="bg-white rounded-2xl p-4 mb-3"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row items-center mb-2">
        <View
          className="w-8 h-8 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: color + "20" }}
        >
          <Ionicons
            name={MEAL_ICONS[type] as any}
            size={16}
            color={color}
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wider" style={{ color }}>
            {type}
          </Text>
          <Text className="text-base font-semibold text-gray-900">
            {meal.name}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-semibold text-gray-900">
            {meal.nutrition.calories} kcal
          </Text>
          <Text className="text-xs text-gray-500">
            {meal.nutrition.protein_g}g protein
          </Text>
        </View>
      </View>
      <Text className="text-sm text-gray-500 mb-2" numberOfLines={2}>
        {meal.description}
      </Text>
      <View className="flex-row items-center">
        <View className="flex-row items-center mr-4">
          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
          <Text className="text-xs text-gray-400 ml-1">
            {meal.prep_time_min + meal.cook_time_min} min
          </Text>
        </View>
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color + "15" }}
        >
          <Text className="text-xs" style={{ color }}>
            {meal.cuisine.replace("_", " ")}
          </Text>
        </View>
        <View className="px-2 py-0.5 rounded-full bg-gray-100 ml-1">
          <Text className="text-xs text-gray-500">{meal.difficulty}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { plan, isLoading, error, fetchTodayPlan, generatePlan } =
    usePlanStore();
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchTodayPlan();
  }, [fetchTodayPlan]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTodayPlan();
    setRefreshing(false);
  };

  const onGenerate = async () => {
    setGenerating(true);
    await generatePlan();
    setGenerating(false);
  };

  const meals = plan?.meals;
  const totals = plan?.daily_totals;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B35"
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-gray-500 text-sm">
              {getGreeting()}
            </Text>
            <Text className="text-gray-900 text-xl font-bold">
              {user?.name ?? "Chef"} 👨‍🍳
            </Text>
          </View>
        </View>

        {/* Today's date */}
        <View className="flex-row items-center mb-5">
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text className="text-gray-500 text-sm ml-1.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>

        {/* Daily Nutrition Summary */}
        {totals && (
          <View
            className="bg-white rounded-2xl p-4 mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text className="text-sm font-semibold text-gray-900 mb-3">
              Daily Nutrition
            </Text>
            <View className="flex-row justify-between">
              {[
                { label: "Calories", value: `${totals.calories}`, unit: "kcal", color: "#FF6B35" },
                { label: "Protein", value: `${totals.protein_g}`, unit: "g", color: "#10B981" },
                { label: "Carbs", value: `${totals.carbs_g}`, unit: "g", color: "#F59E0B" },
                { label: "Fat", value: `${totals.fat_g}`, unit: "g", color: "#6366F1" },
              ].map((item) => (
                <View key={item.label} className="items-center">
                  <Text className="text-lg font-bold" style={{ color: item.color }}>
                    {item.value}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {item.unit}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Meals */}
        <Text className="text-gray-900 text-lg font-bold mb-3">
          Today's Meals
        </Text>

        {isLoading ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text className="text-gray-500 text-sm mt-3">Loading plan...</Text>
          </View>
        ) : meals ? (
          <>
            <MealCard type="breakfast" meal={meals.breakfast} />
            <MealCard type="lunch" meal={meals.lunch} />
            <MealCard type="dinner" meal={meals.dinner} />

            {/* Grocery List Summary */}
            {plan.grocery_list && plan.grocery_list.length > 0 && (
              <View className="bg-white rounded-2xl p-4 mt-2">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-gray-900">
                    Grocery List
                  </Text>
                  <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                    <Text className="text-xs text-orange-600 font-medium">
                      {plan.grocery_list.length} items
                    </Text>
                  </View>
                </View>
                {plan.grocery_list.slice(0, 5).map((item, idx) => (
                  <View key={idx} className="flex-row justify-between py-1.5">
                    <Text className="text-sm text-gray-700">{item.ingredient}</Text>
                    <Text className="text-sm text-gray-400">{item.quantity}</Text>
                  </View>
                ))}
                {plan.grocery_list.length > 5 && (
                  <Text className="text-xs text-orange-500 mt-1">
                    +{plan.grocery_list.length - 5} more items
                  </Text>
                )}
                <Pressable
                  onPress={() => router.push("/cart")}
                  accessibilityLabel="Order Groceries"
                  accessibilityRole="button"
                  className="mt-3 py-3 rounded-xl flex-row items-center justify-center"
                  style={{ backgroundColor: "#FF6B35" }}
                >
                  <Ionicons name="cart-outline" size={18} color="white" />
                  <Text className="text-white text-sm font-semibold ml-2">
                    Order Groceries
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="restaurant-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-500 text-base font-medium mt-3 text-center">
              No meal plan for today yet
            </Text>
            <Pressable
              onPress={onGenerate}
              disabled={generating}
              className="mt-4 px-6 py-3 rounded-xl"
              style={{ backgroundColor: generating ? "#FDB087" : "#FF6B35" }}
            >
              {generating ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white text-sm font-semibold ml-2">
                    Generating with AI...
                  </Text>
                </View>
              ) : (
                <Text className="text-white text-sm font-semibold">
                  Generate Today's Plan
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
