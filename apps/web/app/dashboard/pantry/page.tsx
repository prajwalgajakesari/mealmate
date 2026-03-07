"use client";

import { useState } from "react";
import { Package, RotateCcw } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface PantryItem {
  id: string;
  name: string;
  category: string;
  status: "stocked" | "low" | "empty";
  last_ordered: string;
  estimated_remaining?: string;
}

const demoPantry: PantryItem[] = [
  {
    id: "1",
    name: "Basmati Rice",
    category: "Grains",
    status: "stocked",
    last_ordered: "2 days ago",
    estimated_remaining: "~2 kg",
  },
  {
    id: "2",
    name: "Toor Dal",
    category: "Lentils",
    status: "stocked",
    last_ordered: "5 days ago",
    estimated_remaining: "~1 kg",
  },
  {
    id: "3",
    name: "Paneer",
    category: "Dairy",
    status: "stocked",
    last_ordered: "1 day ago",
    estimated_remaining: "400g",
  },
  {
    id: "4",
    name: "Onions",
    category: "Vegetables",
    status: "low",
    last_ordered: "4 days ago",
    estimated_remaining: "~300g",
  },
  {
    id: "5",
    name: "Tomatoes",
    category: "Vegetables",
    status: "low",
    last_ordered: "3 days ago",
    estimated_remaining: "~200g",
  },
  {
    id: "6",
    name: "Garam Masala",
    category: "Spices",
    status: "low",
    last_ordered: "2 weeks ago",
    estimated_remaining: "~20g",
  },
  {
    id: "7",
    name: "Coconut Oil",
    category: "Oils",
    status: "empty",
    last_ordered: "3 weeks ago",
  },
  {
    id: "8",
    name: "Curd",
    category: "Dairy",
    status: "empty",
    last_ordered: "5 days ago",
  },
];

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>(demoPantry);

  const stocked = items.filter((i) => i.status === "stocked");
  const low = items.filter((i) => i.status === "low");
  const empty = items.filter((i) => i.status === "empty");

  function handleRestock(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "stocked" as const, last_ordered: "Just now", estimated_remaining: "Full" }
          : item
      )
    );
  }

  function renderSection(
    title: string,
    sectionItems: PantryItem[],
    status: "stocked" | "low" | "empty"
  ) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <Badge status={status} label={`${sectionItems.length}`} />
        </div>

        {sectionItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">
            No items in this category.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sectionItems.map((item) => (
              <Card key={item.id} padding="sm" className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-text-primary">{item.name}</h3>
                    <Badge status={item.status} />
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {item.category}
                  </p>
                  <div className="mt-2 space-y-0.5 text-xs text-text-secondary">
                    <p>Last ordered: {item.last_ordered}</p>
                    {item.estimated_remaining && (
                      <p>Remaining: {item.estimated_remaining}</p>
                    )}
                  </div>
                </div>

                {item.status !== "stocked" && (
                  <button
                    onClick={() => handleRestock(item.id)}
                    title="Mark as restocked"
                    className="ml-2 shrink-0 rounded-lg p-2 text-text-secondary transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
          <Package className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pantry</h1>
          <p className="text-sm text-text-secondary">
            {items.length} items tracked
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {renderSection("Stocked", stocked, "stocked")}
        {renderSection("Running Low", low, "low")}
        {renderSection("Empty", empty, "empty")}
      </div>
    </div>
  );
}
