import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { mealService } from "@/services/api";
import type { Meal } from "@/store/usePlanStore";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  meals: Meal[];
}

type Rating = "up" | "down" | null;

export function FeedbackModal({ visible, onClose, meals }: FeedbackModalProps) {
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setRating = (mealId: string, rating: Rating) => {
    setRatings((prev) => ({
      ...prev,
      [mealId]: prev[mealId] === rating ? null : rating,
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const promises = Object.entries(ratings)
        .filter(([, r]) => r !== null)
        .map(([mealId, r]) =>
          mealService.rateMeal(mealId, {
            rating: r === "up" ? 1 : -1,
            feedback: comment || undefined,
          })
        );
      await Promise.all(promises);
      setRatings({});
      setComment("");
      onClose();
    } catch {
      // Silently fail, user can retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end"
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-surface rounded-t-3xl px-6 pt-6 pb-10">
          <View className="items-center mb-4">
            <View className="w-10 h-1 bg-gray-300 rounded-full" />
          </View>

          <Text className="text-text-primary text-lg font-inter-bold text-center mb-1">
            How were today's meals?
          </Text>
          <Text className="text-text-secondary text-sm font-inter text-center mb-6">
            Your feedback helps us personalize better
          </Text>

          {meals.map((meal) => (
            <View
              key={meal.id}
              className="flex-row items-center justify-between py-3 border-b border-gray-100"
            >
              <View className="flex-1">
                <Text className="text-text-secondary text-xs font-inter-medium uppercase">
                  {meal.type}
                </Text>
                <Text
                  className="text-text-primary text-sm font-inter-semibold"
                  numberOfLines={1}
                >
                  {meal.name}
                </Text>
              </View>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setRating(meal.id, "up")}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    ratings[meal.id] === "up"
                      ? "bg-success/20"
                      : "bg-gray-100"
                  }`}
                >
                  <Ionicons
                    name="thumbs-up"
                    size={20}
                    color={
                      ratings[meal.id] === "up" ? "#10B981" : "#6B7280"
                    }
                  />
                </Pressable>
                <Pressable
                  onPress={() => setRating(meal.id, "down")}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    ratings[meal.id] === "down"
                      ? "bg-red-100"
                      : "bg-gray-100"
                  }`}
                >
                  <Ionicons
                    name="thumbs-down"
                    size={20}
                    color={
                      ratings[meal.id] === "down" ? "#EF4444" : "#6B7280"
                    }
                  />
                </Pressable>
              </View>
            </View>
          ))}

          <TextInput
            className="bg-gray-50 rounded-xl p-4 mt-4 text-text-primary text-sm font-inter"
            placeholder="Any suggestions? (optional)"
            placeholderTextColor="#9CA3AF"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            className={`mt-4 py-4 rounded-2xl items-center ${
              submitting ? "bg-primary/50" : "bg-primary"
            }`}
          >
            <Text className="text-white text-base font-inter-semibold">
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
