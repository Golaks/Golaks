import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import NotificationDetailModal from '../components/NotificationDetailModal';
import notificationService, { Notification } from '../services/notification.service';
import { authService } from '../services/auth.service';

interface NotificationsScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function NotificationsScreen({ onTabChange, onLogout }: NotificationsScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, user, refreshNotificationCount } = useAuth();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterTab, setFilterTab] = useState<'unread' | 'read'>('unread');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = createStyles(colors, isDark);

  // Bildirimleri yükle
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;

      setLoading(true);
      const response = await notificationService.getNotifications(token);

      if (response.success && Array.isArray(response.data)) {
        setNotifications(response.data);
      }
    } catch (error: any) {
      showAlert('error', 'Hata', error.message || 'Bildirimler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;

      setRefreshing(true);
      const response = await notificationService.getNotifications(token);

      if (response.success && Array.isArray(response.data)) {
        setNotifications(response.data);
      }
    } catch (error: any) {
    } finally {
      setRefreshing(false);
    }
  };

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      const token = await authService.getToken();

      // Bildirim zaten okunmuşsa API çağrısı yapma
      if (!notification.read && token) {
        await notificationService.markAsRead(token, notification.id);
        // Refresh global notification count
        refreshNotificationCount();
      }

      // State'i güncelle
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
      );

      setSelectedNotification(notification);
      setDetailModalVisible(true);
    } catch (error: any) {
      // Hata olsa bile modal'ı aç
      setSelectedNotification(notification);
      setDetailModalVisible(true);
    }
  };

  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedNotification(null);
  };

  const handleMarkAllRead = async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;

      await notificationService.markAllAsRead(token);

      // State'i güncelle
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      // Refresh global notification count
      refreshNotificationCount();

      showAlert('success', 'Başarılı', 'Tüm bildirimler okundu olarak işaretlendi');
    } catch (error: any) {
      showAlert('error', 'Hata', error.message || 'Bildirimler güncellenemedi');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'bilgi':
        return { name: 'information-circle', color: '#3B82F6' }; // Bilgi - Mavi
      case 'genel':
        return { name: 'notifications', color: '#8B5CF6' }; // Genel - Mor
      case 'duyuru':
        return { name: 'megaphone', color: '#F59E0B' }; // Duyuru - Turuncu
      case 'guncelleme':
        return { name: 'refresh-circle', color: '#10B981' }; // Güncelleme - Yeşil
      case 'uyari':
        return { name: 'warning', color: '#EAB308' }; // Uyarı - Sarı
      case 'acil':
        return { name: 'alert-circle', color: '#EF4444' }; // Acil - Kırmızı
      default:
        return { name: 'information-circle', color: '#3B82F6' };
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;
  const filteredNotifications = filterTab === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.read);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <Header
            title="Bildirimler"
            showMenu={true}
            onLogout={handleLogout}
          />
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
          <TabBar
            activeTab={activeTab}
            onTabPress={handleTabPress}
            notificationCount={unreadCount}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Bildirimler"
          showMenu={true}
          onLogout={handleLogout}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, filteredNotifications.length === 0 && styles.scrollContentEmpty]}
          showsVerticalScrollIndicator={false}
        >
          {/* Page Title */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: '#F59E0B15' }]}>
                <Icon name="notifications" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pageTitle}>Bildirimler</Text>
                <Text style={styles.pageSubtitle}>
                  {unreadCount > 0
                    ? `${unreadCount} okunmamış`
                    : 'Tümü okundu'}
                </Text>
              </View>
              {unreadCount > 0 && (
                <Pressable onPress={handleMarkAllRead} style={styles.markAllButton}>
                  <Icon name="checkmark-done" size={16} color={colors.primary} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <Pressable
              style={[styles.filterTab, filterTab === 'unread' && styles.filterTabActive]}
              onPress={() => setFilterTab('unread')}
            >
              <Icon
                name="mail-unread-outline"
                size={16}
                color={filterTab === 'unread' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.filterTabText, filterTab === 'unread' && styles.filterTabTextActive]}>
                Okunmamış
              </Text>
              <View style={[styles.filterTabBadge, filterTab === 'unread' && styles.filterTabBadgeActive]}>
                <Text style={[styles.filterTabBadgeText, filterTab === 'unread' && styles.filterTabBadgeTextActive]}>
                  {unreadCount}
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.filterTab, filterTab === 'read' && styles.filterTabActive]}
              onPress={() => setFilterTab('read')}
            >
              <Icon
                name="mail-open-outline"
                size={16}
                color={filterTab === 'read' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.filterTabText, filterTab === 'read' && styles.filterTabTextActive]}>
                Okunmuş
              </Text>
              <View style={[styles.filterTabBadge, filterTab === 'read' && styles.filterTabBadgeActive]}>
                <Text style={[styles.filterTabBadgeText, filterTab === 'read' && styles.filterTabBadgeTextActive]}>
                  {readCount}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Notifications List */}
          {filteredNotifications.map((notification) => {
            const iconConfig = getNotificationIcon(notification.type);
            return (
              <Pressable
                key={notification.id}
                style={({ pressed }) => [
                  styles.notificationCard,
                  !notification.read && styles.notificationCardUnread,
                  pressed && styles.notificationCardPressed,
                ]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: iconConfig.color + '20' }
                ]}>
                  <Icon name={iconConfig.name} size={24} color={iconConfig.color} />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.read && styles.notificationTitleUnread,
                    ]}>
                      {notification.title}
                    </Text>
                    {!notification.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>{notification.time}</Text>
                </View>
                <View style={styles.chevronContainer}>
                  <Icon name="chevron-forward" size={20} color={colors.textTertiary} />
                </View>
              </Pressable>
            );
          })}

          {/* Empty State */}
          {filteredNotifications.length === 0 && (
            <EmptyState />
          )}
        </ScrollView>

        {/* Notification Detail Modal */}
        {selectedNotification && (
          <NotificationDetailModal
            visible={detailModalVisible}
            onClose={handleCloseDetailModal}
            title={selectedNotification.title}
            message={selectedNotification.message}
            time={selectedNotification.time}
            type={selectedNotification.type}
          />
        )}

        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={unreadCount}
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
    scrollContentEmpty: {
      flexGrow: 1,
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
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.6,
      marginBottom: 1,
    },
    pageSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    markAllButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notificationCardUnread: {
      backgroundColor: isDark ? colors.primaryBackground : colors.primary + '08',
      borderColor: colors.primary + '30',
    },
    notificationCardPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    notificationTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    notificationTitleUnread: {
      fontWeight: '700',
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    notificationMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 6,
    },
    notificationTime: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    chevronContainer: {
      marginLeft: 8,
      alignSelf: 'center',
    },
    filterTabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    filterTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterTabActive: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary,
    },
    filterTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterTabTextActive: {
      color: colors.primary,
    },
    filterTabBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.textTertiary + '30',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    filterTabBadgeActive: {
      backgroundColor: colors.primary,
    },
    filterTabBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    filterTabBadgeTextActive: {
      color: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 100,
    },
  });
