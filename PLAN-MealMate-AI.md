# MealMate AI — Engineering Plan Document

**Version:** 1.0
**Date:** March 7, 2026
**Author:** Prajwal P
**Status:** Draft

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Team Structure & Roles](#2-team-structure--roles)
3. [System Design for Scalability & Security](#3-system-design-for-scalability--security)
4. [UI/UX Design Philosophy](#4-uiux-design-philosophy)
5. [Tech Stack Decisions](#5-tech-stack-decisions)
6. [Monorepo Structure](#6-monorepo-structure)
7. [Phase-Wise Execution Plan](#7-phase-wise-execution-plan)
8. [Sprint Breakdown with Team Assignments](#8-sprint-breakdown-with-team-assignments)
9. [API Contract & Service Communication](#9-api-contract--service-communication)
10. [Database Design & Migration Strategy](#10-database-design--migration-strategy)
11. [Security Architecture](#11-security-architecture)
12. [Scalability Playbook](#12-scalability-playbook)
13. [CI/CD & DevOps](#13-cicd--devops)
14. [Testing Strategy](#14-testing-strategy)
15. [Risk Register & Contingency Plans](#15-risk-register--contingency-plans)
16. [Definition of Done](#16-definition-of-done)
17. [Communication & Rituals](#17-communication--rituals)

---

## 1. Overview & Goals

MealMate AI is an AI-powered personal kitchen manager that plans meals, auto-orders groceries via India's quick-commerce platforms, tracks your pantry, and generates cook-friendly instructions — all as a single daily-use product.

### Engineering Goals

| Goal | Measure |
|------|---------|
| **Ship MVP in 12 weeks** | Closed beta with 100 users by Week 10 |
| **Minimal, modern UI** | <5 screens for daily flow, <2 min daily active time |
| **Scalable from Day 1** | Architecture supports 10K users without rearchitecting |
| **Secure by default** | Zero stored payment data, encrypted PII, no auto-checkout |
| **Reliable AI output** | 99%+ valid JSON responses from Claude, fallback on parse failure |
| **Multi-platform ordering** | Swiggy MCP primary, Blinkit Playwright fallback on Day 1 |

---

## 2. Team Structure & Roles

### Core Team (6-8 people)

```
                        +-----------------+
                        |  Tech Lead /    |
                        |  Architect (TL) |
                        +--------+--------+
                                 |
          +----------------------+----------------------+
          |                      |                      |
  +-------v--------+   +--------v--------+   +---------v-------+
  | Backend Squad  |   | Frontend Squad  |   | Platform Squad  |
  | (2 engineers)  |   | (2 engineers)   |   | (1-2 engineers) |
  +----------------+   +-----------------+   +-----------------+
          |                      |                      |
  +-------v--------+   +--------v--------+   +---------v-------+
  | Meal Engine    |   | Mobile App      |   | Swiggy MCP      |
  | Pantry Tracker |   | (React Native)  |   | Blinkit Playwright|
  | User Service   |   | Web Dashboard   |   | Zepto Adapter   |
  | API Gateway    |   | (Next.js)       |   | WhatsApp Bot    |
  +----------------+   +-----------------+   +-----------------+
```

### Role Assignments

| Role | Responsibilities | Skills Required |
|------|-----------------|-----------------|
| **TL / Architect** | System design, code review, Claude AI prompt engineering, sprint planning, blocker resolution | Full-stack senior, AI/LLM experience, system design |
| **Backend Engineer 1 (BE1)** | Meal Engine Service, Claude API integration, nutrition calculator, recipe DB | Python, FastAPI, PostgreSQL, LLM APIs |
| **Backend Engineer 2 (BE2)** | User Service, Pantry Tracker, API Gateway, auth, DB migrations | Node.js/Python, PostgreSQL, Redis, JWT/OAuth |
| **Frontend Engineer 1 (FE1)** | React Native mobile app — onboarding, daily plan view, cart approval, feedback | React Native, TypeScript, mobile UI/UX |
| **Frontend Engineer 2 (FE2)** | Next.js web app (admin + user dashboard), push notifications, PWA | Next.js, React, Tailwind CSS |
| **Platform Engineer (PE1)** | Order Orchestrator, Swiggy MCP adapter, Blinkit Playwright adapter, cart builder | Node.js, Playwright, MCP SDK, browser automation |
| **Platform Engineer (PE2) — optional** | WhatsApp bot (Twilio), Zepto adapter, cook instruction sharing | Node.js, Twilio API, Playwright |
| **DevOps / Part-time** | AWS infrastructure, CI/CD, monitoring, Docker, ECS setup | AWS, Terraform/CDK, Docker, GitHub Actions |

### RACI Matrix (Key Deliverables)

| Deliverable | TL | BE1 | BE2 | FE1 | FE2 | PE1 | PE2 | DevOps |
|-------------|:--:|:---:|:---:|:---:|:---:|:---:|:---:|:------:|
| System Architecture | A | C | C | I | I | C | I | C |
| Meal Engine | C | R | I | I | I | I | I | I |
| Pantry Tracker | C | I | R | I | I | I | I | I |
| User Service + Auth | C | I | R | I | I | I | I | I |
| Order Orchestrator | C | I | I | I | I | R | C | I |
| Mobile App | C | I | I | R | C | I | I | I |
| Web Dashboard | C | I | I | C | R | I | I | I |
| WhatsApp Bot | C | I | I | I | I | C | R | I |
| CI/CD + Infra | C | I | I | I | I | I | I | R |
| Prompt Engineering | R | C | I | I | I | I | I | I |

*R = Responsible, A = Accountable, C = Consulted, I = Informed*

---

## 3. System Design for Scalability & Security

### High-Level Architecture (Simplified for MVP)

```
 Users (Mobile + Web + WhatsApp)
           |
           v
 ┌─────────────────────────┐
 │   API Gateway (Kong)    │  -- Rate limiting, JWT auth, request routing
 │   + CloudFront CDN      │
 └────────────┬────────────┘
              |
    ┌─────────┼──────────┬──────────────┐
    v         v          v              v
 ┌───────┐ ┌────────┐ ┌──────────┐ ┌────────┐
 │ User  │ │ Meal   │ │ Pantry   │ │ Order  │
 │Service│ │ Engine │ │ Tracker  │ │ Orch.  │
 │Node.js│ │ Python │ │ Python   │ │Node.js │
 └───┬───┘ └───┬────┘ └────┬─────┘ └───┬────┘
     |         |           |            |
     v         v           v            v
 ┌──────────────────────────────────────────┐
 │         PostgreSQL (single DB, schemas)  │  -- Shared DB, separate schemas per service
 │         Redis (cache + pub/sub + queues) │  -- Session cache, meal plan cache, job queue
 └──────────────────────────────────────────┘
              |
    ┌─────────┼──────────┬──────────┐
    v         v          v          v
 Claude    Swiggy     Blinkit    Twilio
  API       MCP      Playwright  WhatsApp
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Monolith vs Microservices** | Modular monorepo, deploy as separate containers but share DB | MVP speed. Avoids distributed system complexity. Easy to split later. |
| **Single DB vs DB per service** | Single PostgreSQL DB, separate schemas | Simpler ops, allows cross-service joins for analytics. Isolate via schemas. |
| **Message bus** | Redis Streams (not Kafka) | Simpler ops for <50K users. Switch to Kafka when needed. |
| **API Gateway** | Kong (open-source) on ECS | Rate limiting, auth, logging. Avoid vendor lock-in. |
| **Mobile framework** | React Native (Expo) | Faster dev, single codebase, large India talent pool. |
| **AI model** | Claude Sonnet 4.5 (primary), Haiku 4.5 (lightweight tasks) | Best structured JSON output, prompt caching, MCP-native. |
| **Ordering primary** | Swiggy MCP first | Only platform with live MCP. Playwright fallback for others. |

### Scalability Design Principles

1. **Stateless services** — All services are stateless containers. State lives in PostgreSQL + Redis.
2. **Horizontal scaling** — Add more ECS tasks per service as load grows.
3. **Async processing** — Meal generation, cart building, and notifications are async (Redis queues + Bull).
4. **Cache-first reads** — Daily meal plans cached in Redis (TTL 24h). Pantry state cached (TTL 1h).
5. **Claude API cost control** — Prompt caching (system prompt shared), batch API for overnight generation, Haiku for simple tasks.
6. **Database scaling path** — Read replicas at 50K users. Partition meal_plans by date. Shard by user_id at 200K+.

### Data Flow — Daily Meal Cycle

```
[8:30 AM] CRON triggers via EventBridge
    |
    v
Meal Engine: Load user profile + pantry state + 7-day history
    |
    v
Meal Engine: Call Claude API (Sonnet) with structured prompt
    |
    v
Meal Engine: Parse JSON response, validate nutrition, store plan
    |
    v (Redis pub/sub event: "plan.generated")
    |
Order Orchestrator: Receive ingredient list
    |
    v
Order Orchestrator: Filter through Pantry Tracker (skip stocked items)
    |
    v
Order Orchestrator: Search + build cart on Swiggy MCP
    |
    v (Redis pub/sub event: "cart.ready")
    |
Push Notification + WhatsApp: "Your meals and cart are ready!"
    |
    v
User: Reviews plan + cart in app → taps "Order"
    |
    v
Order Orchestrator: Deep-link to Swiggy app for payment
    |
    v
User: Shares cook instructions via WhatsApp
    |
    v
[Evening] Feedback prompt → User rates meals → stored for next cycle
```

---

## 4. UI/UX Design Philosophy

### Principles

| Principle | Implementation |
|-----------|---------------|
| **Minimal** | Max 5 core screens. No clutter. One primary action per screen. |
| **2-minute daily use** | Morning: see plan → approve cart → done. Evening: rate meals. |
| **Thumb-friendly** | Large tap targets, bottom navigation, swipe gestures. |
| **Modern & clean** | Soft whites, warm accent colors (orange/green for food), rounded cards, subtle shadows. |
| **Progressive disclosure** | Show summary first, details on tap. Don't overwhelm. |
| **Instant feedback** | Skeleton loaders, optimistic UI, haptic feedback on actions. |

### Color Palette

```
Primary:       #FF6B35 (Warm Orange — appetite, energy)
Secondary:     #2EC4B6 (Teal — health, freshness)
Background:    #FAFAFA (Off-white — clean, breathable)
Surface:       #FFFFFF (White cards)
Text Primary:  #1A1A2E (Near-black)
Text Secondary:#6B7280 (Gray)
Success:       #10B981 (Green — nutrition goals met)
Warning:       #F59E0B (Amber — pantry low)
```

### Typography

```
Headings:  Inter (Bold, 600-700)
Body:      Inter (Regular, 400)
Accent:    Inter (Medium, 500)
```

### Core Screens (Mobile App — 5 screens)

```
1. HOME / TODAY'S PLAN
   ┌─────────────────────────────┐
   │  Good morning, Prajwal!     │
   │  ─────────────────────────  │
   │                             │
   │  [Breakfast Card]           │
   │   Masala Oats + Fruit       │
   │   320 cal | 18g protein     │
   │   ▸ View Recipe             │
   │                             │
   │  [Lunch Card]               │
   │   Rajma Chawal + Raita      │
   │   580 cal | 24g protein     │
   │   ▸ View Recipe             │
   │                             │
   │  [Dinner Card]              │
   │   Paneer Tikka + Roti       │
   │   490 cal | 32g protein     │
   │   ▸ View Recipe             │
   │                             │
   │  ─────────────────────────  │
   │  Daily Total: 1390/1800 cal │
   │  Protein: 74/120g           │
   │  ████████████░░░░ 62%       │
   │                             │
   │  ┌─────────────────────┐    │
   │  │  View Cart (8 items)│    │
   │  │      ₹ 342          │    │
   │  └─────────────────────┘    │
   │                             │
   │  [Home] [Pantry] [Profile]  │
   └─────────────────────────────┘

2. CART REVIEW
   ┌─────────────────────────────┐
   │  Today's Grocery Cart       │
   │  via Swiggy Instamart       │
   │  ─────────────────────────  │
   │                             │
   │  FRESH (order daily)        │
   │  ☑ Tomatoes 500g    ₹40    │
   │  ☑ Paneer 200g      ₹89    │
   │  ☑ Coriander bunch   ₹15   │
   │                             │
   │  RESTOCK (running low)      │
   │  ☑ Rajma 500g       ₹85    │
   │  ☑ Oats 400g        ₹120   │
   │                             │
   │  ─────────────────────────  │
   │  Subtotal:          ₹349    │
   │  Coupon: SAVE50     -₹50   │
   │  Total:             ₹299    │
   │                             │
   │  ┌─────────────────────┐    │
   │  │   Order on Swiggy   │    │
   │  └─────────────────────┘    │
   │                             │
   │  [Home] [Pantry] [Profile]  │
   └─────────────────────────────┘

3. RECIPE / COOK VIEW
   ┌─────────────────────────────┐
   │  ← Rajma Chawal             │
   │  ─────────────────────────  │
   │  [For You]  [For Cook]      │
   │                             │
   │  Ingredients:               │
   │  • Rajma - 1 katori (soaked)│
   │  • Onion - 2 medium         │
   │  • Tomato - 3 medium        │
   │  • ...                      │
   │                             │
   │  Steps:                     │
   │  1. Pressure cook rajma     │
   │     (4 whistles)            │
   │  2. Heat oil, add jeera...  │
   │  3. ...                     │
   │                             │
   │  ┌─────────────────────┐    │
   │  │ Share with Cook (WA) │    │
   │  └─────────────────────┘    │
   └─────────────────────────────┘

4. PANTRY VIEW
   ┌─────────────────────────────┐
   │  Your Pantry                │
   │  ─────────────────────────  │
   │                             │
   │  STOCKED ✓                  │
   │  Rice (5kg)     ordered 3d  │
   │  Dal (1kg)      ordered 5d  │
   │  Ghee (500ml)   ordered 7d  │
   │                             │
   │  RUNNING LOW ⚠              │
   │  Oats (400g)    ~2 left    │
   │  Rajma (500g)   ~1 left    │
   │                             │
   │  EMPTY ✕                    │
   │  Quinoa         last: 14d   │
   │                             │
   │  [Home] [Pantry] [Profile]  │
   └─────────────────────────────┘

5. PROFILE / ONBOARDING
   ┌─────────────────────────────┐
   │  Your Profile               │
   │  ─────────────────────────  │
   │                             │
   │  Diet: Vegetarian           │
   │  Goal: Muscle Gain          │
   │  Calories: 1800/day         │
   │  Protein: 120g/day          │
   │                             │
   │  Cuisines: Indian, Med.     │
   │  Allergies: None            │
   │  Cook: Yes (Intermediate)   │
   │  Platform: Swiggy Instamart │
   │                             │
   │  Plan Time: 9:00 AM         │
   │  Plan: Pro (₹299/mo)       │
   │                             │
   │  [Edit Profile]             │
   │  [Manage Subscription]      │
   │  [Delete Account]           │
   │                             │
   │  [Home] [Pantry] [Profile]  │
   └─────────────────────────────┘
```

### Onboarding Flow (5 steps, <3 min)

```
Step 1: "What do you eat?"
  → [Vegetarian] [Eggetarian] [Non-Veg] [Vegan] [Jain]

Step 2: "What's your goal?"
  → [Lose Weight] [Build Muscle] [Stay Healthy] [No Preference]

Step 3: "Quick body stats" (optional, skip-able)
  → Height, Weight, Age, Activity Level
  → Auto-calculate calorie + protein targets

Step 4: "What cuisines do you love?"
  → Multi-select chips: [Indian] [South Indian] [Mediterranean] [Asian] [Continental]

Step 5: "Where should we order groceries?"
  → [Swiggy Instamart] [Blinkit] [Zepto]
  → Set delivery address
  → Set morning alert time (default 9:00 AM)

→ "You're all set! Your first meal plan is being generated..."
```

### WhatsApp UX (Primary Channel for Many Users)

```
Morning (automated):
  MealMate: "Good morning Prajwal! Here's your plan for today:

  Breakfast: Masala Oats + Banana (320 cal, 18g protein)
  Lunch: Rajma Chawal + Raita (580 cal, 24g protein)
  Dinner: Paneer Tikka + 2 Roti (490 cal, 32g protein)

  Daily total: 1390 cal | 74g protein

  Your cart has 8 items (₹299 on Swiggy)
  Reply YES to order, or CHANGE to swap a meal."

  User: "YES"

  MealMate: "Cart confirmed! Open Swiggy to complete payment: [deep link]"

Cook message:
  MealMate → Cook's WhatsApp:
  "Aaj ka lunch: Rajma Chawal
  Saamaan: Rajma 1 katori, Pyaaz 2, Tamatar 3, Adrak, Lahsun, Masale
  Banane ka tarika:
  1. Rajma pressure cooker mein 4 seeti
  2. Pyaaz bhuno, tamatar daalo...
  ..."

Evening:
  MealMate: "How were today's meals?
  Breakfast: 👍 or 👎
  Lunch: 👍 or 👎
  Dinner: 👍 or 👎"
```

---

## 5. Tech Stack Decisions

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Mobile App** | React Native + Expo | SDK 52 | Single codebase, OTA updates, large India dev pool |
| **Web App** | Next.js | 15 | SSR for SEO, shared React components with mobile |
| **UI Library** | NativeWind (mobile), Tailwind CSS (web) | 4.x | Consistent styling, rapid iteration |
| **Component Library** | Custom design system (based on shadcn/ui patterns) | — | Minimal, opinionated, food-themed |
| **Backend (Meal Engine)** | Python + FastAPI | 3.12+ | Best AI/ML ecosystem, Claude SDK, fast async |
| **Backend (User/Order)** | Node.js + Fastify | 20+ | High throughput for API gateway, Playwright compat |
| **Database** | PostgreSQL | 16 | JSONB for flexible schemas, proven reliability |
| **Cache/Queue** | Redis | 7.x | Caching, pub/sub, Bull job queues |
| **AI** | Anthropic Claude API | Sonnet 4.5 / Haiku 4.5 | Best structured output, prompt caching, cost-effective |
| **Browser Automation** | Playwright | Latest | Blinkit/Zepto ordering, reliable cross-browser |
| **WhatsApp** | Twilio WhatsApp API | — | Reliable, good India support, media messages |
| **Auth** | Firebase Auth + JWT | — | Social logins, OTP, free tier generous |
| **Push Notifications** | Firebase Cloud Messaging | — | Cross-platform, free |
| **Cloud** | AWS (ECS Fargate, RDS, ElastiCache, S3) | — | Best India region support, cost-effective |
| **CI/CD** | GitHub Actions | — | Free for open-source, good Docker support |
| **Monitoring** | CloudWatch + Sentry + Grafana | — | Logs, errors, dashboards |
| **IaC** | AWS CDK (TypeScript) | — | Programmatic infra, type-safe |

---

## 6. Monorepo Structure

```
mealmate/
├── apps/
│   ├── mobile/                    # React Native (Expo) app
│   │   ├── app/                   # Expo Router screens
│   │   │   ├── (onboarding)/      # Onboarding flow
│   │   │   ├── (tabs)/            # Main tab navigator
│   │   │   │   ├── index.tsx      # Home / Today's Plan
│   │   │   │   ├── pantry.tsx     # Pantry view
│   │   │   │   └── profile.tsx    # Profile & settings
│   │   │   ├── cart.tsx           # Cart review
│   │   │   └── recipe/[id].tsx    # Recipe detail
│   │   ├── components/            # Shared UI components
│   │   ├── hooks/                 # Custom hooks
│   │   ├── services/              # API client
│   │   └── package.json
│   │
│   ├── web/                       # Next.js web app
│   │   ├── app/                   # App router
│   │   ├── components/
│   │   └── package.json
│   │
│   └── whatsapp-bot/              # WhatsApp bot service
│       ├── src/
│       │   ├── handlers/          # Message handlers
│       │   ├── templates/         # Message templates
│       │   └── twilio.ts          # Twilio client
│       └── package.json
│
├── services/
│   ├── meal-engine/               # Python FastAPI
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── plans.py
│   │   │       ├── recipes.py
│   │   │       └── feedback.py
│   │   ├── core/
│   │   │   ├── planner.py         # Main planning orchestrator
│   │   │   ├── nutrition.py       # IFCT-based calculator
│   │   │   ├── cuisine_rotator.py
│   │   │   └── seasonal.py
│   │   ├── ai/
│   │   │   ├── prompts/           # Prompt templates
│   │   │   ├── claude_client.py   # Anthropic SDK wrapper
│   │   │   └── response_parser.py # JSON validation
│   │   ├── models/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   ├── pantry-tracker/            # Python FastAPI
│   │   ├── api/
│   │   ├── core/
│   │   │   ├── tracker.py         # Pantry intelligence
│   │   │   └── categories.py      # Ingredient categorization
│   │   ├── models/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   ├── order-orchestrator/        # Node.js Fastify
│   │   ├── src/
│   │   │   ├── adapters/
│   │   │   │   ├── swiggy.ts      # Swiggy MCP adapter
│   │   │   │   ├── blinkit.ts     # Blinkit Playwright adapter
│   │   │   │   └── zepto.ts       # Zepto adapter
│   │   │   ├── cart-builder.ts    # Smart cart builder
│   │   │   ├── platform-router.ts # Platform selection logic
│   │   │   └── routes/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── user-service/              # Node.js Fastify
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── users.ts
│       │   │   └── subscriptions.ts
│       │   ├── middleware/
│       │   │   └── auth.ts        # JWT verification
│       │   └── firebase.ts        # Firebase Auth client
│       ├── tests/
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── shared-types/              # TypeScript types shared across services
│   │   ├── src/
│   │   │   ├── meal-plan.ts
│   │   │   ├── user.ts
│   │   │   ├── pantry.ts
│   │   │   └── order.ts
│   │   └── package.json
│   │
│   ├── db/                        # Database migrations & seeds
│   │   ├── migrations/
│   │   ├── seeds/
│   │   │   ├── recipes.sql
│   │   │   ├── ingredient_categories.sql
│   │   │   └── nutrition_db.sql
│   │   └── package.json
│   │
│   └── ui/                        # Shared UI components (web + mobile)
│       ├── src/
│       └── package.json
│
├── infra/                         # AWS CDK infrastructure
│   ├── lib/
│   │   ├── vpc-stack.ts
│   │   ├── database-stack.ts
│   │   ├── ecs-stack.ts
│   │   └── monitoring-stack.ts
│   └── package.json
│
├── docs/
│   ├── PRD-MealMate-AI.md
│   ├── TRD-MealMate-AI.md
│   ├── PLAN-MealMate-AI.md        # This document
│   └── api-contracts/
│       ├── meal-engine.openapi.yaml
│       ├── user-service.openapi.yaml
│       └── order-orchestrator.openapi.yaml
│
├── docker-compose.yml             # Local development
├── turbo.json                     # Turborepo config
├── package.json                   # Root workspace
└── README.md
```

**Package Manager:** pnpm (workspaces)
**Build System:** Turborepo (parallel builds, caching)

---

## 7. Phase-Wise Execution Plan

### Phase 0: Foundation (Week 1-2) — "Walk Before You Run"

**Goal:** Infrastructure, tooling, and core data models ready. Every engineer can run the full stack locally.

| # | Task | Owner | Deliverable |
|---|------|-------|-------------|
| 0.1 | Set up monorepo (pnpm + Turborepo) | TL | Working `turbo dev` command |
| 0.2 | Docker Compose for local dev (Postgres + Redis) | DevOps | `docker-compose up` runs full stack |
| 0.3 | PostgreSQL schema v1 (all tables from TRD) | BE2 | Migration files, seed scripts |
| 0.4 | User Service: auth (Firebase + JWT), profile CRUD | BE2 | Working signup/login/profile APIs |
| 0.5 | Meal Engine: FastAPI scaffold, Claude client wrapper | BE1 | Health check + basic Claude call working |
| 0.6 | React Native (Expo) project setup, navigation skeleton | FE1 | App runs on simulator with tab nav |
| 0.7 | Next.js web app scaffold | FE2 | Landing page + basic dashboard shell |
| 0.8 | CI/CD: GitHub Actions (lint, test, build, Docker) | DevOps | PRs run checks automatically |
| 0.9 | AWS CDK: VPC, RDS, ElastiCache, ECS cluster | DevOps | Staging environment live |
| 0.10 | Shared types package | TL | `@mealmate/types` published to workspace |

**Exit Criteria:** Every engineer can clone repo, run `docker-compose up`, and hit APIs locally.

---

### Phase 1: Meal Intelligence (Week 3-4) — "The Brain"

**Goal:** AI generates valid, personalized, nutritious meal plans daily.

| # | Task | Owner | Deliverable |
|---|------|-------|-------------|
| 1.1 | Claude prompt engineering — meal plan system prompt | TL + BE1 | Prompt that generates valid JSON 99%+ of the time |
| 1.2 | Response parser + validator (Pydantic models) | BE1 | Validates every AI response against schema |
| 1.3 | Nutrition calculator (IFCT database) | BE1 | Per-meal and daily nutrition breakdown |
| 1.4 | Cuisine rotation algorithm | BE1 | No repeats within 7 days |
| 1.5 | Recipe seed database (500+ Indian recipes) | BE1 | JSON seed file + import script |
| 1.6 | Meal plan generation API (POST /plans/generate) | BE1 | E2E: profile in → plan out |
| 1.7 | Meal plan retrieval API (GET /plans/today) | BE1 | Returns today's plan with nutrition |
| 1.8 | Meal swap API (POST /plans/:id/swap/:meal) | BE1 | Regenerate single meal |
| 1.9 | Feedback API (POST /plans/:id/feedback) | BE2 | Store ratings, pass to next plan cycle |
| 1.10 | CRON job for morning plan generation | BE1 + DevOps | EventBridge triggers at user's set time |

**Exit Criteria:** Given a user profile, the system generates a valid 3-meal plan with accurate nutrition, no repeats, and cuisine variety. Swappable meals. Feedback stored.

---

### Phase 2: Pantry Intelligence (Week 5-6) — "The Memory"

**Goal:** System tracks what users have, avoids over-ordering, smartly restocks.

| # | Task | Owner | Deliverable |
|---|------|-------|-------------|
| 2.1 | Pantry Tracker service scaffold | BE2 | FastAPI service with health check |
| 2.2 | Ingredient categorization engine (fresh/pantry/staple) | BE2 | Rules-based + LLM fallback categorizer |
| 2.3 | Pantry state CRUD APIs | BE2 | GET/PUT /pantry endpoints |
| 2.4 | Smart reorder algorithm (from TRD) | BE2 | should_reorder() logic with all rules |
| 2.5 | Usage tracking — deduct from pantry on plan execution | BE2 | Auto-update pantry when user approves plan |
| 2.6 | Proactive restock check-ins (weekly) | BE2 | "Do you still have X?" prompt logic |
| 2.7 | Integrate pantry state into Meal Engine | BE1 + BE2 | Plans use pantry-aware ingredients |
| 2.8 | Kitchen staples list (never order) | BE2 | Seed data for common Indian staples |

**Exit Criteria:** Day 1 orders everything. Day 2+ only orders fresh + depleted items. Never orders salt/turmeric/atta. Learns consumption patterns over time.

---

### Phase 3: Order Execution (Week 7-8) — "The Hands"

**Goal:** System builds a cart on Swiggy/Blinkit, user confirms with one tap.

| # | Task | Owner | Deliverable |
|---|------|-------|-------------|
| 3.1 | Order Orchestrator service scaffold | PE1 | Fastify service with health check |
| 3.2 | Platform adapter interface (TypeScript) | PE1 | IGroceryPlatformAdapter interface |
| 3.3 | Swiggy Instamart MCP adapter | PE1 | Search, add-to-cart, view-cart working |
| 3.4 | Blinkit Playwright adapter | PE1 | Search, add-to-cart via browser automation |
| 3.5 | Smart Cart Builder | PE1 | Dedup, best-value selection, substitution |
| 3.6 | Platform router (preference + fallback) | PE1 | Try Swiggy → fall back to Blinkit |
| 3.7 | Cart summary API (GET /orders/cart) | PE1 | Itemized cart with pricing |
| 3.8 | Order approval API (PUT /orders/approve) | PE1 | Generates deep-link / checkout URL |
| 3.9 | Coupon detection + auto-apply | PE1 | Find and apply best available coupon |
| 3.10 | Substitution flow (unavailable items) | PE1 + BE1 | AI suggests substitute → re-search |

**Exit Criteria:** Given a meal plan's ingredient list, system builds a ready-to-order cart on Swiggy with pricing, applies coupons, handles unavailable items, and generates a checkout link. Blinkit works as fallback.

---

### Phase 4: User Experience (Week 9-10) — "The Face"

**Goal:** Beautiful, minimal mobile app. Complete daily flow in <2 minutes.

| # | Task | Owner | Deliverable |
|---|------|-------|-------------|
| 4.1 | Onboarding flow (5 steps) | FE1 | Animated, skip-able, stores profile |
| 4.2 | Home screen — Today's Plan | FE1 | 3 meal cards with nutrition, daily total |
| 4.3 | Cart review screen | FE1 | Item list, pricing, one-tap order |
| 4.4 | Recipe detail / Cook instructions view | FE1 | "For You" and "For Cook" tabs |
| 4.5 | Pantry screen | FE1 | Stocked / Low / Empty sections |
| 4.6 | Profile & settings screen | FE1 | Edit preferences, subscription, logout |
| 4.7 | Push notifications (FCM) | FE2 | Morning plan, cart ready, evening feedback |
| 4.8 | Feedback modal (evening prompt) | FE1 | Thumbs up/down per meal + text |
| 4.9 | WhatsApp bot — morning plan message | PE2 | Auto-send plan at configured time |
| 4.10 | WhatsApp bot — cart approval flow | PE2 | Reply "YES" to order |
| 4.11 | WhatsApp bot — cook instructions sharing | PE2 | Hindi instructions via WhatsApp |
| 4.12 | Web dashboard (basic) | FE2 | View plan, past history, profile edit |
| 4.13 | Deep-link to Swiggy/Blinkit app | FE1 + PE1 | Seamless handoff to platform's cart |

**Exit Criteria:** User can complete full daily flow (see plan → order → share with cook → give feedback) in <2 minutes on mobile. WhatsApp works as alternative channel.

---

### Phase 5: Beta & Iterate (Week 11-12) — "The Test"

**Goal:** 100 real users, collect feedback, fix issues, prepare for public beta.

| # | Task | Owner | Deliverable |
|---|------|-------|-------------|
| 5.1 | Deploy to production (AWS) | DevOps | All services running on ECS Fargate |
| 5.2 | Monitoring dashboards (Grafana) | DevOps | Meal Engine, Order, Platform health |
| 5.3 | Error alerting (Sentry + PagerDuty) | DevOps | Alerts for critical failures |
| 5.4 | Closed beta: 100 users (invite-only) | TL + All | Recruit from fitness communities |
| 5.5 | Daily bug triage + fix | All | <24h fix for P0 bugs |
| 5.6 | User interviews (10 users) | TL | Qualitative feedback |
| 5.7 | Analytics integration (Mixpanel/Amplitude) | FE2 | Track key events (plan viewed, cart approved, etc.) |
| 5.8 | Performance optimization | All | API latency <500ms P95 |
| 5.9 | Security audit | TL + DevOps | OWASP top 10 check, pen test |
| 5.10 | Public beta launch prep | TL | App Store / Play Store submission |

**Exit Criteria:** 100 users using daily for 2 weeks. NPS > 40. Critical bugs fixed. App Store approved.

---

## 8. Sprint Breakdown with Team Assignments

### Sprint Calendar (12 weeks)

```
Week  1-2:  ████ Phase 0 — Foundation
Week  3-4:  ████ Phase 1 — Meal Intelligence
Week  5-6:  ████ Phase 2 — Pantry Intelligence
Week  7-8:  ████ Phase 3 — Order Execution
Week  9-10: ████ Phase 4 — User Experience
Week 11-12: ████ Phase 5 — Beta & Iterate
```

### Parallel Workstreams

```
        Week 1  Week 2  Week 3  Week 4  Week 5  Week 6  Week 7  Week 8  Week 9  Week 10  Week 11  Week 12
TL      [------ Foundation + Prompts ------][-- Review --][-- Review --][- Review -][-- Beta --]
BE1     [- Setup -][-------- Meal Engine --------][- Pantry Integration -][-- Polish --][-- Bugs --]
BE2     [- DB + Auth -----][-- User APIs --][------ Pantry Tracker ------][-- Polish --][-- Bugs --]
FE1     [- RN Setup -][-- UI Components --][-- Onboarding --][-------- All Screens --------][-- Bugs --]
FE2     [- Next.js -][-- Web Shell ---][-- Notifications ---][-- Web Dashboard --][- Analytics -][-- Bugs --]
PE1     [- Setup -][-- MCP Research --][---------- Order Orchestrator ----------][-- Polish --][-- Bugs --]
PE2     [---------- WhatsApp Research ----------][---------- WhatsApp Bot ----------][-- Bugs --]
DevOps  [---- Infra + CI/CD ----][-- Staging --][-- Monitoring --][--- Production ---][-- Scale --]
```

### Sprint 1 (Week 1-2) — Foundation

**Sprint Goal:** Full local dev environment, core APIs scaffold, CI/CD pipeline.

| Task | Assignee | Story Points | Priority |
|------|----------|:------------:|:--------:|
| Monorepo setup (pnpm + Turborepo) | TL | 3 | P0 |
| Docker Compose (Postgres 16 + Redis 7) | DevOps | 3 | P0 |
| PostgreSQL schema v1 + migrations | BE2 | 5 | P0 |
| User Service: Firebase Auth + JWT middleware | BE2 | 5 | P0 |
| User Service: Profile CRUD APIs | BE2 | 3 | P0 |
| Meal Engine: FastAPI scaffold + health check | BE1 | 3 | P0 |
| Meal Engine: Claude client wrapper (Anthropic SDK) | BE1 | 3 | P0 |
| React Native (Expo) project + navigation | FE1 | 5 | P0 |
| Next.js project + Tailwind setup | FE2 | 3 | P1 |
| Shared types package (@mealmate/types) | TL | 2 | P0 |
| GitHub Actions: lint + test + build | DevOps | 3 | P0 |
| AWS CDK: VPC + RDS + ElastiCache + ECS cluster | DevOps | 8 | P0 |
| **Total** | | **46** | |

### Sprint 2 (Week 3-4) — Meal Intelligence

**Sprint Goal:** AI generates valid, diverse, nutritious meal plans.

| Task | Assignee | Story Points | Priority |
|------|----------|:------------:|:--------:|
| Claude system prompt — meal plan generation | TL + BE1 | 8 | P0 |
| Response parser + Pydantic validation | BE1 | 5 | P0 |
| Nutrition calculator (IFCT data) | BE1 | 5 | P0 |
| Cuisine rotation algorithm | BE1 | 3 | P0 |
| Recipe seed database (500+ recipes JSON) | BE1 | 5 | P1 |
| Plan generation API (POST /plans/generate) | BE1 | 5 | P0 |
| Plan retrieval API (GET /plans/today) | BE1 | 2 | P0 |
| Meal swap API | BE1 | 3 | P1 |
| Feedback API | BE2 | 3 | P0 |
| CRON job setup (EventBridge) | BE1 + DevOps | 3 | P0 |
| Mobile: Design system (colors, typography, cards) | FE1 | 5 | P0 |
| Mobile: API client + auth integration | FE1 | 3 | P0 |
| Web: Landing page | FE2 | 5 | P1 |
| Order Orchestrator: Swiggy MCP research + spike | PE1 | 5 | P0 |
| **Total** | | **60** | |

### Sprint 3 (Week 5-6) — Pantry Intelligence

**Sprint Goal:** Pantry tracking prevents over-ordering, enables smart restocking.

| Task | Assignee | Story Points | Priority |
|------|----------|:------------:|:--------:|
| Pantry Tracker: FastAPI scaffold | BE2 | 3 | P0 |
| Ingredient categorization engine | BE2 | 5 | P0 |
| Pantry CRUD APIs | BE2 | 3 | P0 |
| Smart reorder algorithm | BE2 | 8 | P0 |
| Usage tracking + deduction logic | BE2 | 5 | P0 |
| Kitchen staples seed data | BE2 | 2 | P0 |
| Integrate pantry into Meal Engine | BE1 + BE2 | 5 | P0 |
| Proactive restock check-ins | BE2 | 3 | P1 |
| Mobile: Onboarding flow (5 steps) | FE1 | 8 | P0 |
| Mobile: Home screen — meal cards | FE1 | 5 | P0 |
| Web: Auth flow (login/signup) | FE2 | 3 | P0 |
| WhatsApp: Twilio setup + message templates | PE2 | 5 | P0 |
| **Total** | | **55** | |

### Sprint 4 (Week 7-8) — Order Execution

**Sprint Goal:** Cart auto-built from meal plan, one-tap order on Swiggy.

| Task | Assignee | Story Points | Priority |
|------|----------|:------------:|:--------:|
| Platform adapter interface | PE1 | 3 | P0 |
| Swiggy MCP adapter (search, cart, view) | PE1 | 8 | P0 |
| Blinkit Playwright adapter | PE1 | 8 | P0 |
| Smart Cart Builder (dedup, value, substitution) | PE1 | 8 | P0 |
| Platform router (preference + fallback) | PE1 | 3 | P0 |
| Cart summary + approval APIs | PE1 | 5 | P0 |
| Coupon detection | PE1 | 3 | P1 |
| Substitution flow (AI-powered) | PE1 + BE1 | 5 | P1 |
| Mobile: Cart review screen | FE1 | 5 | P0 |
| Mobile: Recipe detail / Cook view | FE1 | 5 | P0 |
| Web: Dashboard — view today's plan | FE2 | 5 | P1 |
| WhatsApp: Morning plan message | PE2 | 5 | P0 |
| WhatsApp: Cart approval ("YES" to order) | PE2 | 5 | P0 |
| **Total** | | **68** | |

### Sprint 5 (Week 9-10) — User Experience + Integration

**Sprint Goal:** Complete end-to-end flow. All screens done. WhatsApp bot working.

| Task | Assignee | Story Points | Priority |
|------|----------|:------------:|:--------:|
| Mobile: Pantry screen | FE1 | 5 | P0 |
| Mobile: Profile & settings | FE1 | 5 | P0 |
| Mobile: Feedback modal | FE1 | 3 | P0 |
| Mobile: Push notifications (FCM) | FE2 | 5 | P0 |
| Mobile: Deep-link to Swiggy/Blinkit | FE1 + PE1 | 3 | P0 |
| WhatsApp: Cook instructions (Hindi) | PE2 | 5 | P0 |
| WhatsApp: Evening feedback flow | PE2 | 3 | P1 |
| Web: Past plans history | FE2 | 3 | P1 |
| E2E integration testing | All | 8 | P0 |
| Performance tuning (API <500ms P95) | BE1 + BE2 | 5 | P0 |
| Security hardening (input validation, rate limits) | TL + BE2 | 5 | P0 |
| **Total** | | **50** | |

### Sprint 6 (Week 11-12) — Beta & Polish

**Sprint Goal:** 100 real users. Fix bugs. Prepare for public launch.

| Task | Assignee | Story Points | Priority |
|------|----------|:------------:|:--------:|
| Production deployment (AWS) | DevOps | 8 | P0 |
| Monitoring dashboards (Grafana) | DevOps | 5 | P0 |
| Error alerting (Sentry) | DevOps | 3 | P0 |
| Beta user recruitment (100 users) | TL | 3 | P0 |
| Bug triage + fix (daily) | All | 13 | P0 |
| User interviews (10 users) | TL | 3 | P0 |
| Analytics (Mixpanel) | FE2 | 5 | P1 |
| App Store / Play Store submission | FE1 | 3 | P0 |
| Security audit (OWASP) | TL + DevOps | 5 | P0 |
| Documentation (API docs, README) | All | 3 | P1 |
| **Total** | | **51** | |

---

## 9. API Contract & Service Communication

### Inter-Service Communication

```
User Service  ←→  Meal Engine      : REST (sync) — profile lookup for plan generation
Meal Engine   ←→  Pantry Tracker   : REST (sync) — pantry state for ingredient filtering
Meal Engine    →  Order Orchestrator: Redis pub/sub (async) — "plan.generated" event
Order Orch.   ←→  Pantry Tracker   : REST (sync) — reorder decisions
Order Orch.    →  User Service     : Redis pub/sub (async) — "cart.ready" notification
User Service   →  WhatsApp Bot     : Redis pub/sub (async) — "send.notification" event
```

### Event Schema (Redis Streams)

```json
// plan.generated
{
  "event": "plan.generated",
  "user_id": "uuid",
  "plan_id": "uuid",
  "plan_date": "2026-03-07",
  "grocery_needed": [...],
  "timestamp": "ISO8601"
}

// cart.ready
{
  "event": "cart.ready",
  "user_id": "uuid",
  "order_id": "uuid",
  "platform": "swiggy_instamart",
  "item_count": 8,
  "total": 299,
  "checkout_url": "swiggy://...",
  "timestamp": "ISO8601"
}

// send.notification
{
  "event": "send.notification",
  "user_id": "uuid",
  "channel": "push|whatsapp|both",
  "template": "morning_plan|cart_ready|evening_feedback",
  "data": {...},
  "timestamp": "ISO8601"
}
```

### API Authentication

All APIs require `Authorization: Bearer <jwt_token>` header.

```
JWT Payload:
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "plan": "pro|free|family",
  "iat": 1709827200,
  "exp": 1709828100  // 15 min
}

Refresh token: 7-day validity, stored in httpOnly cookie.
```

---

## 10. Database Design & Migration Strategy

### Schema Organization

```sql
-- Separate schemas for logical isolation
CREATE SCHEMA auth;      -- users, sessions, tokens
CREATE SCHEMA meals;     -- meal_plans, recipes, feedback
CREATE SCHEMA pantry;    -- pantry_items, usage_log, categories
CREATE SCHEMA orders;    -- grocery_orders, cart_items
```

### Migration Strategy

- Tool: **golang-migrate** (language-agnostic, simple)
- Naming: `YYYYMMDDHHMMSS_description.up.sql` / `.down.sql`
- Every migration is reversible (has a down migration)
- Run in CI before deployment
- Never modify existing migrations — always create new ones

### Indexing Strategy

```sql
-- High-frequency queries
CREATE INDEX idx_meal_plans_user_date ON meals.meal_plans(user_id, plan_date DESC);
CREATE INDEX idx_pantry_items_user ON pantry.pantry_items(user_id, status);
CREATE INDEX idx_feedback_user ON meals.meal_feedback(user_id, created_at DESC);
CREATE INDEX idx_orders_user ON orders.grocery_orders(user_id, created_at DESC);
```

---

## 11. Security Architecture

### Defense in Depth

```
Layer 1: Network        → VPC, private subnets, security groups, no public DB
Layer 2: API Gateway    → Rate limiting (100 req/min/user), IP allowlisting (optional)
Layer 3: Authentication → Firebase Auth + JWT (15-min expiry) + refresh tokens
Layer 4: Authorization  → Role-based (free/pro/family), subscription checks on endpoints
Layer 5: Input          → Pydantic/Zod validation on all inputs, SQL parameterization
Layer 6: Data           → AES-256 encryption at rest (RDS), TLS 1.3 in transit
Layer 7: Secrets        → AWS Secrets Manager for API keys, platform tokens
Layer 8: Monitoring     → Sentry for errors, CloudWatch for anomalies, audit log
```

### Specific Security Measures

| Threat | Mitigation |
|--------|------------|
| **Stolen JWT** | 15-min expiry, refresh via httpOnly cookie, token rotation |
| **Platform credential theft** | Swiggy/Blinkit sessions in Secrets Manager, encrypted, per-user isolation |
| **AI prompt injection** | Claude response validated against strict JSON schema; no user input in system prompt |
| **Playwright session hijack** | Isolated browser contexts per user, session destroyed after use |
| **IDOR (accessing other user's data)** | All queries scoped to `user_id` from JWT, never from request params |
| **DDoS** | CloudFront + WAF, API Gateway rate limiting, Redis-backed throttle |
| **Data breach** | Minimal PII storage, no payment data, encryption at rest, audit logs |
| **Dependency vulnerabilities** | Dependabot, `pnpm audit` in CI, weekly security scans |

### Data Classification

| Data Type | Classification | Storage | Retention |
|-----------|---------------|---------|-----------|
| Email, Phone, Name | PII | Encrypted in RDS | Until account deletion |
| Body stats (height, weight) | Sensitive PII | Encrypted in RDS | Until account deletion |
| Meal plans | User data | RDS (JSONB) | 1 year rolling |
| Feedback | User data | RDS | 1 year rolling |
| Platform session tokens | Secret | AWS Secrets Manager | 24h rotation |
| Order history | User data | RDS | 2 years |
| Claude API prompts/responses | System data | Not stored (ephemeral) | — |

---

## 12. Scalability Playbook

### 0-10K Users (MVP)

```
ECS Fargate:
  - Meal Engine: 2 tasks (0.5 vCPU, 1GB each)
  - Pantry Tracker: 1 task (0.25 vCPU, 512MB)
  - Order Orchestrator: 2 tasks (0.5 vCPU, 1GB) — needs more for Playwright
  - User Service: 1 task (0.25 vCPU, 512MB)
  - WhatsApp Bot: 1 task (0.25 vCPU, 512MB)

RDS: db.t4g.medium (2 vCPU, 4GB RAM)
Redis: cache.t4g.small (1.5GB)

Claude API: ~10K calls/day (Sonnet) + ~5K calls/day (Haiku)
Est. cost: $1,500/month
```

### 10K-50K Users

```
Changes:
  - ECS auto-scaling (CPU target 60%)
  - RDS: db.r6g.large + 1 read replica
  - Redis: cache.r6g.large (cluster mode)
  - Claude: Batch API for overnight generation (50% cost saving)
  - Prompt caching enabled (90% saving on system prompts)
  - Playwright pool: 5 persistent instances

Est. cost: $4,000/month
```

### 50K-200K Users

```
Changes:
  - Multi-AZ deployment
  - RDS: db.r6g.xlarge + 2 read replicas
  - Dedicated Playwright cluster (10 instances)
  - CDN caching for recipe images/static
  - Database partitioning (meal_plans by month)
  - Background job prioritization (paying users first)

Est. cost: $12,000/month
```

### Key Scaling Bottlenecks & Solutions

| Bottleneck | When | Solution |
|-----------|------|----------|
| Claude API rate limits | 10K+ concurrent morning requests | Stagger generation (8:00-9:00 AM window), batch API |
| Playwright browser instances | 5K+ daily orders via Blinkit | Dedicated browser pool, session reuse, official API partnership |
| PostgreSQL connections | 50K+ users | PgBouncer connection pooling, read replicas |
| Redis memory | 100K+ cached plans | TTL management, eviction policies, cluster mode |
| Morning traffic spike | All users get plans at 9 AM | Spread generation over 30-min window based on user timezone |

---

## 13. CI/CD & DevOps

### Pipeline

```
PR Created
    |
    v
┌────────────────────────┐
│ GitHub Actions Pipeline │
│                        │
│ 1. Lint (ESLint +      │
│    Ruff + Prettier)    │ ──→ Fail fast
│ 2. Type Check (tsc +   │
│    mypy)               │ ──→ Fail fast
│ 3. Unit Tests (Jest +  │
│    pytest)             │ ──→ Fail fast
│ 4. Build Docker images │
│ 5. Integration Tests   │
│    (docker-compose)    │
└────────┬───────────────┘
         |
    PR Merged to main
         |
         v
┌────────────────────────┐
│ Deploy to Staging       │
│ (auto, every merge)    │
│                        │
│ 1. Build + push to ECR │
│ 2. ECS service update  │
│ 3. Run E2E smoke tests │
│ 4. Notify Slack        │
└────────┬───────────────┘
         |
    Manual approval
         |
         v
┌────────────────────────┐
│ Deploy to Production   │
│ (manual trigger)       │
│                        │
│ 1. Blue-green deploy   │
│ 2. Health check        │
│ 3. Canary (10% traffic)│
│ 4. Full rollout        │
│ 5. Notify Slack        │
└────────────────────────┘
```

### Environment Strategy

| Environment | Purpose | URL | Deploy Trigger |
|-------------|---------|-----|---------------|
| **Local** | Development | localhost:3000/8000 | Manual |
| **Staging** | QA + integration testing | staging.mealmate.app | Auto on merge to `main` |
| **Production** | Live users | app.mealmate.app | Manual approval |

### Branch Strategy

```
main (protected)
  ├── feature/meal-engine-prompts     (BE1)
  ├── feature/pantry-tracker          (BE2)
  ├── feature/mobile-onboarding       (FE1)
  ├── feature/swiggy-mcp-adapter      (PE1)
  └── fix/cart-builder-dedup          (PE1)

Rules:
  - All PRs require 1 approval
  - CI must pass
  - Squash merge only
  - No direct push to main
```

---

## 14. Testing Strategy

### Testing Pyramid

```
         ╱╲
        ╱  ╲        E2E Tests (10%)
       ╱ E2E╲       Full flows: plan → cart → order
      ╱──────╲      Tools: Playwright, Detox (mobile)
     ╱        ╲
    ╱Integration╲   Integration Tests (30%)
   ╱────────────╲   API endpoints, DB operations, service-to-service
  ╱              ╲  Tools: pytest + httpx, supertest
 ╱  Unit Tests    ╲  Unit Tests (60%)
╱──────────────────╲ Business logic, algorithms, parsers
                     Tools: pytest, Jest, vitest
```

### Critical Test Scenarios

| Scenario | Type | Priority |
|----------|------|----------|
| Claude returns valid JSON for 50 diverse user profiles | Unit + Integration | P0 |
| Claude returns malformed JSON — graceful fallback | Unit | P0 |
| Pantry reorder algorithm: fresh/pantry/staple classification | Unit | P0 |
| Cart builder: deduplication across 3 meals | Unit | P0 |
| Cart builder: handles 3/5 items unavailable | Unit | P0 |
| Full flow: new user → onboard → plan → cart → order | E2E | P0 |
| Swiggy MCP: search returns results, add to cart works | Integration (mocked) | P0 |
| Blinkit Playwright: search + add to cart | Integration | P1 |
| JWT auth: expired token returns 401, refresh works | Integration | P0 |
| Rate limiting: 101st request in 1 min returns 429 | Integration | P0 |
| No cuisine repeat within 7 days | Unit | P0 |
| Nutrition totals match individual meals | Unit | P0 |

### AI Output Testing

```python
# Custom validator for Claude responses
def test_meal_plan_schema():
    """Every field present, types correct, nutrition sane"""
    plan = generate_meal_plan(test_user_profile)
    assert len(plan.meals) == 3
    assert all(m.type in ["breakfast", "lunch", "dinner"] for m in plan.meals)
    assert all(0 < m.nutrition.calories < 2000 for m in plan.meals)
    assert all(0 < m.nutrition.protein_g < 200 for m in plan.meals)
    assert plan.daily_totals.calories == sum(m.nutrition.calories for m in plan.meals)

def test_no_repeat_meals():
    """7 consecutive days should have no repeated meal names"""
    plans = [generate_meal_plan(test_user, day=i) for i in range(7)]
    all_names = [m.name for p in plans for m in p.meals]
    assert len(all_names) == len(set(all_names))

def test_dietary_compliance():
    """Vegetarian user should never get non-veg meals"""
    veg_user = create_profile(diet_type="vegetarian")
    plan = generate_meal_plan(veg_user)
    NON_VEG = ["chicken", "mutton", "fish", "egg", "prawn", "pork"]
    for meal in plan.meals:
        for ingredient in meal.ingredients:
            assert not any(nv in ingredient.name.lower() for nv in NON_VEG)
```

---

## 15. Risk Register & Contingency Plans

| # | Risk | Probability | Impact | Mitigation | Contingency |
|---|------|:-----------:|:------:|-----------|-------------|
| R1 | Swiggy MCP breaks or changes | Medium | High | Abstract behind adapter interface; version-pin | Switch to Playwright automation within 24h |
| R2 | Claude API outage during morning rush | Low | Critical | Retry with exponential backoff; pre-generate plans overnight | Serve cached plan from previous similar day |
| R3 | Claude returns invalid JSON | Medium | Medium | Pydantic validation + retry (up to 3 times) | Fallback to template-based plan from recipe DB |
| R4 | Blinkit blocks Playwright automation | High | Medium | Rotate user agents, realistic delays, proxy rotation | Deprioritize Blinkit; focus on Swiggy MCP |
| R5 | User doesn't trust AI with groceries | Medium | High | "Review before order" — never auto-checkout | Add manual edit capability to every cart item |
| R6 | Morning spike overwhelms DB | Medium | High | Connection pooling (PgBouncer), read replica | Stagger plan generation over 1-hour window |
| R7 | Recipe suggestions are repetitive | Medium | Medium | Cuisine rotation algorithm, 500+ recipe seed | Allow user to "shuffle" / request specific cuisine |
| R8 | Key engineer leaves mid-sprint | Low | High | Code reviews, documentation, pair programming | RACI ensures 2 people know each component |
| R9 | App Store rejection | Low | Medium | Follow guidelines strictly, no private APIs | Launch as PWA first, resubmit app |
| R10 | Firebase Auth free tier exceeded | Low | Low | Monitor usage | Migrate to Supabase Auth or self-hosted |

---

## 16. Definition of Done

A task is "Done" when:

- [ ] Code is written and follows project conventions
- [ ] Unit tests pass (>80% coverage for new code)
- [ ] Integration tests pass (if applicable)
- [ ] PR approved by at least 1 reviewer
- [ ] CI pipeline passes (lint + type check + tests + build)
- [ ] No P0/P1 bugs introduced
- [ ] API changes documented in OpenAPI spec
- [ ] Database migration is reversible
- [ ] Feature works on both iOS and Android (if mobile)
- [ ] Deployed to staging and manually verified

---

## 17. Communication & Rituals

### Daily

| Ritual | Time | Duration | Participants | Format |
|--------|------|----------|-------------|--------|
| Standup | 10:00 AM | 15 min | All | Slack thread or quick call — blockers only |

### Weekly

| Ritual | Day | Duration | Participants | Format |
|--------|-----|----------|-------------|--------|
| Sprint Planning | Monday | 1 hr | All | Plan the week's tasks |
| Tech Review | Wednesday | 30 min | TL + Engineers | Architecture decisions, code review patterns |
| Demo | Friday | 30 min | All + stakeholders | Show what shipped this week |
| Retro | Friday (biweekly) | 30 min | All | What worked, what didn't, action items |

### Tools

| Purpose | Tool |
|---------|------|
| Code | GitHub (monorepo) |
| Project management | Linear (issues, sprints, roadmap) |
| Communication | Slack (channels: #mealmate-general, #mealmate-eng, #mealmate-alerts) |
| Documentation | Notion or repo /docs |
| Design | Figma (UI/UX mockups) |
| Monitoring | Grafana dashboards |
| Incidents | PagerDuty (on-call rotation after beta) |

### Slack Channels

```
#mealmate-general     — Team-wide updates, announcements
#mealmate-eng         — Technical discussions, PR reviews
#mealmate-alerts      — Automated: CI failures, deploy notifications, error spikes
#mealmate-beta        — Beta user feedback, bug reports
```

---

## Appendix A: Key Milestones & Go/No-Go Criteria

| Milestone | Date | Go Criteria |
|-----------|------|-------------|
| **M1: Local E2E** | End of Week 4 | Can generate meal plan via API, see it in mobile app |
| **M2: Smart Ordering** | End of Week 8 | Plan → cart on Swiggy in <30 seconds, pantry-aware |
| **M3: Closed Beta** | End of Week 10 | 100 users invited, full flow working, monitoring live |
| **M4: Public Beta** | End of Week 12 | App Store approved, 500 user target, NPS > 40 |

---

## Appendix B: Open Decisions (Resolve by Week 2)

| # | Decision | Options | Owner | Deadline |
|---|----------|---------|-------|----------|
| D1 | WhatsApp as primary or secondary channel? | Primary (WhatsApp-first) vs Secondary (app-first) | TL | Week 1 |
| D2 | Hindi cook instructions from Day 1? | Yes (increases scope) vs English only for MVP | TL | Week 1 |
| D3 | Subscription enforcement in MVP? | Hard paywall vs fully free beta | TL | Week 2 |
| D4 | Single platform or multi-platform from Day 1? | Swiggy only vs Swiggy + Blinkit | TL + PE1 | Week 2 |
| D5 | Expo managed vs bare workflow? | Managed (simpler) vs Bare (more control) | FE1 | Week 1 |

---

*This is a living document. Last updated: March 7, 2026.*
