export type DietType = 'vegetarian' | 'vegan' | 'eggetarian' | 'non_veg' | 'jain';
export type HealthGoal = 'muscle_gain' | 'weight_loss' | 'maintenance' | 'general_health';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MealStyle = 'quick_easy' | 'elaborate' | 'smoothie_only' | 'salad' | 'full_meal' | 'light' | 'roti_based' | 'rice_based' | 'mixed';
export type CookSkillLevel = 'basic' | 'intermediate' | 'advanced';
export type PlanType = 'free' | 'pro' | 'family';
export type Platform = 'swiggy' | 'blinkit' | 'zepto';

export interface DeliveryAddress {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
}

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  name: string;

  // Body profile
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: string;
  activityLevel: ActivityLevel;
  healthGoal: HealthGoal;

  // Nutrition targets
  calorieTarget: number;
  proteinTargetG: number;
  fiberTargetG: number;
  carbTargetG: number;
  fatTargetG: number;

  // Dietary
  dietType: DietType;
  cuisinePreferences: string[];
  allergies: string[];
  ingredientBlacklist: string[];

  // Meal structure
  breakfastStyle: MealStyle;
  lunchStyle: MealStyle;
  dinnerStyle: MealStyle;
  hasCook: boolean;
  cookSkillLevel: CookSkillLevel;

  // Platform
  preferredPlatform: Platform;
  deliveryAddress?: DeliveryAddress;
  planDeliveryTime: string;

  // Subscription
  planType: PlanType;
  planExpiresAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email?: string;
  phone?: string;
  name: string;
  firebaseUid: string;
}

export interface UpdateProfileRequest {
  name?: string;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: string;
  activityLevel?: ActivityLevel;
  healthGoal?: HealthGoal;
  dietType?: DietType;
  cuisinePreferences?: string[];
  allergies?: string[];
  ingredientBlacklist?: string[];
  breakfastStyle?: MealStyle;
  lunchStyle?: MealStyle;
  dinnerStyle?: MealStyle;
  hasCook?: boolean;
  cookSkillLevel?: CookSkillLevel;
  preferredPlatform?: Platform;
  deliveryAddress?: DeliveryAddress;
  planDeliveryTime?: string;
}
