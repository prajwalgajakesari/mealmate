import { v4 as uuid } from 'uuid';
import {
  IGroceryPlatformAdapter,
  Product,
  CartItem,
  Cart,
  AvailabilityResult,
  Offer,
  CouponResult,
  SearchFilters,
} from './platform.interface';
import { searchMockProducts, MOCK_OFFERS } from './mock-data';

/**
 * SwiggyInstamartAdapter — Swiggy Instamart grocery platform adapter.
 *
 * For MVP: mock implementation with realistic Indian grocery data.
 * Future: will use MCP client pattern (HTTP calls to Swiggy MCP endpoint).
 */
export class SwiggyInstamartAdapter implements IGroceryPlatformAdapter {
  readonly platformName = 'swiggy_instamart' as const;

  private cartItems: Map<string, CartItem> = new Map();

  async searchProduct(query: string, filters?: SearchFilters): Promise<Product[]> {
    const mockResults = searchMockProducts(query, filters);

    return mockResults.map((mp) => ({
      id: `swiggy_${uuid().slice(0, 8)}`,
      name: mp.name,
      brand: mp.brand,
      price: mp.price,
      mrp: mp.mrp,
      quantity: mp.quantity,
      unit: mp.unit,
      available: mp.available,
      platform: this.platformName,
    }));
  }

  async addToCart(product: Product, quantity: number): Promise<CartItem> {
    const existingItem = this.cartItems.get(product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.totalPrice = existingItem.product.price * existingItem.quantity;
      return existingItem;
    }

    const cartItem: CartItem = {
      product,
      quantity,
      totalPrice: product.price * quantity,
      isSubstitution: false,
    };

    this.cartItems.set(product.id, cartItem);
    return cartItem;
  }

  async removeFromCart(itemId: string): Promise<void> {
    this.cartItems.delete(itemId);
  }

  async getCart(): Promise<Cart> {
    const items = Array.from(this.cartItems.values());
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      items,
      subtotal,
      itemCount: items.length,
    };
  }

  async clearCart(): Promise<void> {
    this.cartItems.clear();
  }

  async checkAvailability(query: string): Promise<AvailabilityResult> {
    const products = await this.searchProduct(query);
    const availableProducts = products.filter((p) => p.available);

    return {
      query,
      available: availableProducts.length > 0,
      productCount: availableProducts.length,
      products: availableProducts,
    };
  }

  async getDeliveryEstimate(): Promise<string> {
    // Simulate realistic delivery estimates
    const estimates = ['10-15 mins', '15-20 mins', '20-30 mins'];
    return estimates[Math.floor(Math.random() * estimates.length)];
  }

  async getCheckoutUrl(): Promise<string> {
    const cart = await this.getCart();
    // Generate a Swiggy Instamart deep link (mock)
    const itemIds = cart.items.map((i) => i.product.id).join(',');
    return `https://www.swiggy.com/instamart/checkout?items=${encodeURIComponent(itemIds)}&source=mealmate`;
  }

  async getOffers(): Promise<Offer[]> {
    return MOCK_OFFERS;
  }

  async applyCoupon(code: string): Promise<CouponResult> {
    const offer = MOCK_OFFERS.find(
      (o) => o.code.toLowerCase() === code.toLowerCase()
    );

    if (!offer) {
      return {
        applied: false,
        code,
        discount: 0,
        message: 'Invalid coupon code',
      };
    }

    const cart = await this.getCart();
    if (cart.subtotal < offer.minOrderValue) {
      return {
        applied: false,
        code,
        discount: 0,
        message: `Minimum order value of Rs.${offer.minOrderValue} required. Current cart: Rs.${cart.subtotal}`,
      };
    }

    // Calculate discount
    let discount: number;
    if (offer.discount < 100) {
      // Percentage discount
      discount = Math.min(
        (cart.subtotal * offer.discount) / 100,
        offer.maxDiscount
      );
    } else {
      // Flat discount
      discount = Math.min(offer.discount, offer.maxDiscount);
    }

    return {
      applied: true,
      code,
      discount,
      message: `Coupon applied! You save Rs.${discount}`,
    };
  }
}
