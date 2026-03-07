import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { mealService } from "@/services/api";
import { Skeleton } from "@/components/SkeletonLoader";

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface RecipeStep {
  step_number: number;
  instruction: string;
  duration_min?: number;
}

interface Recipe {
  id: string;
  name: string;
  cuisine: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  cook_instructions?: string;
  image_url?: string;
}

type Tab = "for_you" | "for_cook";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("for_you");

  useEffect(() => {
    async function load() {
      try {
        const response = await mealService.getRecipe(id);
        setRecipe(response.data as Recipe);
      } catch {
        Alert.alert("Error", "Failed to load recipe");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const shareOnWhatsApp = () => {
    if (!recipe) return;

    const ingredientList = recipe.ingredients
      .map((i) => `- ${i.name}: ${i.quantity} ${i.unit}`)
      .join("\n");

    const instructions = recipe.cook_instructions
      ?? recipe.steps.map((s) => `${s.step_number}. ${s.instruction}`).join("\n");

    const message = encodeURIComponent(
      `*${recipe.name}* (${recipe.cuisine})\n\n` +
        `*Ingredients:*\n${ingredientList}\n\n` +
        `*Instructions:*\n${instructions}\n\n` +
        `Sent from MealMate AI`
    );

    Linking.openURL(`whatsapp://send?text=${message}`).catch(() => {
      Alert.alert("Error", "WhatsApp is not installed");
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background px-5 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </Pressable>
        <Skeleton width="70%" height={24} className="mb-3" />
        <Skeleton width="40%" height={16} className="mb-6" />
        <Skeleton width="100%" height={100} borderRadius={16} className="mb-4" />
        <Skeleton width="100%" height={200} borderRadius={16} />
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
        <Text className="text-text-secondary text-base font-inter-medium mt-3">
          Recipe not found
        </Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-primary text-sm font-inter-semibold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-28"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Pressable onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </Pressable>

        <Text className="text-text-primary text-2xl font-inter-bold mb-1">
          {recipe.name}
        </Text>
        <Text className="text-text-secondary text-sm font-inter mb-4">
          {recipe.cuisine}
        </Text>

        {/* Quick info */}
        <View
          className="bg-surface rounded-2xl p-4 mb-4 flex-row justify-around"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View className="items-center">
            <Ionicons name="flame-outline" size={20} color="#FF6B35" />
            <Text className="text-text-primary text-sm font-inter-semibold mt-1">
              {recipe.calories}
            </Text>
            <Text className="text-text-secondary text-xs font-inter">kcal</Text>
          </View>
          <View className="items-center">
            <Ionicons name="barbell-outline" size={20} color="#2EC4B6" />
            <Text className="text-text-primary text-sm font-inter-semibold mt-1">
              {recipe.protein}g
            </Text>
            <Text className="text-text-secondary text-xs font-inter">protein</Text>
          </View>
          <View className="items-center">
            <Ionicons name="time-outline" size={20} color="#F59E0B" />
            <Text className="text-text-primary text-sm font-inter-semibold mt-1">
              {recipe.prep_time_min + recipe.cook_time_min}
            </Text>
            <Text className="text-text-secondary text-xs font-inter">min</Text>
          </View>
          <View className="items-center">
            <Ionicons name="people-outline" size={20} color="#6B7280" />
            <Text className="text-text-primary text-sm font-inter-semibold mt-1">
              {recipe.servings}
            </Text>
            <Text className="text-text-secondary text-xs font-inter">servings</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
          <Pressable
            onPress={() => setActiveTab("for_you")}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              activeTab === "for_you" ? "bg-surface" : ""
            }`}
            style={
              activeTab === "for_you"
                ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 3,
                    elevation: 1,
                  }
                : undefined
            }
          >
            <Text
              className={`text-sm font-inter-semibold ${
                activeTab === "for_you"
                  ? "text-text-primary"
                  : "text-text-secondary"
              }`}
            >
              For You
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("for_cook")}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              activeTab === "for_cook" ? "bg-surface" : ""
            }`}
            style={
              activeTab === "for_cook"
                ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 3,
                    elevation: 1,
                  }
                : undefined
            }
          >
            <Text
              className={`text-sm font-inter-semibold ${
                activeTab === "for_cook"
                  ? "text-text-primary"
                  : "text-text-secondary"
              }`}
            >
              For Cook
            </Text>
          </Pressable>
        </View>

        {activeTab === "for_you" ? (
          <>
            {/* Ingredients */}
            <Text className="text-text-primary text-lg font-inter-bold mb-3">
              Ingredients
            </Text>
            <View
              className="bg-surface rounded-2xl p-4 mb-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              {recipe.ingredients.map((ingredient, index) => (
                <View
                  key={index}
                  className={`flex-row items-center justify-between py-2.5 ${
                    index < recipe.ingredients.length - 1
                      ? "border-b border-gray-50"
                      : ""
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-2 h-2 bg-primary rounded-full mr-3" />
                    <Text className="text-text-primary text-sm font-inter">
                      {ingredient.name}
                    </Text>
                  </View>
                  <Text className="text-text-secondary text-sm font-inter-medium">
                    {ingredient.quantity} {ingredient.unit}
                  </Text>
                </View>
              ))}
            </View>

            {/* Steps */}
            <Text className="text-text-primary text-lg font-inter-bold mb-3">
              Instructions
            </Text>
            <View className="gap-3">
              {recipe.steps.map((step) => (
                <View
                  key={step.step_number}
                  className="bg-surface rounded-2xl p-4 flex-row"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <View className="w-7 h-7 bg-primary/10 rounded-full items-center justify-center mr-3 mt-0.5">
                    <Text className="text-primary text-xs font-inter-bold">
                      {step.step_number}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-primary text-sm font-inter leading-5">
                      {step.instruction}
                    </Text>
                    {step.duration_min && (
                      <View className="flex-row items-center mt-2">
                        <Ionicons
                          name="time-outline"
                          size={12}
                          color="#6B7280"
                        />
                        <Text className="text-text-secondary text-xs font-inter ml-1">
                          ~{step.duration_min} min
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          /* For Cook view — simplified instructions */
          <View>
            <Text className="text-text-primary text-lg font-inter-bold mb-3">
              Cook Instructions
            </Text>
            <View
              className="bg-surface rounded-2xl p-4 mb-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              {recipe.cook_instructions ? (
                <Text className="text-text-primary text-sm font-inter leading-6">
                  {recipe.cook_instructions}
                </Text>
              ) : (
                recipe.steps.map((step) => (
                  <Text
                    key={step.step_number}
                    className="text-text-primary text-sm font-inter leading-6 mb-2"
                  >
                    {step.step_number}. {step.instruction}
                  </Text>
                ))
              )}
            </View>

            {/* Ingredients summary for cook */}
            <Text className="text-text-primary text-lg font-inter-bold mb-3">
              What You'll Need
            </Text>
            <View
              className="bg-surface rounded-2xl p-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              {recipe.ingredients.map((ingredient, index) => (
                <Text
                  key={index}
                  className="text-text-primary text-sm font-inter py-1"
                >
                  {ingredient.quantity} {ingredient.unit} {ingredient.name}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* WhatsApp share */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-surface px-5 pt-3 pb-10"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Pressable
          onPress={shareOnWhatsApp}
          className="bg-[#25D366] py-4 rounded-2xl flex-row items-center justify-center"
        >
          <Ionicons name="logo-whatsapp" size={22} color="white" />
          <Text className="text-white text-base font-inter-bold ml-2">
            Share with Cook (WhatsApp)
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
