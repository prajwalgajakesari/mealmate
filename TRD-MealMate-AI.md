# MealMate AI — Technical Requirements Document (TRD)

**Version:** 1.0
**Date:** March 7, 2026
**Author:** Prajwal P
**Status:** Draft

---

## 1. System Architecture Overview

MealMate AI is a full-stack system with five core services communicating via an event-driven architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Mobile App   │  │ WhatsApp Bot │  │   Web App    │                  │
│  │ (React Native)│  │  (Twilio)    │  │  (Next.js)   │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
└─────────┼─────────────────┼─────────────────┼──────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY (Kong / AWS API Gateway)           │
│                     Auth (JWT + OAuth2) | Rate Limiting | Logging       │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────────────────────┐
          ▼               ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Meal Engine │ │   Pantry     │ │   Order      │ │    User      │
│   Service    │ │  Tracker     │ │  Orchestrator│ │   Service    │
│  (Python)    │ │  (Python)    │ │  (Node.js)   │ │  (Node.js)   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │                │
       ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          MESSAGE BUS (Redis Streams / Kafka)            │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │  S3 / Blob   │
│  (Primary DB)│ │   (Cache)    │ │  (Images)    │
└──────────────┘ └──────────────┘ └──────────────┘

                    EXTERNAL INTEGRATIONS
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Swiggy MCP   │  │ Blinkit      │  │ Zepto MCP    │                  │
│  │ (REST/MCP)   │  │ (Playwright) │  │ (Playwright) │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Claude API   │  │ WhatsApp     │  │ Google Fit / │                  │
│  │ (Anthropic)  │  │ (Twilio)     │  │ Apple Health │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Services — Detailed Design

### 2.1 Meal Engine Service

**Purpose:** AI-powered meal planning, recipe generation, nutrition calculation

**Tech Stack:**
- Python 3.12+ with FastAPI
- Anthropic Claude API (claude-sonnet-4-5-20250514) for meal generation
- PostgreSQL for recipe database
- Redis for caching frequent meal plans

**Key Components:**

```
meal-engine/
├── api/
│   ├── routes/
│   │   ├── plans.py          # Daily plan generation endpoint
│   │   ├── recipes.py        # Recipe CRUD
│   │   └── feedback.py       # User feedback processing
│   └── middleware/
│       └── auth.py
├── core/
│   ├── planner.py            # Main planning orchestrator
│   ├── nutrition.py          # Macro/calorie calculator
│   ├── cuisine_rotator.py    # Ensures variety across days
│   ├── seasonal.py           # Seasonal ingredient awareness
│   └── festival.py           # Festival/fasting calendar
├── ai/
│   ├── prompt_templates/
│   │   ├── meal_plan.py      # System prompt for daily plans
│   │   ├── substitution.py   # Ingredient substitution prompt
│   │   └── cook_instructions.py  # Maid-friendly instruction generator
│   └── claude_client.py      # Anthropic API wrapper
├── models/
│   ├── recipe.py             # Recipe data model
│   ├── meal_plan.py          # Daily plan model
│   └── user_profile.py       # Dietary profile model
└── data/
    ├── recipes_seed.json     # 500+ curated Indian recipes
    └── nutrition_db.json     # IFCT (Indian Food Composition Table) data
```

**Meal Plan Generation Flow:**

```
1. CRON triggers at user's preferred time (default 8:30 AM)
2. Load user profile (diet, goals, macros, preferences, feedback history)
3. Load pantry state (what's available, what needs ordering)
4. Load recent meal history (avoid repeats within 7 days)
5. Call Claude API with structured prompt:
   - User profile + goals
   - Available pantry items
   - Recent meal history (anti-repeat)
   - Seasonal ingredients
   - Festival/fasting calendar
   - Cuisine rotation preference
6. Parse structured JSON response (3 meals + ingredients + instructions)
7. Calculate nutrition (cross-reference with IFCT database)
8. Store plan in DB
9. Trigger Order Orchestrator with ingredient list
10. Push notification to user
```

**Claude API Prompt Architecture:**

```python
SYSTEM_PROMPT = """
You are MealMate AI, a personal meal planner for Indian households.

USER PROFILE:
{user_profile}

CONSTRAINTS:
- Generate exactly 3 meals: breakfast, lunch, dinner
- Breakfast: {breakfast_style} (user makes, <20 min prep)
- Lunch: {lunch_style} (cook/maid makes)
- Dinner: {dinner_style} (cook/maid makes)
- Daily targets: {calorie_target} cal, {protein_target}g protein
- Avoid repeating any meal from last 7 days: {recent_meals}
- Prefer seasonal ingredients: {seasonal_items}
- Festival awareness: {festival_today}

PANTRY STATE:
Available (don't order): {pantry_available}
Running low (order if used): {pantry_low}
Empty (must order): {pantry_empty}

OUTPUT FORMAT: Strict JSON schema (see below)
"""

RESPONSE_SCHEMA = {
    "meals": [
        {
            "type": "breakfast|lunch|dinner",
            "name": "string",
            "cuisine": "string",
            "description": "string",
            "prep_time_min": "int",
            "cook_time_min": "int",
            "ingredients": [
                {
                    "name": "string",
                    "quantity": "string",
                    "unit": "string",
                    "category": "fresh|pantry|staple",
                    "search_term": "string"  # optimized for grocery search
                }
            ],
            "instructions_user": ["step1", "step2"],  # for user
            "instructions_cook": ["step1", "step2"],   # simplified for maid
            "nutrition": {
                "calories": "int",
                "protein_g": "int",
                "fiber_g": "int",
                "carbs_g": "int",
                "fat_g": "int"
            }
        }
    ],
    "daily_totals": { "calories": "int", "protein_g": "int" },
    "grocery_needed": [
        {
            "name": "string",
            "search_term": "string",
            "quantity": "string",
            "category": "fresh|pantry",
            "reason": "string",  # "daily fresh" or "pantry restock - last ordered 10 days ago"
            "priority": "must_have|nice_to_have"
        }
    ]
}
```

### 2.2 Pantry Tracker Service

**Purpose:** Track ingredient inventory, predict depletion, prevent over-ordering

**Tech Stack:**
- Python 3.12+ with FastAPI
- PostgreSQL (pantry_items table with usage tracking)
- Redis for real-time pantry state cache

**Database Schema:**

```sql
-- Pantry Items
CREATE TABLE pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    ingredient_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,  -- 'fresh', 'pantry', 'staple'

    -- Quantity tracking
    last_ordered_at TIMESTAMP,
    last_ordered_qty VARCHAR(50),    -- "500g", "1kg", "200ml"
    estimated_servings_remaining INT,
    estimated_depletion_date DATE,

    -- Usage patterns (learned over time)
    avg_daily_usage_grams DECIMAL(8,2),
    avg_days_between_orders INT,
    times_ordered INT DEFAULT 0,

    -- Preferences
    preferred_brand VARCHAR(255),
    preferred_variant VARCHAR(255),  -- "Tata Sampann Unpolished"
    max_price DECIMAL(8,2),

    -- Status
    status VARCHAR(20) DEFAULT 'unknown',  -- 'stocked', 'low', 'empty', 'unknown'
    needs_reorder BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Pantry consumption log
CREATE TABLE pantry_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    pantry_item_id UUID REFERENCES pantry_items(id),
    meal_plan_id UUID REFERENCES meal_plans(id),
    estimated_usage_grams DECIMAL(8,2),
    used_at TIMESTAMP DEFAULT NOW()
);

-- Category rules (system-wide defaults)
CREATE TABLE ingredient_categories (
    id SERIAL PRIMARY KEY,
    ingredient_pattern VARCHAR(255),  -- regex: 'quinoa|rajma|dal|rice'
    category VARCHAR(50),             -- 'pantry'
    default_shelf_life_days INT,      -- 30
    default_servings_per_pack INT,    -- 10
    is_kitchen_staple BOOLEAN DEFAULT FALSE  -- salt, turmeric, atta
);
```

**Pantry Intelligence Algorithm:**

```python
class PantryTracker:
    def should_reorder(self, item: PantryItem, ingredients_needed: List) -> OrderDecision:
        # Rule 1: Kitchen staples — NEVER order
        if item.category == 'staple':
            return OrderDecision(order=False, reason="Kitchen staple - always available")

        # Rule 2: Fresh items — ALWAYS order if needed in today's plan
        if item.category == 'fresh':
            return OrderDecision(order=True, reason="Fresh item - daily order")

        # Rule 3: Pantry items — Smart reorder logic
        if item.category == 'pantry':
            days_since_ordered = (now() - item.last_ordered_at).days

            # Never ordered before — order it
            if item.last_ordered_at is None:
                return OrderDecision(order=True, reason="First time ordering")

            # Estimated depletion approaching
            if item.estimated_servings_remaining <= 2:
                return OrderDecision(order=True,
                    reason=f"Running low (~{item.estimated_servings_remaining} servings left)")

            # Time-based heuristic (if usage tracking is limited)
            if days_since_ordered >= item.avg_days_between_orders * 0.8:
                return OrderDecision(order=True,
                    reason=f"Last ordered {days_since_ordered} days ago, usually reorder every {item.avg_days_between_orders} days")

            # Still have plenty
            return OrderDecision(order=False,
                reason=f"Ordered {days_since_ordered} days ago, ~{item.estimated_servings_remaining} servings remaining")

    def update_after_order(self, item: PantryItem, qty_ordered: str):
        """Update pantry state after an order is placed"""
        item.last_ordered_at = now()
        item.last_ordered_qty = qty_ordered
        item.estimated_servings_remaining = self.estimate_servings(item, qty_ordered)
        item.status = 'stocked'
        item.times_ordered += 1

    def consume(self, item: PantryItem, meal_plan: MealPlan):
        """Deduct estimated usage when a meal plan is executed"""
        usage = self.estimate_usage(item, meal_plan)
        item.estimated_servings_remaining -= 1
        if item.estimated_servings_remaining <= 2:
            item.status = 'low'
            item.needs_reorder = True
```

### 2.3 Order Orchestrator Service

**Purpose:** Execute grocery orders across multiple platforms (Swiggy, Blinkit, Zepto)

**Tech Stack:**
- Node.js 20+ with Express/Fastify
- Playwright (browser automation fallback)
- MCP Client SDK (for Swiggy/Zepto MCP)
- Bull queue (order job processing)
- Redis (order state management)

**Multi-Platform Order Strategy:**

```
                    ┌─────────────────┐
                    │  Ingredient List │
                    │  from Meal Engine│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Platform Router │
                    │ (user preference │
                    │  + availability) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │  Swiggy    │ │  Blinkit   │ │  Zepto     │
     │  Adapter   │ │  Adapter   │ │  Adapter   │
     │  (MCP)     │ │ (Playwright│ │ (MCP/      │
     │            │ │  + scrape) │ │  Playwright)│
     └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
           │               │              │
           ▼               ▼              ▼
     ┌─────────────────────────────────────────┐
     │           Unified Cart Builder          │
     │  - Deduplicate across meals             │
     │  - Pick best price/brand                │
     │  - Handle unavailability + substitution │
     │  - Apply coupons                        │
     └──────────────────┬──────────────────────┘
                        │
                        ▼
     ┌─────────────────────────────────────────┐
     │        Cart Summary → User Approval     │
     │   (Push notification / WhatsApp / App)  │
     └──────────────────┬──────────────────────┘
                        │
                        ▼ (User taps "Order")
     ┌─────────────────────────────────────────┐
     │          Checkout Execution              │
     │  - Redirect to platform checkout        │
     │  - Or deep-link to app with cart ready  │
     └─────────────────────────────────────────┘
```

**Platform Adapter Interface:**

```typescript
// Common interface for all platform adapters
interface GroceryPlatformAdapter {
  name: string;  // "swiggy_instamart" | "blinkit" | "zepto"

  // Core operations
  searchProduct(query: string, filters?: SearchFilters): Promise<Product[]>;
  addToCart(product: Product, quantity: number): Promise<CartItem>;
  removeFromCart(itemId: string): Promise<void>;
  getCart(): Promise<Cart>;
  clearCart(): Promise<void>;

  // Availability
  checkAvailability(query: string): Promise<AvailabilityResult>;
  getDeliveryEstimate(): Promise<DeliveryEstimate>;

  // Checkout (user-initiated)
  getCheckoutUrl(): Promise<string>;  // deep link or web URL

  // Platform-specific
  applyCoupon?(code: string): Promise<CouponResult>;
  getOffers?(): Promise<Offer[]>;
}

// Swiggy adapter uses MCP
class SwiggyInstamartAdapter implements GroceryPlatformAdapter {
  private mcpClient: MCPClient;

  constructor() {
    this.mcpClient = new MCPClient({
      serverUrl: "https://mcp.swiggy.com/im",
      // Auth handled via user's Swiggy session
    });
  }

  async searchProduct(query: string): Promise<Product[]> {
    const result = await this.mcpClient.callTool("search_products", {
      query,
      limit: 10,
      sort_by: "relevance"
    });
    return this.mapToProducts(result);
  }

  async addToCart(product: Product, qty: number): Promise<CartItem> {
    return await this.mcpClient.callTool("add_to_cart", {
      product_id: product.id,
      quantity: qty
    });
  }
}

// Blinkit adapter uses Playwright (no MCP available yet)
class BlinkitAdapter implements GroceryPlatformAdapter {
  private browser: Browser;
  private page: Page;

  async searchProduct(query: string): Promise<Product[]> {
    await this.page.goto(`https://blinkit.com/s/?q=${encodeURIComponent(query)}`);
    await this.page.waitForSelector('.product-card');

    const products = await this.page.$$eval('.product-card', cards =>
      cards.map(card => ({
        id: card.dataset.productId,
        name: card.querySelector('.product-name')?.textContent,
        price: parseFloat(card.querySelector('.price')?.textContent?.replace('₹', '')),
        available: !card.querySelector('.out-of-stock'),
        image: card.querySelector('img')?.src,
      }))
    );

    return products;
  }
}
```

**Smart Cart Builder:**

```typescript
class SmartCartBuilder {
  // Deduplicate ingredients across meals
  // e.g., if lunch needs 2 tomatoes and dinner needs 3, order 500g (covers both)

  async buildCart(
    ingredients: GroceryItem[],
    pantryState: PantryState,
    platform: GroceryPlatformAdapter
  ): Promise<CartSummary> {

    // 1. Merge duplicate ingredients across meals
    const merged = this.mergeIngredients(ingredients);

    // 2. Filter out items already in pantry
    const toOrder = merged.filter(item =>
      pantryState.shouldReorder(item)
    );

    // 3. Search and add each item
    const cartItems: CartResult[] = [];
    const unavailable: UnavailableItem[] = [];

    for (const item of toOrder) {
      const results = await platform.searchProduct(item.searchTerm);

      if (results.length > 0) {
        // Pick best option (prefer user's brand, then best value)
        const picked = this.pickBestProduct(results, item, pantryState);
        await platform.addToCart(picked, item.quantity);
        cartItems.push({ item, product: picked, price: picked.price });
      } else {
        unavailable.push(item);
      }
    }

    // 4. Handle unavailable items — request substitutions from Meal Engine
    if (unavailable.length > 0) {
      const substitutions = await this.mealEngine.getSubstitutions(unavailable);
      for (const sub of substitutions) {
        const results = await platform.searchProduct(sub.searchTerm);
        if (results.length > 0) {
          const picked = this.pickBestProduct(results, sub);
          await platform.addToCart(picked, sub.quantity);
          cartItems.push({ item: sub, product: picked, price: picked.price, isSubstitution: true });
        }
      }
    }

    // 5. Check for coupons
    const offers = await platform.getOffers?.();
    const bestCoupon = this.findBestCoupon(offers, cartItems);

    return {
      items: cartItems,
      unavailable,
      subtotal: cartItems.reduce((sum, c) => sum + c.price, 0),
      coupon: bestCoupon,
      total: this.calculateTotal(cartItems, bestCoupon),
      platform: platform.name,
      deliveryEstimate: await platform.getDeliveryEstimate()
    };
  }
}
```

### 2.4 User Service

**Purpose:** User management, authentication, preferences, feedback processing

**Tech Stack:**
- Node.js 20+ with Express
- PostgreSQL
- Firebase Auth (social logins)
- JWT tokens

**Database Schema:**

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15) UNIQUE,
    name VARCHAR(255),

    -- Body profile
    height_cm INT,
    weight_kg DECIMAL(5,1),
    age INT,
    gender VARCHAR(10),
    activity_level VARCHAR(20),  -- sedentary, light, moderate, active, very_active
    health_goal VARCHAR(30),      -- muscle_gain, weight_loss, maintenance, general_health

    -- Calculated targets
    calorie_target INT,
    protein_target_g INT,
    fiber_target_g INT,
    carb_target_g INT,
    fat_target_g INT,

    -- Dietary preferences
    diet_type VARCHAR(30),  -- vegetarian, vegan, eggetarian, non_veg, jain
    cuisine_preferences TEXT[],  -- ['indian', 'mediterranean', 'asian']
    allergies TEXT[],
    ingredient_blacklist TEXT[],

    -- Meal structure
    breakfast_style VARCHAR(50),  -- quick_easy, elaborate, smoothie_only
    lunch_style VARCHAR(50),      -- salad, full_meal, light
    dinner_style VARCHAR(50),     -- roti_based, rice_based, mixed
    has_cook BOOLEAN DEFAULT FALSE,
    cook_skill_level VARCHAR(20), -- basic, intermediate, advanced

    -- Platform preferences
    preferred_platform VARCHAR(30),  -- swiggy, blinkit, zepto
    delivery_address JSONB,
    plan_delivery_time TIME DEFAULT '09:00',

    -- Subscription
    plan_type VARCHAR(20) DEFAULT 'free',  -- free, pro, family
    plan_expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Meal Plans
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    plan_date DATE NOT NULL,
    meals JSONB NOT NULL,  -- Full meal plan JSON
    daily_totals JSONB,
    grocery_list JSONB,
    status VARCHAR(20) DEFAULT 'generated',  -- generated, approved, ordered, completed
    created_at TIMESTAMP DEFAULT NOW()
);

-- Feedback
CREATE TABLE meal_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    meal_plan_id UUID REFERENCES meal_plans(id),
    meal_type VARCHAR(10),  -- breakfast, lunch, dinner
    rating INT CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    tags TEXT[],  -- ['too_spicy', 'loved_it', 'too_complex', 'great_protein']
    created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE grocery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    meal_plan_id UUID REFERENCES meal_plans(id),
    platform VARCHAR(30),
    items JSONB,
    subtotal DECIMAL(8,2),
    coupon_applied VARCHAR(50),
    total DECIMAL(8,2),
    status VARCHAR(20),  -- cart_ready, user_approved, placed, delivered
    platform_order_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. Infrastructure & Deployment

### 3.1 Cloud Architecture (AWS)

```
┌──────────────────────────────────────────────────────────────┐
│                        AWS Cloud                              │
│                                                               │
│  ┌─────────────┐     ┌──────────────────────────────────┐    │
│  │ CloudFront  │     │      ECS Fargate Cluster          │    │
│  │ (CDN)       │     │  ┌────────┐ ┌────────┐ ┌────────┐│    │
│  └──────┬──────┘     │  │ Meal   │ │ Pantry │ │ Order  ││    │
│         │            │  │ Engine │ │Tracker │ │ Orch.  ││    │
│  ┌──────▼──────┐     │  │(2 task)│ │(1 task)│ │(2 task)││    │
│  │ ALB         │────▶│  └────────┘ └────────┘ └────────┘│    │
│  └─────────────┘     │  ┌────────┐ ┌────────┐           │    │
│                      │  │ User   │ │WhatsApp│           │    │
│                      │  │Service │ │ Bot    │           │    │
│                      │  │(1 task)│ │(1 task)│           │    │
│                      │  └────────┘ └────────┘           │    │
│                      └──────────────────────────────────┘    │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ RDS          │  │ ElastiCache  │  │ S3           │       │
│  │ PostgreSQL   │  │ Redis        │  │ (Assets)     │       │
│  │ (db.t4g.med) │  │ (cache.t4g)  │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │ EventBridge  │  │ SQS          │                          │
│  │ (CRON jobs)  │  │ (Job queues) │                          │
│  └──────────────┘  └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Cost Estimate (MVP, 10K users)

| Service | Monthly Cost |
|---------|-------------|
| ECS Fargate (7 tasks) | $150 |
| RDS PostgreSQL (db.t4g.medium) | $70 |
| ElastiCache Redis (cache.t4g.small) | $30 |
| Anthropic Claude API (~300K calls/mo @ Sonnet) | $900 |
| S3 + CloudFront | $20 |
| Twilio WhatsApp | $200 |
| Playwright instances (2 always-on for Blinkit) | $100 |
| Monitoring (CloudWatch, Sentry) | $30 |
| **Total** | **~$1,500/mo** |

### 3.3 Scaling Strategy

| Users | Approach | Est. Cost |
|-------|----------|-----------|
| 0-10K | Single region, minimal infra | $1,500/mo |
| 10K-50K | Auto-scaling ECS, read replicas, Claude batch API | $4,000/mo |
| 50K-200K | Multi-AZ, dedicated Playwright pool, prompt caching | $12,000/mo |
| 200K+ | Multi-region, custom fine-tuned model, platform API partnerships | $30,000+/mo |

---

## 4. External Integrations — Detailed

### 4.1 Swiggy Instamart MCP

**Connection Setup:**
```json
{
  "name": "swiggy-instamart",
  "server_url": "https://mcp.swiggy.com/im",
  "auth": {
    "type": "session_token",
    "source": "user_linked_account"
  }
}
```

**Available Tools (as of March 2026):**

| Tool | Description | Status |
|------|-------------|--------|
| `search_products` | Search by name, category, brand | Working |
| `get_product_details` | Get price, variants, availability | Working |
| `add_to_cart` | Add product with quantity | Working |
| `view_cart` | See current cart with pricing | Working |
| `remove_from_cart` | Remove item | Working |
| `apply_offer` | Apply coupon code | Working |
| `checkout` | Initiate order | Partially working (COD only) |
| `track_order` | Get delivery status | Working |

**Limitations & Workarounds:**
- Checkout only supports COD → redirect user to Swiggy app for UPI/card payment
- Rate limits unknown → implement exponential backoff
- Session expires → re-auth flow via OAuth

### 4.2 Zepto Integration

**Approach:** Open-source MCP (Playwright-based)

```typescript
// Based on github.com/proddnav/zepto-cafe-mcp
// Extended for grocery (Zepto main app, not just cafe)

class ZeptoAdapter {
  private playwright: PlaywrightClient;

  async init(userSession: ZeptoSession) {
    this.playwright = await chromium.launch({ headless: true });
    this.page = await this.playwright.newPage();

    // Inject user session cookies
    await this.page.context().addCookies(userSession.cookies);
    await this.page.goto('https://www.zeptonow.com/');
  }

  async searchProduct(query: string): Promise<Product[]> {
    await this.page.fill('input[placeholder*="Search"]', query);
    await this.page.press('input[placeholder*="Search"]', 'Enter');
    await this.page.waitForSelector('[data-testid="product-card"]');
    // ... extract product data
  }
}
```

### 4.3 Blinkit Integration

**Approach:** Playwright browser automation (no MCP available)

```typescript
class BlinkitAdapter {
  // Similar Playwright approach as Zepto
  // Key URLs:
  //   Search: https://blinkit.com/s/?q={query}
  //   Cart: https://blinkit.com/cart
  //   Checkout: https://blinkit.com/checkout

  // Blinkit-specific challenges:
  //   - Aggressive bot detection → rotate user agents, add realistic delays
  //   - Dynamic content loading → proper wait strategies
  //   - Location-based inventory → set correct delivery address first
}
```

### 4.4 Anthropic Claude API

**Usage Pattern:**
```python
# Meal plan generation — primary AI call
model = "claude-sonnet-4-5-20250514"  # Best balance of quality + cost

# Prompt caching for system prompt (saves ~90% on repeated calls)
response = client.messages.create(
    model=model,
    max_tokens=4096,
    system=[{
        "type": "text",
        "text": SYSTEM_PROMPT,  # Cached across users
        "cache_control": {"type": "ephemeral"}
    }],
    messages=[{
        "role": "user",
        "content": user_specific_context  # Varies per user
    }],
    # Force JSON output
    response_format={"type": "json_object"}
)
```

**Cost Optimization:**
- Prompt caching: System prompt (~2K tokens) cached = 90% savings on input
- Batch API for non-urgent generation (overnight prep)
- Haiku for simple tasks (substitution suggestions, cook instruction translation)
- Sonnet for primary meal planning
- Response caching: similar profiles can share base meal templates

### 4.5 WhatsApp Integration (Twilio)

```
Morning Flow:
  Bot → User: "Good morning Prajwal! Your meals for today are ready 🍳"
  Bot → User: [Meal plan card with nutrition]
  Bot → User: "Your grocery cart has 12 items (₹487). Shall I order?"
  User → Bot: "Yes order"
  Bot → User: "Done! Redirecting to Swiggy to confirm payment..."
  Bot → User: [Deep link to Swiggy cart]

Cook Flow:
  Bot → Cook: "Today's lunch: Mediterranean Chickpea Salad"
  Bot → Cook: [Step by step instructions in Hindi]
  Bot → Cook: "Today's dinner: Rajma Masala with Roti"
  Bot → Cook: [Instructions]

Evening Flow:
  Bot → User: "How were today's meals? Rate each one!"
  User → Bot: "Lunch was great, dinner was too spicy"
  Bot → User: "Got it! I'll tone down the spice for dinner tomorrow."
```

---

## 5. API Endpoints

### 5.1 User APIs

```
POST   /api/v1/auth/signup          # Register with phone/email
POST   /api/v1/auth/login           # Login (OTP-based)
GET    /api/v1/users/me             # Get profile
PUT    /api/v1/users/me             # Update profile
PUT    /api/v1/users/me/dietary     # Update dietary preferences
PUT    /api/v1/users/me/goals       # Update health goals
POST   /api/v1/users/me/platforms   # Link Swiggy/Blinkit/Zepto account
```

### 5.2 Meal Plan APIs

```
GET    /api/v1/plans/today          # Get today's meal plan
POST   /api/v1/plans/generate       # Force regenerate today's plan
PUT    /api/v1/plans/:id/approve    # Approve plan
POST   /api/v1/plans/:id/feedback   # Submit feedback for a meal
GET    /api/v1/plans/history        # Past 30 days of plans
POST   /api/v1/plans/:id/swap/:meal # Swap one meal (regenerate just breakfast/lunch/dinner)
```

### 5.3 Pantry APIs

```
GET    /api/v1/pantry               # Get full pantry state
PUT    /api/v1/pantry/:id           # Manual update (e.g., "I bought quinoa separately")
POST   /api/v1/pantry/scan          # Upload photo for pantry scan (P2)
GET    /api/v1/pantry/reorder       # Items that need reordering
```

### 5.4 Order APIs

```
GET    /api/v1/orders/cart          # Get current cart summary
POST   /api/v1/orders/build        # Build cart from today's plan
PUT    /api/v1/orders/approve      # User approves → triggers checkout
GET    /api/v1/orders/:id/status   # Order tracking
GET    /api/v1/orders/history      # Past orders
```

### 5.5 Cook APIs

```
GET    /api/v1/cook/today           # Today's instructions for the cook
POST   /api/v1/cook/share           # Send instructions via WhatsApp
GET    /api/v1/cook/today/:meal     # Specific meal instructions
```

---

## 6. Security & Privacy

### 6.1 Data Protection

- All PII encrypted at rest (AES-256) and in transit (TLS 1.3)
- Platform credentials (Swiggy/Blinkit sessions) stored in AWS Secrets Manager
- No credit card data stored — all payments through platform's native checkout
- User can delete all data (GDPR-style right to erasure)

### 6.2 Platform Account Security

- OAuth-based linking where available (Swiggy)
- Session tokens rotated every 24 hours
- Playwright sessions isolated per user (no shared browser state)
- Never auto-place orders — always require explicit user confirmation

### 6.3 API Security

- JWT-based auth with 15-min access tokens + 7-day refresh tokens
- Rate limiting: 100 req/min per user
- Input validation on all endpoints
- OWASP top 10 compliance

---

## 7. Monitoring & Observability

### 7.1 Key Dashboards

| Dashboard | Metrics |
|-----------|---------|
| Meal Engine | Plans generated/day, Claude API latency, failure rate, cache hit rate |
| Order Orchestrator | Orders placed/day, platform availability, cart build success rate, avg order value |
| Pantry Tracker | Reorder accuracy (did user actually run out?), pantry prediction deviation |
| Platform Health | Swiggy MCP uptime, Blinkit Playwright success rate, Zepto availability |
| User Engagement | DAU, plans approved rate, feedback submission rate, NPS |

### 7.2 Alerting

| Alert | Condition | Channel |
|-------|-----------|---------|
| Platform Down | MCP or Playwright fails >5 times in 10 min | PagerDuty |
| Claude API Error | >5% error rate in 5 min | Slack |
| Order Failure | User-approved order fails to build cart | Slack + SMS to user |
| Plan Generation Lag | Morning plans not generated by 8:45 AM | PagerDuty |

---

## 8. Development Phases & Sprint Plan

### Phase 1: Foundation (Weeks 1-4)

**Sprint 1 (Week 1-2):**
- Set up monorepo, CI/CD, staging environment
- PostgreSQL schema, migrations
- User service: auth, profile, dietary preferences
- Meal Engine: Claude integration, basic prompt, JSON parsing

**Sprint 2 (Week 3-4):**
- Recipe database seeding (500+ Indian recipes for reference)
- Nutrition calculator (IFCT database integration)
- Cuisine rotation algorithm
- Basic meal plan generation E2E flow

### Phase 2: Intelligence (Weeks 5-8)

**Sprint 3 (Week 5-6):**
- Pantry Tracker service with categorization rules
- Smart reorder algorithm
- Pantry state persistence and usage tracking
- Integration with Meal Engine (pantry-aware planning)

**Sprint 4 (Week 7-8):**
- Order Orchestrator: Swiggy MCP adapter
- Order Orchestrator: Blinkit Playwright adapter
- Smart Cart Builder (deduplication, brand preference, substitution)
- Cart summary API

### Phase 3: User Experience (Weeks 9-12)

**Sprint 5 (Week 9-10):**
- React Native mobile app (onboarding, daily plan view, cart approval)
- Push notifications (morning plan, order ready)
- Feedback collection UI

**Sprint 6 (Week 11-12):**
- WhatsApp bot (Twilio integration)
- Cook instructions sharing
- Closed beta with 100 users
- Bug fixes and iteration

---

## 9. Testing Strategy

| Layer | Approach | Tools |
|-------|----------|-------|
| Unit Tests | All business logic (pantry algorithm, nutrition calc, cart builder) | pytest, Jest |
| Integration Tests | API endpoint testing, DB operations | pytest + httpx, supertest |
| E2E Tests | Full flow: plan → cart → order simulation | Playwright |
| Platform Tests | Mock MCP responses, mock Playwright flows | VCR.py, nock |
| AI Output Tests | Validate Claude responses match schema, nutrition sanity checks | Custom validators |
| Load Tests | 1000 concurrent plan generations | k6 |

---

## 10. Open Questions & Decisions Needed

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Mobile framework | React Native vs Flutter | React Native (larger India dev pool) |
| 2 | AI model | Claude Sonnet vs GPT-4o vs Gemini | Claude Sonnet (best structured output, MCP native) |
| 3 | Primary platform | Swiggy first vs Blinkit first | Swiggy (MCP available, largest Instamart coverage) |
| 4 | Monetization MVP | Free with ads vs Freemium vs Paid-only | Freemium (1 meal free, 3 meals = Pro at ₹299/mo) |
| 5 | WhatsApp priority | Core channel vs secondary | Core — most Indian users prefer WhatsApp over apps |
| 6 | Cook language | English only vs Hindi from day 1 | Hindi + English from day 1 (critical for cook persona) |
| 7 | Pantry: trust user vs track | Ask user vs auto-track | Hybrid — auto-track + weekly confirmation |
| 8 | Multi-platform cart | Split across platforms vs single | Single platform per order (simpler UX, one delivery) |

---

*This is a living document. Last updated: March 7, 2026.*
