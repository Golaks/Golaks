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
import MenuCard from '../components/MenuCard';

interface ShopScreenProps {
  onBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  onModelOperations?: () => void;
  onStock?: () => void;
  onSales?: () => void;
  onPersonnelPerformance?: () => void;
  onCompanyModelPerformance?: () => void;
  onReservations?: () => void;
  onAgencyPerformance?: () => void;
}

type ShopTab = 'reports' | 'transactions';

const SHOP_TABS: TabOption<ShopTab>[] = [
  { id: 'reports', label: 'Raporlar', icon: 'stats-chart' },
  { id: 'transactions', label: 'İşlemler', icon: 'swap-horizontal' },
];

export default function ShopScreen({ onBack, onTabChange, onLogout, onModelOperations, onStock, onSales, onPersonnelPerformance, onCompanyModelPerformance, onReservations, onAgencyPerformance }: ShopScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [shopTab, setShopTab] = useState<ShopTab>('reports');

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
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {/* Header */}
        <Header
          title="Satış Yönetimi"
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
                <Icon name="storefront" size={18} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Mağaza</Text>
            </View>
          </View>

          {/* Shop Tabs */}
          <Tab
            options={SHOP_TABS}
            activeTab={shopTab}
            onTabChange={setShopTab}
          />

          {/* Tab Content */}
          {shopTab === 'reports' && (
            <>
              <MenuCard
                name="Satışlar"
                icon="cart-outline"
                color="#10B981"
                description="Mağaza satış raporu"
                onPress={() => onSales?.()}
              />
              <MenuCard
                name="Stoklar"
                icon="cube-outline"
                color="#3B82F6"
                description="Mağaza stok durumu raporu"
                onPress={() => onStock?.()}
              />
              <MenuCard
                name="Firma Model Performans"
                icon="trending-up-outline"
                color="#8B5CF6"
                description="Firma ve Model performans raporu"
                onPress={() => onCompanyModelPerformance?.()}
              />
              <MenuCard
                name="Personel Performans"
                icon="people-outline"
                color="#EC4899"
                description="Personel performans raporu"
                onPress={() => onPersonnelPerformance?.()}
              />
              <MenuCard
                name="Acenta Performans"
                icon="business-outline"
                color="#F59E0B"
                description="Acenta bazlı performans raporu"
                onPress={() => onAgencyPerformance?.()}
              />
            </>
          )}

          {shopTab === 'transactions' && (
            <>
              <MenuCard
                name="Rezervasyonlar"
                icon="calendar-outline"
                color="#F59E0B"
                description="Rezervasyon takibi ve işlemleri"
                onPress={() => onReservations?.()}
              />
              <MenuCard
                name="Model İşlemleri"
                icon="layers-outline"
                color="#F59E0B"
                description="Model kartları ve işlemleri"
                onPress={() => onModelOperations?.()}
              />
            </>
          )}
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
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.6,
    },
  });
