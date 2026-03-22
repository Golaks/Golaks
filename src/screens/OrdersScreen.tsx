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
import BackButton from '../components/BackButton';
import SearchButton from '../components/SearchButton';
import TabBar, { TabName } from '../components/TabBar';
import DateFilter, { DatePreset } from '../components/DateFilter';
import ordersService, { OrderItem, OrderSummaryItem, OrderStats, OrderDetailItem } from '../services/orders.service';
import { authService } from '../services/auth.service';

interface OrdersScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function OrdersScreen({ onGoBack, onTabChange, onLogout }: OrdersScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  const [searchText, setSearchText] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrderItem[]>([]);
  const [summaryData, setSummaryData] = useState<OrderSummaryItem[]>([]);
  const [stats, setStats] = useState<OrderStats>({ totalSatis: 0, totalSatinalma: 0, totalUretimde: 0, totalBeklemede: 0, totalKapali: 0, totalIptal: 0 });
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, OrderDetailItem[]>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  // Tarih filtreleri - varsayılan yıl başı
  const getYearStart = () => new Date(new Date().getFullYear(), 0, 1);
  const getTodayEnd = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };
  const [startDate, setStartDate] = useState<Date>(getYearStart());
  const [endDate, setEndDate] = useState<Date>(getTodayEnd());
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>('year');

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

  const handleStartDateChange = (date: Date) => { setStartDate(date); setSelectedPreset(null); };
  const handleEndDateChange = (date: Date) => { setEndDate(date); setSelectedPreset(null); };

  const styles = createStyles(colors, isDark);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) { setError('Firma veritabanı bilgisi bulunamadı'); return; }

      const response = await ordersService.getList(token, dataName, {
        modul: 'konfeksiyon',
        startDate: formatDateISO(startDate),
        endDate: formatDateISO(endDate),
      });

      if (response.success && response.data) {
        setData(response.data.items || []);
        setSummaryData(response.data.summary || []);
        setStats(response.data.stats || { totalSatis: 0, totalSatinalma: 0, totalUretimde: 0, totalBeklemede: 0 });
      } else {
        setError(response.message || 'Veri alınamadı');
      }
    } catch (err: any) {
      setError(err.message || 'Sipariş listesi alınamadı');
    } finally {
      setIsLoading(false);
    }
  }, [user, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchDetail = async (siparisId: string) => {
    if (detailData[siparisId]) return;
    setDetailLoading(siparisId);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;

      const response = await ordersService.getDetail(token, dataName, siparisId);
      if (response.success && response.data) {
        setDetailData(prev => ({ ...prev, [siparisId]: response.data.details || [] }));
      }
    } catch (_err) {
      // Silent fail for details
    } finally {
      setDetailLoading(null);
    }
  };

  // Frontend search filter
  const filteredData = data.filter((item) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      item.cariAdi.toLowerCase().includes(q) ||
      item.siparisKodu.toLowerCase().includes(q) ||
      item.musteriSiparisKodu.toLowerCase().includes(q)
    );
  });

  const formatAmount = (value: number) =>
    value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '0000-00-00') return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDurumInfo = (durum: string) => {
    switch (durum) {
      case 'uretimde': return { label: 'Üretimde', color: '#3B82F6', icon: 'construct', bg: '#EFF6FF' };
      case 'tamamlandi': return { label: 'Tamamlandı', color: '#10B981', icon: 'checkmark-circle', bg: '#ECFDF5' };
      default: return { label: 'Beklemede', color: '#F59E0B', icon: 'time', bg: '#FFFBEB' };
    }
  };

  const getSiparisTipiInfo = (tipi: number) => {
    if (tipi === 2) return { label: 'Satınalma', color: '#8B5CF6', icon: 'arrow-down-circle' };
    return { label: 'Satış', color: '#10B981', icon: 'arrow-up-circle' };
  };

  const toggleCardExpansion = (cardId: string) => {
    if (expandedCardId === cardId) {
      setExpandedCardId(null);
    } else {
      setExpandedCardId(cardId);
      if (cardId !== 'summary') {
        fetchDetail(cardId);
      }
    }
  };

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleLogout = async () => {
    try {
      await logout();
      onLogout?.();
    } catch (_e) {}
  };

  const totalCount = summaryData.reduce((sum, s) => sum + s.totalCount, 0);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Konfeksiyon Siparişler"
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
            <View style={[styles.pageTitleIcon, { backgroundColor: '#F59E0B15' }]}>
              <Icon name="clipboard-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.pageTitle}>Konfeksiyon Siparişler</Text>
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
              searchPlaceholder="Müşteri, sipariş kodu ara..."
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
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.statLabel}>Toplam</Text>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{totalCount}</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.statLabel}>Üretimde</Text>
                <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.totalUretimde}</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#F97316' }]}>
                <Text style={styles.statLabel}>Beklemede</Text>
                <Text style={[styles.statValue, { color: '#F97316' }]}>{stats.totalBeklemede}</Text>
              </View>
            </View>

            {/* Summary by Currency - expandable */}
            {summaryData.length > 0 && (() => {
              const isSummaryExpanded = expandedCardId === 'summary';
              return (
                <View style={styles.summaryContainer}>
                  <Pressable onPress={() => toggleCardExpansion('summary')}>
                    <View style={styles.summaryHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="wallet-outline" size={16} color={colors.primary} />
                        <Text style={styles.summaryTitle}>Sipariş Özeti</Text>
                      </View>
                      <View style={styles.summaryHeaderRight}>
                        <Text style={styles.summarySubtext}>{totalCount} Sipariş</Text>
                        <Icon name={isSummaryExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                      </View>
                    </View>
                  </Pressable>

                  {isSummaryExpanded && (
                    <View style={styles.summaryDetail}>
                      <View style={styles.summaryDetailHeader}>
                        <Text style={[styles.summaryDetailHeaderCell, { flex: 1 }]}>DÖVİZ</Text>
                        <Text style={[styles.summaryDetailHeaderCell, { flex: 0.7, textAlign: 'right' }]}>ADET</Text>
                        <Text style={[styles.summaryDetailHeaderCell, { flex: 0.7, textAlign: 'right' }]}>MİKTAR</Text>
                        <Text style={[styles.summaryDetailHeaderCell, { flex: 1.2, textAlign: 'right' }]}>TUTAR</Text>
                      </View>
                      {summaryData.map((s, i) => (
                        <View key={s.currency || 'TL'} style={[styles.summaryDetailRow, i % 2 === 0 && styles.summaryDetailRowAlt]}>
                          <View style={[styles.summaryDetailCell, { flex: 1 }]}>
                            <View style={styles.currencyBadge}>
                              <Text style={styles.currencyBadgeText}>{s.currency || 'TL'}</Text>
                            </View>
                          </View>
                          <Text style={[styles.summaryDetailValue, { flex: 0.7 }]}>{s.totalCount}</Text>
                          <Text style={[styles.summaryDetailValue, { flex: 0.7 }]}>{s.totalQuantity.toLocaleString('tr-TR')}</Text>
                          <Text style={[styles.summaryDetailValue, { flex: 1.2, color: '#10B981' }]}>{formatAmount(s.totalAmount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Order List */}
            {filteredData.map((item) => {
              const durumInfo = getDurumInfo(item.durum);
              const tipiInfo = getSiparisTipiInfo(item.siparisTipi);
              const isExpanded = expandedCardId === item.id;
              const details = detailData[item.id];
              const isDetailLoading = detailLoading === item.id;

              return (
                <Pressable key={item.id} style={styles.card} onPress={() => toggleCardExpansion(item.id)}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.durumDot, { backgroundColor: durumInfo.color }]} />
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.cariAdi}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Text style={styles.cardSubtitle}>{item.siparisKodu || '-'}</Text>
                          <Text style={[styles.cardSubtitle, { opacity: 0.5 }]}>·</Text>
                          <Text style={styles.cardSubtitle}>{formatDate(item.tarih)}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={[styles.cardAmount, { color: '#10B981' }]}>
                        {formatAmount(item.tutar)}
                      </Text>
                      <Text style={styles.cardCurrency}>{item.doviz}</Text>
                    </View>
                  </View>

                  {/* Quick Info Row */}
                  <View style={styles.quickInfoRow}>
                    <View style={[styles.quickInfoBadge, { backgroundColor: durumInfo.bg }]}>
                      <Icon name={durumInfo.icon} size={12} color={durumInfo.color} />
                      <Text style={[styles.quickInfoText, { color: durumInfo.color }]}>{durumInfo.label}</Text>
                    </View>
                    <View style={[styles.quickInfoBadge, { backgroundColor: tipiInfo.color + '12' }]}>
                      <Icon name={tipiInfo.icon} size={12} color={tipiInfo.color} />
                      <Text style={[styles.quickInfoText, { color: tipiInfo.color }]}>{tipiInfo.label}</Text>
                    </View>
                    <View style={styles.quickInfoBadge}>
                      <Icon name="layers-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.quickInfoText, { color: colors.textSecondary }]}>{item.detaySayisi} kalem</Text>
                    </View>
                    {item.miktar > 0 && (
                      <View style={styles.quickInfoBadge}>
                        <Icon name="cube-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.quickInfoText, { color: colors.textSecondary }]}>{item.miktar.toLocaleString('tr-TR')} ad.</Text>
                      </View>
                    )}
                  </View>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <View style={styles.cardDetail}>
                      {/* Info Grid */}
                      <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Teslim Tarihi</Text>
                          <Text style={styles.infoValue}>{formatDate(item.teslimTarihi)}</Text>
                        </View>
                        {item.musteriSiparisKodu ? (
                          <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Müşteri Sip. No</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{item.musteriSiparisKodu}</Text>
                          </View>
                        ) : null}
                        {item.musteriSube ? (
                          <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Müşteri Şube</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{item.musteriSube}</Text>
                          </View>
                        ) : null}
                        {(item.avansTutar ?? 0) > 0 && (
                          <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Avans</Text>
                            <Text style={[styles.infoValue, { color: '#3B82F6' }]}>
                              {formatAmount(item.avansTutar ?? 0)} {item.avansDoviz || ''}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Progress Bar */}
                      {item.detaySayisi > 0 && (
                        <View style={styles.progressSection}>
                          <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Üretim İlerlemesi</Text>
                            <Text style={styles.progressPercent}>
                              {Math.round((item.uretimdeCount / item.detaySayisi) * 100)}%
                            </Text>
                          </View>
                          <View style={styles.progressBar}>
                            <View style={[
                              styles.progressFill,
                              { width: `${(item.uretimdeCount / item.detaySayisi) * 100}%` },
                            ]} />
                          </View>
                          <View style={styles.progressInfo}>
                            <Text style={styles.progressInfoText}>
                              <Text style={{ color: '#3B82F6', fontWeight: '600' }}>{item.uretimdeCount}</Text> üretimde
                            </Text>
                            <Text style={styles.progressInfoText}>
                              <Text style={{ color: '#F59E0B', fontWeight: '600' }}>{item.beklemedeSayisi}</Text> beklemede
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Detail Items */}
                      {isDetailLoading ? (
                        <View style={styles.detailLoadingContainer}>
                          <Text style={styles.detailLoadingText}>Detaylar yükleniyor...</Text>
                        </View>
                      ) : details && details.length > 0 ? (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>Sipariş Kalemleri</Text>
                          {details.map((det, idx) => (
                            <View key={det.id} style={[styles.detailItem, idx > 0 && styles.detailItemBorder]}>
                              <View style={styles.detailItemHeader}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.detailItemName} numberOfLines={1}>
                                    {det.modelAdi || det.stokAdi || 'Ürün'}
                                  </Text>
                                  {(det.modelKodu || det.stokKodu) ? (
                                    <Text style={styles.detailItemCode}>{det.modelKodu || det.stokKodu}</Text>
                                  ) : null}
                                </View>
                                <View style={styles.detailItemRight}>
                                  <Text style={styles.detailItemPrice}>
                                    {formatAmount(det.fiyat)} {det.doviz}
                                  </Text>
                                  <Text style={styles.detailItemQty}>{det.miktar.toLocaleString('tr-TR')} ad.</Text>
                                </View>
                              </View>

                              {/* Beden Dağılımı */}
                              {det.bedenler && det.bedenler.length > 0 && (
                                <View style={styles.bedenRow}>
                                  {det.bedenler.map((b, bi) => (
                                    <View key={bi} style={styles.bedenChip}>
                                      <Text style={styles.bedenChipLabel}>{b.beden}</Text>
                                      <Text style={styles.bedenChipValue}>{b.miktar}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              {/* Status badges */}
                              <View style={styles.detailItemFooter}>
                                <View style={[styles.detailBadge, { backgroundColor: det.siparisDurum === 1 ? '#EFF6FF' : '#FFFBEB' }]}>
                                  <Text style={[styles.detailBadgeText, { color: det.siparisDurum === 1 ? '#3B82F6' : '#F59E0B' }]}>
                                    {det.durumLabel}
                                  </Text>
                                </View>
                                <View style={[styles.detailBadge, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                                  <Text style={[styles.detailBadgeText, { color: colors.textSecondary }]}>{det.uretimTipiLabel}</Text>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {/* Açıklama */}
                      {item.aciklama ? (
                        <Text style={styles.cardNote} numberOfLines={3}>{item.aciklama}</Text>
                      ) : null}

                      {/* Footer */}
                      {item.subeAdi ? (
                        <View style={styles.cardFooter}>
                          <View style={styles.branchTag}>
                            <Icon name="business-outline" size={12} color={colors.textSecondary} />
                            <Text style={styles.branchTagText}>{item.subeAdi}</Text>
                          </View>
                        </View>
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
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 100,
    },
    emptyContainer: {
      flex: 1,
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

    // Stats
    statsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 10,
      padding: 6,
      borderLeftWidth: 3,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#F1F5F9',
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
    },

    // Summary
    summaryContainer: {
      marginBottom: 10,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      padding: 6,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      color: colors.text,
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

    // Order Card
    card: {
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      padding: 6,
      marginBottom: 6,
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
    durumDot: {
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

    // Quick Info
    quickInfoRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 10,
    },
    quickInfoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    quickInfoText: {
      fontSize: 11,
      fontWeight: '500',
    },

    // Card Detail
    cardDetail: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    infoItem: {
      minWidth: '45%',
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      borderRadius: 8,
      padding: 6,
    },
    infoLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 3,
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },

    // Progress
    progressSection: {
      marginBottom: 10,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      borderRadius: 10,
      padding: 6,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    progressPercent: {
      fontSize: 13,
      fontWeight: '700',
      color: '#3B82F6',
    },
    progressBar: {
      height: 6,
      backgroundColor: isDark ? colors.border : '#E2E8F0',
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#3B82F6',
      borderRadius: 3,
    },
    progressInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    progressInfoText: {
      fontSize: 11,
      color: colors.textSecondary,
    },

    // Detail Items
    detailSection: {
      marginBottom: 10,
    },
    detailSectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    detailItem: {
      paddingVertical: 10,
    },
    detailItemBorder: {
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
    detailItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    detailItemName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    detailItemCode: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    detailItemRight: {
      alignItems: 'flex-end',
      marginLeft: 8,
    },
    detailItemPrice: {
      fontSize: 13,
      fontWeight: '600',
      color: '#10B981',
    },
    detailItemQty: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Beden
    bedenRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    bedenChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.background : '#F0F4FF',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4,
    },
    bedenChipLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: '#6366F1',
    },
    bedenChipValue: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },

    // Detail badges
    detailItemFooter: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
    },
    detailBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    detailBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },

    // Loading
    detailLoadingContainer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    detailLoadingText: {
      fontSize: 12,
      color: colors.textSecondary,
    },

    // Footer
    cardNote: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
      fontStyle: 'italic',
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 10,
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
  });
