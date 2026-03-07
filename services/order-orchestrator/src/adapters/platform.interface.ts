/**
 * IGroceryPlatformAdapter — unified interface for all grocery platforms.
 * Each platform (Swiggy Instamart, Blinkit, Zepto) implements this interface.
 * For MVP, adapters are mock implementations returning realistic data.
 */

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
  platform: 'swiggy_instamart' | 'blinkit' | 'zepto';
}

export interface CartItem {
  product: Product;
  quantity: number;
  totalPrice: number;
  isSubstitution: boolean;
  originalItem?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface AvailabilityResult {
  query: string;
  available: boolean;
  productCount: number;
  products: Product[];
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  code: string;
  minOrderValue: number;
  discount: number;
  maxDiscount: number;
}

export interface CouponResult {
  applied: boolean;
  code: string;
  discount: number;
  message: string;
}

export interface SearchFilters {
  brand?: string;
  maxPrice?: number;
  sortBy?: 'relevance' | 'price_low' | 'price_high';
}

export interface IGroceryPlatformAdapter {
  readonly platformName: 'swiggy_instamart' | 'blinkit' | 'zepto';

  /** Search for products matching query */
  searchProduct(query: string, filters?: SearchFilters): Promise<Product[]>;

  /** Add a product to the cart */
  addToCart(product: Product, quantity: number): Promise<CartItem>;

  /** Remove an item from the cart by product ID */
  removeFromCart(itemId: string): Promise<void>;

  /** Get current cart state */
  getCart(): Promise<Cart>;

  /** Clear entire cart */
  clearCart(): Promise<void>;

  /** Check availability of a product by search query */
  checkAvailability(query: string): Promise<AvailabilityResult>;

  /** Get estimated delivery time */
  getDeliveryEstimate(): Promise<string>;

  /** Get checkout URL (deep link or web link) */
  getCheckoutUrl(): Promise<string>;

  /** Get available offers/coupons (optional) */
  getOffers?(): Promise<Offer[]>;

  /** Apply a coupon code (optional) */
  applyCoupon?(code: string): Promise<CouponResult>;
}
