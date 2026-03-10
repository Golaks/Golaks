import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import BackButton from '../components/BackButton';
import TabBar, { TabName } from '../components/TabBar';
import DateFilter, { DatePreset } from '../components/DateFilter';

interface AgencyPerformanceScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

type AnalysisMode = 'revenue' | 'count';

interface BranchBreakdown {
  branch: string;
  count: number;
  amount: number;
  commission: number;
}

interface AgencyItem {
  id: string;
  name: string;
  contact: string;
  totalCount: number;
  totalAmount: number;
  totalCommission: number;
  commissionRate: number;
  branches: BranchBreakdown[];
}

// Mock data
const MOCK_AGENCIES: AgencyItem[] = [
  {
    id: '1', name: 'Tur Dünyası Turizm', contact: 'Ahmet Kaya',
    totalCount: 1245, totalAmount: 487500, totalCommission: 48750, commissionRate: 10,
    branches: [
      { branch: 'Merkez Şube', count: 680, amount: 266000, commission: 26600 },
      { branch: 'Kadıköy Şube', count: 340, amount: 133500, commission: 13350 },
      { branch: 'Bakırköy Şube', count: 225, amount: 88000, commission: 8800 },
    ],
  },
  {
    id: '2', name: 'Gezgin Travel', contact: 'Fatma Demir',
    totalCount: 982, totalAmount: 392800, totalCommission: 31424, commissionRate: 8,
    branches: [
      { branch: 'Merkez Şube', count: 520, amount: 208000, commission: 16640 },
      { branch: 'Kadıköy Şube', count: 462, amount: 184800, commission: 14784 },
    ],
  },
  {
    id: '3', name: 'Anadolu Tur', contact: 'Mustafa Yılmaz',
    totalCount: 756, totalAmount: 302400, totalCommission: 27216, commissionRate: 9,
    branches: [
      { branch: 'Merkez Şube', count: 420, amount: 168000, commission: 15120 },
      { branch: 'Bakırköy Şube', count: 336, amount: 134400, commission: 12096 },
    ],
  },
  {
    id: '4', name: 'Akdeniz Holidays', contact: 'Elif Arslan',
    totalCount: 634, totalAmount: 253600, totalCommission: 25360, commissionRate: 10,
    branches: [
      { branch: 'Kadıköy Şube', count: 380, amount: 152000, commission: 15200 },
      { branch: 'Merkez Şube', count: 254, amount: 101600, commission: 10160 },
    ],
  },
  {
    id: '5', name: 'Karadeniz Turizm', contact: 'Hasan Çelik',
    totalCount: 498, totalAmount: 199200, totalCommission: 13944, commissionRate: 7,
    branches: [
      { branch: 'Merkez Şube', count: 498, amount: 199200, commission: 13944 },
    ],
  },
  {
    id: '6', name: 'Star Tourism', contact: 'Zeynep Kurt',
    totalCount: 387, totalAmount: 154800, totalCommission: 13932, commissionRate: 9,
    branches: [
      { branch: 'Bakırköy Şube', count: 210, amount: 84000, commission: 7560 },
      { branch: 'Kadıköy Şube', count: 177, amount: 70800, commission: 6372 },
    ],
  },
];

export default function AgencyPerformanceScreen({
  onGoBack,
  onTabChange,
  onLogout,
}: AgencyPerformanceScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('revenue');

  // Date filters
  const getTodayEnd = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };
  const [startDate, setStartDate] = useState<Date>(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
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
      case 'today': start.setHours(0, 0, 0, 0); break;
      case 'week': start.setDate(now.getDate() - now.getDay() + 1); start.setHours(0, 0, 0, 0); break;
      case 'month': start.setDate(1); start.setHours(0, 0, 0, 0); break;
      case 'year': start = new Date(now.getFullYear(), 0, 1); break;
    }
    setStartDate(start);
    setEndDate(end);
  };

  const handleStartDateChange = (date: Date) => { setStartDate(date); setSelectedPreset(null); };
  const handleEndDateChange = (date: Date) => { setEndDate(date); setSelectedPreset(null); };

  const styles = createStyles(colors, isDark);

  const isRevenue = analysisMode === 'revenue';

  const agencies = [...MOCK_AGENCIES].sort((a, b) =>
    isRevenue ? b.totalAmount - a.totalAmount : b.totalCount - a.totalCount
  );
  const totalAmount = agencies.reduce((sum, a) => sum + a.totalAmount, 0);
  const totalCount = agencies.reduce((sum, a) => sum + a.totalCount, 0);
  const totalCommission = agencies.reduce((sum, a) => sum + a.totalCommission, 0);
  const topAgency = agencies[0];
  const maxChartValue = Math.max(...agencies.map(a => isRevenue ? a.totalAmount : a.totalCount));

  const formatAmount = (value: number) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1).replace('.', ',') + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1).replace('.', ',') + 'K';
    return value.toLocaleString('tr-TR');
  };

  const formatFullAmount = (value: number) =>
    value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const toggleAgencyExpansion = (id: string) => {
    setExpandedAgencyId(prev => prev === id ? null : id);
  };

  const handleTabPress = (tab: TabName) => { setActiveTab(tab); if (onTabChange) onTabChange(tab); };
  const handleLogout = async () => { try { await logout(); if (onLogout) onLogout(); } catch (e) {} };
  const onRefresh = useCallback(() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 1000); }, []);

  const getRankBadge = (index: number) => {
    if (index === 0) return { bg: '#FEF3C7', border: '#FCD34D', text: '#D97706' };
    if (index === 1) return { bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280' };
    if (index === 2) return { bg: '#FED7AA', border: '#FDBA74', text: '#C2410C' };
    return { bg: isDark ? colors.background : '#F8FAFC', border: colors.border, text: colors.textSecondary };
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Acenta Performans"
          leftButton={<BackButton onPress={onGoBack} />}
          showMenu={true}
          onLogout={handleLogout}
        />

        {/* Page Title */}
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleContainer}>
            <View style={[styles.pageTitleIcon, { backgroundColor: '#F59E0B' + '20' }]}>
              <Icon name="business-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.pageTitle}>Acenta Performans Raporu</Text>
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

        {/* Analysis Mode Switch */}
        <View style={styles.modeSwitch}>
          <Pressable
            style={[styles.modeSwitchButton, analysisMode === 'revenue' && styles.modeSwitchButtonActive]}
            onPress={() => setAnalysisMode('revenue')}
          >
            <Icon name="cash-outline" size={16} color={analysisMode === 'revenue' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeSwitchText, analysisMode === 'revenue' && styles.modeSwitchTextActive]}>Ciro</Text>
          </Pressable>
          <Pressable
            style={[styles.modeSwitchButton, analysisMode === 'count' && styles.modeSwitchButtonActive]}
            onPress={() => setAnalysisMode('count')}
          >
            <Icon name="cube-outline" size={16} color={analysisMode === 'count' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeSwitchText, analysisMode === 'count' && styles.modeSwitchTextActive]}>Adet</Text>
          </Pressable>
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
              <Text style={styles.summaryCardLabel}>Toplam Ciro</Text>
              <Text style={[styles.summaryCardValue, { color: '#10B981' }]}>
                ₺{formatAmount(totalAmount)}
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
                <Icon name="wallet-outline" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.summaryCardLabel}>Komisyon</Text>
              <Text style={[styles.summaryCardValue, { color: '#F59E0B' }]}>
                ₺{formatAmount(totalCommission)}
              </Text>
            </View>
          </View>

          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Icon name="bar-chart-outline" size={16} color={colors.primary} />
              <Text style={styles.chartTitle}>{isRevenue ? 'Acenta Ciro Dağılımı' : 'Acenta Adet Dağılımı'}</Text>
            </View>
            {agencies.map((agency, index) => {
              const chartVal = isRevenue ? agency.totalAmount : agency.totalCount;
              const barWidth = maxChartValue > 0 ? (chartVal / maxChartValue) * 100 : 0;
              const rank = getRankBadge(index);
              return (
                <View key={agency.id} style={styles.chartRow}>
                  <View style={styles.chartLabel}>
                    <View style={[styles.chartRankDot, { backgroundColor: rank.bg, borderColor: rank.border }]}>
                      <Text style={[styles.chartRankText, { color: rank.text }]}>{index + 1}</Text>
                    </View>
                    <Text style={styles.chartName} numberOfLines={1}>{agency.name.split(' ')[0]}</Text>
                  </View>
                  <View style={styles.chartBarContainer}>
                    <View style={[styles.chartBar, { width: `${barWidth}%` }]} />
                  </View>
                  <Text style={styles.chartValue}>{isRevenue ? '₺' + formatAmount(agency.totalAmount) : formatFullAmount(agency.totalCount)}</Text>
                </View>
              );
            })}
          </View>

          {/* Agency List */}
          <View style={styles.listHeader}>
            <Icon name="business" size={16} color={colors.primary} />
            <Text style={styles.listTitle}>Acenta Detayları</Text>
            <Text style={styles.listCount}>{agencies.length} acenta</Text>
          </View>

          {agencies.map((agency, agencyIndex) => {
            const isExpanded = expandedAgencyId === agency.id;
            const rank = getRankBadge(agencyIndex);
            const maxBranchVal = Math.max(...agency.branches.map(b => isRevenue ? b.amount : b.count));

            return (
              <View key={agency.id} style={styles.agencyCard}>
                {/* Agency Header */}
                <Pressable
                  style={styles.agencyHeader}
                  onPress={() => toggleAgencyExpansion(agency.id)}
                >
                  <View style={styles.agencyHeaderLeft}>
                    <View style={[styles.agencyRank, { backgroundColor: rank.bg, borderColor: rank.border }]}>
                      <Text style={[styles.agencyRankText, { color: rank.text }]}>{agencyIndex + 1}</Text>
                    </View>
                    <View style={styles.agencyInfo}>
                      <Text style={styles.agencyName} numberOfLines={1}>{agency.name}</Text>
                      <Text style={styles.agencyMeta}>
                        {agency.contact}  ·  %{agency.commissionRate} komisyon
                      </Text>
                    </View>
                  </View>
                  <View style={styles.agencyHeaderRight}>
                    <Text style={styles.agencyAmount}>₺{formatFullAmount(agency.totalAmount)}</Text>
                    <View style={styles.agencySubInfo}>
                      <Text style={styles.agencyCount}>{formatFullAmount(agency.totalCount)} adet</Text>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textSecondary}
                      />
                    </View>
                  </View>
                </Pressable>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedContainer}>
                    {/* Commission Info */}
                    <View style={styles.commissionRow}>
                      <View style={styles.commissionItem}>
                        <Icon name="wallet-outline" size={14} color="#F59E0B" />
                        <Text style={styles.commissionLabel}>Komisyon</Text>
                        <Text style={[styles.commissionValue, { color: '#F59E0B' }]}>₺{formatFullAmount(agency.totalCommission)}</Text>
                      </View>
                      <View style={styles.commissionItem}>
                        <Icon name="pricetag-outline" size={14} color="#8B5CF6" />
                        <Text style={styles.commissionLabel}>Ort. Tutar</Text>
                        <Text style={[styles.commissionValue, { color: '#8B5CF6' }]}>₺{formatFullAmount(Math.round(agency.totalAmount / agency.totalCount))}</Text>
                      </View>
                    </View>

                    {/* Branch Breakdown */}
                    <View style={styles.branchBreakdownHeader}>
                      <Icon name="location-outline" size={14} color={colors.primary} />
                      <Text style={styles.branchBreakdownTitle}>Şube Dağılımı</Text>
                    </View>

                    {agency.branches.map((branch, bi) => {
                      const branchVal = isRevenue ? branch.amount : branch.count;
                      const branchBarWidth = maxBranchVal > 0 ? (branchVal / maxBranchVal) * 100 : 0;
                      return (
                        <View key={branch.branch} style={[styles.branchRow, bi % 2 === 0 && styles.branchRowAlt]}>
                          <View style={styles.branchInfo}>
                            <Icon name="storefront-outline" size={13} color={colors.textSecondary} />
                            <Text style={styles.branchName} numberOfLines={1}>{branch.branch}</Text>
                          </View>
                          <View style={styles.branchBarContainer}>
                            <View style={[styles.branchBar, { width: `${branchBarWidth}%` }]} />
                          </View>
                          <View style={styles.branchStats}>
                            <Text style={styles.branchCount}>{branch.count}</Text>
                            <Text style={styles.branchAmount}>₺{formatAmount(branch.amount)}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
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
    modeSwitch: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: isDark ? colors.card : '#F1F5F9',
      borderRadius: 10,
      padding: 3,
    },
    modeSwitchButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      borderRadius: 8,
    },
    modeSwitchButtonActive: {
      backgroundColor: colors.primary,
    },
    modeSwitchText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modeSwitchTextActive: {
      color: '#fff',
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
      backgroundColor: '#F59E0B',
      borderRadius: 7,
      opacity: 0.8,
    },
    chartValue: {
      width: 52,
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
    // Agency Card
    agencyCard: {
      marginBottom: 8,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
      overflow: 'hidden',
    },
    agencyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    agencyHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    agencyRank: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    agencyRankText: {
      fontSize: 13,
      fontWeight: '800',
    },
    agencyInfo: {
      flex: 1,
    },
    agencyName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    agencyMeta: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    agencyHeaderRight: {
      alignItems: 'flex-end',
      gap: 2,
    },
    agencyAmount: {
      fontSize: 16,
      fontWeight: '800',
      color: '#10B981',
    },
    agencySubInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    agencyCount: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    // Expanded
    expandedContainer: {
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
      paddingHorizontal: 14,
      paddingBottom: 12,
    },
    commissionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
      marginBottom: 14,
    },
    commissionItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? colors.background : '#FAFBFC',
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    commissionLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      flex: 1,
    },
    commissionValue: {
      fontSize: 13,
      fontWeight: '700',
    },
    branchBreakdownHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    branchBreakdownTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    branchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 4,
      borderRadius: 6,
      gap: 8,
    },
    branchRowAlt: {
      backgroundColor: isDark ? colors.card : '#fff',
    },
    branchInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      width: 100,
    },
    branchName: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
      flex: 1,
    },
    branchBarContainer: {
      flex: 1,
      height: 10,
      backgroundColor: isDark ? colors.background : '#F1F5F9',
      borderRadius: 5,
      overflow: 'hidden',
    },
    branchBar: {
      height: '100%',
      backgroundColor: '#F59E0B',
      borderRadius: 5,
      opacity: 0.7,
    },
    branchStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: 90,
      justifyContent: 'flex-end',
    },
    branchCount: {
      fontSize: 12,
      fontWeight: '600',
      color: '#3B82F6',
      width: 28,
      textAlign: 'right',
    },
    branchAmount: {
      fontSize: 12,
      fontWeight: '600',
      color: '#10B981',
    },
  });
