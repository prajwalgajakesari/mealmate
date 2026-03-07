import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  className,
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={className}
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: "#E5E7EB",
        },
        animatedStyle,
      ]}
    />
  );
}

export function MealCardSkeleton() {
  return (
    <View className="bg-surface rounded-2xl p-4 mb-3">
      <Skeleton width={80} height={12} className="mb-3" />
      <View className="flex-row">
        <Skeleton width={64} height={64} borderRadius={12} />
        <View className="flex-1 ml-3">
          <Skeleton width="70%" height={16} className="mb-2" />
          <Skeleton width="40%" height={14} className="mb-2" />
          <Skeleton width="90%" height={12} />
        </View>
      </View>
    </View>
  );
}
