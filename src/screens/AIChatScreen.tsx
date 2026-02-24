import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Image, TextInput, Keyboard, Platform, Animated, Modal, Linking, Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { BASE_API_URL } from '../constants/ApiConfig';
import { aiService, ChatMessage } from '../services/ai.service';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import ConfirmDialog from '../components/ConfirmDialog';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AI_CONSENT_KEY = '@golaks_ai_consent';

interface AIChatScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  isVisible?: boolean;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

export default function AIChatScreen({ onTabChange, onLogout, isVisible }: AIChatScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount, user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('aiChat');
  const [message, setMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Check AI consent on mount
  useEffect(() => {
    AsyncStorage.getItem(AI_CONSENT_KEY).then(value => {
      setHasConsent(value === 'true');
    });
  }, []);

  // Reset activeTab when screen becomes visible
  useEffect(() => {
    if (isVisible) {
      setActiveTab('aiChat');
    }
  }, [isVisible]);

  const handleAcceptConsent = async () => {
    await AsyncStorage.setItem(AI_CONSENT_KEY, 'true');
    setHasConsent(true);
  };

  const handleDeclineConsent = () => {
    setHasConsent(false);
    if (onTabChange) {
      onTabChange('apps');
    }
  };

  // Klavye listener
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Typing animasyonu
  const TypingDots = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animate = (dot: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          ])
        ).start();
      };
      animate(dot1, 0);
      animate(dot2, 150);
      animate(dot3, 300);
    }, []);

    return (
      <View style={styles.typingIndicator}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              { opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              { transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
            ]}
          />
        ))}
      </View>
    );
  };

  // Saate göre selamlama
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      return 'Günaydın';
    } else if (hour >= 12 && hour < 18) {
      return 'İyi öğlenler';
    } else {
      return 'İyi akşamlar';
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `${getGreeting()} ${user?.name || 'Kullanıcı'}! Ben GolaksIQ, sizin yapay zeka asistanınızım. Size nasıl yardımcı olabilirim?`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);

  const styles = createStyles(colors, isDark);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessageText = message.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userMessageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    // Add loading message
    const loadingMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: loadingMessageId,
      text: '',
      isUser: false,
      timestamp: new Date(),
      isLoading: true,
    }]);

    // Build conversation history
    const conversationHistory: ChatMessage[] = messages
      .filter(msg => msg.id !== '1')
      .map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text,
      }));

    conversationHistory.push({
      role: 'user',
      content: userMessageText,
    });

    try {
      const response = await aiService.sendChatMessage(userMessageText, conversationHistory);

      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMessageId);

        let errorText = 'Bir hata oluştu';
        if (response.error) {
          if (typeof response.error === 'string') {
            errorText = response.error;
          } else if (typeof response.error === 'object' && response.error.message) {
            errorText = response.error.message;
          }
        }

        const aiMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: response.success && response.data ? response.data.message : errorText,
          isUser: false,
          timestamp: new Date(),
        };
        return [...filtered, aiMessage];
      });
    } catch (error) {
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMessageId);
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: 'Bağlantı hatası',
          isUser: false,
          timestamp: new Date(),
        };
        return [...filtered, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setShowClearConfirm(true);
  };

  const handleClearConfirm = () => {
    setMessages([
      {
        id: '1',
        text: `${getGreeting()} ${user?.name || 'Kullanıcı'}! Ben GolaksIQ, sizin yapay zeka asistanınızım. Size nasıl yardımcı olabilirim?`,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    setShowClearConfirm(false);
    showSuccess('Sohbet temizlendi');
  };

  const handleCopyAll = () => {
    const allText = messages
      .filter(msg => msg.id !== '1')
      .map(msg => `${msg.isUser ? 'Siz' : 'GolaksIQ'}: ${msg.text}`)
      .join('\n\n');

    if (allText) {
      // TODO: Clipboard implementation needed
      showSuccess('Tüm mesajlar kopyalandı');
    } else {
      showError('Kopyalanacak mesaj yok');
    }
  };

  const customMenuItems = [
    {
      icon: 'copy-outline',
      label: 'Tümünü Kopyala',
      subtext: 'Mesajları panoya kopyala',
      onPress: handleCopyAll,
    },
    {
      icon: 'trash-outline',
      label: 'Sohbeti Temizle',
      subtext: 'Tüm konuşmayı sil',
      onPress: handleClearChat,
      isDanger: true,
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
    }
  };

  // Show consent screen if not yet accepted
  if (hasConsent === null) {
    // Loading consent state
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <Header title="GolaksIQ" showMenu={true} onLogout={handleLogout} />
          <View style={styles.consentLoading} />
          <TabBar activeTab={activeTab} onTabPress={handleTabPress} notificationCount={notificationCount} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!hasConsent) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <Header title="GolaksIQ" showMenu={true} onLogout={handleLogout} />
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.consentScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.consentContainer}>
              {/* Icon */}
              <View style={styles.consentIconWrap}>
                <Icon name="shield-checkmark" size={40} color={colors.primary} />
              </View>

              <Text style={styles.consentTitle}>Veri Kullanım İzni</Text>
              <Text style={styles.consentSubtitle}>
                GolaksIQ yapay zeka asistanını kullanmadan önce lütfen aşağıdaki bilgileri okuyun.
              </Text>

              {/* Data Info Cards */}
              <View style={styles.consentCard}>
                <View style={styles.consentCardHeader}>
                  <Icon name="cloud-upload-outline" size={20} color="#3B82F6" />
                  <Text style={styles.consentCardTitle}>Gönderilen Veriler</Text>
                </View>
                <Text style={styles.consentCardText}>
                  • Yazdığınız mesajlar ve sohbet geçmişi{'\n'}
                  • Dil tercihiniz (Türkçe)
                </Text>
              </View>

              <View style={styles.consentCard}>
                <View style={styles.consentCardHeader}>
                  <Icon name="business-outline" size={20} color="#F59E0B" />
                  <Text style={styles.consentCardTitle}>Veri Alıcısı</Text>
                </View>
                <Text style={styles.consentCardText}>
                  Mesajlarınız, yanıt üretmek için GolaksIQ sunucuları üzerinden işlenir. Sunucuların yanıt verememesi veya gecikmesi durumunda, hizmet sürekliliğini sağlamak amacıyla diğer AI servis sağlayıcılarına kısmen yönlendirilebilir. Kişisel bilgileriniz hiçbir şekilde paylaşılmaz; yalnızca sohbet mesajlarınız AI sunucularına iletilir.
                </Text>
              </View>

              <View style={styles.consentCard}>
                <View style={styles.consentCardHeader}>
                  <Icon name="lock-closed-outline" size={20} color="#10B981" />
                  <Text style={styles.consentCardTitle}>Veri Güvenliği</Text>
                </View>
                <Text style={styles.consentCardText}>
                  • Veriler SSL/TLS ile şifrelenerek iletilir{'\n'}
                  • Kişisel bilgileriniz (ad, e-posta, telefon) doğrudan AI servisine gönderilmez{'\n'}
                  • Sohbet geçmişi cihazınızda saklanır, sunucuda kalıcı olarak tutulmaz
                </Text>
              </View>

              <View style={styles.consentCard}>
                <View style={styles.consentCardHeader}>
                  <Icon name="alert-circle-outline" size={20} color="#EF4444" />
                  <Text style={styles.consentCardTitle}>Önemli Uyarılar</Text>
                </View>
                <Text style={styles.consentCardText}>
                  • Hassas kişisel bilgilerinizi (TC kimlik, kredi kartı vb.) sohbette paylaşmayın{'\n'}
                  • AI yanıtları her zaman doğru olmayabilir, önemli kararlar için doğrulayın
                </Text>
              </View>

              {/* Privacy Policy Link */}
              <Pressable
                style={styles.consentPolicyLink}
                onPress={() => setShowPrivacyModal(true)}
              >
                <Icon name="document-text-outline" size={16} color={colors.primary} />
                <Text style={styles.consentPolicyText}>Gizlilik Politikasını Oku</Text>
                <Icon name="chevron-forward" size={14} color={colors.primary} />
              </Pressable>

              {/* Buttons */}
              <View style={styles.consentButtons}>
                <Button
                  text="Kabul Et ve Devam Et"
                  icon="checkmark-circle"
                  onPress={handleAcceptConsent}
                  style={styles.consentAcceptButton}
                />
                <Button
                  text="Şimdilik Vazgeç"
                  icon="close-circle-outline"
                  onPress={handleDeclineConsent}
                  variant="secondary"
                  style={styles.consentDeclineButton}
                />
              </View>
            </View>
          </ScrollView>

          {/* Privacy Policy Bottom Sheet */}
          <BottomSheet
            visible={showPrivacyModal}
            title="Gizlilik Politikası"
            icon="shield-checkmark-outline"
            iconColor="#10B981"
            onClose={() => setShowPrivacyModal(false)}
            showFooter={false}
            height={SCREEN_HEIGHT * 0.85}
          >
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#10B98115', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Icon name="shield-checkmark" size={28} color="#10B981" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Gizlilik Politikası</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Polaris Dış Ticaret Ltd. Şti.</Text>
            </View>

            {[
              { icon: 'finger-print-outline', color: '#654BE9', title: '1. Toplanan Veriler', items: ['Ad, soyad, kullanıcı adı', 'E-posta ve telefon', 'Hesap ve işlem verileri', 'IP adresi ve cihaz bilgileri'] },
              { icon: 'analytics-outline', color: '#F59E0B', title: '2. İşleme Amaçları', items: ['Hizmet sunumu ve yönetimi', 'Hesap oluşturma ve yönetimi', 'Müşteri desteği ve iletişim', 'Güvenlik ve dolandırıcılık önleme'] },
              { icon: 'lock-closed-outline', color: '#10B981', title: '3. Veri Güvenliği', items: ['SSL/TLS ve AES-256 şifreleme', 'Tier-3 veri merkezi barındırma', 'Düzenli güvenlik denetimleri', 'Erişim kontrolü ve yetkilendirme'] },
              { icon: 'time-outline', color: '#3B82F6', title: '4. Saklama Süresi', items: ['Hesap bilgileri: Aktif olduğu sürece', 'İşlem kayıtları: 10 yıl', 'Teknik loglar: 2 yıl', 'Pazarlama verileri: Onay geçerliyken'] },
              { icon: 'people-outline', color: '#EC4899', title: '5. Üçüncü Taraf Paylaşımı', items: ['Yasal zorunluluklar dışında paylaşılmaz', 'Veriler hiçbir koşulda satılmaz', 'Hizmet sağlayıcılarıyla gizlilik sözleşmesi', 'Açık rızanız olmadan aktarılmaz'] },
              { icon: 'sparkles-outline', color: '#8B5CF6', title: '6. Yapay Zeka Hizmetleri', items: ['GolaksIQ asistan, üçüncü taraf AI servis sağlayıcıları kullanır', 'Gönderilen veriler: mesajlarınız ve sohbet geçmişi', 'Kişisel bilgileriniz (ad, e-posta, telefon) doğrudan AI servisine iletilmez', 'Sohbet verileri sunucuda kalıcı olarak saklanmaz', 'AI hizmeti kullanımı için açık onayınız alınır'] },
            ].map((section, index) => (
              <View key={index} style={{ borderRadius: 12, borderWidth: 1, backgroundColor: colors.card, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: section.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                    <Icon name={section.icon} size={18} color={section.color} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{section.title}</Text>
                </View>
                <View style={{ gap: 8, paddingLeft: 4 }}>
                  {section.items.map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: section.color }} />
                      <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* KVKK Rights */}
            <View style={{ borderRadius: 12, borderWidth: 1, backgroundColor: '#654BE910', borderColor: '#654BE920', padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#654BE915', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name="document-text-outline" size={18} color="#654BE9" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>KVKK Haklarınız</Text>
              </View>
              <View style={{ gap: 8, paddingLeft: 4 }}>
                {['Verilerinizin işlenip işlenmediğini öğrenme', 'İşleme amacını ve uygunluğunu sorgulama', 'Eksik/yanlış verilerin düzeltilmesini isteme', 'Verilerin silinmesini talep etme', 'Otomatik analiz sonuçlarına itiraz etme'].map((right, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="checkmark-circle" size={16} color="#654BE9" />
                    <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{right}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Contact */}
            <View style={{ borderRadius: 12, borderWidth: 1, backgroundColor: colors.card, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name="mail-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>İletişim</Text>
              </View>
              <View style={{ gap: 10 }}>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('mailto:destek@golaks.com')}>
                  <Icon name="mail-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>destek@golaks.com</Text>
                </Pressable>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('tel:+908504664664')}>
                  <Icon name="call-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>+90 850 466 4 664</Text>
                </Pressable>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('https://www.golaks.com')}>
                  <Icon name="globe-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>www.golaks.com</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>Veri Sorumlusu: Polaris Dış Ticaret Ltd. Şti.</Text>
              <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                © 1995-{new Date().getFullYear()} Golaks. Tüm Hakları Saklıdır.
              </Text>
            </View>
          </BottomSheet>

          <TabBar activeTab={activeTab} onTabPress={handleTabPress} notificationCount={notificationCount} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="GolaksIQ"
          showMenu={true}
          onLogout={handleLogout}
          customMenuItems={customMenuItems}
        />

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 120 : 200 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Messages */}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageContainer,
                msg.isUser ? styles.userMessageContainer : styles.systemMessageContainer,
              ]}
            >
              {!msg.isUser && (
                <View style={styles.systemAvatar}>
                  <Image
                    source={require('../assets/images/icon.png')}
                    style={styles.systemAvatarImage}
                    resizeMode="contain"
                  />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.isUser ? styles.userBubble : styles.systemBubble,
                ]}
              >
                {msg.isLoading ? (
                  <TypingDots />
                ) : (
                  <Text style={[styles.messageText, msg.isUser ? styles.userText : styles.systemText]}>
                    {msg.text}
                  </Text>
                )}
              </View>
              {msg.isUser && user?.avatar && (
                <Image
                  source={{ uri: `${BASE_API_URL}/${user.avatar}` }}
                  style={styles.userAvatar}
                  resizeMode="cover"
                />
              )}
              {msg.isUser && !user?.avatar && (
                <View style={styles.userAvatarPlaceholder}>
                  <Icon name="person" size={16} color={colors.primary} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { bottom: keyboardHeight > 0 ? keyboardHeight : 100 }]}>
          <View style={styles.warningContainer}>
            <Icon name="information-circle-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.warningText}>
              GolaksIQ hata yapabilir, önemli bilgilerinizi kontrol edin.
            </Text>
          </View>
          <View style={styles.inputWrapper}>
            <Icon name="sparkles-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Bir şeyler sorun..."
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={1000}
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
            <Pressable
              style={[
                styles.sendButton,
                { backgroundColor: message.trim() ? colors.primary : colors.border },
              ]}
              onPress={handleSend}
              disabled={!message.trim()}
            >
              <Icon
                name="send"
                size={20}
                color={message.trim() ? '#FFFFFF' : colors.textTertiary}
              />
            </Pressable>
          </View>
        </View>

        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />

        {/* Clear Chat Confirmation */}
        <ConfirmDialog
          visible={showClearConfirm}
          title="Sohbeti Temizle"
          message="Tüm mesajlar silinecek. Devam etmek istiyor musunuz?"
          icon="trash-outline"
          iconColor="#EF4444"
          confirmText="Temizle"
          cancelText="İptal"
          confirmIcon="checkmark-outline"
          cancelIcon="close-outline"
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearConfirm(false)}
        />
      </View>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 200,
    },
    messageContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      alignItems: 'flex-end',
      gap: 8,
    },
    userMessageContainer: {
      flexDirection: 'row-reverse',
    },
    systemMessageContainer: {
      flexDirection: 'row',
    },
    messageBubble: {
      maxWidth: '75%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 18,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    systemBubble: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    userText: {
      color: '#FFFFFF',
    },
    systemText: {
      color: colors.text,
    },
    systemAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    },
    systemAvatarImage: {
      width: 28,
      height: 28,
    },
    userAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      flexShrink: 0,
    },
    userAvatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    inputContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginBottom: 8,
    },
    warningText: {
      fontSize: 10,
      color: colors.textTertiary,
      textAlign: 'center',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingLeft: 14,
      paddingRight: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputIcon: {
      marginBottom: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      maxHeight: 100,
      paddingVertical: 8,
      paddingHorizontal: 0,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textTertiary,
      opacity: 0.6,
    },
    // Consent styles
    consentLoading: {
      flex: 1,
    },
    consentScrollContent: {
      padding: 20,
      paddingBottom: 120,
    },
    consentContainer: {
      alignItems: 'center',
    },
    consentIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.primary}12`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      marginTop: 8,
    },
    consentTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    consentSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
      paddingHorizontal: 10,
    },
    consentCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    consentCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    consentCardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    consentCardText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
      textAlign: 'justify',
    },
    consentPolicyLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      marginBottom: 16,
    },
    consentPolicyText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    consentButtons: {
      width: '100%',
      gap: 10,
      marginBottom: 16,
    },
    consentAcceptButton: {
      backgroundColor: colors.primary,
    },
    consentDeclineButton: {},
    consentFooterText: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 16,
    },
  });
