import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ChipOption {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ChipSelectProps {
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  multiSelect?: boolean;
}

export function ChipSelect({
  options,
  selected,
  onToggle,
  multiSelect = true,
}: ChipSelectProps) {
  const handlePress = (value: string) => {
    if (!multiSelect) {
      onToggle(value);
      return;
    }
    onToggle(value);
  };

  return (
    <View className="flex-row flex-wrap gap-3">
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => handlePress(option.value)}
            className={`flex-row items-center px-4 py-3 rounded-2xl border-2 ${
              isSelected
                ? "bg-primary/10 border-primary"
                : "bg-surface border-gray-200"
            }`}
          >
            {option.icon && (
              <Ionicons
                name={option.icon}
                size={18}
                color={isSelected ? "#FF6B35" : "#6B7280"}
                style={{ marginRight: 6 }}
              />
            )}
            <Text
              className={`text-sm font-inter-medium ${
                isSelected ? "text-primary" : "text-text-secondary"
              }`}
            >
              {option.label}
            </Text>
            {isSelected && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#FF6B35"
                style={{ marginLeft: 6 }}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
