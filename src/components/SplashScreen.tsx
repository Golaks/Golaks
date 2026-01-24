import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const GolaksLogo = require('../assets/images/golaks-logo.png');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const { isDark } = useTheme();

  // Simple logo animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Orbital dots animations
  const orbitRotate = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  // Dark mode gradient colors
  const gradientColors = isDark
    ? ['#0F172A', '#1E293B', '#1E3A5F', '#0F172A']
    : ['#E0F2FE', '#DBEAFE', '#EFF6FF', '#F0F9FF'];

  useEffect(() => {
    // Logo entrance animation (fade in + scale)
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 15,
        stiffness: 100,
        mass: 1,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Gentle breathing pulse for logo
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.02,
            duration: 2500,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 2500,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Fade in dots
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      // Orbital rotation animation
      Animated.loop(
        Animated.timing(orbitRotate, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });

    // Complete animation
    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const orbitRotateInterpolate = orbitRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const styles = createStyles(isDark);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated background orbs */}
        <View style={styles.backgroundOrbs}>
          <View style={[styles.orb, styles.orb1]} />
          <View style={[styles.orb, styles.orb2]} />
          <View style={[styles.orb, styles.orb3]} />
        </View>

        {/* Main logo with animations */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <Image source={GolaksLogo} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>

        {/* Orbital dots container */}
        <Animated.View
          style={[
            styles.orbitalContainer,
            {
              opacity: dotsOpacity,
              transform: [{ rotate: orbitRotateInterpolate }],
            },
          ]}
        >
          <View style={[styles.dot, styles.dotPosition1]} />
          <View style={[styles.dot, styles.dotPosition2]} />
          <View style={[styles.dot, styles.dotPosition3]} />
          <View style={[styles.dot, styles.dotPosition4]} />
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundOrbs: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: isDark ? 0.2 : 0.15,
  },
  orb1: {
    width: 400,
    height: 400,
    backgroundColor: isDark ? '#1E40AF' : '#3B82F6',
    top: -200,
    right: -100,
  },
  orb2: {
    width: 300,
    height: 300,
    backgroundColor: isDark ? '#3B82F6' : '#60A5FA',
    bottom: -150,
    left: -80,
  },
  orb3: {
    width: 250,
    height: 250,
    backgroundColor: isDark ? '#60A5FA' : '#93C5FD',
    top: '40%',
    left: -125,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 280,
    height: 280,
  },
  orbitalContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: isDark ? '#60A5FA' : '#3B82F6',
    shadowColor: isDark ? '#60A5FA' : '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  dotPosition1: {
    top: 0,
    left: '50%',
    marginLeft: -5,
  },
  dotPosition2: {
    right: 0,
    top: '50%',
    marginTop: -5,
  },
  dotPosition3: {
    bottom: 0,
    left: '50%',
    marginLeft: -5,
  },
  dotPosition4: {
    left: 0,
    top: '50%',
    marginTop: -5,
  },
});
