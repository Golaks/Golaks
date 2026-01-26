import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import Tab, { TabOption } from '../components/Tab';

interface ConfectionScreenProps {
  onBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

type ConfectionTab = 'reports' | 'transactions';

const CONFECTION_TABS: TabOption<ConfectionTab>[] = [
  { id: 'reports', label: 'Raporlar', icon: 'stats-chart' },
  { id: 'transactions', label: 'İşlemler', icon: 'swap-horizontal' },
];

export default function ConfectionScreen({ onBack, onTabChange, onLogout }: ConfectionScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [confectionTab, setConfectionTab] = useState<ConfectionTab>('reports');

  const styles = createStyles(colors, isDark);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
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
        {/* Header */}
        <Header
          title="Deri Tekstil Üretim"
          leftButton={<BackButton onPress={onBack} />}
          showMenu={true}
          onLogout={handleLogout}
        />

        {/* Content Area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page Title */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="shirt" size={18} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Konfeksiyon</Text>
            </View>
          </View>

          {/* Confection Tabs */}
          <Tab
            options={CONFECTION_TABS}
            activeTab={confectionTab}
            onTabChange={setConfectionTab}
          />
        </ScrollView>

        {/* Bottom TabBar */}
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
  });
