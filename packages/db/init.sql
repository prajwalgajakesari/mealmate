-- MealMate AI Database Schema
-- Version: 1.0

-- Create schemas for logical isolation
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS meals;
CREATE SCHEMA IF NOT EXISTS pantry;
CREATE SCHEMA IF NOT EXISTS orders;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- AUTH SCHEMA - Users & Authentication
-- ============================================

CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15) UNIQUE,
    name VARCHAR(255),
    firebase_uid VARCHAR(128) UNIQUE,

    -- Body profile
    height_cm INT,
    weight_kg DECIMAL(5,1),
    age INT,
    gender VARCHAR(10),
    activity_level VARCHAR(20) DEFAULT 'moderate',
    health_goal VARCHAR(30) DEFAULT 'general_health',

    -- Calculated targets
    calorie_target INT,
    protein_target_g INT,
    fiber_target_g INT,
    carb_target_g INT,
    fat_target_g INT,

    -- Dietary preferences
    diet_type VARCHAR(30) DEFAULT 'vegetarian',
    cuisine_preferences TEXT[] DEFAULT '{"indian"}',
    allergies TEXT[] DEFAULT '{}',
    ingredient_blacklist TEXT[] DEFAULT '{}',

    -- Meal structure
    breakfast_style VARCHAR(50) DEFAULT 'quick_easy',
    lunch_style VARCHAR(50) DEFAULT 'full_meal',
    dinner_style VARCHAR(50) DEFAULT 'mixed',
    has_cook BOOLEAN DEFAULT FALSE,
    cook_skill_level VARCHAR(20) DEFAULT 'basic',

    -- Platform preferences
    preferred_platform VARCHAR(30) DEFAULT 'swiggy',
    delivery_address JSONB,
    plan_delivery_time TIME DEFAULT '09:00',

    -- Subscription
    plan_type VARCHAR(20) DEFAULT 'free',
    plan_expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auth.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MEALS SCHEMA - Meal Plans, Recipes, Feedback
-- ============================================

CREATE TABLE meals.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cuisine VARCHAR(50) NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    diet_type VARCHAR(30) NOT NULL,
    description TEXT,
    prep_time_min INT,
    cook_time_min INT,
    servings INT DEFAULT 2,
    ingredients JSONB NOT NULL,
    instructions_user TEXT[] NOT NULL,
    instructions_cook TEXT[] NOT NULL,
    nutrition JSONB NOT NULL,
    tags TEXT[] DEFAULT '{}',
    difficulty VARCHAR(20) DEFAULT 'easy',
    is_seasonal BOOLEAN DEFAULT FALSE,
    season VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE meals.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    meals JSONB NOT NULL,
    daily_totals JSONB,
    grocery_list JSONB,
    status VARCHAR(20) DEFAULT 'generated',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, plan_date)
);

CREATE TABLE meals.meal_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_plan_id UUID REFERENCES meals.meal_plans(id) ON DELETE CASCADE,
    meal_type VARCHAR(10) NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PANTRY SCHEMA - Pantry Tracking
-- ============================================

CREATE TABLE pantry.ingredient_categories (
    id SERIAL PRIMARY KEY,
    ingredient_pattern VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    default_shelf_life_days INT,
    default_servings_per_pack INT,
    is_kitchen_staple BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pantry.pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,

    -- Quantity tracking
    last_ordered_at TIMESTAMP,
    last_ordered_qty VARCHAR(50),
    estimated_servings_remaining INT DEFAULT 0,
    estimated_depletion_date DATE,

    -- Usage patterns
    avg_daily_usage_grams DECIMAL(8,2),
    avg_days_between_orders INT,
    times_ordered INT DEFAULT 0,

    -- Preferences
    preferred_brand VARCHAR(255),
    preferred_variant VARCHAR(255),
    max_price DECIMAL(8,2),

    -- Status
    status VARCHAR(20) DEFAULT 'unknown',
    needs_reorder BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, ingredient_name)
);

CREATE TABLE pantry.usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pantry_item_id UUID REFERENCES pantry.pantry_items(id) ON DELETE CASCADE,
    meal_plan_id UUID REFERENCES meals.meal_plans(id) ON DELETE SET NULL,
    estimated_usage_grams DECIMAL(8,2),
    used_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ORDERS SCHEMA - Grocery Orders
-- ============================================

CREATE TABLE orders.grocery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_plan_id UUID REFERENCES meals.meal_plans(id) ON DELETE SET NULL,
    platform VARCHAR(30) NOT NULL,
    items JSONB NOT NULL,
    subtotal DECIMAL(8,2),
    coupon_applied VARCHAR(50),
    discount DECIMAL(8,2) DEFAULT 0,
    total DECIMAL(8,2),
    status VARCHAR(20) DEFAULT 'cart_ready',
    platform_order_id VARCHAR(255),
    checkout_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_phone ON auth.users(phone);
CREATE INDEX idx_users_firebase ON auth.users(firebase_uid);
CREATE INDEX idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);

CREATE INDEX idx_meal_plans_user_date ON meals.meal_plans(user_id, plan_date DESC);
CREATE INDEX idx_meal_plans_status ON meals.meal_plans(status);
CREATE INDEX idx_recipes_cuisine ON meals.recipes(cuisine, meal_type);
CREATE INDEX idx_recipes_diet ON meals.recipes(diet_type);
CREATE INDEX idx_feedback_user ON meals.meal_feedback(user_id, created_at DESC);
CREATE INDEX idx_feedback_plan ON meals.meal_feedback(meal_plan_id);

CREATE INDEX idx_pantry_items_user ON pantry.pantry_items(user_id, status);
CREATE INDEX idx_pantry_items_reorder ON pantry.pantry_items(user_id, needs_reorder) WHERE needs_reorder = TRUE;
CREATE INDEX idx_usage_log_user ON pantry.usage_log(user_id, used_at DESC);

CREATE INDEX idx_orders_user ON orders.grocery_orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders.grocery_orders(status);
CREATE INDEX idx_orders_plan ON orders.grocery_orders(meal_plan_id);
