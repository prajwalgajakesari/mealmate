"use client";

import { useState } from "react";
import {
  History,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import Card from "@/components/ui/Card";

interface HistoryMeal {
  id: string;
  name: string;
  meal_type: string;
  calories: number;
  feedback?: "liked" | "disliked" | null;
}

interface DayPlan {
  date: string;
  label: string;
  meals: HistoryMeal[];
}

// Generate demo history for past 30 days
function generateHistory(): DayPlan[] {
  const mealNames = [
    "Poha with Peanuts",
    "Masala Dosa",
    "Idli Sambar",
    "Upma",
    "Paratha with Curd",
    "Rajma Chawal",
    "Chole Bhature",
    "Dal Fry with Rice",
    "Biryani",
    "Kadhi Chawal",
    "Palak Paneer with Roti",
    "Aloo Gobi with Chapati",
    "Fish Curry with Rice",
    "Paneer Tikka Wrap",
    "Sambar Rice",
  ];

  const feedbacks: Array<"liked" | "disliked" | null> = [
    "liked",
    "liked",
    null,
    "disliked",
    "liked",
    null,
  ];
  const types = ["breakfast", "lunch", "dinner"];

  const days: DayPlan[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    days.push({
      date: dateStr,
      label,
      meals: types.map((type, j) => ({
        id: `${dateStr}-${type}`,
        name: mealNames[(i * 3 + j) % mealNames.length],
        meal_type: type,
        calories: 300 + Math.floor(Math.random() * 400),
        feedback: feedbacks[(i + j) % feedbacks.length],
      })),
    });
  }
  return days;
}

const demoHistory = generateHistory();

function FeedbackIcon({ feedback }: { feedback?: "liked" | "disliked" | null }) {
  if (feedback === "liked")
    return <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (feedback === "disliked")
    return <ThumbsDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-gray-300" />;
}

export default function HistoryPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(date: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Plan History</h1>
          <p className="text-sm text-text-secondary">Past 30 days of meal plans</p>
        </div>
      </div>

      <div className="space-y-2">
        {demoHistory.map((day) => {
          const isOpen = expanded.has(day.date);
          const totalCal = day.meals.reduce((s, m) => s + m.calories, 0);
          const feedbackCount = day.meals.filter(
            (m) => m.feedback === "liked"
          ).length;

          return (
            <Card key={day.date} padding="sm" className="overflow-hidden">
              <button
                onClick={() => toggle(day.date)}
                className="flex w-full items-center justify-between px-2 py-1"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-text-secondary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-text-secondary" />
                  )}
                  <span className="font-medium text-text-primary">
                    {day.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>{totalCal} kcal</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
                    {feedbackCount}/{day.meals.length}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="mt-2 border-t border-gray-100 pt-3">
                  <div className="space-y-2 px-2">
                    {day.meals.map((meal) => (
                      <div
                        key={meal.id}
                        className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                      >
                        <div>
                          <span className="text-xs font-medium uppercase text-text-secondary">
                            {meal.meal_type}
                          </span>
                          <p className="text-sm font-medium text-text-primary">
                            {meal.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-secondary">
                            {meal.calories} kcal
                          </span>
                          <FeedbackIcon feedback={meal.feedback} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
