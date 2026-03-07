import Link from "next/link";
import {
  ChefHat,
  CalendarDays,
  ShoppingCart,
  CookingPot,
  SlidersHorizontal,
  Sparkles,
  Zap,
  Check,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const features = [
  {
    icon: CalendarDays,
    title: "Smart Meal Plans",
    description:
      "AI-generated daily meal plans tailored to your dietary preferences, health goals, and regional tastes. Every plan is nutritionally balanced and considers what's in your pantry.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: ShoppingCart,
    title: "Auto Grocery Ordering",
    description:
      "Missing ingredients are automatically added to your cart. Order groceries from Swiggy Instamart, Blinkit, or BigBasket with a single tap.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: CookingPot,
    title: "Cook Instructions",
    description:
      "Step-by-step cooking instructions for every meal. Get precise measurements, timing, and tips to cook like a pro, even if you're a beginner.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

const steps = [
  {
    number: "01",
    icon: SlidersHorizontal,
    title: "Set Preferences",
    description:
      "Tell us about your dietary preferences, allergies, health goals, and favourite cuisines. We handle the rest.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Get Daily Plans",
    description:
      "Wake up to a personalized meal plan every day — breakfast, lunch, dinner, and snacks, all optimized for your nutrition targets.",
  },
  {
    number: "03",
    icon: Zap,
    title: "Order with One Tap",
    description:
      "Missing something? One tap orders groceries from your preferred platform. Your pantry updates automatically after delivery.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "0",
    period: "forever",
    description: "Perfect to get started",
    features: [
      "1 meal plan per day",
      "Basic nutrition tracking",
      "Manual pantry tracking",
      "Community recipes",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "299",
    period: "/mo",
    description: "For health-conscious individuals",
    features: [
      "Unlimited AI meal plans",
      "Advanced nutrition analytics",
      "Auto pantry tracking",
      "Grocery auto-ordering",
      "Swap & customize meals",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Family",
    price: "499",
    period: "/mo",
    description: "Feed the whole family",
    features: [
      "Everything in Pro",
      "Up to 6 family members",
      "Individual dietary profiles",
      "Shared grocery cart",
      "Family nutrition dashboard",
      "Dedicated support",
    ],
    cta: "Start Family Trial",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ────────────────── Hero ────────────────── */}
      <section className="relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-0 h-[400px] w-[400px] rounded-full bg-secondary/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <ChefHat className="h-4 w-4" />
              AI-Powered Kitchen Manager
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              Your AI
              <span className="text-primary"> Kitchen Manager</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
              Personalized meal planning, smart pantry tracking, and one-tap
              grocery ordering — designed for Indian households. Eat healthier
              without the hassle.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/dashboard">
                <Button size="lg">Get Started Free</Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg">
                  See How It Works
                </Button>
              </a>
            </div>

            <p className="mt-4 text-sm text-text-secondary">
              No credit card required. Free plan available forever.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────── Features ────────────────── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
              Everything you need to run your kitchen
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              From planning meals to ordering groceries, MealMate handles it all
              so you can focus on cooking and enjoying food.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} padding="lg" hoverable>
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}
                >
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-text-primary">
                  {feature.title}
                </h3>
                <p className="mt-2 leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── How It Works ────────────────── */}
      <section
        id="how-it-works"
        className="bg-gradient-to-b from-background to-white py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Get started in minutes. Three simple steps to a smarter kitchen.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="text-xs font-bold tracking-widest text-primary/60">
                  STEP {step.number}
                </span>
                <h3 className="mt-2 text-xl font-semibold text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-text-secondary">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── Pricing ────────────────── */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Start free. Upgrade when you're ready.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                padding="lg"
                className={
                  plan.highlighted
                    ? "relative border-2 border-primary ring-1 ring-primary/20"
                    : ""
                }
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-text-primary">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {plan.description}
                </p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-text-primary">
                    &#8377;{plan.price}
                  </span>
                  <span className="text-text-secondary">
                    {plan.period === "forever" ? " forever" : plan.period}
                  </span>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-text-secondary">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Link href="/dashboard">
                    <Button
                      variant={plan.highlighted ? "primary" : "outline"}
                      fullWidth
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── Footer ────────────────── */}
      <footer className="border-t border-gray-100 bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className="font-bold text-text-primary">
                Meal<span className="text-primary">Mate</span> AI
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              &copy; {new Date().getFullYear()} MealMate AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
