import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, RefreshControl, Pressable } from 'react-native';
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
import SatisDetayForm from '../components/SatisDetayForm';
import OdemeForm from '../components/OdemeForm';
import { useAlert } from '../contexts/AlertContext';
import { authService } from '../services/auth.service';
import salesService from '../services/sales.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';

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
  const { showSuccess, showError, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [filterVisible, setFilterVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [durumFilter, setDurumFilter] = useState<number | null>(1);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [detayFormVisible, setDetayFormVisible] = useState(false);
  const [detayFormItem, setDetayFormItem] = useState<any>(null);
  const [odemeFormVisible, setOdemeFormVisible] = useState(false);
  const [odemeItem, setOdemeItem] = useState<any>(null);

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
        modul: 'magaza-satis',
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

  const handleOnayla = (item: any) => {
    showConfirm({
      title: 'Fatura Onayla',
      message: `${item.seriNo} numaralı faturayı onaylamak istiyor musunuz? Onaylanan fatura kapanır ve düzenlenemez.`,
      confirmText: 'Onayla',
      cancelText: 'İptal',
      icon: 'checkmark-circle-outline',
      iconColor: '#10B981',
      onConfirm: async () => {
        try {
          const token = await authService.getToken();
          if (!token) return;
          const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
          const res = await fetch(API_ENDPOINTS.SALES_ONAYLA, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ dataName, id: item.id }),
          });
          const json = await res.json();
          if (json.success) {
            showSuccess('Fatura onaylandı');
            fetchData();
          } else {
            showError(json.error?.message || 'Onaylama başarısız');
          }
        } catch (err: any) {
          showError(err.message || 'Onaylama başarısız');
        }
      },
    });
  };

  // Arama filtresi
  const searchFilteredData = data.filter((item: any) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      (item.cariAdi || '').toLowerCase().includes(q) ||
      (item.seriNo || '').toLowerCase().includes(q) ||
      (item.artId?.acente?.adi || '').toLowerCase().includes(q) ||
      (item.artId?.rehber?.adi || '').toLowerCase().includes(q)
    );
  });

  // Stats
  const stats = {
    total: searchFilteredData.length,
    acik: searchFilteredData.filter((i: any) => i.aktif === 1 || i.aktif === undefined).length,
    kapali: searchFilteredData.filter((i: any) => i.aktif === 0).length,
    silinen: searchFilteredData.filter((i: any) => i.aktif === -1).length,
  };

  // Durum filtresi
  const filteredData = searchFilteredData.filter((item: any) => {
    if (durumFilter === null) return true;
    if (durumFilter === 1) return item.aktif === 1 || item.aktif === undefined;
    return item.aktif === durumFilter;
  });

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
              <AddButton onPress={() => { setEditingItem(null); setFormVisible(true); }} />
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

          {/* Stat Kartları */}
          {data.length > 0 && (
            <View style={styles.statsRow}>
              <Pressable style={[styles.statCard, { borderLeftColor: '#3B82F6' }, durumFilter === null && { borderColor: '#3B82F6', borderWidth: 1.5 }]} onPress={() => setDurumFilter(null)}>
                <Text style={styles.statLabel}>Toplam</Text>
                <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.total}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#10B981' }, durumFilter === 1 && { borderColor: '#10B981', borderWidth: 1.5 }]} onPress={() => setDurumFilter(1)}>
                <Text style={styles.statLabel}>Açık</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.acik}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#6B7280' }, durumFilter === 0 && { borderColor: '#6B7280', borderWidth: 1.5 }]} onPress={() => setDurumFilter(0)}>
                <Text style={styles.statLabel}>Kapalı</Text>
                <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.kapali}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#EF4444' }, durumFilter === -1 && { borderColor: '#EF4444', borderWidth: 1.5 }]} onPress={() => setDurumFilter(-1)}>
                <Text style={styles.statLabel}>Silinen</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.silinen}</Text>
              </Pressable>
            </View>
          )}

          {filteredData.length === 0 && !isLoading ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                icon="cart-outline"
                title="Satış Bulunamadı"
                subtitle={searchText ? 'Aramanızla eşleşen satış bulunamadı.' : 'Seçilen tarih aralığında satış kaydı yok.'}
              />
            </View>
          ) : (
            filteredData.map((item: any) => {
              const formatAmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const formatTarih = (t: string) => { if (!t) return '-'; const d = t.split(' ')[0]?.split('-'); return d?.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : t; };
              const durumBadge = item.aktif === 1
                ? { label: 'Açık', color: '#10B981', bg: isDark ? '#10B98115' : '#ECFDF5', icon: 'checkmark-circle' }
                : item.aktif === 0
                ? { label: 'Kapalı', color: '#6B7280', bg: isDark ? '#6B728015' : '#F3F4F6', icon: 'lock-closed' }
                : { label: 'Silinen', color: '#EF4444', bg: isDark ? '#EF444415' : '#FEF2F2', icon: 'trash' };

              const isExpanded = expandedCardId === item.id;

              return (
                <Pressable key={item.id} style={[styles.card, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isExpanded ? colors.primary + '40' : (isDark ? colors.border : '#E2E8F0') }]} onPress={() => setExpandedCardId(isExpanded ? null : item.id)}>
                  {/* Üst: Cari & Tutar */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>{item.cariAdi}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.seriNo}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, opacity: 0.5 }}>·</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{formatTarih(item.tarih)}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#10B981' }}>{formatAmt(item.toplamTutar || 0)} <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.doviz}</Text></Text>
                      {item.toplamIndirim > 0 && (
                        <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>İnd. {formatAmt(item.toplamIndirim)} {item.doviz}</Text>
                      )}
                    </View>
                  </View>

                  {/* Badge'ler */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
                    <View style={[styles.badge, { backgroundColor: durumBadge.bg }]}>
                      <Icon name={durumBadge.icon} size={12} color={durumBadge.color} />
                      <Text style={[styles.badgeText, { color: durumBadge.color }]}>{durumBadge.label}</Text>
                    </View>
                    {item.detaySayisi > 0 && (
                      <View style={[styles.badge, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                        <Icon name="layers-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.detaySayisi} kalem</Text>
                      </View>
                    )}
                    {item.toplamUrunMiktar > 0 && (
                      <View style={[styles.badge, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                        <Icon name="cube-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.toplamUrunMiktar} ad.</Text>
                      </View>
                    )}
                    {item.tipiAciklama ? (
                      <View style={[styles.badge, { backgroundColor: isDark ? '#3B82F610' : '#EFF6FF' }]}>
                        <Icon name="document-text-outline" size={12} color="#3B82F6" />
                        <Text style={[styles.badgeText, { color: '#3B82F6' }]} numberOfLines={1}>{item.tipiAciklama.replace(/^\(\d+\)\s*/, '').replace(/\s*Faturası?$/, '')}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Aksiyon Butonları */}
                  {item.aktif === 1 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: '#F59E0B', flexDirection: 'row', gap: 4, width: 'auto', paddingHorizontal: 8 }]}
                        onPress={(e) => { e.stopPropagation(); setEditingItem(item); setFormVisible(true); }}
                      >
                        <Icon name="create-outline" size={14} color="#fff" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>Düzenle</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: colors.primary, flexDirection: 'row', gap: 4, width: 'auto', paddingHorizontal: 8 }]}
                        onPress={(e) => { e.stopPropagation(); setDetayFormItem(item); setDetayFormVisible(true); }}
                      >
                        <Icon name="add" size={14} color="#fff" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>Ürün Ekle</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: '#8B5CF6', flexDirection: 'row', gap: 4, width: 'auto', paddingHorizontal: 8 }]}
                        onPress={(e) => { e.stopPropagation(); setOdemeItem(item); setOdemeFormVisible(true); }}
                      >
                        <Icon name="cash-outline" size={14} color="#fff" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>Ödeme</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: '#10B981', flexDirection: 'row', gap: 4, width: 'auto', paddingHorizontal: 8 }]}
                        onPress={(e) => { e.stopPropagation(); handleOnayla(item); }}
                      >
                        <Icon name="checkmark-circle-outline" size={14} color="#fff" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>Onayla</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Alt Detaylar - Expandable */}
                  {isExpanded && (
                    <>
                      <View style={[styles.cardInfoGrid, { borderTopColor: isDark ? colors.border : '#F1F5F9' }]}>
                        <View style={styles.cardInfoItem}>
                          <Text style={[styles.cardInfoLabel, { color: colors.textSecondary }]}>Acente</Text>
                          <Text style={[styles.cardInfoValue, { color: colors.text }]} numberOfLines={1}>{(item.artId?.acente?.adi || '-').replace(/^[\d.]+\s*-\s*/, '')}</Text>
                        </View>
                        <View style={styles.cardInfoItem}>
                          <Text style={[styles.cardInfoLabel, { color: colors.textSecondary }]}>Rehber</Text>
                          <Text style={[styles.cardInfoValue, { color: colors.text }]} numberOfLines={1}>{(item.artId?.rehber?.adi || '-').replace(/^[\d.]+\s*-\s*/, '')}</Text>
                        </View>
                      </View>
                      <View style={[styles.cardInfoGrid, { borderTopWidth: 0, marginTop: 6, paddingTop: 0 }]}>
                        <View style={[styles.cardInfoItem, { flex: 1 }]}>
                          <Text style={[styles.cardInfoLabel, { color: colors.textSecondary }]}>Tezgahtar</Text>
                          <Text style={[styles.cardInfoValue, { color: colors.text }]} numberOfLines={2}>
                            {item.artId?.tezgahtar?.length > 0
                              ? item.artId.tezgahtar.map((t: any) => (t.adi || '').replace(/^[\d.]+\s*-\s*/, '')).join(', ')
                              : '-'}
                          </Text>
                        </View>
                      </View>

                    </>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
        )}

        {/* Satış Detay Formu */}
        <SatisDetayForm
          visible={detayFormVisible}
          onClose={() => { setDetayFormVisible(false); setDetayFormItem(null); }}
          onSave={() => { setDetayFormVisible(false); setDetayFormItem(null); showSuccess('Ürünler eklendi'); fetchData(); }}
          faturaId={detayFormItem?.id}
          seriNo={detayFormItem?.seriNo}
          doviz={detayFormItem?.doviz}
          defaultTezgahtarIds={(detayFormItem?.artId?.tezgahtar || []).map((t: any) => String(t.id))}
        />

        {/* Satış Formu */}
        <SatisForm
          visible={formVisible}
          onClose={() => { setFormVisible(false); setEditingItem(null); }}
          onSave={handleSaved}
          editingItem={editingItem}
        />

        {/* Ödeme Formu */}
        <OdemeForm
          visible={odemeFormVisible}
          onClose={() => { setOdemeFormVisible(false); setOdemeItem(null); }}
          onSave={() => { setOdemeFormVisible(false); setOdemeItem(null); showSuccess('Ödeme alındı (tasarım)'); }}
          faturaItem={odemeItem}
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
    statsRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    statCard: {
      flex: 1,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 10, padding: 10,
      borderLeftWidth: 3, borderWidth: 1,
      borderColor: isDark ? colors.border : '#F1F5F9',
    },
    statLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 3 },
    statValue: { fontSize: 16, fontWeight: '700' },
    card: {
      borderRadius: 12, padding: 14, marginBottom: 8,
      borderWidth: 1,
    },
    badge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    },
    badgeText: { fontSize: 11, fontWeight: '600' },
    cardInfoGrid: {
      flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10,
      borderTopWidth: 1,
    },
    cardInfoItem: {
      flex: 1, backgroundColor: isDark ? colors.background : '#F8FAFC',
      borderRadius: 8, padding: 8,
    },
    cardInfoLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
    cardInfoValue: { fontSize: 13, fontWeight: '600' },
    iconBtn: {
      width: 28, height: 28, borderRadius: 7,
      alignItems: 'center', justifyContent: 'center',
    },
  });
