import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { userService } from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";

const PLATFORMS = [
  {
    value: "swiggy",
    label: "Swiggy Instamart",
    color: "#FC8019",
  },
  {
    value: "blinkit",
    label: "Blinkit",
    color: "#F8CB46",
  },
  {
    value: "zepto",
    label: "Zepto",
    color: "#7B2FF2",
  },
];

const ALERT_TIMES = [
  { value: "06:00", label: "6:00 AM" },
  { value: "06:30", label: "6:30 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "07:30", label: "7:30 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "08:30", label: "8:30 AM" },
  { value: "09:00", label: "9:00 AM" },
];

export default function PlatformScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuthStore();
  const [platform, setPlatform] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [alertTime, setAlertTime] = useState("07:00");
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!platform) return;
    setSaving(true);
    try {
      await userService.updateProfile({
        preferredPlatform: platform,
        deliveryAddress: address || undefined,
        alertTime: alertTime,
      });
      completeOnboarding();
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-6 pt-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View className="flex-row gap-1.5 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <View key={step} className="flex-1 h-1 rounded-full bg-primary" />
          ))}
        </View>

        {/* Back */}
        <Pressable onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </Pressable>

        <Text className="text-text-primary text-2xl font-inter-bold mb-2">
          Almost done!
        </Text>
        <Text className="text-text-secondary text-base font-inter mb-8">
          Set up your grocery delivery preferences
        </Text>

        {/* Platform */}
        <Text className="text-text-primary text-sm font-inter-medium mb-3">
          Grocery Platform
        </Text>
        <View className="gap-3 mb-6">
          {PLATFORMS.map((p) => (
            <Pressable
              key={p.value}
              onPress={() => setPlatform(p.value)}
              className={`flex-row items-center p-4 rounded-2xl border-2 ${
                platform === p.value
                  ? "border-primary bg-primary/5"
                  : "border-gray-100 bg-surface"
              }`}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: `${p.color}20` }}
              >
                <Ionicons name="cart-outline" size={20} color={p.color} />
              </View>
              <Text className="text-text-primary text-base font-inter-semibold flex-1">
                {p.label}
              </Text>
              {platform === p.value && (
                <Ionicons name="checkmark-circle" size={22} color="#FF6B35" />
              )}
            </Pressable>
          ))}
        </View>

        {/* Address */}
        <View className="mb-6">
          <Text className="text-text-primary text-sm font-inter-medium mb-2">
            Delivery Address
          </Text>
          <TextInput
            className="bg-surface border border-gray-200 rounded-xl px-4 py-3.5 text-text-primary text-base font-inter"
            placeholder="Enter your delivery address"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Alert Time */}
        <View className="mb-8">
          <Text className="text-text-primary text-sm font-inter-medium mb-3">
            Morning Alert Time
          </Text>
          <Text className="text-text-secondary text-xs font-inter mb-3">
            We'll send your daily meal plan and cart at this time
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {ALERT_TIMES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setAlertTime(t.value)}
                  className={`px-4 py-2.5 rounded-xl ${
                    alertTime === t.value
                      ? "bg-primary"
                      : "bg-surface border border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-inter-medium ${
                      alertTime === t.value ? "text-white" : "text-text-secondary"
                    }`}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <View className="px-6 pb-8">
        <Pressable
          onPress={handleFinish}
          disabled={!platform || saving}
          className={`py-4 rounded-2xl items-center ${
            platform && !saving ? "bg-primary" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-base font-inter-semibold ${
              platform && !saving ? "text-white" : "text-gray-400"
            }`}
          >
            {saving ? "Setting up..." : "Start My Meal Plans"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
