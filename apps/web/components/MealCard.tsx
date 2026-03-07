"use client";

import {
  Clock,
  Flame,
  Drumstick,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from "lucide-react";
import Card from "./ui/Card";
import { clsx } from "clsx";

export interface Meal {
  id: string;
  name: string;
  cuisine: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  prep_time_minutes: number;
  image_url?: string;
}

interface MealCardProps {
  meal: Meal;
  onFeedback?: (mealId: string, feedback: "like" | "dislike" | "swap") => void;
  className?: string;
}

const mealTypeColors: Record<string, string> = {
  breakfast: "bg-amber-50 text-amber-700",
  lunch: "bg-orange-50 text-orange-700",
  dinner: "bg-indigo-50 text-indigo-700",
  snack: "bg-emerald-50 text-emerald-700",
};

export default function MealCard({ meal, onFeedback, className }: MealCardProps) {
  return (
    <Card hoverable className={clsx("relative", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <span
            className={clsx(
              "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              mealTypeColors[meal.meal_type] ?? "bg-gray-50 text-gray-700"
            )}
          >
            {meal.meal_type}
          </span>
          <h3 className="mt-2 text-lg font-semibold text-text-primary">
            {meal.name}
          </h3>
          <p className="text-sm text-text-secondary">{meal.cuisine} cuisine</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-text-secondary">
        <span className="flex items-center gap-1">
          <Flame className="h-4 w-4 text-primary" />
          {meal.calories} kcal
        </span>
        <span className="flex items-center gap-1">
          <Drumstick className="h-4 w-4 text-secondary" />
          {meal.protein}g protein
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-text-secondary" />
          {meal.prep_time_minutes} min
        </span>
      </div>

      {onFeedback && (
        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
          <button
            onClick={() => onFeedback(meal.id, "like")}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-emerald-50 hover:text-emerald-600"
          >
            <ThumbsUp className="h-4 w-4" />
            Like
          </button>
          <button
            onClick={() => onFeedback(meal.id, "dislike")}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <ThumbsDown className="h-4 w-4" />
            Dislike
          </button>
          <button
            onClick={() => onFeedback(meal.id, "swap")}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-blue-50 hover:text-blue-600"
          >
            <RefreshCw className="h-4 w-4" />
            Swap
          </button>
        </div>
      )}
    </Card>
  );
}
