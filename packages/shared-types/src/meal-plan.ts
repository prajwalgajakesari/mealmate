export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type IngredientCategory = 'fresh' | 'pantry' | 'staple';
export type PlanStatus = 'generated' | 'approved' | 'ordered' | 'completed';

export interface Nutrition {
  calories: number;
  proteinG: number;
  fiberG: number;
  carbsG: number;
  fatG: number;
}

export interface MealIngredient {
  name: string;
  quantity: string;
  unit: string;
  category: IngredientCategory;
  searchTerm: string;
}

export interface Meal {
  type: MealType;
  name: string;
  cuisine: string;
  description: string;
  prepTimeMin: number;
  cookTimeMin: number;
  ingredients: MealIngredient[];
  instructionsUser: string[];
  instructionsCook: string[];
  nutrition: Nutrition;
}

export interface GroceryItem {
  name: string;
  searchTerm: string;
  quantity: string;
  category: IngredientCategory;
  reason: string;
  priority: 'must_have' | 'nice_to_have';
}

export interface MealPlan {
  id: string;
  userId: string;
  planDate: string;
  meals: Meal[];
  dailyTotals: Nutrition;
  groceryList: GroceryItem[];
  status: PlanStatus;
  createdAt: string;
}

export interface MealFeedback {
  id: string;
  userId: string;
  mealPlanId: string;
  mealType: MealType;
  rating: number;
  feedbackText?: string;
  tags: string[];
  createdAt: string;
}

export interface GeneratePlanRequest {
  userId: string;
  date?: string;
  forceRegenerate?: boolean;
}

export interface SwapMealRequest {
  mealType: MealType;
  reason?: string;
}

export interface SubmitFeedbackRequest {
  mealType: MealType;
  rating: number;
  feedbackText?: string;
  tags?: string[];
}
