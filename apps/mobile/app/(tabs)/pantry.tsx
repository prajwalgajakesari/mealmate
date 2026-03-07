import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  SectionList,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pantryService } from "@/services/api";
import { Skeleton } from "@/components/SkeletonLoader";

interface PantryItem {
  id: string;
  name: string;
  status: "stocked" | "running_low" | "empty";
  last_ordered?: string;
  estimated_remaining?: string;
  category?: string;
}

interface SectionData {
  title: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  data: PantryItem[];
}

const STATUS_CONFIG: Record<
  string,
  { title: string; color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  stocked: {
    title: "Stocked",
    color: "#10B981",
    bgColor: "#D1FAE5",
    icon: "checkmark-circle",
  },
  running_low: {
    title: "Running Low",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    icon: "alert-circle",
  },
  empty: {
    title: "Empty",
    color: "#EF4444",
    bgColor: "#FEE2E2",
    icon: "close-circle",
  },
};

export default function PantryScreen() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const response = await pantryService.getItems();
      const data = response.data as {
        stocked?: Array<{ id: string; ingredient_name: string; status: string; category?: string; estimated_servings_remaining?: number }>;
        low?: Array<{ id: string; ingredient_name: string; status: string; category?: string; estimated_servings_remaining?: number }>;
        empty?: Array<{ id: string; ingredient_name: string; status: string; category?: string; estimated_servings_remaining?: number }>;
        unknown?: Array<{ id: string; ingredient_name: string; status: string; category?: string; estimated_servings_remaining?: number }>;
      };
      const allItems: PantryItem[] = [
        ...(data.stocked ?? []),
        ...(data.low ?? []),
        ...(data.empty ?? []),
        ...(data.unknown ?? []),
      ].map((item) => ({
        id: item.id,
        name: item.ingredient_name,
        status: (item.status === "in_stock" ? "stocked" : item.status === "low" ? "running_low" : item.status === "empty" ? "empty" : "stocked") as PantryItem["status"],
        category: item.category,
        estimated_remaining: item.estimated_servings_remaining ? `${item.estimated_servings_remaining} servings` : undefined,
      }));
      setItems(allItems);
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const sections: SectionData[] = (["stocked", "running_low", "empty"] as const)
    .map((status) => ({
      title: STATUS_CONFIG[status].title,
      color: STATUS_CONFIG[status].color,
      icon: STATUS_CONFIG[status].icon,
      data: items.filter((item) => item.status === status),
    }))
    .filter((section) => section.data.length > 0);

  const renderItem = ({ item }: { item: PantryItem }) => {
    const config = STATUS_CONFIG[item.status];
    return (
      <View
        className="bg-surface rounded-xl p-4 mb-2 flex-row items-center"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <View
          className="w-10 h-10 rounded-lg items-center justify-center mr-3"
          style={{ backgroundColor: config.bgColor }}
        >
          <Ionicons name="nutrition" size={20} color={config.color} />
        </View>
        <View className="flex-1">
          <Text className="text-text-primary text-sm font-inter-semibold">
            {item.name}
          </Text>
          <View className="flex-row mt-1 gap-3">
            {item.last_ordered && (
              <Text className="text-text-secondary text-xs font-inter">
                Ordered: {item.last_ordered}
              </Text>
            )}
            {item.estimated_remaining && (
              <Text className="text-text-secondary text-xs font-inter">
                ~{item.estimated_remaining} left
              </Text>
            )}
          </View>
        </View>
        <View
          className="px-2.5 py-1 rounded-full"
          style={{ backgroundColor: config.bgColor }}
        >
          <Text
            className="text-xs font-inter-medium"
            style={{ color: config.color }}
          >
            {config.title}
          </Text>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View className="flex-row items-center mb-2 mt-4">
      <Ionicons name={section.icon} size={18} color={section.color} />
      <Text
        className="text-sm font-inter-bold ml-2"
        style={{ color: section.color }}
      >
        {section.title}
      </Text>
      <Text className="text-text-secondary text-xs font-inter ml-2">
        ({section.data.length})
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-text-primary text-xl font-inter-bold">
          Pantry
        </Text>
        <Text className="text-text-secondary text-sm font-inter mt-1">
          Track your kitchen inventory
        </Text>
      </View>

      {isLoading ? (
        <View className="px-5 pt-4 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="flex-row items-center gap-3">
              <Skeleton width={40} height={40} borderRadius={8} />
              <View className="flex-1 gap-2">
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={10} />
              </View>
            </View>
          ))}
        </View>
      ) : sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B35"
            />
          }
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
          <Text className="text-text-secondary text-base font-inter-medium mt-4 text-center">
            Your pantry is empty
          </Text>
          <Text className="text-text-secondary text-sm font-inter mt-2 text-center">
            Items will appear here after your first order
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
