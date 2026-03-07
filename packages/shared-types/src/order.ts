export type OrderStatus = 'cart_ready' | 'user_approved' | 'placed' | 'delivered' | 'failed';
export type PlatformName = 'swiggy_instamart' | 'blinkit' | 'zepto';

export interface Product {
  id: string;
  name: string;
  brand?: string;
  price: number;
  mrp?: number;
  quantity: string;
  unit: string;
  image?: string;
  available: boolean;
  platform: PlatformName;
}

export interface CartItem {
  product: Product;
  quantity: number;
  totalPrice: number;
  isSubstitution: boolean;
  originalItem?: string;
}

export interface CartSummary {
  items: CartItem[];
  unavailable: string[];
  subtotal: number;
  coupon?: {
    code: string;
    discount: number;
  };
  deliveryFee: number;
  total: number;
  platform: PlatformName;
  deliveryEstimate: string;
  checkoutUrl?: string;
}

export interface GroceryOrder {
  id: string;
  userId: string;
  mealPlanId: string;
  platform: PlatformName;
  items: CartItem[];
  subtotal: number;
  couponApplied?: string;
  discount: number;
  total: number;
  status: OrderStatus;
  platformOrderId?: string;
  checkoutUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuildCartRequest {
  userId: string;
  mealPlanId: string;
  groceryItems: Array<{
    name: string;
    searchTerm: string;
    quantity: string;
    category: string;
    priority: string;
  }>;
  platform?: PlatformName;
}

export interface ApproveOrderRequest {
  orderId: string;
}

export interface SearchFilters {
  brand?: string;
  maxPrice?: number;
  sortBy?: 'relevance' | 'price_low' | 'price_high';
}
