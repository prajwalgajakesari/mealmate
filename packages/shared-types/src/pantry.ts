export type PantryStatus = 'stocked' | 'low' | 'empty' | 'unknown';
export type PantryCategory = 'fresh' | 'pantry' | 'staple';

export interface PantryItem {
  id: string;
  userId: string;
  ingredientName: string;
  category: PantryCategory;

  lastOrderedAt?: string;
  lastOrderedQty?: string;
  estimatedServingsRemaining: number;
  estimatedDepletionDate?: string;

  avgDailyUsageGrams?: number;
  avgDaysBetweenOrders?: number;
  timesOrdered: number;

  preferredBrand?: string;
  preferredVariant?: string;
  maxPrice?: number;

  status: PantryStatus;
  needsReorder: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface OrderDecision {
  ingredientName: string;
  shouldOrder: boolean;
  reason: string;
  category: PantryCategory;
  suggestedQty?: string;
}

export interface UpdatePantryRequest {
  ingredientName: string;
  status?: PantryStatus;
  estimatedServingsRemaining?: number;
  preferredBrand?: string;
  maxPrice?: number;
}

export interface PantryState {
  stocked: PantryItem[];
  low: PantryItem[];
  empty: PantryItem[];
  unknown: PantryItem[];
}
