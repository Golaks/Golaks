import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, RefreshControl } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import SearchButton from '../components/SearchButton';
import AddButton from '../components/AddButton';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import DateFilter from '../components/DateFilter';
import SatisForm from '../components/SatisForm';
import { useAlert } from '../contexts/AlertContext';
import { authService } from '../services/auth.service';
import salesService from '../services/sales.service';

type DatePreset = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'custom';

const getPresetDates = (preset: DatePreset): { start: Date; end: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'thisWeek': {
      const day = today.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const start = new Date(today);
      start.setDate(today.getDate() - diff);
      return { start, end: today };
    }
    case 'thisMonth':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: today };
    case 'lastMonth': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: s, end: e };
    }
    case 'last3Months': {
      const s = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return { start: s, end: today };
    }
    case 'thisYear':
      return { start: new Date(now.getFullYear(), 0, 1), end: today };
    default:
      return { start: today, end: today };
  }
};

const formatDateStr = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}.${m}.${date.getFullYear()}`;
};

interface SatisIslemleriScreenProps {
  onGoBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function SatisIslemleriScreen({ onGoBack, onTabChange, onLogout }: SatisIslemleriScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, user, notificationCount } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [filterVisible, setFilterVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [data, setData] = useState<any[]>([]);

  // Date filter
  const defaultPreset: DatePreset = 'thisMonth';
  const defaultDates = getPresetDates(defaultPreset);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(defaultPreset);
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  const formatDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const response = await salesService.getList(token, dataName, {
        modul: 'magaza',
        startDate: formatDateISO(startDate),
        endDate: formatDateISO(endDate),
      });
      if (response.success && response.data) {
        setData(response.data.items || []);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleSaved = () => {
    showSuccess('Satış kaydedildi');
    fetchData();
  };

  const styles = createStyles(colors, isDark);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleLogout = async () => {
    try {
      await logout();
      onLogout?.();
    } catch {}
  };

  const handlePresetChange = (preset: DatePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const { start, end } = getPresetDates(preset);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleStartDateChange = (date: Date) => {
    setStartDate(date);
    setSelectedPreset('custom');
  };

  const handleEndDateChange = (date: Date) => {
    setEndDate(date);
    setSelectedPreset('custom');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Satış İşlemleri"
          leftButton={<BackButton onPress={onGoBack || (() => {})} />}
          showMenu={true}
          onLogout={handleLogout}
          rightButton={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AddButton onPress={() => setFormVisible(true)} />
              <SearchButton onPress={() => setFilterVisible(!filterVisible)} />
            </View>
          }
        />

        {isLoading && data.length === 0 ? (
          <LoadingSpinner />
        ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchData} colors={[colors.primary]} />
          }
        >
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="cart" size={18} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Satış İşlemleri</Text>
            </View>
          </View>

          {/* Date Filter */}
          {filterVisible && (
            <View style={styles.filterCard}>
              <DateFilter
                selectedPreset={selectedPreset}
                onPresetChange={handlePresetChange}
                startDate={formatDateStr(startDate)}
                endDate={formatDateStr(endDate)}
                startDateObj={startDate}
                endDateObj={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                showSearch={true}
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Müşteri, fatura no ara..."
              />
            </View>
          )}

          {data.length === 0 && !isLoading ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                icon="cart-outline"
                title="Satış Bulunamadı"
                subtitle={searchText ? 'Aramanızla eşleşen satış bulunamadı.' : 'Seçilen tarih aralığında satış kaydı yok.'}
              />
            </View>
          ) : (
            data.map((item: any) => (
              <View key={item.id} style={[styles.card, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? colors.border : '#E2E8F0' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.cariAdi}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{item.seriNo} · {item.tarih?.split(' ')[0]}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>{parseFloat(item.toplamTutar || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.doviz}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        )}

        {/* Satış Formu */}
        <SatisForm
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          onSave={handleSaved}
        />

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
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 16 },
    pageHeader: { paddingTop: 16, paddingBottom: 8 },
    pageTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageTitleIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    pageTitle: { fontSize: 16, fontWeight: '700', color: colors.text, opacity: 0.6 },
    filterCard: {
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12, padding: 12, marginBottom: 12,
      borderWidth: 1, borderColor: isDark ? colors.border : '#E2E8F0',
    },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    card: {
      borderRadius: 12, padding: 14, marginBottom: 8,
      borderWidth: 1,
    },
  });
