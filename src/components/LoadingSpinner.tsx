import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, Image } from 'react-native';

const GolaksIcon = require('../assets/images/icon.png');

interface LoadingSpinnerProps {
  size?: number;
}

export default function LoadingSpinner({ size = 80 }: LoadingSpinnerProps) {

  // Logo animations
  const logoScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Gentle breathing pulse for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 0.95,
          duration: 1500,
          easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Main logo with animations */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={GolaksIcon}
          style={[styles.logoImage, { width: size, height: size }]}
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
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    opacity: 0.9,
  },
});
