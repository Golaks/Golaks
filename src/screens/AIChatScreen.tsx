import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';

interface AIChatScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function AIChatScreen({ onTabChange, onLogout }: AIChatScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('aiChat');
  const [message, setMessage] = useState('');

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
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page Title */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: '#8B5CF615' }]}>
                <Icon name="chatbubbles" size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.pageTitle}>GolaksIQ</Text>
            </View>
          </View>

          {/* Welcome Card */}
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            style={styles.welcomeCard}
          >
            <Icon name="sparkles" size={48} color="#FFFFFF" />
            <Text style={styles.welcomeTitle}>AI Asistanınız Hazır!</Text>
            <Text style={styles.welcomeSubtitle}>
              Sorularınızı sorun, size yardımcı olmaktan mutluluk duyarım.
            </Text>
          </LinearGradient>

          {/* Suggestions */}
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Önerilen Sorular</Text>
            <View style={styles.suggestionsGrid}>
              {[
                { icon: 'calculator', text: 'Muhasebe raporları nasıl alınır?' },
                { icon: 'business', text: 'Stok durumu nasıl kontrol edilir?' },
                { icon: 'people', text: 'Cari hesap özeti nerede?' },
                { icon: 'document-text', text: 'Rapor formatları nelerdir?' },
              ].map((suggestion, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.suggestionCard,
                    pressed && styles.suggestionCardPressed,
                  ]}
                  onPress={() => setMessage(suggestion.text)}
                >
                  <Icon name={suggestion.icon} size={20} color={colors.primary} />
                  <Text style={styles.suggestionText}>{suggestion.text}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Icon name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Bu özellik yakında aktif olacaktır. Şimdilik önerilen soruları deneyebilirsiniz.
            </Text>
          </View>
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Bir şeyler sorun..."
              placeholderTextColor={colors.placeholder}
              multiline
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
      paddingBottom: 120,
    },
    pageHeader: {
      marginBottom: 16,
    },
    pageTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    pageTitleIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.6,
    },
    welcomeCard: {
      padding: 32,
      borderRadius: 20,
      alignItems: 'center',
      marginBottom: 24,
    },
    welcomeTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: 16,
      marginBottom: 8,
    },
    welcomeSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.9)',
      textAlign: 'center',
    },
    suggestionsContainer: {
      marginBottom: 24,
    },
    suggestionsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    suggestionsGrid: {
      gap: 12,
    },
    suggestionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    suggestionCardPressed: {
      opacity: 0.7,
      backgroundColor: colors.border,
      transform: [{ scale: 0.98 }],
    },
    suggestionText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    inputContainer: {
      position: 'absolute',
      bottom: 80,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.backgroundSecondary,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      maxHeight: 100,
      paddingVertical: 8,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
