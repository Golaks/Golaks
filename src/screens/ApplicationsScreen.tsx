import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import DeviceInfo from 'react-native-device-info';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { BASE_API_URL } from '../constants/ApiConfig';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import MenuCard from '../components/MenuCard';
import ComingSoonModal from '../components/ComingSoonModal';
import VersionBadge from '../components/VersionBadge';

interface Application {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  comingSoon?: boolean;
}

const APPLICATIONS: Application[] = [
  {
    id: '1',
    name: 'Muhasebe',
    icon: 'calculator-outline',
    color: '#3B82F6',
    description: 'Finans Yönetimi',
  },
  {
    id: '2',
    name: 'Tabakhane',
    icon: 'business-outline',
    color: '#10B981',
    description: 'Üretim Yönetimi',
  },
  {
    id: '3',
    name: 'Konfeksiyon',
    icon: 'shirt-outline',
    color: '#F59E0B',
    description: 'Deri Tekstil Üretim',
  },
  {
    id: '4',
    name: 'Mağaza',
    icon: 'storefront-outline',
    color: '#8B5CF6',
    description: 'Satış Yönetimi',
    comingSoon: true,
  },
];

interface ApplicationsScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  onAppPress?: (appId: string) => void;
}

export default function ApplicationsScreen({ onTabChange, onLogout, onAppPress }: ApplicationsScreenProps) {
  const { colors, isDark, theme, setTheme } = useTheme();
  const { logout, user, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    user?.avatar ? `${BASE_API_URL}/${user.avatar}` : undefined
  );
  const [comingSoonModal, setComingSoonModal] = useState<{ visible: boolean; appName: string; appIcon: string; appColor: string }>({
    visible: false,
    appName: '',
    appIcon: '',
    appColor: '',
  });

  const styles = createStyles(colors, isDark);

  // Update photo URL when user changes
  useEffect(() => {
    if (user?.avatar) {
      const newPhotoUrl = `${BASE_API_URL}/${user.avatar}`;
      setPhotoUrl(newPhotoUrl);
    } else {
      setPhotoUrl(undefined);
    }
  }, [user?.avatar]);

  // Saate göre selamlama
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      return 'Günaydın,';
    } else if (hour >= 12 && hour < 18) {
      return 'İyi Öğlenler,';
    } else {
      return 'İyi Akşamlar,';
    }
  };

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleAppPress = (app: Application) => {
    if (app.comingSoon) {
      setComingSoonModal({
        visible: true,
        appName: app.name,
        appIcon: app.icon,
        appColor: app.color,
      });
      return;
    }
    if (onAppPress) {
      onAppPress(app.id);
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

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {/* Header */}
        <Header
          title="Uygulamalar"
          showMenu={true}
          onLogout={handleLogout}
        />

        {/* Content Area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <Icon name="person" size={36} color={isDark ? colors.primary : '#FFFFFF'} />
                  )}
                </View>
              </View>
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeGreeting}>{getGreeting()}</Text>
                <Text style={styles.welcomeName}>{user?.name || 'Kullanıcı'}</Text>
                <Text style={styles.welcomeSubtext}>
                  Bugün harika bir gün! Hadi işe koyulalım.
                </Text>
              </View>
            </View>
          </View>

          {/* Applications Grid */}
          <View style={styles.grid}>
            {APPLICATIONS.map((app) => (
              <Pressable
                key={app.id}
                style={({ pressed }) => [
                  styles.appCard,
                  app.comingSoon && styles.appCardDisabled,
                  pressed && !app.comingSoon && styles.appCardPressed,
                ]}
                onPress={() => handleAppPress(app)}
              >
                {app.comingSoon && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Çok Yakında</Text>
                  </View>
                )}
                <View style={[styles.iconContainer, { backgroundColor: `${app.color}15` }]}>
                  <Icon name={app.icon} size={32} color={app.color} />
                </View>
                <Text style={styles.appName}>{app.name}</Text>
                <Text style={styles.appDescription} numberOfLines={2}>
                  {app.description}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Bildirimler */}
          <MenuCard
            name="Bildirimler"
            icon="notifications-outline"
            color="#EC4899"
            description="Tüm Bildirimleriniz"
            onPress={() => handleTabPress('notifications')}
            badgeCount={notificationCount}
          />

          {/* Version Info */}
          <View style={styles.versionSection}>
            <VersionBadge
              version={DeviceInfo.getVersion()}
              buildNumber={DeviceInfo.getBuildNumber()}
              size="small"
            />
          </View>
        </ScrollView>

        {/* Bottom TabBar */}
        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />

        {/* Coming Soon Modal */}
        <ComingSoonModal
          visible={comingSoonModal.visible}
          onClose={() => setComingSoonModal({ visible: false, appName: '', appIcon: '', appColor: '' })}
          appName={comingSoonModal.appName}
          appIcon={comingSoonModal.appIcon}
          appColor={comingSoonModal.appColor}
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
      paddingBottom: 100, // Space for TabBar
    },
    welcomeCard: {
      backgroundColor: isDark ? colors.primaryBackground : colors.primary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      width: '100%',
    },
    welcomeContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      marginRight: 14,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isDark ? colors.primaryBackground : 'rgba(255, 255, 255, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: isDark ? colors.primary + '60' : 'rgba(255, 255, 255, 0.5)',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 32,
    },
    welcomeTextContainer: {
      flex: 1,
    },
    welcomeGreeting: {
      fontSize: 13,
      color: isDark ? colors.textSecondary : 'rgba(255, 255, 255, 0.85)',
      marginBottom: 2,
    },
    welcomeName: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? colors.text : '#FFFFFF',
      marginBottom: 4,
    },
    welcomeSubtext: {
      fontSize: 13,
      color: isDark ? colors.textSecondary : 'rgba(255, 255, 255, 0.9)',
      lineHeight: 18,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    appCard: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: 16,
      position: 'relative',
    },
    appCardDisabled: {
      opacity: 0.6,
    },
    appCardPressed: {
      opacity: 0.7,
      backgroundColor: colors.border,
      transform: [{ scale: 0.96 }],
    },
    comingSoonBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      zIndex: 1,
    },
    comingSoonText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    appName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    appDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 16,
    },
    versionSection: {
      marginTop: 20,
      marginBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
