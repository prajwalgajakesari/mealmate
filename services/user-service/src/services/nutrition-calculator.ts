/**
 * Nutrition Calculator Service
 *
 * Calculates daily calorie and macronutrient targets based on
 * user body stats, activity level, and health goals.
 *
 * Uses the Mifflin-St Jeor equation for BMR calculation.
 */

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type HealthGoal = 'muscle_gain' | 'weight_loss' | 'maintenance' | 'general_health';

export interface BodyStats {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: string;
  activityLevel: ActivityLevel;
}

export interface NutritionTargets {
  calorieTarget: number;
  proteinTargetG: number;
  carbTargetG: number;
  fatTargetG: number;
  fiberTargetG: number;
}

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Macro split ratios: [protein%, carb%, fat%]
const MACRO_SPLITS: Record<HealthGoal, { protein: number; carbs: number; fat: number }> = {
  muscle_gain: { protein: 0.40, carbs: 0.30, fat: 0.30 },
  weight_loss: { protein: 0.35, carbs: 0.35, fat: 0.30 },
  maintenance: { protein: 0.30, carbs: 0.40, fat: 0.30 },
  general_health: { protein: 0.25, carbs: 0.50, fat: 0.25 },
};

// Calorie adjustments per goal
const CALORIE_ADJUSTMENTS: Record<HealthGoal, number> = {
  muscle_gain: 300,    // surplus
  weight_loss: -400,   // deficit
  maintenance: 0,
  general_health: 0,
};

// Calories per gram of macronutrient
const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

/**
 * Calculate BMR using the Mifflin-St Jeor equation.
 *
 * Male:   BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
 * Female: BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
 */
export function calculateBMR(stats: BodyStats): number {
  const { weightKg, heightCm, age, gender } = stats;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (gender?.toLowerCase() === 'female') {
    return base - 161;
  }
  // Default to male formula
  return base + 5;
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE).
 * TDEE = BMR * activity multiplier
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  return Math.round(bmr * multiplier);
}

/**
 * Calculate fiber target based on calorie intake.
 * General recommendation: 14g fiber per 1000 calories.
 */
function calculateFiberTarget(calories: number): number {
  return Math.round((calories / 1000) * 14);
}

/**
 * Calculate full nutrition targets from body stats and health goal.
 * Returns null if required body stats are missing.
 */
export function calculateNutritionTargets(
  stats: Partial<BodyStats>,
  healthGoal: HealthGoal
): NutritionTargets | null {
  // Require minimum body stats for calculation
  if (!stats.heightCm || !stats.weightKg || !stats.age || !stats.gender) {
    return null;
  }

  const fullStats: BodyStats = {
    heightCm: stats.heightCm,
    weightKg: stats.weightKg,
    age: stats.age,
    gender: stats.gender,
    activityLevel: stats.activityLevel || 'moderate',
  };

  const bmr = calculateBMR(fullStats);
  const tdee = calculateTDEE(bmr, fullStats.activityLevel);
  const adjustment = CALORIE_ADJUSTMENTS[healthGoal] || 0;
  const calorieTarget = Math.round(tdee + adjustment);

  const split = MACRO_SPLITS[healthGoal] || MACRO_SPLITS.general_health;

  const proteinTargetG = Math.round((calorieTarget * split.protein) / CALORIES_PER_GRAM.protein);
  const carbTargetG = Math.round((calorieTarget * split.carbs) / CALORIES_PER_GRAM.carbs);
  const fatTargetG = Math.round((calorieTarget * split.fat) / CALORIES_PER_GRAM.fat);
  const fiberTargetG = calculateFiberTarget(calorieTarget);

  return {
    calorieTarget,
    proteinTargetG,
    carbTargetG,
    fatTargetG,
    fiberTargetG,
  };
}
