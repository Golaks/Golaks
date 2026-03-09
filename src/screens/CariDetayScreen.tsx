import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import IconButton from '../components/IconButton';
import SearchInput from '../components/SearchInput';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import CariCard from '../components/CariCard';
import accountService, { CariAccount, CariTransaction } from '../services/account.service';
import { authService } from '../services/auth.service';
import { generateEkstrePDF } from '../utils/pdfEkstre';

interface CariDetayScreenProps {
  onBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

type AccountFilterType = 'all' | 'customers' | 'suppliers' | 'safes' | 'banks' | 'personnel';

interface FilterOption {
  id: AccountFilterType;
  label: string;
  icon: string;
  color: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'Tümü', icon: 'grid-outline', color: '#6B7280' },
  { id: 'customers', label: 'Müşteriler', icon: 'person-outline', color: '#3B82F6' },
  { id: 'suppliers', label: 'Tedarikçiler', icon: 'business-outline', color: '#8B5CF6' },
  { id: 'safes', label: 'Kasalar', icon: 'wallet-outline', color: '#10B981' },
  { id: 'banks', label: 'Bankalar', icon: 'card-outline', color: '#F59E0B' },
  { id: 'personnel', label: 'Personeller', icon: 'people-outline', color: '#EF4444' },
];

export default function CariDetayScreen({ onBack, onTabChange, onLogout }: CariDetayScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [selectedFilter, setSelectedFilter] = useState<AccountFilterType>('customers');
  const [cariList, setCariList] = useState<CariAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionSearchVisible, setTransactionSearchVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Detail view state
  const [selectedCari, setSelectedCari] = useState<CariAccount | null>(null);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  const styles = createStyles(colors, isDark);

  // Load cari list
  useEffect(() => {
    if (!selectedCari) {
      loadCariList();
    }
  }, [selectedFilter, searchQuery]);

  const loadCariList = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await authService.getToken();
      if (!token) {
        throw new Error('Token bulunamadı');
      }

      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';

      const response = await accountService.getCariList(
        token,
        dataName,
        selectedFilter,
        searchQuery
      );

      if (response.success) {
        setCariList(response.data.data);
      } else {
        throw new Error(response.message || 'Cari listesi alınamadı');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadTransactions = async (cari: CariAccount) => {
    const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';

    try {
      setIsLoadingTransactions(true);
      setTransactionError(null);

      const token = await authService.getToken();
      if (!token) {
        throw new Error('Token bulunamadı');
      }

      const response = await accountService.getCariEkstre(token, dataName, cari.id);

      if (response.success) {
        setTransactions(response.data.transactions);
      } else {
        throw new Error(response.message || 'İşlemler alınamadı');
      }
    } catch (err: any) {
      const errorDetail = `${err.message || 'Bir hata oluştu'}\n\nEndpoint: /account/cari-ekstre\nCari ID: ${cari.id}\nDataName: ${dataName}`;
      setTransactionError(errorDetail);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

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

  const handleEkstrePDF = async (cari: CariAccount) => {
    try {
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');

      const response = await accountService.getCariEkstre(token, dataName, cari.id);
      if (!response.success || !response.data.transactions.length) {
        Alert.alert('Uyarı', 'Bu cari için hareket bulunamadı');
        return;
      }

      await generateEkstrePDF({
        unvan: cari.unvan,
        hesapKodu: cari.hesapKodu,
        sube: cari.sube,
        transactions: response.data.transactions,
      });
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'PDF oluşturulamadı');
    }
  };

  const handleToggleSearch = () => {
    if (selectedCari) {
      setTransactionSearchVisible(!transactionSearchVisible);
      if (transactionSearchVisible) {
        setTransactionSearch('');
      }
    } else {
      setSearchVisible(!searchVisible);
      if (searchVisible) {
        setSearchQuery('');
      }
    }
  };

  const handleFilterPress = (filterId: AccountFilterType) => {
    setSelectedFilter(filterId);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (selectedCari) {
      loadTransactions(selectedCari);
      setRefreshing(false);
    } else {
      loadCariList();
    }
  };

  const handleCariSelect = (cari: CariAccount) => {
    setSelectedCari(cari);
    loadTransactions(cari);
  };

  const handleBackToList = () => {
    setSelectedCari(null);
    setTransactions([]);
    setTransactionError(null);
    setTransactionSearch('');
    setTransactionSearchVisible(false);
    setSummaryExpanded(false);
  };

  // Hesap koduna göre renk ve icon belirle
  const getAccountTypeInfo = (hesapKodu: string) => {
    if (hesapKodu.startsWith('120')) {
      return { color: '#3B82F6', icon: 'person-outline', label: 'Müşteri' };
    } else if (hesapKodu.startsWith('320')) {
      return { color: '#8B5CF6', icon: 'business-outline', label: 'Tedarikçi' };
    } else if (hesapKodu.startsWith('100')) {
      return { color: '#10B981', icon: 'wallet-outline', label: 'Kasa' };
    } else if (hesapKodu.startsWith('102')) {
      return { color: '#F59E0B', icon: 'card-outline', label: 'Banka' };
    } else if (hesapKodu.startsWith('335')) {
      return { color: '#EF4444', icon: 'people-outline', label: 'Personel' };
    }
    return { color: colors.primary, icon: 'person-outline', label: 'Cari' };
  };

  const formatCurrency = (amount: number, doviz: string = 'TL') => {
    return `${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${doviz}`;
  };

  const filteredTransactions = transactionSearch
    ? transactions.filter(t => {
        const q = transactionSearch.toLowerCase();
        return (
          (t.aciklama || '').toLowerCase().includes(q) ||
          (t.fisNo || '').toLowerCase().includes(q) ||
          (t.tarih || '').includes(q)
        );
      })
    : transactions;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Render transaction item
  const renderTransactionItem = ({ item, index }: { item: CariTransaction; index: number }) => {
    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <View style={styles.transactionDateContainer}>
            <Text style={styles.transactionDate}>{formatDate(item.tarih)}</Text>
            <Text style={styles.transactionFisNo}>{item.fisNo}</Text>
          </View>
          <Text style={styles.transactionAciklama} numberOfLines={2}>
            {item.aciklama || item.fisTuru}
          </Text>
        </View>
        <View style={styles.transactionRight}>
          {item.borc > 0 && (
            <Text style={[styles.transactionAmount, { color: '#EF4444' }]}>
              {formatCurrency(item.borc, item.doviz)} B
            </Text>
          )}
          {item.alacak > 0 && (
            <Text style={[styles.transactionAmount, { color: '#10B981' }]}>
              {formatCurrency(item.alacak, item.doviz)} A
            </Text>
          )}
          <Text style={styles.transactionBakiye}>
            {formatCurrency(Math.abs(item.bakiye), item.doviz)} {item.bakiye >= 0 ? 'B' : 'A'}
          </Text>
        </View>
      </View>
    );
  };

  // Transaction List Header
  const TransactionListHeader = () => {
    if (!selectedCari) return null;

    return (
      <View style={styles.transactionHeader}>
        <View style={styles.cariCardWrapper}>
          <CariCard
            cari={selectedCari}
            expanded={false}
            showExpandIcon={false}
          />
        </View>

        {/* Summary - döviz bazlı, açılır-kapanır */}
        {transactions.length > 0 && (() => {
          const grouped: Record<string, { borc: number; alacak: number }> = {};
          transactions.forEach(t => {
            const d = t.doviz || 'TL';
            if (!grouped[d]) grouped[d] = { borc: 0, alacak: 0 };
            grouped[d].borc += t.borc;
            grouped[d].alacak += t.alacak;
          });
          const entries = Object.entries(grouped);
          return (
            <View style={styles.summaryWrapper}>
              <Pressable
                style={styles.summaryToggle}
                onPress={() => setSummaryExpanded(!summaryExpanded)}
              >
                <View style={styles.summaryToggleLeft}>
                  <Icon name="stats-chart-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.summaryToggleText}>Özet</Text>
                  {!summaryExpanded && entries.map(([doviz, totals]) => {
                    const bakiye = totals.borc - totals.alacak;
                    return (
                      <Text key={doviz} style={[styles.summaryInlineValue, { color: bakiye >= 0 ? '#EF4444' : '#10B981' }]}>
                        {formatCurrency(Math.abs(bakiye), doviz)} {bakiye >= 0 ? 'B' : 'A'}
                      </Text>
                    );
                  })}
                </View>
                <Icon
                  name={summaryExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
              {summaryExpanded && entries.map(([doviz, totals]) => {
                const bakiye = totals.borc - totals.alacak;
                return (
                  <View key={doviz} style={styles.summaryRow}>
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryCellLabel}>Borç</Text>
                      <Text style={[styles.summaryCellValue, { color: '#EF4444' }]}>
                        {formatCurrency(totals.borc, doviz)}
                      </Text>
                    </View>
                    <View style={styles.summaryCellDivider} />
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryCellLabel}>Alacak</Text>
                      <Text style={[styles.summaryCellValue, { color: '#10B981' }]}>
                        {formatCurrency(totals.alacak, doviz)}
                      </Text>
                    </View>
                    <View style={styles.summaryCellDivider} />
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryCellLabel}>Bakiye</Text>
                      <Text style={[styles.summaryCellValue, { color: bakiye >= 0 ? '#EF4444' : '#10B981' }]}>
                        {formatCurrency(Math.abs(bakiye), doviz)} {bakiye >= 0 ? 'B' : 'A'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}

        <View style={styles.transactionListTitleContainer}>
          <Icon name="list-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.transactionListTitle}>
            Hesap Hareketleri ({filteredTransactions.length})
          </Text>
        </View>
        {transactionSearchVisible && (
          <View style={{ marginBottom: 8 }}>
            <SearchInput
              value={transactionSearch}
              onChangeText={setTransactionSearch}
              placeholder="Hareket ara..."
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {/* Header */}
        <Header
          title={selectedCari ? 'Cari Ekstre' : 'Cari Detay'}
          leftButton={
            <BackButton
              onPress={selectedCari ? handleBackToList : (onBack || (() => {}))}
            />
          }
          rightButton={
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {selectedCari && (
                <IconButton icon="document-text-outline" onPress={() => handleEkstrePDF(selectedCari)} />
              )}
              <IconButton icon="search-outline" onPress={handleToggleSearch} />
            </View>
          }
          showMenu={true}
          onLogout={handleLogout}
        />

        {/* List View */}
        {!selectedCari ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Search Input */}
            {searchVisible && (
              <View style={styles.searchContainer}>
                <SearchInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Cari ara..."
                />
              </View>
            )}

            {/* Page Title */}
            <View style={styles.pageHeader}>
              <View style={styles.pageTitleContainer}>
                <View style={[styles.pageTitleIcon, { backgroundColor: '#10B981' + '15' }]}>
                  <Icon name="document-text" size={18} color="#10B981" />
                </View>
                <Text style={styles.pageTitle}>Cari Detay</Text>
              </View>
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              {FILTER_OPTIONS.map((filter) => {
                const isSelected = selectedFilter === filter.id;
                return (
                  <Pressable
                    key={filter.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? filter.color : colors.card,
                        borderColor: isSelected ? filter.color : colors.border,
                      },
                    ]}
                    onPress={() => handleFilterPress(filter.id)}
                  >
                    <Icon
                      name={filter.icon}
                      size={16}
                      color={isSelected ? '#FFFFFF' : colors.text}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Account List */}
            <View style={styles.listContainer}>
              {isLoading ? (
                <View style={styles.centerContainer}>
                  <LoadingSpinner />
                </View>
              ) : error ? (
                <EmptyState
                  icon="alert-circle-outline"
                  title="Hata"
                  subtitle={error}
                />
              ) : cariList.length === 0 ? (
                <EmptyState />
              ) : (
                cariList.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.cariItem}
                    onPress={() => handleCariSelect(item)}
                  >
                    <View style={[styles.cariIconContainer, { backgroundColor: getAccountTypeInfo(item.hesapKodu).color + '15' }]}>
                      <Icon name={getAccountTypeInfo(item.hesapKodu).icon} size={22} color={getAccountTypeInfo(item.hesapKodu).color} />
                    </View>
                    <View style={styles.cariInfo}>
                      <Text style={styles.cariUnvan} numberOfLines={1}>
                        {item.unvan}
                      </Text>
                      <View style={styles.cariMeta}>
                        <Text style={styles.cariHesapKodu}>{item.hesapKodu}</Text>
                        <View style={styles.dotSeparator} />
                        <Text style={styles.cariSube}>{item.sube}</Text>
                      </View>
                    </View>
                    <View style={styles.cariActions}>
                      <Pressable
                        style={styles.ekstreButton}
                        onPress={() => handleEkstrePDF(item)}
                      >
                        <Icon name="document-text-outline" size={20} color={colors.primary} />
                      </Pressable>
                      <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </ScrollView>
        ) : (
          /* Transaction View */
          <View style={styles.content}>
            {isLoadingTransactions ? (
              <View style={styles.centerContainer}>
                <LoadingSpinner />
              </View>
            ) : transactionError ? (
              <View style={styles.errorContainer}>
                <TransactionListHeader />
                <View style={styles.errorCenterWrapper}>
                  <EmptyState
                    icon="alert-circle-outline"
                    title="Hata"
                    subtitle={transactionError}
                  />
                </View>
              </View>
            ) : (
              <FlatList
                data={filteredTransactions}
                renderItem={renderTransactionItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.transactionListContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={TransactionListHeader}
                ListEmptyComponent={
                  <EmptyState />
                }
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                  />
                }
              />
            )}
          </View>
        )}

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
    content: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
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
    filterContainer: {
      paddingVertical: 4,
      gap: 4,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      gap: 6,
      marginRight: 4,
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: '600',
    },
    listContainer: {
      marginTop: 16,
    },
    searchContainer: {
      paddingTop: 0,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },
    centerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
    },
    errorContainer: {
      flex: 1,
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    errorCenterWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Cari List Item
    cariItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    cariIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cariInfo: {
      flex: 1,
    },
    cariUnvan: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    cariMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cariHesapKodu: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    dotSeparator: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textTertiary,
      marginHorizontal: 8,
    },
    cariSube: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    cariActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginLeft: 8,
    },
    ekstreButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Transaction View
    transactionHeader: {
      marginBottom: 4,
    },
    cariCardWrapper: {
      marginBottom: 4,
    },

    // Summary
    summaryWrapper: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    summaryToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    summaryToggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    summaryToggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    summaryInlineValue: {
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingBottom: 10,
      alignItems: 'center',
    },
    summaryCell: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    summaryCellDivider: {
      width: 1,
      height: 28,
      backgroundColor: colors.border,
    },
    summaryCellLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    summaryCellValue: {
      fontSize: 13,
      fontWeight: '700',
    },

    // Transaction List
    transactionListTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    transactionListTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      opacity: 0.7,
    },
    transactionListContent: {
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    transactionItem: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    transactionLeft: {
      flex: 1,
      marginRight: 12,
    },
    transactionDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    transactionDate: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    transactionFisNo: {
      fontSize: 11,
      color: colors.textTertiary,
      marginLeft: 8,
    },
    transactionAciklama: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    transactionRight: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    transactionAmount: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    transactionBakiye: {
      fontSize: 11,
      color: colors.textSecondary,
    },
  });
