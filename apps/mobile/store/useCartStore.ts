import { create } from "zustand";
import { orderService } from "@/services/api";

export interface CartItem {
  id: string;
  name: string;
  brand?: string;
  price: number;
  quantity: string;
  category: string;
  selected: boolean;
}

interface CartState {
  items: CartItem[];
  orderId: string | null;
  orderStatus: string;
  checkoutUrl: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  couponCode: string | null;
  platform: string;
  deliveryEstimate: string;
  isLoading: boolean;
  error: string | null;

  fetchCart: () => Promise<void>;
  buildCart: (mealPlanId: string, groceryItems: Array<{ name: string; searchTerm: string; quantity: string; category: string; priority: string }>) => Promise<void>;
  toggleItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  checkout: () => Promise<string | null>;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderId: null,
  orderStatus: "",
  checkoutUrl: null,
  subtotal: 0,
  deliveryFee: 0,
  discount: 0,
  total: 0,
  couponCode: null,
  platform: "",
  deliveryEstimate: "",
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await orderService.getCart();
      const raw = response.data;
      const data = raw?.data ?? raw;
      if (data && Array.isArray(data?.items) && data.items.length > 0) {
        const items: CartItem[] = data.items.map((item: any, idx: number) => ({
          id: item.product?.id ?? `item-${idx}`,
          name: item.product?.name ?? item.name ?? "Unknown",
          brand: item.product?.brand,
          price: item.totalPrice ?? item.product?.price ?? 0,
          quantity: item.product?.quantity ?? item.quantity ?? "",
          category: item.category ?? "fresh",
          selected: true,
        }));
        set({
          items,
          orderId: data.orderId ?? data.id,
          orderStatus: data.status ?? "",
          checkoutUrl: data.checkoutUrl ?? data.checkout_url ?? null,
          subtotal: Number(data.subtotal) || 0,
          deliveryFee: Number(data.deliveryFee ?? data.delivery_fee) || 0,
          discount: 0,
          total: Number(data.total) || 0,
          platform: data.platform ?? "",
          deliveryEstimate: data.deliveryEstimate ?? data.delivery_estimate ?? "",
          isLoading: false,
        });
      } else {
        set({ items: [], isLoading: false });
      }
    } catch {
      set({ error: null, isLoading: false });
    }
  },

  buildCart: async (mealPlanId, groceryItems) => {
    set({ isLoading: true, error: null });
    try {
      const response = await orderService.buildCart({ mealPlanId, groceryItems });
      const data = response.data?.data ?? response.data;
      if (data && data.items) {
        const items: CartItem[] = data.items.map((item: any, idx: number) => ({
          id: item.product?.id ?? `item-${idx}`,
          name: item.product?.name ?? item.name ?? "Unknown",
          brand: item.product?.brand,
          price: item.totalPrice ?? item.product?.price ?? 0,
          quantity: item.product?.quantity ?? item.quantity ?? "",
          category: item.category ?? "fresh",
          selected: true,
        }));
        set({
          items,
          orderId: data.orderId,
          subtotal: Number(data.subtotal) || 0,
          deliveryFee: Number(data.deliveryFee) || 0,
          discount: 0,
          total: Number(data.total) || 0,
          platform: data.platform ?? "",
          deliveryEstimate: data.deliveryEstimate ?? "",
          isLoading: false,
        });
      }
    } catch {
      set({ error: "Failed to build cart", isLoading: false });
    }
  },

  toggleItem: (itemId) => {
    const items = get().items.map((i) =>
      i.id === itemId ? { ...i, selected: !i.selected } : i
    );
    const subtotal = items.filter((i) => i.selected).reduce((s, i) => s + i.price, 0);
    const deliveryFee = get().deliveryFee;
    set({ items, subtotal, total: subtotal + deliveryFee - get().discount });
  },

  removeItem: (itemId) => {
    const items = get().items.filter((i) => i.id !== itemId);
    const subtotal = items.filter((i) => i.selected).reduce((s, i) => s + i.price, 0);
    const deliveryFee = get().deliveryFee;
    set({ items, subtotal, total: subtotal + deliveryFee - get().discount });
  },

  checkout: async () => {
    const { orderId, orderStatus, checkoutUrl: existingUrl } = get();
    if (!orderId) throw new Error("No order to approve");

    // Already approved — just return the existing checkout URL
    if (orderStatus === "user_approved" && existingUrl) {
      return existingUrl;
    }

    const response = await orderService.approveOrder(orderId);
    const data = response.data?.data ?? response.data;
    const url = data?.checkoutUrl ?? null;
    set({ orderStatus: "user_approved", checkoutUrl: url });
    return url;
  },

  clearCart: () => set({ items: [], orderId: null, orderStatus: "", checkoutUrl: null, subtotal: 0, total: 0 }),
}));
