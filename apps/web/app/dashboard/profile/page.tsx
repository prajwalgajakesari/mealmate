"use client";

import { useState } from "react";
import {
  User,
  Heart,
  Target,
  Activity,
  UtensilsCrossed,
  Link2,
  CreditCard,
  Save,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface ProfileState {
  name: string;
  email: string;
  dietary_preferences: string[];
  allergies: string[];
  health_goals: string[];
  body_stats: {
    age: number;
    weight_kg: number;
    height_cm: number;
    activity_level: string;
  };
  cuisine_preferences: string[];
  connected_platforms: { name: string; connected: boolean }[];
  subscription: "free" | "pro" | "family";
}

const initialProfile: ProfileState = {
  name: "Prajwal",
  email: "prajwal@example.com",
  dietary_preferences: ["Vegetarian", "Low Oil"],
  allergies: ["Peanuts"],
  health_goals: ["Weight Loss", "High Protein"],
  body_stats: {
    age: 28,
    weight_kg: 72,
    height_cm: 175,
    activity_level: "Moderate",
  },
  cuisine_preferences: [
    "North Indian",
    "South Indian",
    "Indo-Chinese",
    "Continental",
  ],
  connected_platforms: [
    { name: "Swiggy Instamart", connected: true },
    { name: "Blinkit", connected: false },
    { name: "BigBasket", connected: false },
  ],
  subscription: "pro",
};

const dietaryOptions = [
  "Vegetarian",
  "Vegan",
  "Eggetarian",
  "Non-Vegetarian",
  "Jain",
  "Low Oil",
  "Low Sodium",
  "Gluten Free",
];

const cuisineOptions = [
  "North Indian",
  "South Indian",
  "Bengali",
  "Gujarati",
  "Maharashtrian",
  "Indo-Chinese",
  "Continental",
  "Mughlai",
];

const goalOptions = [
  "Weight Loss",
  "Weight Gain",
  "Muscle Building",
  "High Protein",
  "Low Carb",
  "Heart Health",
  "Diabetes Friendly",
];

const activityLevels = ["Sedentary", "Light", "Moderate", "Active", "Very Active"];

function TagSelector({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 text-text-secondary hover:border-gray-300"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    // TODO: call user service API
    setTimeout(() => setSaving(false), 1000);
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Profile &amp; Settings
            </h1>
            <p className="text-sm text-text-secondary">{profile.email}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Dietary Preferences */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Dietary Preferences
            </h2>
          </div>
          <TagSelector
            options={dietaryOptions}
            selected={profile.dietary_preferences}
            onChange={(val) =>
              setProfile((p) => ({ ...p, dietary_preferences: val }))
            }
          />
        </Card>

        {/* Health Goals */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Health Goals
            </h2>
          </div>
          <TagSelector
            options={goalOptions}
            selected={profile.health_goals}
            onChange={(val) => setProfile((p) => ({ ...p, health_goals: val }))}
          />
        </Card>

        {/* Body Stats */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold text-text-primary">
              Body Stats
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Age
              </label>
              <input
                type="number"
                value={profile.body_stats.age}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    body_stats: {
                      ...p.body_stats,
                      age: parseInt(e.target.value) || 0,
                    },
                  }))
                }
                className="w-full rounded-xl border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Weight (kg)
              </label>
              <input
                type="number"
                value={profile.body_stats.weight_kg}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    body_stats: {
                      ...p.body_stats,
                      weight_kg: parseInt(e.target.value) || 0,
                    },
                  }))
                }
                className="w-full rounded-xl border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Height (cm)
              </label>
              <input
                type="number"
                value={profile.body_stats.height_cm}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    body_stats: {
                      ...p.body_stats,
                      height_cm: parseInt(e.target.value) || 0,
                    },
                  }))
                }
                className="w-full rounded-xl border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Activity Level
              </label>
              <select
                value={profile.body_stats.activity_level}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    body_stats: {
                      ...p.body_stats,
                      activity_level: e.target.value,
                    },
                  }))
                }
                className="w-full rounded-xl border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {activityLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Cuisine Preferences */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Cuisine Preferences
            </h2>
          </div>
          <TagSelector
            options={cuisineOptions}
            selected={profile.cuisine_preferences}
            onChange={(val) =>
              setProfile((p) => ({ ...p, cuisine_preferences: val }))
            }
          />
        </Card>

        {/* Connected Platforms */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Connected Platforms
            </h2>
          </div>
          <div className="space-y-3">
            {profile.connected_platforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
              >
                <span className="font-medium text-text-primary">
                  {platform.name}
                </span>
                {platform.connected ? (
                  <Badge status="stocked" label="Connected" />
                ) : (
                  <Button variant="outline" size="sm">
                    Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Subscription */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold text-text-primary">
              Subscription
            </h2>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div>
              <p className="font-semibold capitalize text-text-primary">
                {profile.subscription} Plan
              </p>
              <p className="text-sm text-text-secondary">
                {profile.subscription === "free"
                  ? "Upgrade for unlimited meal plans and auto-ordering"
                  : "Your plan renews on the 1st of every month"}
              </p>
            </div>
            {profile.subscription === "free" ? (
              <Button size="sm">Upgrade</Button>
            ) : (
              <Button variant="outline" size="sm">
                Manage
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
