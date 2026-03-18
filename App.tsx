/**
 * Golaks Mobile App
 * React Native TypeScript
 *
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, View, ActivityIndicator, Platform } from 'react-native';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AlertProvider } from './src/contexts/AlertContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import SplashScreen from './src/components/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import MainNavigator, { MainNavigatorRef } from './src/navigation/MainNavigator';
import pushNotificationService from './src/services/pushNotification.service';

type Screen = 'splash' | 'login' | 'forgot-password' | 'home';

function AppContent(): React.JSX.Element {
  const { isDark, colors } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [showSplash, setShowSplash] = useState(true);
  const navigatorRef = useRef<MainNavigatorRef>(null);

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

  // Handle notification tap - navigate to notifications screen
  useEffect(() => {
    if (!isAuthenticated) return;

    const goToNotifications = () => {
      setCurrentScreen('home');
      setTimeout(() => navigatorRef.current?.navigateTo('notifications'), 100);
    };

    // App opened from background by tapping notification
    const unsubscribe = pushNotificationService.onNotificationOpenedApp(goToNotifications);

    // App was closed, opened by tapping notification
    pushNotificationService.getInitialNotification().then((message) => {
      if (message) {
        goToNotifications();
      }
    });

    return unsubscribe;
  }, [isAuthenticated]);

  // In-app update check
  useEffect(() => {
    if (currentScreen !== 'home') return;

    const checkUpdate = async () => {
      try {
        const inAppUpdates = new SpInAppUpdates(false);
        const result = await inAppUpdates.checkNeedsUpdate();
        if (result.shouldUpdate) {
          await inAppUpdates.startUpdate({
            updateType: Platform.OS === 'android'
              ? IAUUpdateKind.FLEXIBLE
              : IAUUpdateKind.IMMEDIATE,
          });
        }
      } catch (_e) {
        // Silently fail - update check is not critical
      }
    };

    checkUpdate();
  }, [currentScreen]);

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
        return <MainNavigator ref={navigatorRef} onLogout={handleLogout} />;
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
