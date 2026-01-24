import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  Image,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import Input from '../components/Input';

const GolaksLogo = require('../assets/images/golaks-logo.png');

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [companyId, setCompanyId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { colors, isDark, theme, setTheme } = useTheme();

  // Animation values
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const companyAnim = useRef(new Animated.Value(0)).current;
  const usernameAnim = useRef(new Animated.Value(0)).current;
  const passwordAnim = useRef(new Animated.Value(0)).current;
  const optionsAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  const styles = createStyles(colors, isDark);

  useEffect(() => {
    // Staggered entrance animations
    Animated.stagger(100, [
      Animated.spring(logoAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 90,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(companyAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(usernameAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(passwordAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(optionsAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!companyId || !username || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurunuz.');
      return;
    }

    setIsLoading(true);

    // Simulated login - replace with actual API call
    // Backend'e gönderilecek: { companyId, username, password }
    setTimeout(() => {
      setIsLoading(false);

      // For demo purposes, accept any credentials
      if (companyId && username && password) {
        onLoginSuccess();
      } else {
        Alert.alert('Hata', 'Geçersiz giriş bilgileri.');
      }
    }, 1500);
  };

  const createAnimatedStyle = (anim: Animated.Value, direction: 'up' | 'down' = 'down') => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [direction === 'down' ? 20 : -20, 0],
        }),
      },
    ],
  });

  // Dark mode gradient colors
  const gradientColors = isDark
    ? ['#0F172A', '#1E293B', '#1E3A5F']
    : ['#E0F2FE', '#DBEAFE', '#EFF6FF'];

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Decorative circles */}
      <View style={styles.backgroundOrbs}>
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Login Card */}
          <Animated.View
            style={[styles.card, createAnimatedStyle(cardAnim, 'up')]}
          >
            {/* Logo */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoAnim,
                  transform: [{ scale: logoAnim }],
                },
              ]}
            >
              <Image source={GolaksLogo} style={styles.logoImage} resizeMode="contain" />
            </Animated.View>

            {/* Welcome Text */}
            <View style={styles.headerContainer}>
              <Text style={styles.welcomeText}>Tekrar Hoş Geldiniz</Text>
              <Text style={styles.welcomeSubtext}>
                Devam etmek için giriş yapın
              </Text>
            </View>

            {/* Company ID Input */}
            <Animated.View style={createAnimatedStyle(companyAnim)}>
              <Input
                label="Firma ID"
                icon="business-outline"
                placeholder="Örn: app, test, client1"
                value={companyId}
                onChangeText={setCompanyId}
                autoCapitalize="none"
              />
            </Animated.View>

            {/* Username Input */}
            <Animated.View style={createAnimatedStyle(usernameAnim)}>
              <Input
                label="Kullanıcı Adı"
                icon="person-outline"
                placeholder="Kullanıcı adınızı girin"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </Animated.View>

            {/* Password Input */}
            <Animated.View style={createAnimatedStyle(passwordAnim)}>
              <Input
                label="Şifre"
                icon="lock-closed-outline"
                placeholder="Şifrenizi girin"
                value={password}
                onChangeText={setPassword}
                isPassword
                autoCapitalize="none"
              />
            </Animated.View>

            {/* Remember Me & Forgot Password */}
            <Animated.View
              style={[styles.optionsContainer, createAnimatedStyle(optionsAnim)]}
            >
              <Pressable
                onPress={() => setRememberMe(!rememberMe)}
                style={styles.rememberMeContainer}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Beni Hatırla</Text>
              </Pressable>

              <Pressable onPress={() => Alert.alert('Bilgi', 'Şifre sıfırlama özelliği yakında eklenecek.')}>
                <Text style={styles.forgotPassword}>Şifremi Unuttum</Text>
              </Pressable>
            </Animated.View>

            {/* Login Button */}
            <Animated.View style={[createAnimatedStyle(buttonAnim), { marginBottom: 20 }]}>
              <Button
                onPress={handleLogin}
                text="Giriş Yap"
                icon="log-in-outline"
                loading={isLoading}
                fullWidth={true}
              />
            </Animated.View>

            {/* Theme Switcher */}
            <Animated.View style={[styles.themeSwitcherContainer, createAnimatedStyle(footerAnim)]}>
              <View style={styles.themeSwitcherCard}>
                <Pressable
                  onPress={() => setTheme('light')}
                  style={[
                    styles.themeButtonCard,
                    theme === 'light' && styles.themeButtonCardActive,
                  ]}
                >
                  <Icon
                    name="sunny"
                    size={18}
                    color={theme === 'light' ? colors.primary : colors.textSecondary}
                  />
                </Pressable>

                <Pressable
                  onPress={() => setTheme('dark')}
                  style={[
                    styles.themeButtonCard,
                    theme === 'dark' && styles.themeButtonCardActive,
                  ]}
                >
                  <Icon
                    name="moon"
                    size={18}
                    color={theme === 'dark' ? colors.primary : colors.textSecondary}
                  />
                </Pressable>
              </View>
            </Animated.View>

            {/* Copyright */}
            <Animated.View
              style={[styles.copyrightContainer, createAnimatedStyle(footerAnim)]}
            >
              <Text style={styles.copyrightText}>
                © 2026 Golaks. Tüm hakları saklıdır.
              </Text>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
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
    opacity: isDark ? 0.15 : 0.1,
  },
  orb1: {
    width: 300,
    height: 300,
    backgroundColor: isDark ? '#3B82F6' : '#3B82F6',
    top: -100,
    right: -80,
  },
  orb2: {
    width: 250,
    height: 250,
    backgroundColor: isDark ? '#1E40AF' : '#60A5FA',
    bottom: -80,
    left: -60,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: -35,
    marginBottom: -45,
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 12,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.border : 'transparent',
  },
  headerContainer: {
    marginBottom: 28,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  welcomeSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 5,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  forgotPassword: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  themeSwitcherContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  themeSwitcherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  themeButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  themeButtonCardActive: {
    backgroundColor: isDark ? colors.card : '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  copyrightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
