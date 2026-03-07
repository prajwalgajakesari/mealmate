import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { userService } from "@/services/api";

const DIET_LABELS: Record<string, string> = {
  vegetarian: "Vegetarian",
  "non-veg": "Non-Vegetarian",
  vegan: "Vegan",
  jain: "Jain",
  eggetarian: "Eggetarian",
};

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Lose Weight",
  muscle_gain: "Build Muscle",
  maintenance: "Stay Healthy",
  no_preference: "No Preference",
};

const PLATFORM_LABELS: Record<string, string> = {
  swiggy: "Swiggy Instamart",
  blinkit: "Blinkit",
  zepto: "Zepto",
};

interface ProfileData {
  name?: string;
  email?: string;
  dietType?: string;
  healthGoal?: string;
  cuisinePreferences?: string[];
  heightCm?: number;
  weightKg?: number;
  age?: number;
  activityLevel?: string;
  calorieTarget?: number;
  proteinTargetG?: number;
  preferredPlatform?: string;
  deliveryAddress?: string;
  alertTime?: string;
  subscriptionPlan?: string;
}

interface ProfileSectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  onEdit?: () => void;
}

function ProfileSection({ title, icon, children, onEdit }: ProfileSectionProps) {
  return (
    <View
      className="bg-surface rounded-2xl p-4 mb-3"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name={icon} size={18} color="#FF6B35" />
          <Text className="text-text-primary text-sm font-inter-semibold ml-2">
            {title}
          </Text>
        </View>
        {onEdit && (
          <Pressable
            onPress={onEdit}
            accessibilityLabel={`Edit ${title}`}
            accessibilityRole="button"
            className="flex-row items-center"
          >
            <Ionicons name="pencil" size={14} color="#2EC4B6" />
            <Text className="text-secondary text-xs font-inter-medium ml-1">
              Edit
            </Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-text-secondary text-sm font-inter">{label}</Text>
      <Text className="text-text-primary text-sm font-inter-medium">
        {value ?? "Not set"}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await userService.getProfile();
      setProfile(response.data as ProfileData);
    } catch {
      // Profile fetch failed silently — dev user may not have full profile
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  const editNotReady = () => {
    Alert.alert("Coming Soon", "Profile editing will be available in the next update.");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
      >
        {/* Header */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-3">
            <Text className="text-primary text-2xl font-inter-bold">
              {profile?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text className="text-text-primary text-lg font-inter-bold">
            {profile?.name ?? "User"}
          </Text>
          <Text className="text-text-secondary text-sm font-inter">
            {profile?.email ?? ""}
          </Text>
        </View>

        {/* Diet & Goals */}
        <ProfileSection title="Diet Preferences" icon="nutrition" onEdit={editNotReady}>
          <InfoRow
            label="Diet Type"
            value={profile?.dietType ? DIET_LABELS[profile.dietType] ?? profile.dietType : undefined}
          />
          <InfoRow
            label="Health Goal"
            value={profile?.healthGoal ? GOAL_LABELS[profile.healthGoal] ?? profile.healthGoal : undefined}
          />
          <InfoRow
            label="Cuisines"
            value={profile?.cuisinePreferences?.join(", ") || undefined}
          />
        </ProfileSection>

        {/* Body Stats */}
        <ProfileSection title="Body Stats" icon="body" onEdit={editNotReady}>
          <InfoRow
            label="Height"
            value={profile?.heightCm ? `${profile.heightCm} cm` : undefined}
          />
          <InfoRow
            label="Weight"
            value={profile?.weightKg ? `${profile.weightKg} kg` : undefined}
          />
          <InfoRow label="Age" value={profile?.age?.toString()} />
          <InfoRow label="Activity" value={profile?.activityLevel} />
        </ProfileSection>

        {/* Nutrition Targets */}
        <ProfileSection title="Nutrition Targets" icon="analytics">
          <InfoRow
            label="Daily Calories"
            value={profile?.calorieTarget ? `${profile.calorieTarget} kcal` : undefined}
          />
          <InfoRow
            label="Daily Protein"
            value={profile?.proteinTargetG ? `${profile.proteinTargetG}g` : undefined}
          />
        </ProfileSection>

        {/* Delivery */}
        <ProfileSection title="Delivery Setup" icon="cart" onEdit={editNotReady}>
          <InfoRow
            label="Platform"
            value={
              profile?.preferredPlatform
                ? PLATFORM_LABELS[profile.preferredPlatform] ?? profile.preferredPlatform
                : undefined
            }
          />
          <InfoRow label="Address" value={profile?.deliveryAddress} />
          <InfoRow label="Alert Time" value={profile?.alertTime} />
        </ProfileSection>

        {/* Subscription */}
        <ProfileSection title="Subscription" icon="diamond">
          <InfoRow
            label="Plan"
            value={profile?.subscriptionPlan ?? "Free Trial"}
          />
        </ProfileSection>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          accessibilityLabel="Logout"
          accessibilityRole="button"
          className="flex-row items-center justify-center py-4 mt-4"
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text className="text-red-500 text-base font-inter-semibold ml-2">
            Logout
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
