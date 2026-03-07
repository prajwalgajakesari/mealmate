# MealMate AI — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** March 7, 2026
**Author:** Prajwal P
**Status:** Draft

---

## 1. Executive Summary

MealMate AI is an AI-powered personal kitchen manager that combines personalized meal planning with automated grocery ordering via India's quick-commerce platforms (Swiggy Instamart, Blinkit, Zepto). Unlike existing meal planning apps that stop at generating a grocery list, MealMate closes the full loop — it plans your meals, orders the ingredients, tracks your pantry, and provides cooking instructions to your household cook/maid.

**The core insight:** India's 10-minute grocery delivery infrastructure makes "order ingredients every morning" a viable daily habit — something impossible in markets where delivery takes hours. No product today combines AI meal intelligence with actual end-to-end grocery execution in this market.

---

## 2. Problem Statement

### The Daily Kitchen Problem

Every Indian household faces the same daily friction:

1. **"What should we eat today?"** — Decision fatigue, repeated meals, lack of variety
2. **"Do we have the ingredients?"** — No visibility into pantry status, wastage from over-buying
3. **"How do I tell my cook what to make?"** — Communication gaps with household help, especially for new recipes
4. **"I want to eat healthy but don't know how"** — Macros, calories, and dietary goals are hard to track manually
5. **"I ordered too much / forgot to order"** — No intelligence around what's already in the kitchen

### Current Solutions Fall Short

| Solution | What it does | What it doesn't do |
|----------|-------------|-------------------|
| Swiggy Instamart / Blinkit / Zepto | Delivers groceries in 10 min | Doesn't know what you should eat |
| Meal planning apps (Ollie, Eat This Much, MealFlow) | AI meal suggestions + grocery lists | Doesn't order for you. US-focused. No India cuisine depth |
| Swiggy MCP (Jan 2026) | AI can search & cart items | No meal planning, no pantry tracking, checkout broken |
| Zepto MCP (open-source) | Natural language ordering for Zepto Cafe | Only for cafe items, experimental, not grocery |
| ChatGPT / Claude directly | Can suggest meals | No persistent memory, no pantry tracking, no ordering |

**Gap:** Nobody owns the full pipeline — meal intelligence + pantry tracking + auto-ordering + cook instructions — as a single, daily-use product.

---

## 3. Product Vision

> **"Your AI kitchen manager that plans every meal, orders every ingredient, and tells your cook exactly what to make — every single day, automatically."**

### North Star Metric
**Daily Active Meal Plans Executed** — a user who receives a meal plan, has ingredients ordered, and confirms at least one meal was made from it.

### Key Value Propositions

1. **Zero decision fatigue** — Wake up to 3 personalized meals planned for you
2. **Zero shopping friction** — Ingredients show up at your door by the time you need them
3. **Smart pantry** — Never over-order (no 500g chickpeas daily) or under-order
4. **Health-goal aligned** — Meals tuned to your body goals (muscle gain, weight loss, maintenance)
5. **Cook-ready instructions** — Simple instructions your maid/cook can follow
6. **Gets better daily** — Learns from your feedback, preferences, seasonal availability

---

## 4. Target Users

### Primary: Urban Indian Professional (25-40)

- Lives in Tier 1/2 city with quick-commerce access
- Health-conscious, gym-goer, tracks macros or wants to
- Has a maid/cook for lunch and dinner
- Makes breakfast themselves (quick & easy)
- Already uses Swiggy Instamart / Blinkit / Zepto
- Experiences daily "what to eat" fatigue
- Vegetarian or follows specific dietary patterns

### Secondary Personas

- **Young couples** — Both working, no cook, need quick meal ideas + auto-ordering
- **Fitness enthusiasts** — Strict macro requirements, meal prep focused
- **Parents** — Need kid-friendly + adult meals, variety is critical
- **People with dietary restrictions** — Diabetes-friendly, PCOS diet, gluten-free, Jain

### Market Size (India, 2026)

- Quick-commerce users: ~50M monthly active
- Health & fitness app users: ~80M
- Households with domestic help (Tier 1/2): ~25M
- **Serviceable addressable market:** 5-10M households willing to pay for meal + grocery automation

---

## 5. Competitive Landscape

### Direct Competitors (Meal Planning)

| App | Strengths | Weaknesses | India Presence |
|-----|-----------|------------|----------------|
| **Ollie** | Best AI meal planning, learns preferences, Instacart integration | US-only, no Indian cuisine depth, no cook instructions | None |
| **Eat This Much** | Auto meal plans, budget control, CNN's Best 2025 | US-focused, basic Indian options, no quick-commerce | Minimal |
| **MealFlow AI** | Macro targets, Instacart one-click | US-only, no pantry tracking | None |
| **Fitia** | 1M+ food database, metabolic research-based | List only, no ordering, no cook mode | Limited |
| **HealthifyMe** | Strong India presence, calorie tracking | Not a meal planner, no grocery integration | Strong |
| **cure.fit / cult.fit** | Meal delivery (eat.fit) | Pre-made meals only, expensive, no cooking | Strong |

### Indirect Competitors (Quick Commerce + AI)

| Platform | MCP Status | Capabilities | Gaps |
|----------|-----------|--------------|------|
| **Swiggy Instamart** | Live (Jan 2026) | Search, cart, 40K+ SKUs, Claude/ChatGPT/Gemini | Checkout broken, COD only, no meal planning |
| **Zepto** | Open-source MCP (Cafe only) | Natural language ordering, Playwright-based | Cafe only, experimental, no grocery MCP |
| **Blinkit (Zomato)** | No public MCP yet | Largest quick-commerce player | No AI integration announced |

### Our Differentiation

Nobody combines all four layers:

```
Layer 1: Meal Intelligence (AI plans meals based on goals, preferences, cuisine rotation)
Layer 2: Pantry Intelligence (tracks what you have, what's running low)
Layer 3: Order Execution (actually adds to cart and orders on Swiggy/Blinkit/Zepto)
Layer 4: Cook Communication (maid-friendly instructions in local languages)
```

---

## 6. Feature Requirements

### P0 — MVP (Month 1-2)

#### 6.1 Onboarding & Profile

- Dietary preferences (veg/non-veg/vegan/Jain/eggetarian)
- Health goals (muscle gain, weight loss, maintenance, general health)
- Body stats (height, weight, activity level) for calorie/macro targets
- Cuisine preferences (Indian, Mediterranean, Asian, Continental, etc.)
- Household size and meal structure (who eats what)
- Cook/maid availability and skill level
- Allergies and ingredient blacklist
- Quick-commerce platform preference (Swiggy/Blinkit/Zepto)
- Delivery address and preferred delivery time

#### 6.2 Daily Meal Planning Engine

- Generate 3 meals/day (breakfast, lunch, dinner) every morning at user-set time
- Personalized to dietary profile, health goals, and macro targets
- Cuisine rotation — no repeats within a week
- Per-meal nutrition breakdown (protein, fiber, calories, carbs, fat)
- Daily nutrition total vs. target
- Seasonal ingredient awareness (what's fresh and cheap right now)
- Festival/fasting awareness (Navratri, Ekadashi, etc.)

#### 6.3 Smart Pantry Tracker

- Categorize every ingredient as FRESH (order daily) or PANTRY (order weekly/biweekly)
- Track approximate pantry depletion based on usage patterns
- Day 1: order everything; Day 2+: only order fresh + depleted pantry items
- Proactive check-ins: "Do you still have quinoa, or should I reorder?"
- Never order kitchen staples (salt, turmeric, atta, cooking oil, basic spices)
- Learn household consumption rates over time

#### 6.4 Auto Grocery Ordering

- Search ingredients on preferred platform (Swiggy Instamart → Blinkit → Zepto fallback)
- Add items to cart with intelligent quantity selection (don't buy 1kg ginger for 1 recipe)
- Handle unavailability: substitute ingredient + adjust recipe
- Price-aware: pick best value options, apply available coupons
- Cart summary with itemized pricing before order
- User confirms and places order (never auto-checkout for safety)
- Support for MCP-based ordering (Swiggy MCP) and browser automation fallback

#### 6.5 Cook/Maid Instructions

- Simple, step-by-step cooking instructions
- Ingredient quantities in familiar Indian measurements (katori, chammach, etc.)
- Prep time and cooking time estimates
- Option to share via WhatsApp (one-tap)
- Hindi / regional language support (Phase 2)

#### 6.6 Feedback Loop

- Daily feedback prompt: "How were yesterday's meals?"
- Thumbs up/down per meal
- Free-text feedback for adjustments
- System learns and adapts: more of what you like, less of what you don't

### P1 — Growth Features (Month 3-4)

#### 6.7 WhatsApp Bot Interface

- Full experience via WhatsApp (morning plan, approve cart, share cook instructions)
- Voice note support for feedback
- Family group integration (multiple family members can give input)

#### 6.8 Multi-Language Support

- Cook instructions in Hindi, Marathi, Tamil, Telugu, Kannada, Bengali
- Voice-based instructions (text-to-speech for illiterate cooks)

#### 6.9 Meal Prep Mode

- Weekend meal prep suggestions (batch cook for the week)
- Freezer-friendly recipes with reheat instructions
- Optimized grocery orders for bulk prep

#### 6.10 Family Profiles

- Different dietary needs per family member
- Kid-friendly alternatives
- Guest mode (adjust quantities for visitors)

### P2 — Differentiation Features (Month 5-6)

#### 6.11 Smart Fridge / Pantry Scan

- Photo-based pantry inventory (snap a photo of your fridge/shelf)
- Auto-detect available ingredients
- "Use what you have" recipe mode

#### 6.12 Health Integration

- Sync with Google Fit / Apple Health / Fitbit
- Adjust calorie targets based on actual activity
- Water and supplement reminders

#### 6.13 Cost Optimization

- Daily/weekly/monthly grocery budget setting
- Price comparison across platforms (Swiggy vs Blinkit vs Zepto)
- Smart substitutions to hit budget targets
- Weekly spending report

#### 6.14 Social Features

- Share meal plans with friends/family
- Community recipes from users with similar profiles
- Rate and review auto-generated recipes

---

## 7. User Flows

### 7.1 First-Time Setup (5 min)

```
Download App → Quick Profile Quiz (diet, goals, body stats, cuisine prefs)
→ Connect Quick Commerce Account (Swiggy/Blinkit/Zepto)
→ Set Delivery Address → Set Morning Alert Time
→ First Meal Plan Generated → Review & Approve → Groceries Ordered
```

### 7.2 Daily Flow (2 min active time)

```
9:00 AM: Push notification → "Your meals for today are ready!"
→ User opens app → Sees 3 meals with nutrition
→ Sees grocery cart (fresh items + any pantry restocks)
→ Taps "Order" → Redirected to Swiggy/Blinkit to confirm
→ Shares cook instructions via WhatsApp to maid
→ Evening: Quick feedback (thumbs up/down + optional note)
```

### 7.3 Cook/Maid Flow

```
Receives WhatsApp message with today's lunch & dinner
→ Clear ingredient list with quantities
→ Step-by-step instructions
→ Can tap "I don't have [ingredient]" → App suggests substitute
```

---

## 8. Business Model

### Revenue Streams

| Stream | Model | Estimated Revenue |
|--------|-------|-------------------|
| **Subscription** | Freemium: Free (1 meal/day) → Pro ₹299/mo (3 meals + auto-order + pantry) → Family ₹499/mo | Primary |
| **Affiliate/Commission** | 2-5% commission from Swiggy/Blinkit/Zepto per order driven | High potential |
| **Brand Partnerships** | Promoted ingredients/brands in meal plans (e.g., Tata Sampann, Milky Mist) | Medium |
| **Premium Recipes** | Celebrity chef / nutritionist-designed meal plans | Addon |
| **B2B** | Corporate wellness programs, gym/fitness center partnerships | Phase 2 |

### Unit Economics (Target)

- CAC (Customer Acquisition Cost): ₹150-300
- ARPU (Monthly): ₹299-499
- Gross Margin: 70-80% (software product)
- LTV: ₹3,600-6,000 (12-month retention target)
- Payback Period: < 2 months

---

## 9. Success Metrics

### North Star

- **Daily Meal Plans Executed** (plan received + order placed + meal confirmed)

### Primary KPIs

| Metric | Target (Month 3) | Target (Month 6) |
|--------|------------------|------------------|
| DAU | 10K | 50K |
| Daily plans generated | 8K | 40K |
| Orders placed through app | 5K/day | 25K/day |
| User retention (D30) | 40% | 55% |
| NPS | 50+ | 60+ |
| Avg meals executed per user/week | 12 | 18 |

### Secondary KPIs

- Pantry prediction accuracy (did user need to reorder sooner/later?)
- Ingredient availability rate (% items found on first platform)
- Substitution acceptance rate
- Cook instruction completion rate (did maid follow through?)
- Weekly grocery spend per user
- Macro target adherence (% users hitting protein/calorie goals)

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP APIs break or change | Core ordering fails | Browser automation fallback (Playwright); multi-platform redundancy |
| Quick-commerce platforms block automation | Can't place orders | Official partnership/API deal; become a significant order driver they want |
| Users don't trust AI with groceries | Low adoption | Start with "suggest & confirm" model; never auto-checkout |
| Meal suggestions are repetitive/boring | Churn | Large recipe database; cuisine rotation engine; user feedback loop |
| Cook/maid doesn't follow instructions | Value diminished | Simple language; WhatsApp delivery; photo-based instructions |
| Swiggy/Blinkit launch their own meal planner | Direct competition | Move fast; build switching costs (pantry data, preference history); multi-platform advantage |
| Food safety / dietary advice liability | Legal risk | Disclaimer; no medical claims; partner with certified nutritionists |

---

## 11. Go-to-Market Strategy

### Phase 1: Beta (Month 1-2)

- **Target:** 500 beta users from fitness communities (Reddit India, Twitter fitness, gym WhatsApp groups)
- **Cities:** Bangalore, Mumbai, Pune (highest quick-commerce penetration)
- **Channel:** Organic — fitness influencer partnerships, gym partnerships
- **Hook:** "Your AI kitchen manager — plans meals, orders groceries, tells your cook what to make"

### Phase 2: Launch (Month 3-4)

- **Target:** 10K users
- **Channels:** Instagram/YouTube fitness influencers, Google Ads (meal planning keywords), App Store optimization
- **Partnerships:** cult.fit gyms, HealthifyMe cross-promo, Swiggy Instamart featured app

### Phase 3: Scale (Month 5-6)

- **Target:** 50K users
- **Channels:** WhatsApp viral loops (share meal plan with friends), referral program, brand partnerships (Tata, Amul, etc.)
- **Expansion:** Delhi NCR, Hyderabad, Chennai, Kolkata

---

## 12. Timeline & Milestones

| Week | Milestone |
|------|-----------|
| Week 1-2 | Technical architecture finalized, MCP integrations tested |
| Week 3-4 | Core meal planning engine built, recipe database seeded (500+ Indian recipes) |
| Week 5-6 | Pantry tracking system, auto-ordering flow (Swiggy MCP + browser fallback) |
| Week 7-8 | Mobile app MVP (React Native), onboarding flow, WhatsApp integration |
| Week 9-10 | Closed beta with 100 users, feedback collection, iteration |
| Week 11-12 | Public beta launch, 500 users target |
| Month 4 | Blinkit & Zepto integration, multi-language cook instructions |
| Month 6 | 50K users, Series A readiness |

---

## Appendix A: Existing MCP Infrastructure (As of March 2026)

### Swiggy Instamart MCP

- **Endpoint:** `https://mcp.swiggy.com/im`
- **Status:** Live (Jan 27, 2026)
- **Capabilities:** Product search, cart management, 40K+ SKUs
- **Limitations:** Checkout not fully exposed, COD only
- **GitHub:** github.com/Swiggy/swiggy-mcp-server-manifest

### Zepto MCP

- **Status:** Open-source (Zepto Cafe only)
- **Capabilities:** Natural language ordering via Playwright browser automation
- **Limitations:** Cafe items only, no grocery, experimental
- **GitHub:** github.com/proddnav/zepto-cafe-mcp

### Blinkit (Zomato)

- **Status:** No public MCP as of March 2026
- **Approach:** Browser automation (Playwright) required

---

*This is a living document. Last updated: March 7, 2026.*
