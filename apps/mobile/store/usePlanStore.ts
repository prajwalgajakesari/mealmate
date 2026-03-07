import { create } from "zustand";
import { mealService } from "@/services/api";

export interface NutritionInfo {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface Ingredient {
  name: string;
  quantity: string;
  category: string;
  is_available: boolean;
  search_term: string;
}

export interface MealRecipe {
  name: string;
  cuisine: string;
  meal_type: string;
  diet_type: string;
  description: string;
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  ingredients: Ingredient[];
  instructions_user: string[];
  instructions_cook: string[];
  nutrition: NutritionInfo;
  tags: string[];
  difficulty: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  plan_date: string;
  meals: {
    breakfast: MealRecipe;
    lunch: MealRecipe;
    dinner: MealRecipe;
  };
  daily_totals: NutritionInfo;
  grocery_list: Array<{
    ingredient: string;
    quantity: string;
    search_term: string;
    estimated_price_inr: number;
  }>;
  status: string;
  created_at: string;
}

interface PlanState {
  plan: MealPlan | null;
  isLoading: boolean;
  error: string | null;

  fetchTodayPlan: () => Promise<void>;
  generatePlan: () => Promise<void>;
  clearPlan: () => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  plan: null,
  isLoading: false,
  error: null,

  fetchTodayPlan: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await mealService.getTodayPlan();
      set({ plan: response.data as MealPlan, isLoading: false });
    } catch {
      set({
        error: "No meal plan for today yet",
        isLoading: false,
      });
    }
  },

  generatePlan: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await mealService.generatePlan();
      set({ plan: response.data as MealPlan, isLoading: false });
    } catch {
      set({
        error: "Failed to generate meal plan",
        isLoading: false,
      });
    }
  },

  clearPlan: () => set({ plan: null }),
}));
