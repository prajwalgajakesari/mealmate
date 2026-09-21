# MealMate AI

**An AI kitchen manager for Indian households: it plans your meals, checks your pantry, builds the grocery cart, and briefs your cook over WhatsApp.**

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-52-000020?style=flat-square&logo=expo&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-4-000000?style=flat-square&logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)
![AWS CDK](https://img.shields.io/badge/AWS_CDK-2-FF9900?style=flat-square&logo=amazonwebservices&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## What is MealMate

Most meal planning apps stop at a grocery list. MealMate is built to close the loop. Every day it generates three personalised meals with Claude, works out which ingredients you already have, builds a grocery cart on an Indian quick-commerce platform, and sends the plan, the cart, and cook-friendly instructions to you over WhatsApp. It is aimed at urban Indian professionals who track health goals, already use Swiggy Instamart or Blinkit, and often rely on a household cook.

The product brief lives in [PRD-MealMate-AI.md](PRD-MealMate-AI.md). The technical design is in [TRD-MealMate-AI.md](TRD-MealMate-AI.md).

## Features

Everything below exists in the code today. See [Status](#status) for what is still mocked or unfinished.

- **AI daily meal plans.** The meal engine calls Claude through the Anthropic SDK with prompt caching and JSON retry. Plans respect diet type, allergies, cuisine preferences, and calorie and macro targets.
- **Nutrition targets.** Calories and macros are derived from body stats and activity level using the Mifflin-St Jeor equation, with different macro splits for muscle gain, weight loss, maintenance, and general health.
- **Cuisine rotation.** A seven-day window caps how often a cuisine or a specific recipe can repeat, with seasonal ingredient suggestions.
- **Meal swaps and feedback.** Any meal in a plan can be swapped for an alternative. Users can rate meals, and feedback is stored per plan.
- **Pantry tracking with reorder rules.** Staples such as salt and atta are never reordered. Fresh items are always ordered when a plan needs them. Other pantry items are reordered based on estimated servings left and the usual reorder interval.
- **Cart building.** The order orchestrator turns the plan's shopping list into a cart, checks it against the pantry, applies delivery fee and free-delivery thresholds, and waits for approval.
- **WhatsApp interface.** A Twilio webhook accepts YES or ORDER to approve a cart, CHANGE to request a swap, a thumbs up or down or a 1 to 5 rating for feedback, and free text as a comment. Outgoing templates cover the morning plan, cart ready, cook instructions, evening feedback, and order confirmation. Replies are in Hinglish.
- **Event-driven services.** Services publish and consume events such as `plan.generated` and `cart.ready` on a Redis Stream.
- **Auth and profiles.** Clients sign in with Firebase. The user service verifies the Firebase ID token and issues its own JWT access and refresh tokens. Profile, dietary, and goal endpoints feed the planner.
- **Web dashboard.** A Next.js landing page and dashboard with today's meals, pantry, history, and profile pages.
- **Mobile app.** An Expo app with an onboarding flow (diet, goals, body stats, cuisines, platform), Home, Pantry, and Profile tabs, a cart screen, and recipe detail.
- **Cloud infrastructure as code.** AWS CDK stacks for the VPC, RDS PostgreSQL, ElastiCache Redis, ECS Fargate services behind an ALB, and CloudWatch dashboards and alarms.

## Architecture

```
  Mobile (Expo)      Web (Next.js)      WhatsApp (Twilio)
        \                 |                   /
         \                |                  /
          v               v                 v
   +-------------+  +-------------+  +--------------------+  +----------------+
   | user-service|  | meal-engine |  | order-orchestrator |  | pantry-tracker |
   | Fastify/TS  |  | FastAPI/Py  |  | Fastify/TS         |  | FastAPI/Py     |
   | Firebase+JWT|  | Claude API  |  | platform adapters  |  | reorder rules  |
   +-------------+  +-------------+  +--------------------+  +----------------+
          \                |                  |                    /
           \               v                  v                   /
            +------->  PostgreSQL 16  <---->  Redis 7 (cache + event stream)
```

| Component | Path | Stack | Role |
|-----------|------|-------|------|
| Meal Engine | `services/meal-engine` | Python 3.12, FastAPI, Anthropic SDK | Generates and swaps plans, stores feedback |
| Pantry Tracker | `services/pantry-tracker` | Python 3.12, FastAPI | Inventory, consumption log, reorder decisions |
| Order Orchestrator | `services/order-orchestrator` | Node 20, Fastify, BullMQ | Builds carts, routes to a grocery platform |
| User Service | `services/user-service` | Node 20, Fastify, firebase-admin | Signup, login, tokens, profile and goals |
| WhatsApp Bot | `apps/whatsapp-bot` | Node 20, Fastify, Twilio | Inbound commands and outbound notifications |
| Web | `apps/web` | Next.js 15, React 19, Tailwind 4, Zustand | Landing page and dashboard |
| Mobile | `apps/mobile` | Expo 52, React Native 0.76, expo-router, NativeWind | iOS and Android app |
| Database | `packages/db` | PostgreSQL 16 | Schema (`auth`, `meals`, `pantry`, `orders`) and seeds |
| Shared Types | `packages/shared-types` | TypeScript | Types for users, plans, pantry, orders, events |
| Infra | `infra` | AWS CDK v2 | Network, Database, ECS, Monitoring stacks |

### Main API routes

| Service | Routes |
|---------|--------|
| Meal Engine | `GET /api/v1/plans/today`, `POST /api/v1/plans/generate`, `POST /api/v1/plans/{plan_id}/swap/{meal_type}`, `GET /api/v1/plans/history`, `POST` and `GET /api/v1/plans/{plan_id}/feedback` |
| Pantry Tracker | `GET /api/v1/pantry`, `GET /api/v1/pantry/reorder`, `POST /api/v1/pantry/items`, `PUT` and `DELETE /api/v1/pantry/items/{item_id}`, `POST /api/v1/pantry/check-order`, `POST /api/v1/pantry/consume`, `POST /api/v1/pantry/after-order` |
| Order Orchestrator | `GET /api/v1/orders/cart`, `POST /api/v1/orders/build`, `PUT /api/v1/orders/:order_id/approve`, `GET /api/v1/orders/:order_id/status`, `GET /api/v1/orders/history` |
| User Service | `POST /api/v1/auth/{signup,login,refresh,logout}`, `GET` and `PUT /api/v1/users/me`, `PUT /api/v1/users/me/dietary`, `PUT /api/v1/users/me/goals`, `DELETE /api/v1/users/me` |
| WhatsApp Bot | `POST /api/v1/whatsapp/webhook` |

Every service also exposes `GET /health`.

## Getting started

### Prerequisites

- Node.js 20 or newer and pnpm 9 or newer
- Python 3.12 (only if you run the Python services outside Docker)
- Docker with Compose
- `psql` (only for the `db:migrate` and `db:seed` scripts)
- An Anthropic API key, a Firebase project, and a Twilio WhatsApp sender for the full flow

### 1. Install

```bash
git clone https://github.com/prajwalgajakesari/mealmate.git
cd mealmate
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the values. Variables and what they are for:

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | all backend services | PostgreSQL connection string |
| `REDIS_URL` | all backend services | Redis for caching, cart TTL, and the event stream |
| `ANTHROPIC_API_KEY` | meal-engine | Claude API key for plan generation |
| `JWT_SECRET` | user-service | Signs access and refresh tokens |
| `FIREBASE_PROJECT_ID` | user-service | Firebase Admin verifies client ID tokens |
| `TWILIO_ACCOUNT_SID` | whatsapp-bot | Twilio account |
| `TWILIO_AUTH_TOKEN` | whatsapp-bot | Twilio auth token, also validates webhook signatures in production |
| `TWILIO_WHATSAPP_NUMBER` | whatsapp-bot | The WhatsApp sender number |
| `MEAL_ENGINE_URL`, `PANTRY_TRACKER_URL`, `ORDER_ORCHESTRATOR_URL`, `USER_SERVICE_URL` | services, whatsapp-bot | Internal service-to-service base URLs |
| `NEXT_PUBLIC_USER_SERVICE_URL`, `NEXT_PUBLIC_MEAL_ENGINE_URL`, `NEXT_PUBLIC_PANTRY_TRACKER_URL`, `NEXT_PUBLIC_ORDER_ORCHESTRATOR_URL` | web | Browser-side API base URLs, default to the Docker Compose ports |

Optional tuning variables such as `PORT`, `HOST`, `CORS_ORIGINS`, `LOG_LEVEL`, `DEFAULT_PLATFORM`, `DEFAULT_DELIVERY_FEE`, `FREE_DELIVERY_THRESHOLD`, and `CART_TTL_SECONDS` are read in each service's `config.ts` or `config.py` with sensible defaults.

### 3. Start the backend

```bash
pnpm docker:up
```

This starts PostgreSQL (host port 5433), Redis (6379), and the four backend services. The schema in `packages/db/init.sql` is applied automatically on first start.

| Service | Local URL |
|---------|-----------|
| meal-engine | http://localhost:8001 |
| pantry-tracker | http://localhost:8002 |
| order-orchestrator | http://localhost:8003 |
| user-service | http://localhost:8004 |

To apply the schema or seeds to another database:

```bash
pnpm db:migrate
pnpm db:seed
```

### 4. Run the clients

```bash
# Web dashboard on http://localhost:3000
pnpm --filter @mealmate/web dev

# Mobile app (Expo Go or a simulator)
cd apps/mobile && pnpm start

# WhatsApp bot (needs Twilio credentials and a public URL for the webhook)
pnpm --filter @mealmate/whatsapp-bot dev
```

### Running a service without Docker

```bash
# Node services
pnpm --filter @mealmate/user-service dev
pnpm --filter @mealmate/order-orchestrator dev

# Python services
cd services/meal-engine
pip install -e ".[dev]"
uvicorn main:app --reload --port 8000
```

When services run directly, they use the ports in their own config files (user-service 3001, whatsapp-bot 3002, order-orchestrator 3003, pantry-tracker 8001). The mobile app's API client is set up for that layout.

### Build

```bash
pnpm build        # all workspaces via Turborepo
pnpm type-check
pnpm lint
```

### Deploy

```bash
cd infra
pnpm synth
pnpm deploy       # cdk deploy --all, defaults to ap-south-1
```

## Project structure

```
mealmate/
├── apps/
│   ├── mobile/            Expo app: onboarding, tabs, cart, recipe detail
│   ├── web/               Next.js landing page and dashboard
│   └── whatsapp-bot/      Twilio webhook, message templates, event consumer
├── services/
│   ├── meal-engine/       FastAPI, Claude client, planner, cuisine rotation, nutrition
│   ├── pantry-tracker/    FastAPI, inventory and reorder rules
│   ├── order-orchestrator/ Fastify, cart builder, platform adapters
│   └── user-service/      Fastify, Firebase auth, JWT, profile and goals
├── packages/
│   ├── db/                init.sql schema and seed SQL
│   └── shared-types/      TypeScript types shared across services
├── infra/                 AWS CDK: network, database, ECS, monitoring
├── .github/workflows/     CI pipeline
├── docker-compose.yml     Local Postgres, Redis, and backend services
├── PRD-MealMate-AI.md     Product requirements
├── TRD-MealMate-AI.md     Technical design
└── PLAN-MealMate-AI.md    Implementation plan
```

## Scripts

Root scripts, run with `pnpm <script>`:

| Script | What it does |
|--------|--------------|
| `dev` | `turbo dev` across workspaces |
| `build` | `turbo build` |
| `test` | `turbo test` |
| `lint` | `turbo lint` |
| `type-check` | `turbo type-check` |
| `db:migrate` | Apply `packages/db/init.sql` to `DATABASE_URL` |
| `db:seed` | Load ingredient categories |
| `docker:up` / `docker:down` | Start or stop the Compose stack |
| `clean` | `turbo clean` |

## Status

This is an early-stage MVP. The service boundaries, data model, and client flows are in place, but several pieces are stubbed:

- **Grocery ordering is mocked.** The Swiggy Instamart and Blinkit adapters return realistic mock products and carts. No live orders are placed. The Zepto adapter is not implemented.
- **The web dashboard shows demo data.** Its API client is wired, but the dashboard pages still render hardcoded meals and nutrition.
- **Tests are placeholders.** The `tests` directories are empty and the Node services have no `test` script yet, so the CI test jobs do not exercise real tests.
- **The mobile app falls back to a development user ID** when no auth session exists.

CI runs type checks, lint, and Docker image builds for every backend service on pushes and pull requests to `main`.

## License

MIT. See [LICENSE](LICENSE).
