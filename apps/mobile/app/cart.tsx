import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore, CartItem } from "@/store/useCartStore";
import { Skeleton } from "@/components/SkeletonLoader";

const PLATFORM_LABELS: Record<string, string> = {
  swiggy_instamart: "Swiggy Instamart",
  swiggy: "Swiggy Instamart",
  blinkit: "Blinkit",
  zepto: "Zepto",
};

function CartItemRow({ item }: { item: CartItem }) {
  const { toggleItem, removeItem } = useCartStore();

  return (
    <View className="flex-row items-center py-3 border-b border-gray-50">
      <Pressable
        onPress={() => toggleItem(item.id)}
        accessibilityLabel={`Toggle ${item.name}`}
        accessibilityRole="checkbox"
        className="mr-3"
        hitSlop={8}
      >
        <Ionicons
          name={item.selected ? "checkbox" : "square-outline"}
          size={24}
          color={item.selected ? "#FF6B35" : "#D1D5DB"}
        />
      </Pressable>

      <View className="flex-1">
        <Text
          className="text-text-primary text-sm font-inter-semibold"
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View className="flex-row items-center mt-0.5">
          {item.brand && (
            <Text className="text-text-secondary text-xs font-inter mr-2">
              {item.brand}
            </Text>
          )}
          <Text className="text-text-secondary text-xs font-inter">
            {item.quantity}
          </Text>
        </View>
      </View>

      <Text className="text-text-primary text-sm font-inter-semibold mr-3">
        Rs. {Number(item.price).toFixed(0)}
      </Text>

      <Pressable
        onPress={() => removeItem(item.id)}
        accessibilityLabel={`Remove ${item.name}`}
        accessibilityRole="button"
        hitSlop={8}
      >
        <Ionicons name="close-circle-outline" size={20} color="#9CA3AF" />
      </Pressable>
    </View>
  );
}

function CategorySection({
  title,
  items,
  icon,
  color,
}: {
  title: string;
  items: CartItem[];
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-2">
        <Ionicons name={icon} size={16} color={color} />
        <Text className="text-text-primary text-sm font-inter-bold ml-2">
          {title}
        </Text>
        <Text className="text-text-secondary text-xs font-inter ml-1">
          ({items.length})
        </Text>
      </View>
      <View className="bg-surface rounded-2xl px-4">
        {items.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const {
    items,
    subtotal,
    discount,
    total,
    couponCode,
    platform,
    orderStatus,
    isLoading,
    fetchCart,
    checkout,
  } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const freshItems = items.filter((i) => i.category === "fresh");
  const restockItems = items.filter((i) => i.category === "restock");
  const allFresh = restockItems.length === 0;

  const platformLabel = platform
    ? PLATFORM_LABELS[platform] ?? platform
    : "Grocery App";

  const handleCheckout = async () => {
    try {
      const checkoutUrl = await checkout();
      if (checkoutUrl) {
        Alert.alert(
          "Opening " + platformLabel,
          "You'll be redirected to complete your order.",
          [
            {
              text: "Open " + platformLabel,
              onPress: () => {
                Linking.openURL(checkoutUrl);
                router.back();
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else {
        Alert.alert(
          "Order Placed!",
          `Your order is being prepared on ${platformLabel}`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch {
      Alert.alert("Error", "Failed to place order. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Close cart"
          accessibilityRole="button"
          hitSlop={12}
        >
          <Ionicons name="close" size={28} color="#1A1A2E" />
        </Pressable>
        <Text className="text-text-primary text-lg font-inter-bold">
          Your Cart
        </Text>
        <View className="w-7" />
      </View>

      {isLoading ? (
        <View className="px-5 pt-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="flex-row items-center gap-3">
              <Skeleton width={24} height={24} borderRadius={4} />
              <View className="flex-1 gap-2">
                <Skeleton width="70%" height={14} />
                <Skeleton width="30%" height={10} />
              </View>
              <Skeleton width={50} height={14} />
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
          <Text className="text-text-secondary text-base font-inter-medium mt-4 text-center">
            Your cart is empty
          </Text>
          <Text className="text-text-secondary text-sm font-inter mt-2 text-center">
            Generate a meal plan and order groceries from the home screen
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Go back to home"
            accessibilityRole="button"
            className="mt-4 px-6 py-3 rounded-xl"
            style={{ backgroundColor: "#FF6B35" }}
          >
            <Text className="text-white text-sm font-semibold">Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-48"
          >
            {allFresh ? (
              <CategorySection
                title="Fresh Ingredients"
                items={freshItems}
                icon="leaf"
                color="#10B981"
              />
            ) : (
              <>
                <CategorySection
                  title="Fresh Ingredients"
                  items={freshItems}
                  icon="leaf"
                  color="#10B981"
                />
                <CategorySection
                  title="Restock Items"
                  items={restockItems}
                  icon="refresh"
                  color="#F59E0B"
                />
              </>
            )}
          </ScrollView>

          {/* Bottom summary */}
          <View
            className="absolute bottom-0 left-0 right-0 bg-surface px-5 pt-4 pb-10 rounded-t-3xl"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 12,
            }}
          >
            <View className="mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-sm font-inter">
                  Subtotal
                </Text>
                <Text className="text-text-primary text-sm font-inter-medium">
                  Rs. {Number(subtotal).toFixed(0)}
                </Text>
              </View>
              {discount > 0 && (
                <View className="flex-row justify-between mb-1">
                  <View className="flex-row items-center">
                    <Text className="text-success text-sm font-inter">
                      Coupon Discount
                    </Text>
                    {couponCode && (
                      <View className="bg-success/10 rounded px-1.5 py-0.5 ml-2">
                        <Text className="text-success text-xs font-inter-medium">
                          {couponCode}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-success text-sm font-inter-medium">
                    - Rs. {Number(discount).toFixed(0)}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-100">
                <Text className="text-text-primary text-base font-inter-bold">
                  Total
                </Text>
                <Text className="text-text-primary text-base font-inter-bold">
                  Rs. {Number(total).toFixed(0)}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleCheckout}
              accessibilityLabel={`Order on ${platformLabel}`}
              accessibilityRole="button"
              className="bg-primary py-4 rounded-2xl flex-row items-center justify-center"
              style={{
                shadowColor: "#FF6B35",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons name={orderStatus === "user_approved" ? "open-outline" : "cart"} size={20} color="white" />
              <Text className="text-white text-base font-inter-bold ml-2">
                {orderStatus === "user_approved" ? `Open in ${platformLabel}` : `Order on ${platformLabel}`}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
