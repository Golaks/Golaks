/**
 * Golaks Mobile App
 * React Native TypeScript
 *
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, View, ActivityIndicator, Platform, Modal, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AlertProvider } from './src/contexts/AlertContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { API_ENDPOINTS } from './src/constants/ApiConfig';
import SplashScreen from './src/components/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import MainNavigator, { MainNavigatorRef } from './src/navigation/MainNavigator';
import pushNotificationService from './src/services/pushNotification.service';
import { HelpProvider } from './src/lib/helpContext';
import HelpBottomSheet from './src/components/HelpBottomSheet';

type Screen = 'splash' | 'login' | 'forgot-password' | 'home';

function AppContent(): React.JSX.Element {
  const { isDark, colors } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [showSplash, setShowSplash] = useState(true);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [upToDateVisible, setUpToDateVisible] = useState(false);
  const [updateStoreUrl, setUpdateStoreUrl] = useState('');
  const [updateMinVersion, setUpdateMinVersion] = useState('');
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

  const checkUpdate = async (manual = false) => {
    try {
      const version = DeviceInfo.getVersion();
      const platform = Platform.OS;
      const res = await fetch(
        `${API_ENDPOINTS.VERSION_CHECK}?platform=${platform}&version=${version}`,
      );
      const data = await res.json();
      if (!data.success || !data.data) return;
      const d = data.data;

      // 1) Zorunlu güncelleme (min sürüm altındaysa)
      if (d.needsUpdate) {
        setUpdateMinVersion(d.minVersion);
        setUpdateStoreUrl(d.storeUrl);
        setUpdateModalVisible(true);
        return;
      }

      // 2) Mağazada yeni sürüm var (önerilen güncelleme)
      if (d.isOutdated && d.latestVersion) {
        setUpdateMinVersion(d.latestVersion);
        setUpdateStoreUrl(d.storeUrl);
        setUpdateModalVisible(true);
        return;
      }

      // 3) Güncel - sadece manuel kontrolde göster
      if (manual) {
        setUpdateMinVersion(version);
        setUpdateModalVisible(false);
        setUpToDateVisible(true);
      }
    } catch {}
  };

  // Otomatik güncelleme kontrolü
  useEffect(() => {
    if (currentScreen !== 'home') return;
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
        return <MainNavigator ref={navigatorRef} onLogout={handleLogout} onCheckUpdate={() => checkUpdate(true)} />;
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

      {/* Güncelleme Modalı */}
      <Modal visible={updateModalVisible} transparent animationType="fade">
        <View style={updateStyles.overlay}>
          <View style={[updateStyles.content, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={updateStyles.iconWrapper}>
              <Icon name="arrow-up-circle" size={48} color="#3B82F6" />
            </View>
            <Text style={[updateStyles.title, { color: colors.text }]}>Güncelleme Mevcut</Text>
            <Text style={[updateStyles.message, { color: colors.textSecondary }]}>
              Yeni bir sürüm yayınlandı (v{updateMinVersion}).{'\n'}
              Daha iyi bir deneyim için lütfen uygulamayı güncelleyin.
            </Text>
            <Pressable
              style={updateStyles.updateButton}
              onPress={() => {
                setUpdateModalVisible(false);
                Linking.openURL(updateStoreUrl);
              }}
            >
              <Icon name="download-outline" size={20} color="#FFFFFF" />
              <Text style={updateStyles.updateButtonText}>Güncelle</Text>
            </Pressable>
            <Pressable
              style={updateStyles.laterButton}
              onPress={() => setUpdateModalVisible(false)}
            >
              <Text style={[updateStyles.laterButtonText, { color: colors.textSecondary }]}>Daha Sonra</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Güncel Modalı */}
      <Modal visible={upToDateVisible} transparent animationType="fade">
        <View style={updateStyles.overlay}>
          <View style={[updateStyles.content, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={updateStyles.iconWrapper}>
              <Icon name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <Text style={[updateStyles.title, { color: colors.text }]}>Uygulamanız Güncel</Text>
            <Text style={[updateStyles.message, { color: colors.textSecondary }]}>
              En son sürümü kullanıyorsunuz (v{DeviceInfo.getVersion()}).
            </Text>
            <Pressable
              style={[updateStyles.updateButton, { backgroundColor: '#22C55E' }]}
              onPress={() => setUpToDateVisible(false)}
            >
              <Icon name="checkmark" size={20} color="#FFFFFF" />
              <Text style={updateStyles.updateButtonText}>Tamam</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <HelpBottomSheet />
    </SafeAreaProvider>
  );
}

const updateStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  laterButton: {
    marginTop: 12,
    paddingVertical: 10,
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
          <HelpProvider>
            <AppContent />
          </HelpProvider>
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
