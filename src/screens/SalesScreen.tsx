import React, { useState, useCallback, useEffect } from 'react';
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
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchInput from '../components/SearchInput';
import IconButton from '../components/IconButton';
import BackButton from '../components/BackButton';
import SearchButton from '../components/SearchButton';
import TabBar, { TabName } from '../components/TabBar';
import DateFilter, { DatePreset } from '../components/DateFilter';
import salesService, { SalesItem, SalesSummaryItem } from '../services/sales.service';
import { authService } from '../services/auth.service';

export type SalesModul = 'muhasebe' | 'magaza' | 'konfeksiyon';

const MODUL_TITLES: Record<SalesModul, string> = {
  muhasebe: 'Muhasebe Satışları',
  magaza: 'Mağaza Satışları',
  konfeksiyon: 'Konfeksiyon Satışları',
};

const MODUL_ICONS: Record<SalesModul, string> = {
  muhasebe: 'stats-chart',
  magaza: 'storefront-outline',
  konfeksiyon: 'shirt-outline',
};

interface SalesScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  modul?: SalesModul;
}

export default function SalesScreen({ onGoBack, onTabChange, onLogout, modul = 'muhasebe' }: SalesScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  const [searchText, setSearchText] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesItem[]>([]);
  const [summaryData, setSummaryData] = useState<SalesSummaryItem[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Tarih filtreleri
  const getToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const getTodayEnd = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };
  const [startDate, setStartDate] = useState<Date>(getToday());
  const [endDate, setEndDate] = useState<Date>(getTodayEnd());
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>('today');

  const formatDateStr = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${d}.${m}.${date.getFullYear()}`;
  };

  const formatDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');

      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) {
        setError('Firma veritabanı bilgisi bulunamadı');
        return;
      }

      const response = await salesService.getList(token, dataName, {
        modul,
        startDate: formatDateISO(startDate),
        endDate: formatDateISO(endDate),
      });

      if (response.success && response.data) {
        setData(response.data.items || []);
        setSummaryData(response.data.summary || []);
      } else {
        setError(response.message || 'Veri alınamadı');
      }
    } catch (err: any) {
      setError(err.message || 'Satış listesi alınamadı');
    } finally {
      setIsLoading(false);
    }
  }, [user, modul, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Frontend search filter
  const filteredData = data.filter((item) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      item.cariAdi.toLowerCase().includes(q) ||
      item.seriNo.toLowerCase().includes(q)
    );
  });

  const formatAmount = (value: number) => {
    return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getPaymentStatusInfo = (status: number) => {
    switch (status) {
      case 1: return { label: 'Ödendi', color: '#10B981', icon: 'checkmark-circle' };
      case 2: return { label: 'Kısmi', color: '#F59E0B', icon: 'time' };
      case 3: return { label: 'Ödenmedi', color: '#EF4444', icon: 'close-circle' };
      default: return { label: 'Belirsiz', color: colors.textSecondary, icon: 'help-circle' };
    }
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

  // Genel toplamlar
  const totalCount = summaryData.reduce((sum, s) => sum + s.totalCount, 0);
  const totalAmount = summaryData.reduce((sum, s) => sum + s.totalAmount, 0);
  const paidCount = summaryData.reduce((sum, s) => sum + s.paidCount, 0);
  const unpaidCount = summaryData.reduce((sum, s) => sum + s.unpaidCount, 0);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title={MODUL_TITLES[modul]}
          leftButton={<BackButton onPress={onGoBack} />}
          rightButton={
            <SearchButton onPress={() => {
              setFilterVisible(v => !v);
              if (filterVisible) setSearchText('');
            }} />
          }
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
              searchPlaceholder="Cari adı, seri no ara..."
            />
          </View>
        )}


        {/* Content */}
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <View style={styles.emptyContainer}>
            <EmptyState title={error} icon="alert-circle-outline" />
            <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchData}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
          >
            {/* Özet Kartları */}
            {summaryData.length > 0 && (() => {
              const isExpanded = expandedCardId === 'summary';
              return (
                <View style={styles.summaryContainer}>
                  <Pressable onPress={() => toggleCardExpansion('summary')}>
                    <View style={styles.summaryHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="receipt-outline" size={16} color={colors.primary} />
                        <Text style={styles.summaryTitle}>Satış Özeti</Text>
                      </View>
                      <View style={styles.summaryHeaderRight}>
                        <Text style={styles.summarySubtext}>{totalCount} Fatura</Text>
                        <Icon
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textSecondary}
                        />
                      </View>
                    </View>
                  </Pressable>
                  <View style={styles.summaryCards}>
                    <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
                      <Text style={styles.summaryCardLabel}>Toplam Tutar</Text>
                      <Text style={[styles.summaryCardValue, { color: '#10B981' }]}>
                        {formatAmount(totalAmount)}
                      </Text>
                    </View>
                    <View style={[styles.summaryCard, { borderLeftColor: '#3B82F6' }]}>
                      <Text style={styles.summaryCardLabel}>Ödenen</Text>
                      <Text style={[styles.summaryCardValue, { color: '#3B82F6' }]}>
                        {paidCount}
                      </Text>
                    </View>
                    <View style={[styles.summaryCard, { borderLeftColor: '#EF4444' }]}>
                      <Text style={styles.summaryCardLabel}>Ödenmedi</Text>
                      <Text style={[styles.summaryCardValue, { color: '#EF4444' }]}>
                        {unpaidCount}
                      </Text>
                    </View>
                  </View>
                  {isExpanded && summaryData.length > 0 && (
                    <View style={styles.summaryDetail}>
                      <View style={styles.summaryDetailHeader}>
                        <Text style={[styles.summaryDetailHeaderCell, { flex: 1 }]}>{'Döviz'.toLocaleUpperCase('tr-TR')}</Text>
                        <Text style={[styles.summaryDetailHeaderCell, { flex: 1, textAlign: 'right' }]}>{'Adet'.toLocaleUpperCase('tr-TR')}</Text>
                        <Text style={[styles.summaryDetailHeaderCell, { flex: 1.5, textAlign: 'right' }]}>{'Tutar'.toLocaleUpperCase('tr-TR')}</Text>
                      </View>
                      {summaryData.map((s, i) => (
                        <View key={s.currency || 'TL'} style={[
                          styles.summaryDetailRow,
                          i % 2 === 0 && styles.summaryDetailRowAlt,
                        ]}>
                          <View style={[styles.summaryDetailCell, { flex: 1 }]}>
                            <View style={styles.currencyBadge}>
                              <Text style={styles.currencyBadgeText}>{s.currency || 'TL'}</Text>
                            </View>
                          </View>
                          <Text style={[styles.summaryDetailValue, { flex: 1, color: colors.text }]}>
                            {s.totalCount}
                          </Text>
                          <Text style={[styles.summaryDetailValue, { flex: 1.5, color: '#10B981' }]}>
                            {formatAmount(s.totalAmount)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Satış Listesi */}
            {filteredData.map((item) => {
              const payment = getPaymentStatusInfo(item.odemeDurum);
              const isExpanded = expandedCardId === item.id;

              return (
                <Pressable
                  key={item.id}
                  style={styles.card}
                  onPress={() => toggleCardExpansion(item.id)}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.paymentDot, { backgroundColor: payment.color }]} />
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.cariAdi}</Text>
                        <Text style={styles.cardSubtitle}>
                          {item.seriNo} · {formatDate(item.tarih)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={[styles.cardAmount, { color: '#10B981' }]}>
                        {formatAmount(item.toplamTutar)}
                      </Text>
                      <Text style={styles.cardCurrency}>{item.doviz}</Text>
                    </View>
                  </View>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <View style={styles.cardDetail}>
                      <View style={styles.cardDetailRow}>
                        <View style={styles.cardDetailItem}>
                          <Text style={styles.cardDetailLabel}>Miktar</Text>
                          <Text style={styles.cardDetailValue}>{item.toplamMiktar}</Text>
                        </View>
                        <View style={styles.cardDetailItem}>
                          <Text style={styles.cardDetailLabel}>İndirim</Text>
                          <Text style={[styles.cardDetailValue, { color: '#F59E0B' }]}>
                            {formatAmount(item.toplamIndirim)}
                          </Text>
                        </View>
                        <View style={styles.cardDetailItem}>
                          <Text style={styles.cardDetailLabel}>KDV</Text>
                          <Text style={styles.cardDetailValue}>
                            {formatAmount(item.toplamKdv)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardDetailFooter}>
                        <View style={styles.cardDetailFooterLeft}>
                          <Icon name={payment.icon} size={14} color={payment.color} />
                          <Text style={[styles.paymentLabel, { color: payment.color }]}>{payment.label}</Text>
                        </View>
                        {item.subeAdi && (
                          <View style={styles.branchTag}>
                            <Icon name="business-outline" size={12} color={colors.textSecondary} />
                            <Text style={styles.branchTagText}>{item.subeAdi}</Text>
                          </View>
                        )}
                      </View>
                      {item.aciklama ? (
                        <Text style={styles.cardNote} numberOfLines={2}>{item.aciklama}</Text>
                      ) : null}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

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
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
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
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 100,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    // Summary
    summaryContainer: {
      marginBottom: 16,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    summaryTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    summaryHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    summarySubtext: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    summaryCards: {
      flexDirection: 'row',
      gap: 8,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      borderRadius: 10,
      padding: 12,
      borderLeftWidth: 3,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#F1F5F9',
    },
    summaryCardLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    summaryCardValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    summaryDetail: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
      paddingTop: 10,
    },
    summaryDetailHeader: {
      flexDirection: 'row',
      paddingBottom: 6,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#F1F5F9',
    },
    summaryDetailHeaderCell: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    summaryDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 6,
      paddingHorizontal: 4,
    },
    summaryDetailRowAlt: {
      backgroundColor: isDark ? colors.background : '#F8FAFC',
    },
    summaryDetailCell: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryDetailValue: {
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
    },
    currencyBadge: {
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    currencyBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    // Card
    card: {
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },
    paymentDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    cardTitleContainer: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardHeaderRight: {
      alignItems: 'flex-end',
      marginLeft: 8,
    },
    cardAmount: {
      fontSize: 15,
      fontWeight: '700',
    },
    cardCurrency: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    // Card Detail
    cardDetail: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
    cardDetailRow: {
      flexDirection: 'row',
      gap: 8,
    },
    cardDetailItem: {
      flex: 1,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
    },
    cardDetailLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    cardDetailValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    cardDetailFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    cardDetailFooterLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    paymentLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    branchTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    branchTagText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    cardNote: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
      fontStyle: 'italic',
    },
  });
