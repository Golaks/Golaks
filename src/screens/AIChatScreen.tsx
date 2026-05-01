import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Image, TextInput, Keyboard, Platform, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { BASE_API_URL } from '../constants/ApiConfig';
import { aiService, ChatMessage } from '../services/ai.service';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import ConfirmDialog from '../components/ConfirmDialog';

interface AIChatScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  serverName?: string | null;
}

export default function AIChatScreen({ onTabChange, onLogout }: AIChatScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount, user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('aiChat');
  const [message, setMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

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
          serverName: response.success && response.data ? response.data.server_name : null,
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
              <View style={msg.isUser ? styles.bubbleColumnUser : styles.bubbleColumnSystem}>
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
                {!msg.isLoading && (
                  <View style={msg.isUser ? styles.metaRowUser : styles.metaRowSystem}>
                    <Text style={styles.metaText}>
                      {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {!msg.isUser && msg.serverName && (
                      <Text style={styles.metaServerText}>· {msg.serverName}</Text>
                    )}
                  </View>
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
    bubbleColumnUser: {
      maxWidth: '75%',
      alignItems: 'flex-end',
    },
    bubbleColumnSystem: {
      maxWidth: '75%',
      alignItems: 'flex-start',
    },
    messageBubble: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 18,
    },
    metaRowUser: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
      marginRight: 4,
    },
    metaRowSystem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
      marginLeft: 4,
    },
    metaText: {
      fontSize: 10,
      color: colors.textTertiary,
    },
    metaServerText: {
      fontSize: 9,
      color: colors.textTertiary,
      opacity: 0.7,
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
  });
