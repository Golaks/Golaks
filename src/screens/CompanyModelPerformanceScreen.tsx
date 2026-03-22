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

export type PerformanceModul = 'muhasebe' | 'magaza' | 'konfeksiyon';

const MODUL_TITLES: Record<PerformanceModul, string> = {
  muhasebe: 'Muhasebe Firma Model Performans',
  magaza: 'Mağaza Firma Model Performans',
  konfeksiyon: 'Konfeksiyon Firma Model Performans',
};

const MODUL_ICONS: Record<PerformanceModul, string> = {
  muhasebe: 'stats-chart',
  magaza: 'storefront-outline',
  konfeksiyon: 'shirt-outline',
};

interface CompanyModelPerformanceScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  modul?: PerformanceModul;
}

type AnalysisMode = 'count' | 'profit';

// Types
interface ColorBreakdown {
  color: string;
  colorHex: string;
  count: number;
  amount: number;
  profit: number;
}

interface ModelItem {
  id: string;
  model: string;
  totalCount: number;
  totalAmount: number;
  totalProfit: number;
  colors: ColorBreakdown[];
}

interface BranchItem {
  id: string;
  name: string;
  totalCount: number;
  totalAmount: number;
  totalProfit: number;
  models: ModelItem[];
}

interface CompanyItem {
  id: string;
  name: string;
  totalCount: number;
  totalAmount: number;
  totalProfit: number;
  branches: BranchItem[];
}

// Mock data
const MOCK_COMPANIES: CompanyItem[] = [
  {
    id: '1', name: 'Zara Tekstil', totalCount: 856, totalAmount: 245800, totalProfit: 68420,
    branches: [
      {
        id: 'b1', name: 'Merkez Şube', totalCount: 520, totalAmount: 152000, totalProfit: 42560,
        models: [
          {
            id: 'm1', model: 'MDL-2024-A1', totalCount: 320, totalAmount: 96000, totalProfit: 28800,
            colors: [
              { color: 'Siyah', colorHex: '#1F2937', count: 140, amount: 42000, profit: 12600 },
              { color: 'Beyaz', colorHex: '#F9FAFB', count: 95, amount: 28500, profit: 8550 },
              { color: 'Lacivert', colorHex: '#1E3A5F', count: 85, amount: 25500, profit: 7650 },
            ],
          },
          {
            id: 'm2', model: 'MDL-2024-B3', totalCount: 200, totalAmount: 56000, totalProfit: 13760,
            colors: [
              { color: 'Kırmızı', colorHex: '#DC2626', count: 100, amount: 28000, profit: 7000 },
              { color: 'Gri', colorHex: '#9CA3AF', count: 100, amount: 28000, profit: 6760 },
            ],
          },
        ],
      },
      {
        id: 'b2', name: 'Kadıköy Şube', totalCount: 336, totalAmount: 93800, totalProfit: 25860,
        models: [
          {
            id: 'm3', model: 'MDL-2024-B3', totalCount: 80, totalAmount: 28000, totalProfit: 6720,
            colors: [
              { color: 'Siyah', colorHex: '#1F2937', count: 50, amount: 17500, profit: 4200 },
              { color: 'Kırmızı', colorHex: '#DC2626', count: 30, amount: 10500, profit: 2520 },
            ],
          },
          {
            id: 'm4', model: 'MDL-2024-C7', totalCount: 256, totalAmount: 65800, totalProfit: 19140,
            colors: [
              { color: 'Bej', colorHex: '#D4A574', count: 110, amount: 28600, profit: 8580 },
              { color: 'Kahverengi', colorHex: '#78350F', count: 86, amount: 22360, profit: 6260 },
              { color: 'Yeşil', colorHex: '#059669', count: 60, amount: 14840, profit: 4300 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '2', name: 'H&M Group', totalCount: 642, totalAmount: 189500, totalProfit: 52260,
    branches: [
      {
        id: 'b3', name: 'İstanbul Depo', totalCount: 485, totalAmount: 145500, totalProfit: 40740,
        models: [
          {
            id: 'm5', model: 'HM-STD-110', totalCount: 275, totalAmount: 82500, totalProfit: 24750,
            colors: [
              { color: 'Beyaz', colorHex: '#F9FAFB', count: 130, amount: 39000, profit: 11700 },
              { color: 'Siyah', colorHex: '#1F2937', count: 95, amount: 28500, profit: 8550 },
              { color: 'Mavi', colorHex: '#3B82F6', count: 50, amount: 15000, profit: 4500 },
            ],
          },
          {
            id: 'm6', model: 'HM-PRE-220', totalCount: 210, totalAmount: 63000, totalProfit: 15990,
            colors: [
              { color: 'Lacivert', colorHex: '#1E3A5F', count: 100, amount: 30000, profit: 7500 },
              { color: 'Bordo', colorHex: '#991B1B', count: 70, amount: 21000, profit: 5250 },
              { color: 'Gri', colorHex: '#9CA3AF', count: 40, amount: 12000, profit: 3240 },
            ],
          },
        ],
      },
      {
        id: 'b4', name: 'Ankara Şube', totalCount: 157, totalAmount: 44000, totalProfit: 11520,
        models: [
          {
            id: 'm7', model: 'HM-CAS-330', totalCount: 157, totalAmount: 44000, totalProfit: 11520,
            colors: [
              { color: 'Pembe', colorHex: '#EC4899', count: 82, amount: 22960, profit: 6200 },
              { color: 'Beyaz', colorHex: '#F9FAFB', count: 75, amount: 21040, profit: 5320 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '3', name: 'Mango Fashion', totalCount: 478, totalAmount: 143400, totalProfit: 45890,
    branches: [
      {
        id: 'b5', name: 'Merkez', totalCount: 478, totalAmount: 143400, totalProfit: 45890,
        models: [
          {
            id: 'm8', model: 'MNG-2024-X5', totalCount: 198, totalAmount: 59400, totalProfit: 19008,
            colors: [
              { color: 'Siyah', colorHex: '#1F2937', count: 88, amount: 26400, profit: 8448 },
              { color: 'Krem', colorHex: '#FFFDD0', count: 65, amount: 19500, profit: 6240 },
              { color: 'Yeşil', colorHex: '#059669', count: 45, amount: 13500, profit: 4320 },
            ],
          },
          {
            id: 'm9', model: 'MNG-2024-Y2', totalCount: 165, totalAmount: 49500, totalProfit: 15840,
            colors: [
              { color: 'Turuncu', colorHex: '#EA580C', count: 80, amount: 24000, profit: 7680 },
              { color: 'Sarı', colorHex: '#EAB308', count: 85, amount: 25500, profit: 8160 },
            ],
          },
          {
            id: 'm10', model: 'MNG-2024-Z8', totalCount: 115, totalAmount: 34500, totalProfit: 11042,
            colors: [
              { color: 'Mor', colorHex: '#7C3AED', count: 60, amount: 18000, profit: 5760 },
              { color: 'Gri', colorHex: '#9CA3AF', count: 55, amount: 16500, profit: 5282 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '4', name: 'LC Waikiki', totalCount: 392, totalAmount: 117600, totalProfit: 29400,
    branches: [
      {
        id: 'b6', name: 'Merkez Depo', totalCount: 180, totalAmount: 54000, totalProfit: 13500,
        models: [
          {
            id: 'm11', model: 'LCW-BSC-01', totalCount: 180, totalAmount: 54000, totalProfit: 13500,
            colors: [
              { color: 'Beyaz', colorHex: '#F9FAFB', count: 90, amount: 27000, profit: 6750 },
              { color: 'Siyah', colorHex: '#1F2937', count: 90, amount: 27000, profit: 6750 },
            ],
          },
        ],
      },
      {
        id: 'b7', name: 'Bursa Şube', totalCount: 212, totalAmount: 63600, totalProfit: 15900,
        models: [
          {
            id: 'm12', model: 'LCW-PRM-05', totalCount: 212, totalAmount: 63600, totalProfit: 15900,
            colors: [
              { color: 'Mavi', colorHex: '#3B82F6', count: 72, amount: 21600, profit: 5400 },
              { color: 'Kırmızı', colorHex: '#DC2626', count: 68, amount: 20400, profit: 5100 },
              { color: 'Lacivert', colorHex: '#1E3A5F', count: 72, amount: 21600, profit: 5400 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '5', name: 'Koton Mağazacılık', totalCount: 310, totalAmount: 93000, totalProfit: 27900,
    branches: [
      {
        id: 'b8', name: 'İstanbul Merkez', totalCount: 310, totalAmount: 93000, totalProfit: 27900,
        models: [
          {
            id: 'm13', model: 'KTN-SS-24A', totalCount: 170, totalAmount: 51000, totalProfit: 15300,
            colors: [
              { color: 'Pembe', colorHex: '#EC4899', count: 70, amount: 21000, profit: 6300 },
              { color: 'Beyaz', colorHex: '#F9FAFB', count: 55, amount: 16500, profit: 4950 },
              { color: 'Lila', colorHex: '#A78BFA', count: 45, amount: 13500, profit: 4050 },
            ],
          },
          {
            id: 'm14', model: 'KTN-AW-24B', totalCount: 140, totalAmount: 42000, totalProfit: 12600,
            colors: [
              { color: 'Siyah', colorHex: '#1F2937', count: 80, amount: 24000, profit: 7200 },
              { color: 'Kahverengi', colorHex: '#78350F', count: 60, amount: 18000, profit: 5400 },
            ],
          },
        ],
      },
    ],
  },
];

export default function CompanyModelPerformanceScreen({
  onGoBack,
  onTabChange,
  onLogout,
  modul = 'konfeksiyon',
}: CompanyModelPerformanceScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('count');

  // Date filters
  const getToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
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

  const isProfit = analysisMode === 'profit';

  // Sort companies based on analysis mode
  const companies = [...MOCK_COMPANIES].sort((a, b) =>
    isProfit ? b.totalProfit - a.totalProfit : b.totalCount - a.totalCount
  );
  const totalAmount = companies.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalCount = companies.reduce((sum, c) => sum + c.totalCount, 0);
  const totalProfit = companies.reduce((sum, c) => sum + c.totalProfit, 0);
  const topCompany = companies[0];
  const maxChartValue = Math.max(...companies.map(c => isProfit ? c.totalProfit : c.totalCount));

  const formatAmount = (value: number) => {
    if (value >= 1000) return (value / 1000).toFixed(1).replace('.', ',') + 'K';
    return value.toLocaleString('tr-TR');
  };

  const formatFullAmount = (value: number) =>
    value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const toggleCompanyExpansion = (id: string) => {
    setExpandedCompanyId(prev => prev === id ? null : id);
    setExpandedBranchId(null);
    setExpandedModelId(null);
  };

  const toggleBranchExpansion = (id: string) => {
    setExpandedBranchId(prev => prev === id ? null : id);
    setExpandedModelId(null);
  };

  const toggleModelExpansion = (id: string) => {
    setExpandedModelId(prev => prev === id ? null : id);
  };

  const handleTabPress = (tab: TabName) => { setActiveTab(tab); if (onTabChange) onTabChange(tab); };
  const handleLogout = async () => { try { await logout(); if (onLogout) onLogout(); } catch (e) {} };
  const onRefresh = useCallback(() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 1000); }, []);

  const getColorDotStyle = (hex: string) => {
    const isLight = hex === '#F9FAFB' || hex === '#FFFDD0';
    return {
      backgroundColor: hex,
      borderWidth: isLight ? 1 : 0,
      borderColor: colors.border,
    };
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

        {/* Analysis Mode Switch */}
        <View style={styles.modeSwitch}>
          <Pressable
            style={[styles.modeSwitchButton, analysisMode === 'count' && styles.modeSwitchButtonActive]}
            onPress={() => setAnalysisMode('count')}
          >
            <Icon name="cube-outline" size={16} color={analysisMode === 'count' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeSwitchText, analysisMode === 'count' && styles.modeSwitchTextActive]}>Adet</Text>
          </Pressable>
          <Pressable
            style={[styles.modeSwitchButton, analysisMode === 'profit' && styles.modeSwitchButtonActive]}
            onPress={() => setAnalysisMode('profit')}
          >
            <Icon name="trending-up-outline" size={16} color={analysisMode === 'profit' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeSwitchText, analysisMode === 'profit' && styles.modeSwitchTextActive]}>Karlılık</Text>
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
            <View style={[styles.summaryCard, { borderLeftColor: isProfit ? '#F59E0B' : '#3B82F6' }]}>
              <View style={styles.summaryCardIcon}>
                <Icon name={isProfit ? 'trending-up-outline' : 'cube-outline'} size={18} color={isProfit ? '#F59E0B' : '#3B82F6'} />
              </View>
              <Text style={styles.summaryCardLabel}>{isProfit ? 'Toplam Kar' : 'Toplam Adet'}</Text>
              <Text style={[styles.summaryCardValue, { color: isProfit ? '#F59E0B' : '#3B82F6' }]}>
                {isProfit ? '₺' + formatAmount(totalProfit) : formatFullAmount(totalCount)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
              <View style={styles.summaryCardIcon}>
                <Icon name="cash-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.summaryCardLabel}>Toplam Satış</Text>
              <Text style={[styles.summaryCardValue, { color: '#10B981' }]}>
                {formatAmount(totalAmount)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: '#8B5CF6' }]}>
              <View style={styles.summaryCardIcon}>
                <Icon name="business-outline" size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.summaryCardLabel}>En İyi Firma</Text>
              <Text style={[styles.summaryCardValue, { color: '#8B5CF6' }]} numberOfLines={1}>
                {topCompany?.name?.split(' ')[0] || '-'}
              </Text>
            </View>
          </View>

          {/* Bar Chart - Firma bazlı */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Icon name="bar-chart-outline" size={16} color={colors.primary} />
              <Text style={styles.chartTitle}>{isProfit ? 'Firma Karlılık Dağılımı' : 'Firma Adet Dağılımı'}</Text>
            </View>
            {companies.map((company, index) => {
              const chartVal = isProfit ? company.totalProfit : company.totalCount;
              const barWidth = maxChartValue > 0 ? (chartVal / maxChartValue) * 100 : 0;
              return (
                <View key={company.id} style={styles.chartRow}>
                  <View style={styles.chartLabel}>
                    <View style={[styles.chartRankDot, {
                      backgroundColor: index === 0 ? '#FEF3C7' : index === 1 ? '#F3F4F6' : index === 2 ? '#FED7AA' : (isDark ? colors.background : '#F8FAFC'),
                      borderColor: index === 0 ? '#FCD34D' : index === 1 ? '#D1D5DB' : index === 2 ? '#FDBA74' : colors.border,
                    }]}>
                      <Text style={[styles.chartRankText, {
                        color: index === 0 ? '#D97706' : index === 1 ? '#6B7280' : index === 2 ? '#C2410C' : colors.textSecondary,
                      }]}>{index + 1}</Text>
                    </View>
                    <Text style={styles.chartName} numberOfLines={1}>{company.name.split(' ')[0]}</Text>
                  </View>
                  <View style={styles.chartBarContainer}>
                    <View style={[styles.chartBar, { width: `${barWidth}%` }]} />
                  </View>
                  <Text style={styles.chartValue}>{isProfit ? '₺' + formatAmount(company.totalProfit) : formatFullAmount(company.totalCount)}</Text>
                </View>
              );
            })}
          </View>

          {/* Company List */}
          <View style={styles.listHeader}>
            <Icon name="business" size={16} color={colors.primary} />
            <Text style={styles.listTitle}>Firma Detayları</Text>
            <Text style={styles.listCount}>{companies.length} firma</Text>
          </View>

          {companies.map((company, companyIndex) => {
            const isCompanyExpanded = expandedCompanyId === company.id;

            return (
              <View key={company.id} style={styles.companyCard}>
                {/* Company Header */}
                <Pressable
                  style={styles.companyHeader}
                  onPress={() => toggleCompanyExpansion(company.id)}
                >
                  <View style={styles.companyHeaderLeft}>
                    <View style={[styles.companyRank, {
                      backgroundColor: companyIndex === 0 ? '#FEF3C7' : companyIndex === 1 ? '#F3F4F6' : companyIndex === 2 ? '#FED7AA' : (isDark ? colors.background : '#F8FAFC'),
                      borderColor: companyIndex === 0 ? '#FCD34D' : companyIndex === 1 ? '#D1D5DB' : companyIndex === 2 ? '#FDBA74' : colors.border,
                    }]}>
                      <Text style={[styles.companyRankText, {
                        color: companyIndex === 0 ? '#D97706' : companyIndex === 1 ? '#6B7280' : companyIndex === 2 ? '#C2410C' : colors.textSecondary,
                      }]}>{companyIndex + 1}</Text>
                    </View>
                    <View style={styles.companyInfo}>
                      <Text style={styles.companyName} numberOfLines={1}>{company.name}</Text>
                      <Text style={styles.companyMeta}>
                        {company.branches.length} şube  ·  {formatFullAmount(company.totalCount)} adet
                      </Text>
                    </View>
                  </View>
                  <View style={styles.companyHeaderRight}>
                    <Text style={styles.companyAmount}>₺{formatFullAmount(company.totalAmount)}</Text>
                    <Icon
                      name={isCompanyExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                </Pressable>

                {/* Expanded Branches */}
                {isCompanyExpanded && (
                  <View style={styles.modelsContainer}>
                    {company.branches.map((branch) => {
                      const isBranchExpanded = expandedBranchId === branch.id;

                      return (
                        <View key={branch.id} style={styles.branchCard}>
                          <Pressable
                            style={styles.branchHeader}
                            onPress={() => toggleBranchExpansion(branch.id)}
                          >
                            <View style={styles.branchHeaderLeft}>
                              <Icon name="location-outline" size={16} color="#8B5CF6" />
                              <View style={styles.branchInfo}>
                                <Text style={styles.branchName}>{branch.name}</Text>
                                <Text style={styles.branchMeta}>{branch.models.length} model  ·  {formatFullAmount(branch.totalCount)} adet</Text>
                              </View>
                            </View>
                            <View style={styles.branchHeaderRight}>
                              <Text style={styles.branchAmount}>₺{formatFullAmount(branch.totalAmount)}</Text>
                              <Icon
                                name={isBranchExpanded ? 'chevron-up' : 'chevron-down'}
                                size={14}
                                color={colors.textSecondary}
                              />
                            </View>
                          </Pressable>

                          {/* Expanded Models */}
                          {isBranchExpanded && (
                            <View style={styles.branchModelsContainer}>
                              {branch.models.map((model) => {
                                const isModelExpanded = expandedModelId === model.id;
                                const maxColorCount = Math.max(...model.colors.map(c => c.count));

                                return (
                                  <View key={model.id} style={styles.modelCard}>
                                    <Pressable
                                      style={styles.modelHeader}
                                      onPress={() => toggleModelExpansion(model.id)}
                                    >
                                      <View style={styles.modelHeaderLeft}>
                                        <Icon name="pricetag-outline" size={14} color={colors.primary} />
                                        <View style={styles.modelInfo}>
                                          <Text style={styles.modelName}>{model.model}</Text>
                                          <Text style={styles.modelMeta}>{formatFullAmount(model.totalCount)} adet</Text>
                                        </View>
                                      </View>
                                      <View style={styles.modelHeaderRight}>
                                        <Text style={styles.modelAmount}>₺{formatFullAmount(model.totalAmount)}</Text>
                                        <Icon
                                          name={isModelExpanded ? 'chevron-up' : 'chevron-down'}
                                          size={14}
                                          color={colors.textSecondary}
                                        />
                                      </View>
                                    </Pressable>

                                    {/* Color Breakdown */}
                                    {isModelExpanded && (
                                      <View style={styles.colorsContainer}>
                                        {model.colors.map((colorItem, ci) => {
                                          const colorBarWidth = maxColorCount > 0 ? (colorItem.count / maxColorCount) * 100 : 0;
                                          return (
                                            <View key={colorItem.color} style={[styles.colorRow, ci % 2 === 0 && styles.colorRowAlt]}>
                                              <View style={styles.colorInfo}>
                                                <View style={[styles.colorDot, getColorDotStyle(colorItem.colorHex)]} />
                                                <Text style={styles.colorName}>{colorItem.color}</Text>
                                              </View>
                                              <View style={styles.colorBarContainer}>
                                                <View style={[styles.colorBar, { width: `${colorBarWidth}%`, backgroundColor: colorItem.colorHex === '#F9FAFB' || colorItem.colorHex === '#FFFDD0' ? colors.primary : colorItem.colorHex }]} />
                                              </View>
                                              <View style={styles.colorStats}>
                                                <Text style={styles.colorCount}>{colorItem.count}</Text>
                                                <Text style={styles.colorAmount}>₺{formatFullAmount(colorItem.amount)}</Text>
                                              </View>
                                            </View>
                                          );
                                        })}
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
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
    // Company Card
    companyCard: {
      marginBottom: 8,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
      overflow: 'hidden',
    },
    companyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    companyHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    companyRank: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    companyRankText: {
      fontSize: 13,
      fontWeight: '800',
    },
    companyInfo: {
      flex: 1,
    },
    companyName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    companyMeta: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    companyHeaderRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    companyAmount: {
      fontSize: 16,
      fontWeight: '800',
      color: '#10B981',
    },
    // Branches & Models Container
    modelsContainer: {
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
      paddingHorizontal: 14,
      paddingBottom: 10,
    },
    branchCard: {
      marginTop: 10,
      backgroundColor: isDark ? colors.background : '#FAFBFC',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
      overflow: 'hidden',
    },
    branchHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
    },
    branchHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    branchInfo: {
      flex: 1,
    },
    branchName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    branchMeta: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    branchHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    branchAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: '#10B981',
    },
    branchModelsContainer: {
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#E2E8F0',
      paddingHorizontal: 10,
      paddingBottom: 8,
    },
    modelCard: {
      marginTop: 10,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
      overflow: 'hidden',
    },
    modelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
    },
    modelHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    modelInfo: {
      flex: 1,
    },
    modelName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    modelMeta: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    modelHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    modelAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: '#10B981',
    },
    // Colors
    colorsContainer: {
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#E2E8F0',
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    colorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 4,
      borderRadius: 6,
      gap: 8,
    },
    colorRowAlt: {
      backgroundColor: isDark ? colors.card : '#fff',
    },
    colorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      width: 85,
    },
    colorDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    colorName: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
      flex: 1,
    },
    colorBarContainer: {
      flex: 1,
      height: 10,
      backgroundColor: isDark ? colors.background : '#F1F5F9',
      borderRadius: 5,
      overflow: 'hidden',
    },
    colorBar: {
      height: '100%',
      borderRadius: 5,
      opacity: 0.7,
    },
    colorStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: 90,
      justifyContent: 'flex-end',
    },
    colorCount: {
      fontSize: 12,
      fontWeight: '600',
      color: '#3B82F6',
      width: 28,
      textAlign: 'right',
    },
    colorAmount: {
      fontSize: 12,
      fontWeight: '600',
      color: '#10B981',
    },
  });
