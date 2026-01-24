/**
 * Golaks Mobile App
 * React Native TypeScript
 *
 * @format
 */

import React, { useState } from 'react';
import { StatusBar, StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AlertProvider } from './src/contexts/AlertContext';
import SplashScreen from './src/components/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';

type Screen = 'splash' | 'login' | 'home';

function AppContent(): React.JSX.Element {
  const { isDark, colors } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');

  const handleSplashComplete = () => {
    setCurrentScreen('login');
  };

  const handleLoginSuccess = () => {
    setCurrentScreen('home');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onAnimationComplete={handleSplashComplete} />;
      case 'login':
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
      case 'home':
        return (
          <View style={[styles.homeContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.homeText, { color: colors.text }]}>
              Hoş Geldiniz! 🎉
            </Text>
            <Text style={[styles.homeSubtext, { color: colors.textSecondary }]}>
              Ana ekran burada görüntülenecek
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.container}>{renderScreen()}</View>
    </SafeAreaProvider>
  );
}

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AlertProvider>
        <AppContent />
      </AlertProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  homeText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  homeSubtext: {
    fontSize: 16,
  },
});
