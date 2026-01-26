/**
 * Golaks Mobile App
 * React Native TypeScript
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AlertProvider } from './src/contexts/AlertContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import SplashScreen from './src/components/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import MainNavigator from './src/navigation/MainNavigator';

type Screen = 'splash' | 'login' | 'forgot-password' | 'home';

function AppContent(): React.JSX.Element {
  const { isDark, colors } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check authentication after splash
    if (!showSplash && !isLoading) {
      if (isAuthenticated) {
        setCurrentScreen('home');
      } else {
        setCurrentScreen('login');
      }
    }
  }, [isAuthenticated, isLoading, showSplash]);

  const handleSplashComplete = () => {
    setShowSplash(false);
    // Will trigger useEffect to check auth
  };

  const handleLoginSuccess = () => {
    setCurrentScreen('home');
  };

  const handleForgotPassword = () => {
    setCurrentScreen('forgot-password');
  };

  const handleBackToLogin = () => {
    setCurrentScreen('login');
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

  // Show loading spinner while checking auth
  if (isLoading && !showSplash) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onAnimationComplete={handleSplashComplete} />;
      case 'login':
        return (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onForgotPassword={handleForgotPassword}
          />
        );
      case 'forgot-password':
        return <ForgotPasswordScreen onBackToLogin={handleBackToLogin} />;
      case 'home':
        return <MainNavigator onLogout={handleLogout} />;
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
      {renderScreen()}
    </SafeAreaProvider>
  );
}

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
          <AppContent />
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
