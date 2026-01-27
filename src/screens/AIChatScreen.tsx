import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Image, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { BASE_API_URL } from '../constants/ApiConfig';
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
}

export default function AIChatScreen({ onTabChange, onLogout }: AIChatScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount, user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('aiChat');
  const [message, setMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
    console.log('Active tab:', tab);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    console.log('Send message:', message);
    setMessage('');
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
      console.error('Logout error:', error);
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
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
                <Text style={[styles.messageText, msg.isUser ? styles.userText : styles.systemText]}>
                  {msg.text}
                </Text>
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
        <View style={styles.inputContainer}>
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
      paddingBottom: 195,
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
      bottom: 125,
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
  });
