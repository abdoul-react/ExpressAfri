import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useColors, radius } from '@/design-system';

type Props = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width, height = 20, borderRadius = radius.sm, style }: Props) {
  const colors = useColors();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.35, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[{ width, height }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            backgroundColor: colors.border,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

export function SkeletonCircle({ size = 54 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
}
