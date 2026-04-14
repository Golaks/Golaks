import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, RefreshControl } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import SearchButton from '../components/SearchButton';
import AddButton from '../components/AddButton';
import SearchInput from '../components/SearchInput';
import SelectInput from '../components/SelectInput';
import IconButton from '../components/IconButton';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import CariCard from '../components/CariCard';
import BottomSheet from '../components/BottomSheet';
import Input from '../components/Input';
import Button from '../components/Button';
import accountService, { CariAccount, CariTransaction } from '../services/account.service';
import { useFieldErrors } from '../hooks/useFieldErrors';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import ordersService from '../services/orders.service';
import { generateEkstrePDF } from '../utils/pdfEkstre';

interface CariHesaplarScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

type AccountFilterType = 'all' | 'customers' | 'suppliers' | 'safes' | 'banks' | 'personnel' | 'stocks';

interface FilterOption {
  id: AccountFilterType;
  label: string;
  icon: string;
  color: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'Tüm Cariler', icon: 'grid-outline', color: '#6B7280' },
  { id: 'customers', label: 'Müşteriler', icon: 'people-outline', color: '#3B82F6' },
  { id: 'suppliers', label: 'Tedarikçiler', icon: 'people-outline', color: '#8B5CF6' },
  { id: 'safes', label: 'Kasalar', icon: 'people-outline', color: '#10B981' },
  { id: 'banks', label: 'Bankalar', icon: 'people-outline', color: '#F59E0B' },
  { id: 'personnel', label: 'Personeller', icon: 'people-outline', color: '#EF4444' },
  { id: 'stocks', label: 'Stoklar', icon: 'people-outline', color: '#06B6D4' },
];

export default function CariHesaplarScreen({ onGoBack, onTabChange, onLogout }: CariHesaplarScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount, user } = useAuth();
  const { showError, showWarning, showSuccess } = useAlert();
  const cariFieldErrors = useFieldErrors();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [selectedFilter, setSelectedFilter] = useState<AccountFilterType>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [cariList, setCariList] = useState<CariAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Branch state
  const [subeler, setSubeler] = useState<{ id: string; label: string }[]>([]);
  const [selectedSubeId, setSelectedSubeId] = useState<string>('');
  const [subelerLoaded, setSubelerLoaded] = useState(false);

  // Ekstre (transaction) view state
  const [selectedCari, setSelectedCari] = useState<CariAccount | null>(null);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionSearchVisible, setTransactionSearchVisible] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Create form state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCari, setEditingCari] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formHesapKodu, setFormHesapKodu] = useState('');
  const [formUnvan, setFormUnvan] = useState('');
  const [formKisaUnvan, setFormKisaUnvan] = useState('');
  const [formDoviz, setFormDoviz] = useState('TL');
  const [varsayilanDoviz, setVarsayilanDoviz] = useState('TL');
  const [dovizTipleri, setDovizTipleri] = useState<{ id: string; label: string }[]>([]);
  const [formSubeId, setFormSubeId] = useState('');

  const styles = createStyles(colors, isDark);

  // Load subeler on mount
  const loadSubeler = useCallback(async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const response = await fetch(
        `${require('../config/env').BASE_URL}/user/subeler`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.success && data.data?.subeler) {
        const mapped = data.data.subeler.map((s: any) => ({ id: String(s.id), label: s.name || s.subeAdi }));
        setSubeler(mapped);
        const varsayilan = data.data.varsayilanSube ? String(data.data.varsayilanSube) : '';
        if (varsayilan) {
          setSelectedSubeId(varsayilan);
        } else if (mapped.length > 0) {
          setSelectedSubeId(mapped[0].id);
        }
        setSubelerLoaded(true);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadSubeler();
    // Varsayılan döviz
    (async () => {
      try {
        const token = await authService.getToken();
        if (!token) return;
        const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
        const res = await fetch(API_ENDPOINTS.SALES_NEXT_SERI_NO, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ dataName, prefix: 'FAT' }),
        });
        const data = await res.json();
        if (data.success && data.data?.varsayilanDoviz) {
          setVarsayilanDoviz(data.data.varsayilanDoviz);
        }
        // Döviz tipleri
        const lookupsRes = await ordersService.getLookups(token, dataName);
        if (lookupsRes.success && lookupsRes.data?.dovizTipleri) {
          setDovizTipleri(lookupsRes.data.dovizTipleri.map((d: any) => ({ id: d.dovizTipi, label: d.dovizTipi })));
        }
      } catch {}
    })();
  }, []);

  // Load cari list
  useEffect(() => {
    if (!selectedCari && subelerLoaded) {
      loadCariList();
    }
  }, [selectedFilter, searchQuery, selectedSubeId, subelerLoaded]);

  const loadCariList = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
      const response = await accountService.getCariList(
        token, dataName, selectedFilter, searchQuery,
        selectedSubeId ? parseInt(selectedSubeId) : undefined
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
      if (!token) throw new Error('Token bulunamadı');
      const response = await accountService.getCariEkstre(token, dataName, cari.id);
      if (response.success) {
        setTransactions(response.data.transactions);
      } else {
        throw new Error(response.message || 'İşlemler alınamadı');
      }
    } catch (err: any) {
      setTransactionError(err.message || 'Bir hata oluştu');
    } finally {
      setIsLoadingTransactions(false);
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
    } catch {}
  };

  const handleToggleSearch = () => {
    if (selectedCari) {
      setTransactionSearchVisible(!transactionSearchVisible);
      if (transactionSearchVisible) setTransactionSearch('');
    } else {
      setSearchVisible(!searchVisible);
      if (searchVisible) setSearchQuery('');
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

  const handleRefresh = () => {
    setRefreshing(true);
    if (selectedCari) {
      loadTransactions(selectedCari);
      setRefreshing(false);
    } else {
      loadCariList();
    }
  };

  const handleEkstrePDF = async (cari: CariAccount) => {
    try {
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const response = await accountService.getCariEkstre(token, dataName, cari.id);
      if (!response.success || !response.data.transactions.length) {
        showWarning('Bu cari için hareket bulunamadı');
        return;
      }
      await generateEkstrePDF({
        unvan: cari.unvan,
        hesapKodu: cari.hesapKodu,
        sube: cari.sube,
        transactions: response.data.transactions,
      });
    } catch (err: any) {
      showError(err.message || 'PDF oluşturulamadı');
    }
  };

  const resetForm = () => {
    setFormHesapKodu('');
    setFormUnvan('');
    setFormKisaUnvan('');
    setFormDoviz(varsayilanDoviz);
    setFormSubeId('');
    cariFieldErrors.clearAll();
  };

  const fetchNextHesapKodu = async (filterType: AccountFilterType, subeId: string) => {
    if (!subeId || filterType === 'all') return;
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const response = await accountService.getNextHesapKodu(token, dataName, filterType, parseInt(subeId));
      if (response.success && response.data.hesapKodu) {
        setFormHesapKodu(response.data.hesapKodu);
      }
    } catch (_) {}
  };

  const handleOpenCreateModal = () => {
    setEditingCari(null);
    resetForm();
    setFormSubeId(selectedSubeId);
    setShowFormModal(true);
    fetchNextHesapKodu(selectedFilter, selectedSubeId);
  };

  const handleOpenEditModal = (cari: any) => {
    setEditingCari(cari);
    setFormHesapKodu(cari.hesapKodu || cari.hesap_kodu || '');
    setFormUnvan(cari.unvan || '');
    setFormKisaUnvan(cari.kisaUnvan || cari.kisa_unvan || '');
    setFormDoviz(cari.doviz || varsayilanDoviz);
    setFormSubeId(cari.subeId ? String(cari.subeId) : (cari.sube_id ? String(cari.sube_id) : selectedSubeId));
    cariFieldErrors.clearAll();
    setShowFormModal(true);
  };

  const handleSaveCari = async () => {
    if (!cariFieldErrors.validateRequired({
      unvan: formUnvan.trim(),
      hesapKodu: formHesapKodu.trim(),
      sube: formSubeId,
    })) return;

    setIsSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      if (editingCari) {
        await accountService.updateCari(token, dataName, editingCari.id, {
          unvan: formUnvan.trim(),
          kisaUnvan: formKisaUnvan.trim(),
          doviz: formDoviz,
        });
        showSuccess('Cari hesap güncellendi');
      } else {
        await accountService.createCari(token, dataName, {
          hesapKodu: formHesapKodu.trim(),
          unvan: formUnvan.trim(),
          kisaUnvan: formKisaUnvan.trim(),
          doviz: formDoviz,
          subeId: parseInt(formSubeId),
        });
        showSuccess('Cari hesap oluşturuldu');
      }
      setShowFormModal(false);
      setEditingCari(null);
      resetForm();
      loadCariList();
    } catch (err: any) {
      showError(err.message || 'İşlem başarısız');
    } finally {
      setIsSaving(false);
    }
  };

  const getAccountTypeInfo = (hesapKodu: string) => {
    if (hesapKodu.startsWith('120')) return { color: '#3B82F6', icon: 'person-outline', label: 'Müşteri' };
    if (hesapKodu.startsWith('320')) return { color: '#8B5CF6', icon: 'business-outline', label: 'Tedarikçi' };
    if (hesapKodu.startsWith('100')) return { color: '#10B981', icon: 'wallet-outline', label: 'Kasa' };
    if (hesapKodu.startsWith('102')) return { color: '#F59E0B', icon: 'card-outline', label: 'Banka' };
    if (hesapKodu.startsWith('335')) return { color: '#EF4444', icon: 'people-outline', label: 'Personel' };
    if (hesapKodu.startsWith('150')) return { color: '#06B6D4', icon: 'cube-outline', label: 'Stok' };
    return { color: colors.primary, icon: 'person-outline', label: 'Cari' };
  };

  const formatCurrency = (amount: number, doviz: string = 'TL') => {
    return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${doviz}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  const renderTransactionItem = ({ item }: { item: CariTransaction }) => (
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

  const TransactionListHeader = () => {
    if (!selectedCari) return null;
    return (
      <View style={styles.transactionHeader}>
        <View style={styles.cariCardWrapper}>
          <CariCard cari={selectedCari} expanded={false} showExpandIcon={false} />
        </View>

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
              <Pressable style={styles.summaryToggle} onPress={() => setSummaryExpanded(!summaryExpanded)}>
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
                <Icon name={summaryExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
              </Pressable>
              {summaryExpanded && entries.map(([doviz, totals]) => {
                const bakiye = totals.borc - totals.alacak;
                return (
                  <View key={doviz} style={styles.summaryRow}>
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryCellLabel}>Borç</Text>
                      <Text style={[styles.summaryCellValue, { color: '#EF4444' }]}>{formatCurrency(totals.borc, doviz)}</Text>
                    </View>
                    <View style={styles.summaryCellDivider} />
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryCellLabel}>Alacak</Text>
                      <Text style={[styles.summaryCellValue, { color: '#10B981' }]}>{formatCurrency(totals.alacak, doviz)}</Text>
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
          <Text style={styles.transactionListTitle}>Hesap Hareketleri ({filteredTransactions.length})</Text>
        </View>
        {transactionSearchVisible && (
          <View style={{ marginBottom: 8 }}>
            <SearchInput value={transactionSearch} onChangeText={setTransactionSearch} placeholder="Hareket ara..." />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title={selectedCari ? 'Cari Ekstre' : 'Cari Hesaplar'}
          leftButton={<BackButton onPress={selectedCari ? handleBackToList : onGoBack} />}
          rightButton={
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {selectedCari && (
                <IconButton icon="document-text-outline" onPress={() => handleEkstrePDF(selectedCari)} />
              )}
              {!selectedCari && (
                <AddButton onPress={handleOpenCreateModal} />
              )}
              <SearchButton onPress={handleToggleSearch} />
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
            {searchVisible && (
              <View style={styles.searchContainer}>
                <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Cari ara..." />
              </View>
            )}

            <View style={styles.pageHeader}>
              <View style={styles.pageTitleRow}>
                <View style={styles.pageTitleContainer}>
                  <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Icon name="people" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.pageTitle}>Cari Hesaplar</Text>
                </View>
                {subeler.length > 0 && (
                  <View style={styles.subeSelectorContainer}>
                    <SelectInput
                      value={selectedSubeId}
                      onSelect={setSelectedSubeId}
                      items={subeler}
                      placeholder="Şube"
                      compact
                    />
                  </View>
                )}
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContent}
            >
              {FILTER_OPTIONS.map((filter) => {
                const isSelected = selectedFilter === filter.id;
                return (
                  <Pressable
                    key={filter.id}
                    style={[
                      styles.filterChip,
                      isSelected && { backgroundColor: filter.color, borderColor: filter.color },
                    ]}
                    onPress={() => setSelectedFilter(filter.id)}
                  >
                    {filter.color && !isSelected && (
                      <View style={[styles.filterDot, { backgroundColor: filter.color }]} />
                    )}
                    <Text style={[styles.filterChipText, isSelected && { color: '#FFF' }]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.listContainer, (cariList.length === 0 || isLoading || error) && { flex: 1, justifyContent: 'center' }]}>
              {isLoading ? (
                <View style={styles.centerContainer}>
                  <LoadingSpinner />
                </View>
              ) : error ? (
                <EmptyState icon="alert-circle-outline" title="Hata" subtitle={error} />
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
                      <Text style={styles.cariUnvan} numberOfLines={1}>{item.unvan}</Text>
                      <View style={styles.cariMeta}>
                        <Text style={styles.cariHesapKodu}>{item.hesapKodu}</Text>
                        <View style={styles.dotSeparator} />
                        <Text style={styles.cariSube}>{item.sube}</Text>
                        {item.doviz && (
                          <>
                            <View style={styles.dotSeparator} />
                            <Text style={styles.cariSube}>{item.doviz}</Text>
                          </>
                        )}
                      </View>
                    </View>
                    <View style={styles.cariActions}>
                      <Pressable style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); handleOpenEditModal(item); }} hitSlop={4}>
                        <Icon name="create-outline" size={18} color="#F59E0B" />
                      </Pressable>
                      <Pressable style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); handleEkstrePDF(item); }} hitSlop={4}>
                        <Icon name="document-text-outline" size={18} color={colors.primary} />
                      </Pressable>
                      <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </ScrollView>
        ) : (
          /* Transaction/Ekstre View */
          <View style={styles.content}>
            {isLoadingTransactions ? (
              <View style={styles.centerContainer}>
                <LoadingSpinner />
              </View>
            ) : transactionError ? (
              <View style={styles.errorContainer}>
                <TransactionListHeader />
                <View style={styles.errorCenterWrapper}>
                  <EmptyState icon="alert-circle-outline" title="Hata" subtitle={transactionError} />
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
                ListEmptyComponent={<EmptyState />}
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

        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />

        {/* Create Cari Modal */}
        <BottomSheet
          visible={showFormModal}
          onClose={() => { setShowFormModal(false); resetForm(); }}
          title={editingCari ? 'Cari Hesap Düzenle' : 'Yeni Cari Hesap'}
          icon="person-add-outline"
          footer={
            <>
              <Button
                text="İptal"
                variant="secondary"
                onPress={() => { setShowFormModal(false); resetForm(); }}
                icon="close-outline"
                style={{ flex: 1 }}
              />
              <Button
                text="Kaydet"
                variant="primary"
                onPress={handleSaveCari}
                icon="checkmark-outline"
                loading={isSaving}
                style={{ flex: 1 }}
              />
            </>
          }
        >
          <Input
            label="Hesap Kodu *"
            value={formHesapKodu}
            onChangeText={(v) => { setFormHesapKodu(v); cariFieldErrors.clearFieldError('hesapKodu'); }}
            placeholder="Otomatik oluşturulacak"
            autoCapitalize="none"
            editable={!editingCari}
            error={cariFieldErrors.errors.hesapKodu ? ' ' : ''}
            shake={cariFieldErrors.shakes.hesapKodu}
          />
          <Input
            label="Ünvan *"
            value={formUnvan}
            onChangeText={(v) => { setFormUnvan(v); cariFieldErrors.clearFieldError('unvan'); }}
            placeholder="Firma veya kişi adı"
            error={cariFieldErrors.errors.unvan ? ' ' : ''}
            shake={cariFieldErrors.shakes.unvan}
          />
          <View style={styles.formRow}>
            <View style={styles.formRowHalf}>
              <Input
                label="Kısa Ünvan"
                value={formKisaUnvan}
                onChangeText={setFormKisaUnvan}
                placeholder="Kısaltılmış ad"
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            <View style={styles.formRowHalf}>
              <SelectInput
                label="Döviz"
                value={formDoviz}
                onSelect={setFormDoviz}
                items={dovizTipleri}
                placeholder="Döviz seçin"
                noClear
              />
            </View>
          </View>
        </BottomSheet>
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
      flexGrow: 1,
      padding: 16,
      paddingBottom: 100,
    },
    searchContainer: {
      paddingBottom: 12,
    },
    pageHeader: {
      marginBottom: 8,
    },
    pageTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pageTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    subeSelectorContainer: {
      minWidth: 140,
      maxWidth: 200,
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
    filterScroll: {
      flexGrow: 0,
      marginBottom: 14,
    },
    filterContent: {
      gap: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: isDark ? colors.card : '#fff',
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
      gap: 6,
    },
    filterDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    listContainer: {
      marginTop: 4,
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
      gap: 6,
      marginLeft: 8,
    },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
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
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    formRowHalf: {
      flex: 1,
    },
  });
