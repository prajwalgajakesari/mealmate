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
 * BlinkitAdapter — Blinkit grocery platform adapter.
 *
 * For MVP: mock implementation with realistic data.
 * Future: will use Playwright for browser automation against Blinkit.
 *
 * Playwright structure is stubbed — the `launchBrowser` and page interaction
 * methods are present but not active for MVP.
 */
export class BlinkitAdapter implements IGroceryPlatformAdapter {
  readonly platformName = 'blinkit' as const;

  private cartItems: Map<string, CartItem> = new Map();

  // ----- Playwright stubs (for future real implementation) -----

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async launchBrowser(): Promise<void> {
    // Future: const { chromium } = require('playwright');
    // this.browser = await chromium.launch({ headless: true });
    // this.page = await this.browser.newPage();
    // await this.page.goto('https://blinkit.com');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async closeBrowser(): Promise<void> {
    // Future: await this.browser?.close();
  }

  // ----- IGroceryPlatformAdapter implementation (mock) -----

  async searchProduct(query: string, filters?: SearchFilters): Promise<Product[]> {
    const mockResults = searchMockProducts(query, filters);

    // Simulate slight price variation from Swiggy (Blinkit is sometimes cheaper)
    return mockResults.map((mp) => {
      const priceVariation = 1 + (Math.random() * 0.1 - 0.05); // +/- 5%
      const adjustedPrice = Math.round(mp.price * priceVariation);

      return {
        id: `blinkit_${uuid().slice(0, 8)}`,
        name: mp.name,
        brand: mp.brand,
        price: adjustedPrice,
        mrp: mp.mrp,
        quantity: mp.quantity,
        unit: mp.unit,
        available: mp.available,
        platform: this.platformName,
      };
    });
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
    // Blinkit's USP is speed
    const estimates = ['8-12 mins', '10-15 mins', '12-18 mins'];
    return estimates[Math.floor(Math.random() * estimates.length)];
  }

  async getCheckoutUrl(): Promise<string> {
    const cart = await this.getCart();
    const itemIds = cart.items.map((i) => i.product.id).join(',');
    return `https://blinkit.com/checkout?items=${encodeURIComponent(itemIds)}&source=mealmate`;
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
        message: `Minimum order value of Rs.${offer.minOrderValue} required`,
      };
    }

    let discount: number;
    if (offer.discount < 100) {
      discount = Math.min(
        (cart.subtotal * offer.discount) / 100,
        offer.maxDiscount
      );
    } else {
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
