import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { useFormValidation } from '../hooks/useFormValidation';
import { API_ENDPOINTS } from '../constants/ApiConfig';

const GolaksLogo = require('../assets/images/golaks-logo.png');

type Step = 'email' | 'code' | 'password' | 'success';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const [step, setStep] = useState<Step>('email');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { colors, isDark } = useTheme();
  const { showSuccess, showError } = useAlert();

  // Form validation
  const { fields, setValue, validateForm } = useFormValidation({
    email: '',
  });

  // Animation values
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  // Code input refs
  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  const styles = createStyles(colors, isDark);

  useEffect(() => {
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
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Focus first code input when code step is shown
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 300);
    }
  }, [step]);

  // Step 1: Send reset code to email
  const handleSendCode = async () => {
    const isValid = validateForm({
      email: [
        { required: true, message: 'E-posta gereklidir' },
        { email: true, message: 'Geçerli bir e-posta adresi giriniz' },
      ],
    });

    if (!isValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.PASSWORD_RESET, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'request',
          email: fields.email.value,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('code');
        showSuccess(data.message || 'Doğrulama kodu e-posta adresinize gönderildi!');
      } else {
        showError(data.error?.message || 'Bir hata oluştu');
      }
    } catch (error) {
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify the 6-digit code
  const handleVerifyCode = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || code.join('');
    if (fullCode.length !== 6) {
      showError('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.PASSWORD_RESET, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify',
          email: fields.email.value,
          code: fullCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Kod geçerli, şifre adımına geç
        setStep('password');
        showSuccess('Kod doğrulandı, yeni şifrenizi belirleyin');
      } else {
        // Kod geçersiz
        // Kodu temizle
        setCode(['', '', '', '', '', '']);
        showError(data.error?.message || 'Geçersiz veya süresi dolmuş kod');
        // Alert kapandıktan sonra focus geri ilk kutuya
        setTimeout(() => {
          codeInputRefs.current[0]?.focus();
        }, 500);
      }
    } catch (error) {
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
      // Alert kapandıktan sonra focus geri ilk kutuya
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set new password
  const handleResetPassword = async () => {
    const fullCode = code.join('');

    if (fullCode.length !== 6) {
      showError('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      showError('Lütfen tüm alanları doldurun.');
      return;
    }

    if (newPassword.length < 6) {
      showError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Şifreler eşleşmiyor.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.PASSWORD_RESET, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset',
          email: fields.email.value,
          code: fullCode,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
        showSuccess(data.message || 'Şifreniz başarıyla güncellendi!');
      } else {
        showError(data.error?.message || 'Kod geçersiz veya süresi dolmuş');
      }
    } catch (error) {
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle code input
  const handleCodeChange = (value: string, index: number) => {
    // Sadece rakam kabul et
    if (value && !/^\d+$/.test(value)) {
      return;
    }

    if (value.length > 1) {
      // Handle paste - sadece rakamları al
      const pastedCode = value.slice(0, 6).split('').filter(char => /^\d$/.test(char));
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (i < 6) newCode[i] = char;
      });
      setCode(newCode);
      if (pastedCode.length === 6) {
        codeInputRefs.current[5]?.blur();
        // Auto-verify pasted code
        handleVerifyCode(newCode.join(''));
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    } else if (value && index === 5) {
      // Son rakam girildi, otomatik doğrula
      codeInputRefs.current[5]?.blur();
      handleVerifyCode(newCode.join(''));
    }
  };

  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      // Mevcut kutu boşsa önceki kutuya geç ve orayı sil
      if (!code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        setTimeout(() => {
          codeInputRefs.current[index - 1]?.focus();
        }, 10);
      }
    }
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

  const gradientColors = isDark
    ? ['#0F172A', '#1E293B', '#1E3A5F']
    : ['#E0F2FE', '#DBEAFE', '#EFF6FF'];

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, step === 'email' && styles.stepDotActive]} />
      <View style={[styles.stepLine, (step === 'code' || step === 'password' || step === 'success') && styles.stepLineActive]} />
      <View style={[styles.stepDot, (step === 'code' || step === 'password' || step === 'success') && styles.stepDotActive]} />
      <View style={[styles.stepLine, (step === 'password' || step === 'success') && styles.stepLineActive]} />
      <View style={[styles.stepDot, (step === 'password' || step === 'success') && styles.stepDotActive]} />
    </View>
  );

  const renderEmailStep = () => (
    <>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Şifremi Unuttum</Text>
        <Text style={styles.headerSubtitle}>
          E-posta adresinizi girin, size doğrulama kodu gönderelim
        </Text>
      </View>

      <Animated.View style={createAnimatedStyle(contentAnim)}>
        <Input
          label="E-posta"
          icon="mail-outline"
          placeholder="ornek@golaks.com"
          value={fields.email.value}
          onChangeText={(value) => setValue('email', value)}
          error={fields.email.error}
          shake={fields.email.shake}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Animated.View>

      <Button
        onPress={handleSendCode}
        text="Kod Gönder"
        icon="paper-plane-outline"
        loading={isLoading}
        fullWidth={true}
      />
    </>
  );

  const renderCodeStep = () => (
    <>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Doğrulama Kodu</Text>
        <Text style={styles.headerSubtitle}>
          <Text style={styles.emailHighlight}>{fields.email.value}</Text>
        </Text>
        <Text style={[styles.headerSubtitle, { marginTop: 8 }]}>
          E-posta adresinize gönderilen 6 haneli kodu girin. Son rakamı girdiğinizde kod otomatik doğrulanacak.
        </Text>
      </View>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { codeInputRefs.current[index] = ref; }}
            style={[styles.codeInput, digit && styles.codeInputFilled]}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={(e) => handleCodeKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
          />
        ))}
      </View>

      <Button
        onPress={handleVerifyCode}
        text="Kodu Doğrula"
        icon="checkmark-circle-outline"
        loading={isLoading}
        fullWidth={true}
        style={{ marginBottom: 12 }}
      />

      <View style={styles.linkContainer}>
        <Pressable onPress={() => setStep('email')} style={styles.backLink}>
          <Icon name="arrow-back" size={16} color={colors.primary} />
          <Text style={styles.backLinkText}>E-Posta Değiştir</Text>
        </Pressable>

        <Pressable onPress={onBackToLogin} style={styles.backLink}>
          <Icon name="log-in-outline" size={16} color={colors.primary} />
          <Text style={styles.backLinkText}>Girişe Dön</Text>
        </Pressable>
      </View>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Yeni Şifre Belirle</Text>
        <Text style={styles.headerSubtitle}>
          Lütfen güvenli bir şifre oluşturun
        </Text>
      </View>

      <Input
        label="Yeni Şifre"
        icon="lock-closed-outline"
        placeholder="Yeni şifrenizi girin"
        value={newPassword}
        onChangeText={setNewPassword}
        isPassword
        autoCapitalize="none"
        containerStyle={{ marginBottom: 16 }}
      />

      <Input
        label="Şifre Tekrar"
        icon="lock-closed-outline"
        placeholder="Şifrenizi tekrar girin"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        isPassword
        autoCapitalize="none"
      />

      <Button
        onPress={handleResetPassword}
        text="Şifremi Sıfırla"
        icon="shield-checkmark-outline"
        loading={isLoading}
        fullWidth={true}
        style={{ marginBottom: 12 }}
      />

      <Pressable onPress={onBackToLogin} style={styles.backLink}>
        <Icon name="log-in-outline" size={16} color={colors.primary} />
        <Text style={styles.backLinkText}>Girişe Dön</Text>
      </Pressable>
    </>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconContainer}>
        <Icon name="checkmark-circle" size={80} color={colors.primary} />
      </View>
      <Text style={[styles.successTitle, { color: colors.primary }]}>Başarılı!</Text>
      <Text style={styles.successMessage}>
        Şifreniz başarıyla sıfırlandı. Şimdi yeni şifrenizle giriş yapabilirsiniz.
      </Text>

      <Button
        onPress={onBackToLogin}
        text="Giriş Sayfasına Dön"
        icon="log-in-outline"
        fullWidth={true}
      />
    </View>
  );

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
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
          <Animated.View style={[styles.card, createAnimatedStyle(cardAnim, 'up')]}>
            <Animated.View
              style={[
                styles.logoContainer,
                { opacity: logoAnim, transform: [{ scale: logoAnim }] },
              ]}
            >
              <Image source={GolaksLogo} style={styles.logoImage} resizeMode="contain" />
            </Animated.View>

            {step !== 'success' && renderStepIndicator()}

            {step === 'email' && renderEmailStep()}
            {step === 'code' && renderCodeStep()}
            {step === 'password' && renderPasswordStep()}
            {step === 'success' && renderSuccessStep()}

            {step === 'email' && (
              <Pressable onPress={onBackToLogin} style={[styles.backLink, { marginTop: 16 }]}>
                <Icon name="arrow-back" size={16} color={colors.primary} />
                <Text style={styles.backLinkText}>Giriş sayfasına dön</Text>
              </Pressable>
            )}

            <View style={styles.copyrightContainer}>
              <Text style={styles.copyrightText}>
                Polaris Dış Ticaret Ltd. Şti.
              </Text>
              <Text style={styles.copyrightText}>
                © 1995 - {new Date().getFullYear()} Golaks. Tüm Hakları Saklıdır.
              </Text>
            </View>
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
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.border : 'transparent',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  emailHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  codeInputFilled: {
    borderColor: colors.primary,
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
  },
  countdownText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  resendText: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  backLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  copyrightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  copyrightText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
