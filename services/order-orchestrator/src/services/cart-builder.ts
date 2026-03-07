import { v4 as uuid } from 'uuid';
import { IGroceryPlatformAdapter, Product, CartItem } from '../adapters/platform.interface';
import { config } from '../config';

// ---- Types ----

export interface GroceryIngredient {
  name: string;
  searchTerm: string;
  quantity: string;
  category: string;
  priority: string;
}

export interface PantryDecision {
  ingredientName: string;
  shouldOrder: boolean;
  reason: string;
  category: string;
  suggestedQty?: string;
}

export interface CartBuildResult {
  orderId: string;
  items: CartItem[];
  unavailableItems: UnavailableItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  platform: string;
  deliveryEstimate: string;
  itemCount: number;
}

export interface UnavailableItem {
  name: string;
  searchTerm: string;
  reason: string;
  suggestedSubstitute?: string;
}

interface MergedIngredient {
  name: string;
  searchTerm: string;
  quantities: string[];
  category: string;
  priority: string;
  preferredBrand?: string;
  maxPrice?: number;
}

// ---- SmartCartBuilder ----

/**
 * SmartCartBuilder — builds an optimal grocery cart from a meal plan's ingredient list.
 *
 * Algorithm:
 * 1. Merge/deduplicate ingredients across meals
 * 2. Filter out items already stocked (using pantry decisions)
 * 3. Search for each item on the selected platform
 * 4. Pick best product (user's preferred brand > best value)
 * 5. Handle unavailable items (mark for substitution)
 * 6. Calculate totals
 */
export class SmartCartBuilder {
  /**
   * Build a cart from ingredients, pantry decisions, and platform adapter.
   */
  async buildCart(
    ingredients: GroceryIngredient[],
    pantryDecisions: PantryDecision[],
    adapter: IGroceryPlatformAdapter,
    userPreferences?: { preferredBrands?: Record<string, string>; maxPrices?: Record<string, number> }
  ): Promise<CartBuildResult> {
    console.log(`[CartBuilder] Building cart with ${ingredients.length} ingredients on ${adapter.platformName}`);

    // Step 1: Merge & deduplicate ingredients
    const merged = this.mergeIngredients(ingredients, userPreferences);
    console.log(`[CartBuilder] Merged to ${merged.length} unique ingredients`);

    // Step 2: Filter out stocked items using pantry decisions
    const toOrder = this.filterByPantry(merged, pantryDecisions);
    console.log(`[CartBuilder] ${toOrder.length} items need ordering (${merged.length - toOrder.length} already stocked)`);

    // Step 3: Clear any existing cart on the platform
    await adapter.clearCart();

    // Step 4 & 5: Search, pick best, add to cart
    const cartItems: CartItem[] = [];
    const unavailableItems: UnavailableItem[] = [];

    for (const ingredient of toOrder) {
      try {
        const result = await this.findAndAddProduct(ingredient, adapter);
        if (result.cartItem) {
          cartItems.push(result.cartItem);
        } else if (result.unavailable) {
          unavailableItems.push(result.unavailable);
        }
      } catch (error) {
        console.error(`[CartBuilder] Error processing '${ingredient.name}':`, error);
        unavailableItems.push({
          name: ingredient.name,
          searchTerm: ingredient.searchTerm,
          reason: 'Error searching for product',
        });
      }
    }

    // Step 6: Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = subtotal >= config.cart.freeDeliveryThreshold ? 0 : config.cart.deliveryFee;
    const total = subtotal + deliveryFee;
    const deliveryEstimate = await adapter.getDeliveryEstimate();

    const result: CartBuildResult = {
      orderId: uuid(),
      items: cartItems,
      unavailableItems,
      subtotal,
      deliveryFee,
      total,
      platform: adapter.platformName,
      deliveryEstimate,
      itemCount: cartItems.length,
    };

    console.log(
      `[CartBuilder] Cart built: ${cartItems.length} items, ` +
      `${unavailableItems.length} unavailable, total: Rs.${total}`
    );

    return result;
  }

  /**
   * Merge duplicate ingredients across meals, combining quantities.
   */
  private mergeIngredients(
    ingredients: GroceryIngredient[],
    userPreferences?: { preferredBrands?: Record<string, string>; maxPrices?: Record<string, number> }
  ): MergedIngredient[] {
    const merged = new Map<string, MergedIngredient>();

    for (const ing of ingredients) {
      const key = ing.searchTerm.toLowerCase().trim();

      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.quantities.push(ing.quantity);
        // Upgrade priority if any instance is must_have
        if (ing.priority === 'must_have') {
          existing.priority = 'must_have';
        }
      } else {
        const normalizedName = ing.name.toLowerCase().trim();
        merged.set(key, {
          name: ing.name,
          searchTerm: ing.searchTerm,
          quantities: [ing.quantity],
          category: ing.category,
          priority: ing.priority,
          preferredBrand: userPreferences?.preferredBrands?.[normalizedName],
          maxPrice: userPreferences?.maxPrices?.[normalizedName],
        });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Filter out items the pantry says are already stocked.
   */
  private filterByPantry(
    ingredients: MergedIngredient[],
    pantryDecisions: PantryDecision[]
  ): MergedIngredient[] {
    const decisionMap = new Map<string, PantryDecision>();
    for (const decision of pantryDecisions) {
      decisionMap.set(decision.ingredientName.toLowerCase().trim(), decision);
    }

    return ingredients.filter((ing) => {
      const decision = decisionMap.get(ing.name.toLowerCase().trim());

      // If no pantry decision, assume we need to order
      if (!decision) return true;

      // If pantry says don't order, skip it
      if (!decision.shouldOrder) {
        console.log(`[CartBuilder] Skipping '${ing.name}': ${decision.reason}`);
        return false;
      }

      // Use pantry's suggested quantity if available
      if (decision.suggestedQty) {
        ing.quantities = [decision.suggestedQty];
      }

      return true;
    });
  }

  /**
   * Search for a product on the platform, pick the best match, and add to cart.
   */
  private async findAndAddProduct(
    ingredient: MergedIngredient,
    adapter: IGroceryPlatformAdapter
  ): Promise<{ cartItem?: CartItem; unavailable?: UnavailableItem }> {
    // Search with brand preference first
    let products = await adapter.searchProduct(ingredient.searchTerm, {
      brand: ingredient.preferredBrand,
      maxPrice: ingredient.maxPrice,
    });

    // If brand-specific search returned nothing, search without brand filter
    if (products.length === 0 && ingredient.preferredBrand) {
      products = await adapter.searchProduct(ingredient.searchTerm);
    }

    // No products found at all
    if (products.length === 0) {
      return {
        unavailable: {
          name: ingredient.name,
          searchTerm: ingredient.searchTerm,
          reason: 'No products found on platform',
        },
      };
    }

    // Filter to available products only
    const availableProducts = products.filter((p) => p.available);

    if (availableProducts.length === 0) {
      return {
        unavailable: {
          name: ingredient.name,
          searchTerm: ingredient.searchTerm,
          reason: 'All matching products are currently out of stock',
          suggestedSubstitute: products[0]?.name,
        },
      };
    }

    // Pick the best product
    const bestProduct = this.pickBestProduct(availableProducts, ingredient);

    // Add to cart (quantity = 1 pack/unit for most items)
    const cartItem = await adapter.addToCart(bestProduct, 1);

    return { cartItem };
  }

  /**
   * Pick the best product from search results.
   * Priority: preferred brand match > best value (lowest price per unit).
   */
  private pickBestProduct(products: Product[], ingredient: MergedIngredient): Product {
    // If user has a brand preference, try to match it
    if (ingredient.preferredBrand) {
      const brandMatch = products.find(
        (p) => p.brand?.toLowerCase() === ingredient.preferredBrand?.toLowerCase()
      );
      if (brandMatch) return brandMatch;
    }

    // Otherwise pick the best value: lowest price among available
    const sorted = [...products].sort((a, b) => a.price - b.price);
    return sorted[0];
  }
}
