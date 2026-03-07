import { z } from 'zod';

// Enum schemas
const dietTypeSchema = z.enum(['vegetarian', 'vegan', 'eggetarian', 'non_veg', 'jain']);
const healthGoalSchema = z.enum(['muscle_gain', 'weight_loss', 'maintenance', 'general_health']);
const activityLevelSchema = z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']);
const mealStyleSchema = z.enum([
  'quick_easy', 'elaborate', 'smoothie_only', 'salad',
  'full_meal', 'light', 'roti_based', 'rice_based', 'mixed',
]);
const cookSkillLevelSchema = z.enum(['basic', 'intermediate', 'advanced']);
const platformSchema = z.enum(['swiggy', 'blinkit', 'zepto']);

const deliveryAddressSchema = z.object({
  label: z.string().min(1).max(50),
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// Firebase token for signup/login
export const firebaseAuthSchema = z.object({
  firebaseToken: z.string().min(1, 'Firebase token is required'),
});

// Signup request (Firebase token + optional name)
export const signupSchema = z.object({
  firebaseToken: z.string().min(1, 'Firebase token is required'),
  name: z.string().min(1).max(255),
});

// Refresh token request
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Logout request
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Update profile request
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  heightCm: z.number().int().min(50).max(300).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  age: z.number().int().min(10).max(150).optional(),
  gender: z.string().min(1).max(10).optional(),
  activityLevel: activityLevelSchema.optional(),
  healthGoal: healthGoalSchema.optional(),
  dietType: dietTypeSchema.optional(),
  cuisinePreferences: z.array(z.string().min(1).max(50)).max(20).optional(),
  allergies: z.array(z.string().min(1).max(100)).max(50).optional(),
  ingredientBlacklist: z.array(z.string().min(1).max(100)).max(100).optional(),
  breakfastStyle: mealStyleSchema.optional(),
  lunchStyle: mealStyleSchema.optional(),
  dinnerStyle: mealStyleSchema.optional(),
  hasCook: z.boolean().optional(),
  cookSkillLevel: cookSkillLevelSchema.optional(),
  preferredPlatform: platformSchema.optional(),
  deliveryAddress: deliveryAddressSchema.optional(),
  planDeliveryTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format').optional(),
});

// Update dietary preferences
export const updateDietarySchema = z.object({
  dietType: dietTypeSchema.optional(),
  cuisinePreferences: z.array(z.string().min(1).max(50)).max(20).optional(),
  allergies: z.array(z.string().min(1).max(100)).max(50).optional(),
  ingredientBlacklist: z.array(z.string().min(1).max(100)).max(100).optional(),
});

// Update health goals
export const updateGoalsSchema = z.object({
  heightCm: z.number().int().min(50).max(300).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  age: z.number().int().min(10).max(150).optional(),
  gender: z.string().min(1).max(10).optional(),
  activityLevel: activityLevelSchema.optional(),
  healthGoal: healthGoalSchema.optional(),
});

export type FirebaseAuthInput = z.infer<typeof firebaseAuthSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateDietaryInput = z.infer<typeof updateDietarySchema>;
export type UpdateGoalsInput = z.infer<typeof updateGoalsSchema>;
