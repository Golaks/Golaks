import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, Image } from 'react-native';

const GolaksIcon = require('../assets/images/icon.png');

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export default function LoadingSpinner({ size = 80, color }: LoadingSpinnerProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation (scale)
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.2,
          duration: 750,
          easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 750,
          easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const iconSize = size * 0.8; // Icon'u %80 boyutunda göster

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <Image
          source={GolaksIcon}
          style={[styles.icon, { width: iconSize, height: iconSize }]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    opacity: 0.9,
  },
});
