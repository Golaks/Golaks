import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
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
import TabBar, { TabName } from '../components/TabBar';
import stockService, { StockItem, StockSummaryItem } from '../services/stock.service';
import { authService } from '../services/auth.service';

interface StockScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function StockScreen({ onGoBack, onTabChange, onLogout }: StockScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  const [searchText, setSearchText] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StockItem[]>([]);
  const [summaryData, setSummaryData] = useState<StockSummaryItem[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const styles = createStyles(colors, isDark);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await authService.getToken();
      if (!token) {
        setError('Oturum bilgisi bulunamadı');
        return;
      }
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) {
        setError('Firma veritabanı bilgisi bulunamadı');
        return;
      }
      const response = await stockService.getList(token, dataName, {
        stokModul: 'muhasebe',
      });
      if (response.success && response.data) {
        setData(response.data.data || []);
        setSummaryData(response.data.summary || []);
      } else {
        setError(response.message || 'Veri alınamadı');
      }
    } catch (err: any) {
      setError(err.message || 'Stok listesi alınamadı');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Frontend search filter
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!searchText.trim()) return data;
    const q = searchText.toLowerCase().trim();
    return data.filter(item =>
      item.stockCode?.toLowerCase().includes(q) ||
      item.stockName?.toLowerCase().includes(q) ||
      item.barcode?.toLowerCase().includes(q) ||
      item.model?.toLowerCase().includes(q) ||
      item.type?.toLowerCase().includes(q)
    );
  }, [data, searchText]);

  const formatNumber = (value: number) => {
    return value % 1 === 0
      ? value.toLocaleString('tr-TR')
      : value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatCurrency = (value: number, currency: string) => {
    return `${formatNumber(value)} ${currency}`;
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
    } catch (error) {}
  };

  const getStockStatusColor = (remaining: number) => {
    if (remaining <= 0) return '#EF4444';
    if (remaining < 10) return '#F59E0B';
    return '#10B981';
  };

  const handleToggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      setSearchText('');
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Stoklar"
          leftButton={<BackButton onPress={onGoBack} />}
          rightButton={<IconButton icon="search-outline" onPress={handleToggleSearch} />}
          showMenu={true}
          onLogout={handleLogout}
        />

        {/* Search */}
        {searchVisible && (
          <View style={styles.searchContainer}>
            <SearchInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Stok kodu, adı, barkod ara..."
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
          >
            {/* Summary Card */}
            {summaryData.length > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Icon name="stats-chart" size={18} color={colors.primary} />
                  <Text style={styles.summaryHeaderText}>Stok Özeti</Text>
                  <View style={styles.summaryBadge}>
                    <Text style={styles.summaryBadgeText}>{filteredData.length} Kalem</Text>
                  </View>
                </View>

                {summaryData.map((s, index) => (
                  <View key={s.currency}>
                    {index > 0 && <View style={styles.summaryDivider} />}
                    <View style={styles.currencySection}>
                      <View style={styles.currencyHeader}>
                        <View style={[styles.currencyTag, { backgroundColor: `${colors.primary}15` }]}>
                          <Text style={[styles.currencyTagText, { color: colors.primary }]}>{s.currency}</Text>
                        </View>
                      </View>
                      <View style={styles.summaryGrid}>
                        <View style={styles.summaryGridItem}>
                          <Text style={styles.summaryGridLabel}>Miktar</Text>
                          <Text style={[styles.summaryGridValue, { color: colors.text }]}>
                            {formatNumber(s.totalRemaining)}
                          </Text>
                        </View>
                        <View style={styles.summaryGridItem}>
                          <Text style={styles.summaryGridLabel}>Giren</Text>
                          <Text style={[styles.summaryGridValue, { color: '#3B82F6' }]}>
                            {formatNumber(s.totalIn)}
                          </Text>
                        </View>
                        <View style={styles.summaryGridItem}>
                          <Text style={styles.summaryGridLabel}>Çıkan</Text>
                          <Text style={[styles.summaryGridValue, { color: '#EF4444' }]}>
                            {formatNumber(s.totalOut)}
                          </Text>
                        </View>
                      </View>
                      {s.totalValue > 0 && (
                        <View style={styles.totalValueRow}>
                          <Text style={styles.totalValueLabel}>Toplam Tutar</Text>
                          <Text style={styles.totalValueAmount}>
                            {formatCurrency(s.totalValue, s.currency)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Stock List */}
            <Text style={styles.listTitle}>Stok Kartları ({filteredData.length})</Text>

            {filteredData.map((item) => {
              const isExpanded = expandedCardId === item.id;
              const statusColor = getStockStatusColor(item.quantity1Remaining);

              return (
                <View key={item.id} style={styles.card}>
                  {/* Card Header */}
                  <Pressable
                    style={styles.cardHeader}
                    onPress={() => toggleCardExpansion(item.id)}
                  >
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.stockName || item.stockCode}
                        </Text>
                        {item.stockCode ? (
                          <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {item.stockCode}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={[styles.remainingValue, { color: statusColor }]}>
                        {formatNumber(item.quantity1Remaining)}
                      </Text>
                      <Text style={styles.unitLabel}>{item.unit1 || 'Ad'}</Text>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                  </Pressable>

                  {/* Tags row */}
                  <View style={styles.tagsRow}>
                    {item.type ? (
                      <View style={[styles.tag, { backgroundColor: '#3B82F620' }]}>
                        <Text style={[styles.tagText, { color: '#3B82F6' }]}>{item.type}</Text>
                      </View>
                    ) : null}
                    {item.model ? (
                      <View style={[styles.tag, { backgroundColor: '#8B5CF620' }]}>
                        <Text style={[styles.tagText, { color: '#8B5CF6' }]}>{item.model}</Text>
                      </View>
                    ) : null}
                    {item.currency && item.currency !== 'TL' ? (
                      <View style={[styles.tag, { backgroundColor: '#F59E0B20' }]}>
                        <Text style={[styles.tagText, { color: '#F59E0B' }]}>{item.currency}</Text>
                      </View>
                    ) : null}
                    {item.size ? (
                      <View style={[styles.tag, { backgroundColor: '#06B6D420' }]}>
                        <Text style={[styles.tagText, { color: '#06B6D4' }]}>{item.size}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <View style={styles.cardDetails}>
                      {item.barcode ? (
                        <View style={styles.cardRow}>
                          <Text style={styles.cardLabel}>Barkod</Text>
                          <Text style={styles.cardValue}>{item.barcode}</Text>
                        </View>
                      ) : null}

                      {item.subType ? (
                        <View style={styles.cardRow}>
                          <Text style={styles.cardLabel}>Alt Tip</Text>
                          <Text style={styles.cardValue}>{item.subType}</Text>
                        </View>
                      ) : null}

                      {item.kind ? (
                        <View style={styles.cardRow}>
                          <Text style={styles.cardLabel}>Cins</Text>
                          <Text style={styles.cardValue}>{item.kind}</Text>
                        </View>
                      ) : null}

                      {item.origin ? (
                        <View style={styles.cardRow}>
                          <Text style={styles.cardLabel}>Menşei</Text>
                          <Text style={styles.cardValue}>{item.origin}</Text>
                        </View>
                      ) : null}

                      {/* Quantity Details */}
                      <View style={styles.quantitySection}>
                        <Text style={styles.quantitySectionTitle}>Miktar Bilgileri</Text>
                        <View style={styles.quantityGrid}>
                          <View style={styles.quantityItem}>
                            <Text style={styles.quantityLabel}>Giren</Text>
                            <Text style={[styles.quantityValue, { color: '#3B82F6' }]}>
                              {formatNumber(item.quantity1In)} {item.unit1 || 'Ad'}
                            </Text>
                          </View>
                          <View style={styles.quantityItem}>
                            <Text style={styles.quantityLabel}>Çıkan</Text>
                            <Text style={[styles.quantityValue, { color: '#EF4444' }]}>
                              {formatNumber(item.quantity1Out)} {item.unit1 || 'Ad'}
                            </Text>
                          </View>
                          <View style={styles.quantityItem}>
                            <Text style={styles.quantityLabel}>Kalan</Text>
                            <Text style={[styles.quantityValue, { color: '#10B981' }]}>
                              {formatNumber(item.quantity1Remaining)} {item.unit1 || 'Ad'}
                            </Text>
                          </View>
                        </View>

                        {/* Miktar 2 - sadece varsa göster */}
                        {(item.quantity2In > 0 || item.quantity2Out > 0 || item.quantity2Remaining > 0) && item.unit2 ? (
                          <View style={[styles.quantityGrid, { marginTop: 8 }]}>
                            <View style={styles.quantityItem}>
                              <Text style={styles.quantityLabel}>Giren (2)</Text>
                              <Text style={[styles.quantityValue, { color: '#3B82F6' }]}>
                                {formatNumber(item.quantity2In)} {item.unit2}
                              </Text>
                            </View>
                            <View style={styles.quantityItem}>
                              <Text style={styles.quantityLabel}>Çıkan (2)</Text>
                              <Text style={[styles.quantityValue, { color: '#EF4444' }]}>
                                {formatNumber(item.quantity2Out)} {item.unit2}
                              </Text>
                            </View>
                            <View style={styles.quantityItem}>
                              <Text style={styles.quantityLabel}>Kalan (2)</Text>
                              <Text style={[styles.quantityValue, { color: '#10B981' }]}>
                                {formatNumber(item.quantity2Remaining)} {item.unit2}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </View>

                      {item.vatRate > 0 ? (
                        <View style={styles.cardRow}>
                          <Text style={styles.cardLabel}>KDV Oranı</Text>
                          <Text style={styles.cardValue}>%{item.vatRate}</Text>
                        </View>
                      ) : null}

                      {item.description ? (
                        <View style={styles.cardRow}>
                          <Text style={styles.cardLabel}>Açıklama</Text>
                          <Text style={styles.cardValue}>{item.description}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
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
      paddingTop: 8,
      paddingBottom: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    // Summary Card
    summaryCard: {
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#F1F5F9',
      overflow: 'hidden',
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      paddingBottom: 10,
      gap: 8,
    },
    summaryHeaderText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    summaryBadge: {
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    summaryBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    summaryDivider: {
      height: 1,
      backgroundColor: isDark ? colors.border : '#F1F5F9',
      marginHorizontal: 14,
    },
    currencySection: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    currencyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    currencyTag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    currencyTagText: {
      fontSize: 13,
      fontWeight: '700',
    },
    summaryGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryGridItem: {
      alignItems: 'center',
      flex: 1,
    },
    summaryGridLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    summaryGridValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    totalValueRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
    totalValueLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    totalValueAmount: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    // List
    listTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 12,
    },
    // Card
    card: {
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#F1F5F9',
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      paddingBottom: 8,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },
    statusDot: {
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    remainingValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    unitLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 4,
    },
    // Tags
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 14,
      paddingBottom: 10,
      gap: 6,
    },
    tag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    tagText: {
      fontSize: 11,
      fontWeight: '600',
    },
    // Card Details
    cardDetails: {
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
      paddingTop: 10,
      paddingHorizontal: 14,
      paddingBottom: 14,
    },
    cardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    cardLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    cardValue: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'right',
      flex: 1,
      marginLeft: 16,
    },
    // Quantity Section
    quantitySection: {
      marginTop: 8,
      backgroundColor: isDark ? `${colors.background}80` : '#F8FAFC',
      borderRadius: 8,
      padding: 12,
    },
    quantitySectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    quantityGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    quantityItem: {
      alignItems: 'center',
      flex: 1,
    },
    quantityLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    quantityValue: {
      fontSize: 13,
      fontWeight: '600',
    },
  });
