import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import BackButton from '../components/BackButton';
import TabBar, { TabName } from '../components/TabBar';
import DateFilter, { DatePreset } from '../components/DateFilter';

export type PerformanceModul = 'muhasebe' | 'magaza' | 'konfeksiyon';

const MODUL_TITLES: Record<PerformanceModul, string> = {
  muhasebe: 'Muhasebe Personel Performans',
  magaza: 'Mağaza Personel Performans',
  konfeksiyon: 'Konfeksiyon Personel Performans',
};

const MODUL_ICONS: Record<PerformanceModul, string> = {
  muhasebe: 'stats-chart',
  magaza: 'storefront-outline',
  konfeksiyon: 'shirt-outline',
};

interface PersonnelPerformanceScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  modul?: PerformanceModul;
}

// Mock data types
interface PersonnelDailyBreakdown {
  day: string;
  amount: number;
  count: number;
}

interface PersonnelItem {
  id: string;
  name: string;
  totalSales: number;
  totalCount: number;
  avgSale: number;
  rank: number;
  dailyBreakdown: PersonnelDailyBreakdown[];
}

// Mock data
const MOCK_PERSONNEL: PersonnelItem[] = [
  {
    id: '1', name: 'Ahmet Yılmaz', totalSales: 45200, totalCount: 234, avgSale: 193, rank: 1,
    dailyBreakdown: [
      { day: 'Pazartesi', amount: 8200, count: 42 },
      { day: 'Salı', amount: 7800, count: 38 },
      { day: 'Çarşamba', amount: 9100, count: 48 },
      { day: 'Perşembe', amount: 6500, count: 35 },
      { day: 'Cuma', amount: 7200, count: 40 },
      { day: 'Cumartesi', amount: 6400, count: 31 },
      { day: 'Pazar', amount: 3200, count: 18 },
    ],
  },
  {
    id: '2', name: 'Mehmet Kaya', totalSales: 38100, totalCount: 198, avgSale: 192, rank: 2,
    dailyBreakdown: [
      { day: 'Pazartesi', amount: 7100, count: 36 },
      { day: 'Salı', amount: 6500, count: 33 },
      { day: 'Çarşamba', amount: 7800, count: 38 },
      { day: 'Perşembe', amount: 5800, count: 30 },
      { day: 'Cuma', amount: 6200, count: 34 },
      { day: 'Cumartesi', amount: 4700, count: 27 },
      { day: 'Pazar', amount: 2400, count: 14 },
    ],
  },
  {
    id: '3', name: 'Ayşe Demir', totalSales: 29700, totalCount: 167, avgSale: 178, rank: 3,
    dailyBreakdown: [
      { day: 'Pazartesi', amount: 5400, count: 30 },
      { day: 'Salı', amount: 5100, count: 28 },
      { day: 'Çarşamba', amount: 5800, count: 32 },
      { day: 'Perşembe', amount: 4500, count: 26 },
      { day: 'Cuma', amount: 4900, count: 27 },
      { day: 'Cumartesi', amount: 4000, count: 24 },
      { day: 'Pazar', amount: 1800, count: 12 },
    ],
  },
  {
    id: '4', name: 'Fatma Şahin', totalSales: 24500, totalCount: 142, avgSale: 173, rank: 4,
    dailyBreakdown: [
      { day: 'Pazartesi', amount: 4500, count: 25 },
      { day: 'Salı', amount: 4200, count: 24 },
      { day: 'Çarşamba', amount: 4800, count: 27 },
      { day: 'Perşembe', amount: 3800, count: 22 },
      { day: 'Cuma', amount: 4000, count: 24 },
      { day: 'Cumartesi', amount: 3200, count: 20 },
      { day: 'Pazar', amount: 1500, count: 10 },
    ],
  },
  {
    id: '5', name: 'Ali Çelik', totalSales: 21800, totalCount: 128, avgSale: 170, rank: 5,
    dailyBreakdown: [
      { day: 'Pazartesi', amount: 4000, count: 23 },
      { day: 'Salı', amount: 3800, count: 22 },
      { day: 'Çarşamba', amount: 4200, count: 24 },
      { day: 'Perşembe', amount: 3400, count: 20 },
      { day: 'Cuma', amount: 3600, count: 21 },
      { day: 'Cumartesi', amount: 2800, count: 18 },
      { day: 'Pazar', amount: 1200, count: 8 },
    ],
  },
  {
    id: '6', name: 'Zeynep Arslan', totalSales: 18900, totalCount: 115, avgSale: 164, rank: 6,
    dailyBreakdown: [
      { day: 'Pazartesi', amount: 3500, count: 21 },
      { day: 'Salı', amount: 3200, count: 19 },
      { day: 'Çarşamba', amount: 3600, count: 22 },
      { day: 'Perşembe', amount: 2900, count: 18 },
      { day: 'Cuma', amount: 3100, count: 19 },
      { day: 'Cumartesi', amount: 2600, count: 16 },
      { day: 'Pazar', amount: 1100, count: 7 },
    ],
  },
  {
    id: '7', name: 'Hasan Öztürk', totalSales: 15200, totalCount: 98, avgSale: 155, rank: 7,
    dailyBreakdown: [
      { day: 'Pazartesi', amount: 2800, count: 18 },
      { day: 'Salı', amount: 2600, count: 16 },
      { day: 'Çarşamba', amount: 2900, count: 18 },
      { day: 'Perşembe', amount: 2400, count: 15 },
      { day: 'Cuma', amount: 2500, count: 17 },
      { day: 'Cumartesi', amount: 2000, count: 14 },
      { day: 'Pazar', amount: 900, count: 6 },
    ],
  },
  {
    id: '8', name: 'Elif Yıldız', totalSales: 12400, totalCount: 82, avgSale: 151, rank: 8,
    dailyBreakdown: [
      { day: 'Pazartesi', amount: 2300, count: 15 },
      { day: 'Salı', amount: 2100, count: 14 },
      { day: 'Çarşamba', amount: 2400, count: 15 },
      { day: 'Perşembe', amount: 1900, count: 13 },
      { day: 'Cuma', amount: 2000, count: 13 },
      { day: 'Cumartesi', amount: 1700, count: 12 },
      { day: 'Pazar', amount: 700, count: 5 },
    ],
  },
];

export default function PersonnelPerformanceScreen({
  onGoBack,
  onTabChange,
  onLogout,
  modul = 'konfeksiyon',
}: PersonnelPerformanceScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Date filters
  const getToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const getTodayEnd = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };
  const [startDate, setStartDate] = useState<Date>(getToday());
  const [endDate, setEndDate] = useState<Date>(getTodayEnd());
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>('month');

  const formatDateStr = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${d}.${m}.${date.getFullYear()}`;
  };

  const handlePresetChange = (preset: DatePreset) => {
    setSelectedPreset(preset);
    const now = new Date();
    let start = new Date();
    let end = new Date();
    end.setHours(23, 59, 59, 999);
    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - now.getDay() + 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }
    setStartDate(start);
    setEndDate(end);
  };

  const handleStartDateChange = (date: Date) => {
    setStartDate(date);
    setSelectedPreset(null);
  };

  const handleEndDateChange = (date: Date) => {
    setEndDate(date);
    setSelectedPreset(null);
  };

  const styles = createStyles(colors, isDark);

  const personnel = MOCK_PERSONNEL;
  const maxSales = Math.max(...personnel.map(p => p.totalSales));
  const totalSales = personnel.reduce((sum, p) => sum + p.totalSales, 0);
  const totalCount = personnel.reduce((sum, p) => sum + p.totalCount, 0);
  const bestPerson = personnel[0];

  const formatAmount = (value: number) => {
    if (value >= 1000) {
      return (value / 1000).toFixed(1).replace('.', ',') + 'K';
    }
    return value.toLocaleString('tr-TR');
  };

  const formatFullAmount = (value: number) => {
    return value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCardId(prev => prev === cardId ? null : cardId);
  };

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) onLogout();
    } catch (e) {}
  };

  const onRefresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '1', bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
    if (rank === 2) return { emoji: '2', bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' };
    if (rank === 3) return { emoji: '3', bg: '#FED7AA', color: '#C2410C', border: '#FDBA74' };
    return { emoji: String(rank), bg: isDark ? colors.background : '#F8FAFC', color: colors.textSecondary, border: colors.border };
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title={MODUL_TITLES[modul]}
          leftButton={<BackButton onPress={onGoBack} />}
          showMenu={true}
          onLogout={handleLogout}
        />

        {/* Page Title */}
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleContainer}>
            <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
              <Icon name={MODUL_ICONS[modul]} size={18} color={colors.primary} />
            </View>
            <Text style={styles.pageTitle}>{MODUL_TITLES[modul]}</Text>
          </View>
        </View>

        {/* Date Filter */}
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
          />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        >
          {/* Summary Cards */}
          <View style={styles.summaryCards}>
            <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
              <View style={styles.summaryCardIcon}>
                <Icon name="cash-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.summaryCardLabel}>Toplam Satış</Text>
              <Text style={[styles.summaryCardValue, { color: '#10B981' }]}>
                {formatAmount(totalSales)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: '#3B82F6' }]}>
              <View style={styles.summaryCardIcon}>
                <Icon name="cube-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.summaryCardLabel}>Toplam Adet</Text>
              <Text style={[styles.summaryCardValue, { color: '#3B82F6' }]}>
                {formatFullAmount(totalCount)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}>
              <View style={styles.summaryCardIcon}>
                <Icon name="trophy-outline" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.summaryCardLabel}>En İyi</Text>
              <Text style={[styles.summaryCardValue, { color: '#F59E0B' }]} numberOfLines={1}>
                {bestPerson?.name?.split(' ')[0] || '-'}
              </Text>
            </View>
          </View>

          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Icon name="bar-chart-outline" size={16} color={colors.primary} />
              <Text style={styles.chartTitle}>Satış Dağılımı</Text>
            </View>
            {personnel.slice(0, 6).map((person) => {
              const barWidth = maxSales > 0 ? (person.totalSales / maxSales) * 100 : 0;
              const rank = getRankBadge(person.rank);
              return (
                <View key={person.id} style={styles.chartRow}>
                  <View style={styles.chartLabel}>
                    <View style={[styles.chartRankDot, { backgroundColor: rank.bg, borderColor: rank.border }]}>
                      <Text style={[styles.chartRankText, { color: rank.color }]}>{rank.emoji}</Text>
                    </View>
                    <Text style={styles.chartName} numberOfLines={1}>{person.name.split(' ')[0]}</Text>
                  </View>
                  <View style={styles.chartBarContainer}>
                    <View style={[styles.chartBar, { width: `${barWidth}%` }]} />
                  </View>
                  <Text style={styles.chartValue}>{formatAmount(person.totalSales)}</Text>
                </View>
              );
            })}
          </View>

          {/* Personnel List */}
          <View style={styles.listHeader}>
            <Icon name="people" size={16} color={colors.primary} />
            <Text style={styles.listTitle}>Personel Detayları</Text>
            <Text style={styles.listCount}>{personnel.length} kişi</Text>
          </View>

          {personnel.map((person) => {
            const isExpanded = expandedCardId === person.id;
            const rank = getRankBadge(person.rank);

            return (
              <Pressable
                key={person.id}
                style={styles.card}
                onPress={() => toggleCardExpansion(person.id)}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.rankBadge, { backgroundColor: rank.bg, borderColor: rank.border }]}>
                      <Text style={[styles.rankText, { color: rank.color }]}>{rank.emoji}</Text>
                    </View>
                    <View style={styles.cardTitleContainer}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{person.name}</Text>
                      <Text style={styles.cardSubtitle}>
                        {formatFullAmount(person.totalCount)} adet  ·  Ort: ₺{formatFullAmount(person.avgSale)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <Text style={styles.cardAmount}>₺{formatFullAmount(person.totalSales)}</Text>
                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                </View>

                {/* Expanded Detail */}
                {isExpanded && (
                  <View style={styles.cardDetail}>
                    <View style={styles.cardDetailHeader}>
                      <Text style={[styles.cardDetailHeaderCell, { flex: 1.2 }]}>Gün</Text>
                      <Text style={[styles.cardDetailHeaderCell, { flex: 1, textAlign: 'right' }]}>Adet</Text>
                      <Text style={[styles.cardDetailHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Tutar</Text>
                    </View>
                    {person.dailyBreakdown.map((day, i) => (
                      <View key={day.day} style={[styles.cardDetailRow, i % 2 === 0 && styles.cardDetailRowAlt]}>
                        <Text style={[styles.cardDetailCell, { flex: 1.2 }]}>{day.day}</Text>
                        <Text style={[styles.cardDetailCell, { flex: 1, textAlign: 'right', color: '#3B82F6' }]}>
                          {day.count}
                        </Text>
                        <Text style={[styles.cardDetailCell, { flex: 1.5, textAlign: 'right', color: '#10B981', fontWeight: '600' }]}>
                          ₺{formatFullAmount(day.amount)}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.cardDetailFooter}>
                      <Text style={styles.cardDetailFooterLabel}>Günlük Ortalama</Text>
                      <Text style={styles.cardDetailFooterValue}>
                        ₺{formatFullAmount(Math.round(person.totalSales / (person.dailyBreakdown.length || 1)))}
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

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
    pageHeader: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
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
    filterCard: {
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 100,
    },
    // Summary Cards
    summaryCards: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      padding: 12,
      borderLeftWidth: 3,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    summaryCardIcon: {
      marginBottom: 6,
    },
    summaryCardLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    summaryCardValue: {
      fontSize: 17,
      fontWeight: '800',
    },
    // Bar Chart
    chartContainer: {
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 14,
    },
    chartTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    chartRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 8,
    },
    chartLabel: {
      width: 80,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chartRankDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    chartRankText: {
      fontSize: 10,
      fontWeight: '700',
    },
    chartName: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    chartBarContainer: {
      flex: 1,
      height: 14,
      backgroundColor: isDark ? colors.background : '#F1F5F9',
      borderRadius: 7,
      overflow: 'hidden',
    },
    chartBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 7,
      opacity: 0.8,
    },
    chartValue: {
      width: 48,
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'right',
    },
    // List Header
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    listTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
      flex: 1,
    },
    listCount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    // Personnel Cards
    card: {
      marginBottom: 8,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    rankText: {
      fontSize: 13,
      fontWeight: '800',
    },
    cardTitleContainer: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    cardHeaderRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    cardAmount: {
      fontSize: 16,
      fontWeight: '800',
      color: '#10B981',
    },
    // Expanded Detail
    cardDetail: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
      paddingTop: 10,
    },
    cardDetailHeader: {
      flexDirection: 'row',
      paddingBottom: 6,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#F1F5F9',
    },
    cardDetailHeaderCell: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    cardDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 4,
      borderRadius: 6,
    },
    cardDetailRowAlt: {
      backgroundColor: isDark ? colors.background : '#F8FAFC',
    },
    cardDetailCell: {
      fontSize: 13,
      color: colors.text,
    },
    cardDetailFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
    cardDetailFooterLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    cardDetailFooterValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
  });
