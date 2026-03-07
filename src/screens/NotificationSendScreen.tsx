import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Sound from 'react-native-sound';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import notificationService from '../services/notification.service';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { createGlobalStyles } from '../styles/globalStyles';
import Header from '../components/Header';
import BackButton from '../components/BackButton';
import SectionTitle from '../components/SectionTitle';
import Button from '../components/Button';
import Input from '../components/Input';
import TabBar, { TabName } from '../components/TabBar';
import Checkbox from '../components/Checkbox';
import LoadingSpinner from '../components/LoadingSpinner';

const EMOJI_LIST = [
  '📢', '🔔', '⚡', '🎉', '⭐', '✨',
  '🚀', '💡', '🔥', '❤️', '👍', '✅',
  '⚠️', '🎯', '📌', '💪', '🎊', '🌟',
  '📣', '🏆', '🎁', '💼', '📊', '💰',
];

const CATEGORY_OPTIONS = [
  { id: 'bilgi', label: 'Bilgi', icon: 'information-circle', color: '#3B82F6' },
  { id: 'genel', label: 'Genel', icon: 'notifications', color: '#8B5CF6' },
  { id: 'duyuru', label: 'Duyuru', icon: 'megaphone', color: '#F59E0B' },
  { id: 'guncelleme', label: 'Güncelleme', icon: 'refresh-circle', color: '#10B981' },
  { id: 'uyari', label: 'Uyarı', icon: 'warning', color: '#EAB308' },
  { id: 'acil', label: 'Acil', icon: 'alert-circle', color: '#EF4444' },
];

const TARGET_OPTIONS = [
  { id: 'all', label: 'Tüm Kullanıcılar', icon: 'people-outline' },
  { id: 'role', label: 'Belirli Rol', icon: 'shield-outline' },
  { id: 'user', label: 'Belirli Kullanıcılar', icon: 'person-outline' },
];

const ROLE_OPTIONS = [
  { id: '0', label: 'Kullanıcı' },
  { id: '1', label: 'Admin' },
  { id: '2', label: 'Süper Admin' },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: 'superAdmin' | 'admin' | 'user';
}

interface NotificationSendScreenProps {
  onBack?: () => void;
  onTabChange?: (tab: TabName) => void;
}

export default function NotificationSendScreen({ onBack, onTabChange }: NotificationSendScreenProps) {
  const { colors, isDark } = useTheme();
  const { notificationCount, refreshNotificationCount } = useAuth();
  const { showSuccess, showError } = useAlert();
  const styles = createStyles(colors, isDark);
  const globalStyles = createGlobalStyles(colors);

  const [activeTab, setActiveTab] = useState<TabName>('profile');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'bilgi' | 'genel' | 'duyuru' | 'guncelleme' | 'uyari' | 'acil'>('genel');
  const [target, setTarget] = useState<'all' | 'role' | 'user'>('all');
  const [selectedRole, setSelectedRole] = useState<'0' | '1' | '2'>('0');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEmojiModalVisible, setIsEmojiModalVisible] = useState(false);
  const [emojiTargetField, setEmojiTargetField] = useState<'title' | 'message'>('title');
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const soundRef = useRef<Sound | null>(null);

  React.useEffect(() => {
    if (target === 'user') {
      fetchUsers();
    }
  }, [target]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const token = await authService.getToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.USER_LIST, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success && data.data?.users) {
        setUsers(data.data.users);
      }
    } catch (error) {
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendNotification = async () => {
    // Validasyon
    if (!title.trim()) {
      showError('Lütfen bildirim başlığı girin');
      return;
    }

    if (title.length > 255) {
      showError('Başlık en fazla 255 karakter olabilir');
      return;
    }

    if (!message.trim()) {
      showError('Lütfen bildirim mesajı girin');
      return;
    }

    if (message.length > 1000) {
      showError('Mesaj en fazla 1000 karakter olabilir');
      return;
    }

    if (target === 'user' && selectedUsers.length === 0) {
      showError('En az bir kullanıcı seçmelisiniz');
      return;
    }

    try {
      setIsSending(true);

      const token = await authService.getToken();
      if (!token) {
        showError('Oturum bilgisi bulunamadı');
        return;
      }

      let hedefDeger: string | null = null;
      if (target === 'role') {
        hedefDeger = selectedRole;
      } else if (target === 'user') {
        hedefDeger = JSON.stringify(selectedUsers);
      }

      const result = await notificationService.sendNotification(token, {
        baslik: title,
        mesaj: message,
        hedef_tip: target,
        hedef_deger: hedefDeger,
        bildirim_tipi: category,
      });

      if (result.success) {
        const count = result.data?.basarili_gonderim ?? 0;
        const successMessage = `Bildirim ${count} kullanıcıya başarıyla gönderildi`;
        showSuccess(successMessage);

        // Refresh notification count (sender might be in target group)
        refreshNotificationCount();

        // Formu temizle
        setTitle('');
        setMessage('');
        setCategory('genel');
        setTarget('all');
        setSelectedRole('0');
        setSelectedUsers([]);
      } else {
        showError(result.message || 'Bildirim gönderilemedi');
      }
    } catch (error: any) {
      showError(error.message || 'Bildirim gönderilirken hata oluştu');
    } finally {
      setIsSending(false);
    }
  };

  const handleSoundTest = () => {
    if (isPlayingSound && soundRef.current) {
      soundRef.current.stop();
      soundRef.current.release();
      soundRef.current = null;
      setIsPlayingSound(false);
      return;
    }

    const sound = new Sound('golaks-mobile.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        showError('Ses dosyası yüklenemedi');
        return;
      }
      soundRef.current = sound;
      setIsPlayingSound(true);
      sound.play(() => {
        sound.release();
        soundRef.current = null;
        setIsPlayingSound(false);
      });
    });
  };

  const selectedCategory = CATEGORY_OPTIONS.find(c => c.id === category);
  const selectedTarget = TARGET_OPTIONS.find(t => t.id === target);

  const openEmojiPicker = (field: 'title' | 'message') => {
    setEmojiTargetField(field);
    setIsEmojiModalVisible(true);
  };

  const handleEmojiSelect = (emoji: string) => {
    if (emojiTargetField === 'title') {
      setTitle(prev => prev + emoji);
    } else {
      setMessage(prev => prev + emoji);
    }
    setIsEmojiModalVisible(false);
  };

  // Extract emoji from title for preview
  const titleEmoji = title.match(/[\p{Emoji}]/u)?.[0] || '📢';

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Bildirim Gönder"
          leftButton={<BackButton onPress={onBack || (() => {})} />}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Ekran Başlığı */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="send" size={18} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Bildirim Gönder</Text>
            </View>
          </View>

          {/* Başlık */}
          <View style={styles.section}>
            <SectionTitle title="Başlık" />
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Bildirim başlığı..."
              maxLength={255}
              rightIcon="happy-outline"
              onRightIconPress={() => openEmojiPicker('title')}
              showCharCounter
            />
          </View>

          {/* Mesaj */}
          <View style={styles.section}>
            <SectionTitle title="Mesaj" />
            <View style={styles.textAreaContainer}>
              <TextInput
                style={[styles.input, styles.textArea, { paddingRight: 44 }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Bildirim mesajınızı buraya yazın..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Pressable
                onPress={() => openEmojiPicker('message')}
                style={styles.emojiIconButton}
              >
                <Icon name="happy-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={globalStyles.charCounter}>{message.length}/1000</Text>
          </View>

          {/* Bildirim Kategorisi */}
          <View style={styles.section}>
            <SectionTitle title="Bildirim Kategorisi" />
            <View style={styles.categoryGrid}>
              {CATEGORY_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionCard,
                    category === option.id && [
                      styles.optionCardSelected,
                      { borderColor: option.color },
                    ],
                  ]}
                  onPress={() => setCategory(option.id as any)}
                >
                  <Icon
                    name={option.icon}
                    size={24}
                    color={category === option.id ? option.color : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      category === option.id && { color: option.color },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Hedef Kitle */}
          <View style={styles.section}>
            <SectionTitle title="Hedef Kitle" />
            <View style={styles.targetContainer}>
              {TARGET_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.targetButton,
                    target === option.id && styles.targetButtonSelected,
                  ]}
                  onPress={() => setTarget(option.id as any)}
                >
                  <Icon
                    name={option.icon}
                    size={20}
                    color={target === option.id ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.targetLabel,
                      target === option.id && styles.targetLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {target === option.id && (
                    <Icon name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Rol Seçimi (if target === 'role') */}
          {target === 'role' && (
            <View style={styles.section}>
              <SectionTitle title="Rol Seçin" />
              <View style={styles.roleContainer}>
                {ROLE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.targetButton,
                      selectedRole === option.id && styles.targetButtonSelected,
                    ]}
                    onPress={() => setSelectedRole(option.id as any)}
                  >
                    <View style={styles.radioOuter}>
                      {selectedRole === option.id && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.targetLabel,
                        selectedRole === option.id && styles.targetLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Kullanıcı Seçimi (if target === 'user') */}
          {target === 'user' && (
            <View style={styles.section}>
              <SectionTitle title="Kullanıcıları Seçin" />
              {isLoadingUsers ? (
                <View style={styles.loadingContainer}>
                  <LoadingSpinner size={40} />
                </View>
              ) : (
                <View style={styles.userList}>
                  {users.map((user) => (
                    <Pressable
                      key={user.id}
                      style={styles.userCard}
                      onPress={() => handleToggleUser(user.id)}
                    >
                      <Checkbox
                        label=""
                        checked={selectedUsers.includes(user.id)}
                        onPress={() => handleToggleUser(user.id)}
                      />
                      <View style={styles.userInfoContainer}>
                        <Text style={styles.userNameText}>{user.name}</Text>
                        <Text style={styles.userEmailText}>{user.email}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Önizleme */}
          {(title || message) && (
            <View style={styles.section}>
              <SectionTitle title="Önizleme" />
              <View style={[styles.previewCard, { borderLeftColor: selectedCategory?.color }]}>
                <View style={styles.previewHeader}>
                  <View style={[styles.previewIconContainer, { backgroundColor: selectedCategory?.color + '20' }]}>
                    <Icon name={selectedCategory?.icon || 'notifications'} size={24} color={selectedCategory?.color} />
                  </View>
                  <View style={styles.previewTitleContainer}>
                    <Text style={styles.previewTitle}>{title || 'Başlık...'}</Text>
                    <Text style={styles.previewTarget}>
                      {selectedTarget?.label} • {selectedCategory?.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.previewMessage}>
                  {message || 'Mesajınız burada görünecek...'}
                </Text>
              </View>
            </View>
          )}

          {/* Ses Testi */}
          <View style={styles.section}>
            <SectionTitle title="Bildirim Sesi" />
            <Pressable
              style={[styles.soundTestButton, isPlayingSound && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
              onPress={handleSoundTest}
            >
              <Icon
                name={isPlayingSound ? 'stop-circle' : 'musical-notes'}
                size={24}
                color={isPlayingSound ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.soundTestText, isPlayingSound && { color: colors.primary }]}>
                {isPlayingSound ? 'Sesi Durdur' : 'Bildirim Sesini Test Et'}
              </Text>
              <Icon
                name={isPlayingSound ? 'volume-high' : 'volume-medium-outline'}
                size={20}
                color={isPlayingSound ? colors.primary : colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Gönder Butonu */}
          <View style={styles.footer}>
            <Button
              text="Bildirimi Gönder"
              icon="send-outline"
              onPress={handleSendNotification}
              loading={isSending}
              disabled={!title.trim() || !message.trim()}
            />
          </View>
        </ScrollView>

        {/* Bottom TabBar */}
        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />

        {/* Emoji Modal */}
        <Modal
          visible={isEmojiModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsEmojiModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsEmojiModalVisible(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Emoji Seç</Text>
                  <Pressable onPress={() => setIsEmojiModalVisible(false)}>
                    <Icon name="close" size={24} color={colors.text} />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.emojiContainer}>
                    {EMOJI_LIST.map((emoji, index) => (
                      <Pressable
                        key={index}
                        style={styles.emojiButton}
                        onPress={() => handleEmojiSelect(emoji)}
                      >
                        <Text style={styles.emoji}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
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
      paddingBottom: 100, // Space for TabBar
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
    section: {
      marginBottom: 16,
    },
    emojiContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    emojiButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: {
      fontSize: 24,
    },
    textAreaContainer: {
      position: 'relative',
    },
    emojiIconButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      padding: 8,
      backgroundColor: colors.card,
      borderRadius: 8,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 15,
      color: colors.text,
      minHeight: 52,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    optionsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    optionCard: {
      minWidth: '30%',
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      gap: 8,
    },
    optionCardSelected: {
      borderWidth: 2,
      backgroundColor: colors.card,
    },
    optionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    targetContainer: {
      gap: 12,
    },
    targetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    targetButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    targetLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    targetLabelSelected: {
      color: colors.text,
    },
    previewCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderLeftWidth: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 12,
    },
    previewIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewEmoji: {
      fontSize: 32,
    },
    previewTitleContainer: {
      flex: 1,
    },
    previewTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    previewTarget: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    previewMessage: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    footer: {
      marginTop: 24,
      marginBottom: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    roleContainer: {
      gap: 10,
    },
    radioOuter: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    userList: {
      gap: 8,
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
    },
    userInfoContainer: {
      flex: 1,
    },
    userNameText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    userEmailText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    soundTestButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    soundTestText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
