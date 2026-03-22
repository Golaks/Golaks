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
import ReportParameterModal from '../components/ReportParameterModal';

interface AccountScreenProps {
  onBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  onAccountSummary?: () => void;
  onCashBank?: () => void;
  onCariDetay?: () => void;
  onCheckBill?: () => void;
  onStock?: () => void;
  onSales?: () => void;
  onPersonnelPerformance?: () => void;
  onCompanyModelPerformance?: () => void;
  onBankaKomisyon?: () => void;
  onCariHesaplar?: () => void;
  onKasaIslemleri?: () => void;
  initialTab?: AccountTab;
  onActiveTabChange?: (tab: AccountTab) => void;
}

type AccountTab = 'reports' | 'transactions';

const ACCOUNT_TABS: TabOption<AccountTab>[] = [
  { id: 'reports', label: 'Raporlar', icon: 'stats-chart' },
  { id: 'transactions', label: 'İşlemler', icon: 'swap-horizontal' },
];

export default function AccountScreen({ onBack, onTabChange, onLogout, onAccountSummary, onCashBank, onCariDetay, onCheckBill, onStock, onSales, onPersonnelPerformance, onCompanyModelPerformance, onBankaKomisyon, onCariHesaplar, onKasaIslemleri, initialTab, onActiveTabChange }: AccountScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [accountTab, setAccountTab] = useState<AccountTab>(initialTab ?? 'reports');
  const [showParameterModal, setShowParameterModal] = useState(false);

  const styles = createStyles(colors, isDark);

  // Mock rapor parametreleri
  const mockReportParameters = [
    {
      id: 'startDate',
      label: 'Başlangıç Tarihi',
      type: 'date' as const,
      required: true,
    },
    {
      id: 'endDate',
      label: 'Bitiş Tarihi',
      type: 'date' as const,
      required: true,
    },
    {
      id: 'format',
      label: 'Rapor Formatı',
      type: 'radio' as const,
      required: true,
      options: [
        { value: 'pdf', label: 'PDF' },
        { value: 'excel', label: 'Excel' },
      ],
    },
    {
      id: 'details',
      label: 'Detay Seçenekleri',
      type: 'checkbox' as const,
      options: [
        { value: 'summary', label: 'Özet Bilgiler' },
        { value: 'transactions', label: 'İşlem Detayları' },
        { value: 'charts', label: 'Grafikler' },
      ],
    },
  ];

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

  const handleReportGenerate = (values: Record<string, any>) => {
    // TODO: Buradan API'ye istek gönderilecek
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {/* Header */}
        <Header
          title="Finans Yönetimi"
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
                <Icon name="calculator" size={18} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Muhasebe</Text>
            </View>
          </View>

          {/* Account Tabs */}
          <Tab
            options={ACCOUNT_TABS}
            activeTab={accountTab}
            onTabChange={(tab) => { setAccountTab(tab); onActiveTabChange?.(tab); }}
          />

          {/* Tab Content */}
          {accountTab === 'reports' && (
            <>
              <MenuCard
                name="Kasa & Banka"
                icon="wallet-outline"
                color="#3B82F6"
                description="Kasa ve banka hesap durumu raporu"
                onPress={() => {
                  if (onCashBank) {
                    onCashBank();
                  }
                }}
              />
              <MenuCard
                name="Cari Özet"
                icon="people-outline"
                color="#8B5CF6"
                description="Cari hesap bakiyeleri özet raporu"
                onPress={() => {
                  if (onAccountSummary) {
                    onAccountSummary();
                  }
                }}
              />
              <MenuCard
                name="Cari Detay"
                icon="document-text-outline"
                color="#10B981"
                description="Cari hesap hareketleri detay raporu"
                onPress={() => {
                  if (onCariDetay) {
                    onCariDetay();
                  }
                }}
              />
              <MenuCard
                name="Çek & Senet"
                icon="card-outline"
                color="#F59E0B"
                description="Çek ve senet durumu raporu"
                onPress={() => {
                  if (onCheckBill) {
                    onCheckBill();
                  }
                }}
              />
              <MenuCard
                name="Stoklar"
                icon="cube-outline"
                color="#EF4444"
                description="Stok durumu ve hareketleri"
                onPress={() => {
                  if (onStock) {
                    onStock();
                  }
                }}
              />
              <MenuCard
                name="Satışlar"
                icon="cart-outline"
                color="#10B981"
                description="Satış faturaları ve raporu"
                onPress={() => onSales?.()}
              />
            </>
          )}

          {accountTab === 'transactions' && (
            <>
              <MenuCard
                name="Cari Hesaplar"
                icon="people-outline"
                color="#8B5CF6"
                description="Cari hesap işlemleri"
                onPress={() => onCariHesaplar?.()}
              />
              <MenuCard
                name="Kasa İşlemleri"
                icon="cash-outline"
                color="#10B981"
                description="Kasa giriş/çıkış işlemleri"
                onPress={() => onKasaIslemleri?.()}
              />
              <MenuCard
                name="Banka Komisyon"
                icon="card-outline"
                color="#3B82F6"
                description="Banka komisyon tanımları"
                onPress={() => onBankaKomisyon?.()}
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

        {/* Report Parameter Modal */}
        <ReportParameterModal
          visible={showParameterModal}
          onClose={() => setShowParameterModal(false)}
          reportTitle="Kasa & Banka Raporu"
          parameters={mockReportParameters}
          onGenerate={handleReportGenerate}
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
