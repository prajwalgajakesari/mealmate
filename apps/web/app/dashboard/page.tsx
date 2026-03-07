"use client";

import { useState } from "react";
import MealCard from "@/components/MealCard";
import CartSummary from "@/components/CartSummary";
import ProgressBar from "@/components/ui/ProgressBar";
import Card from "@/components/ui/Card";
import type { Meal } from "@/components/MealCard";

// Demo data — will be replaced by API calls
const todaysMeals: Meal[] = [
  {
    id: "1",
    name: "Masala Oats with Vegetables",
    cuisine: "Indian",
    meal_type: "breakfast",
    calories: 320,
    protein: 12,
    prep_time_minutes: 15,
  },
  {
    id: "2",
    name: "Rajma Chawal with Raita",
    cuisine: "North Indian",
    meal_type: "lunch",
    calories: 580,
    protein: 22,
    prep_time_minutes: 45,
  },
  {
    id: "3",
    name: "Palak Paneer with Roti",
    cuisine: "North Indian",
    meal_type: "dinner",
    calories: 520,
    protein: 24,
    prep_time_minutes: 35,
  },
];

const nutritionSummary = {
  calories: { value: 1420, max: 2000 },
  protein: { value: 58, max: 80 },
  carbs: { value: 180, max: 250 },
  fat: { value: 45, max: 65 },
};

export default function DashboardPage() {
  const [meals] = useState<Meal[]>(todaysMeals);

  function handleFeedback(mealId: string, feedback: "like" | "dislike" | "swap") {
    // TODO: call meal engine API
    console.log(`Feedback for ${mealId}: ${feedback}`);
  }

  function handleOrder() {
    // TODO: call order orchestrator API
    console.log("Placing order...");
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Today&apos;s Meal Plan
        </h1>
        <p className="mt-1 text-text-secondary">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Meal cards — span 2 cols */}
        <div className="space-y-4 lg:col-span-2">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onFeedback={handleFeedback} />
          ))}
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-6">
          {/* Nutrition summary */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              Daily Nutrition
            </h2>
            <div className="space-y-4">
              <ProgressBar
                label="Calories"
                value={nutritionSummary.calories.value}
                max={nutritionSummary.calories.max}
                unit=" kcal"
                color="primary"
              />
              <ProgressBar
                label="Protein"
                value={nutritionSummary.protein.value}
                max={nutritionSummary.protein.max}
                unit="g"
                color="secondary"
              />
              <ProgressBar
                label="Carbs"
                value={nutritionSummary.carbs.value}
                max={nutritionSummary.carbs.max}
                unit="g"
                color="warning"
              />
              <ProgressBar
                label="Fat"
                value={nutritionSummary.fat.value}
                max={nutritionSummary.fat.max}
                unit="g"
                color="success"
              />
            </div>
          </Card>

          {/* Cart summary */}
          <CartSummary itemCount={7} total={435} onOrder={handleOrder} />
        </div>
      </div>
    </div>
  );
}
