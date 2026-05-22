import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, RefreshControl, Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { Alert } from 'react-native';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import SearchButton from '../components/SearchButton';
import AddButton from '../components/AddButton';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import DateFilter from '../components/DateFilter';
import ConfirmDialog from '../components/ConfirmDialog';
import FisForm from '../components/FisForm';
import { useRegisterHelp } from '../lib/helpContext';
import { fisIslemleriHelp } from './fisIslemleri/help';

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
    case 'last3Months':
      return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end: today };
    case 'thisYear':
      return { start: new Date(now.getFullYear(), 0, 1), end: today };
    default:
      return { start: today, end: today };
  }
};

interface FisIslemleriScreenProps {
  onGoBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function FisIslemleriScreen({ onGoBack, onTabChange, onLogout }: FisIslemleriScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, user, notificationCount } = useAuth();
  const { showSuccess } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  useRegisterHelp(fisIslemleriHelp);
  const [filterVisible, setFilterVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [onaylaItem, setOnaylaItem] = useState<any>(null);

  // Durum filtresi
  const [durumFilter, setDurumFilter] = useState<number | null>(1);

  // Date filter
  const defaultPreset: DatePreset = 'thisMonth';
  const defaultDates = getPresetDates(defaultPreset);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(defaultPreset);
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  const styles = createStyles(colors, isDark);

  const formatDateStr = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}.${m}.${date.getFullYear()}`;
  };

  const formatDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatTarih = (t: string) => {
    if (!t) return '-';
    const d = t.split(' ')[0]?.split('-');
    return d?.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : t;
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const res = await fetch(API_ENDPOINTS.FIS_LIST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          dataName,
          startDate: formatDateISO(startDate),
          endDate: formatDateISO(endDate),
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data.items || json.data || []);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleOnaylaConfirm = async () => {
    if (!onaylaItem) return;
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const res = await fetch(API_ENDPOINTS.FIS_ONAYLA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dataName, id: onaylaItem.id }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Fiş onaylandı (kapatıldı)');
        fetchData();
      } else {
        Alert.alert('Onaylanamadı', data.error?.message || data.message || 'Fiş onaylanamadı');
      }
    } catch {} finally {
      setOnaylaItem(null);
    }
  };

  const handleLogout = async () => {
    try { await logout(); onLogout?.(); } catch {}
  };

  const handlePresetChange = (preset: DatePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const { start, end } = getPresetDates(preset);
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Arama filtresi
  const searchFilteredData = data.filter((item: any) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      (item.fisNo || '').toLowerCase().includes(q) ||
      (item.fisTipi || '').toLowerCase().includes(q) ||
      (item.fisAciklama || '').toLowerCase().includes(q)
    );
  });

  // Stats
  const stats = {
    total: searchFilteredData.length,
    acik: searchFilteredData.filter((i: any) => i.kasaDurum === 1).length,
    kapali: searchFilteredData.filter((i: any) => i.kasaDurum === 0).length,
  };

  // Durum filtresi
  const filteredData = searchFilteredData.filter((item: any) => {
    if (durumFilter === null) return true;
    return item.kasaDurum === durumFilter;
  });

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Fiş tipi renkleri
  const getTipiBadge = (tip: string) => {
    switch (tip) {
      case 'Mahsup': return { color: '#3B82F6', bg: isDark ? '#3B82F615' : '#EFF6FF' };
      case 'Tahsil': return { color: '#10B981', bg: isDark ? '#10B98115' : '#ECFDF5' };
      case 'Tediye': return { color: '#EF4444', bg: isDark ? '#EF444415' : '#FEF2F2' };
      case 'Fatura': return { color: '#8B5CF6', bg: isDark ? '#8B5CF615' : '#F5F3FF' };
      case 'Sipariş Avans': return { color: '#F59E0B', bg: isDark ? '#F59E0B15' : '#FFFBEB' };
      case 'Sipariş İndirim': return { color: '#EC4899', bg: isDark ? '#EC489915' : '#FDF2F8' };
      default: return { color: colors.textSecondary, bg: isDark ? colors.background : '#F8FAFC' };
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Fiş İşlemleri"
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
                <Icon name="document-text" size={18} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Fiş İşlemleri</Text>
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
                onStartDateChange={(d) => { setStartDate(d); setSelectedPreset('custom'); }}
                onEndDateChange={(d) => { setEndDate(d); setSelectedPreset('custom'); }}
                showSearch={true}
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Fiş no, açıklama ara..."
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
            </View>
          )}

          {/* Liste */}
          {filteredData.length === 0 && !isLoading ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                icon="document-text-outline"
                title="Fiş Bulunamadı"
                subtitle={searchText ? 'Aramanızla eşleşen fiş bulunamadı.' : 'Seçilen tarih aralığında fiş kaydı yok.'}
              />
            </View>
          ) : (
            filteredData.map((item: any) => {
              const tipiBadge = getTipiBadge(item.fisTipi);
              const isExpanded = expandedCardId === String(item.id);

              return (
                <Pressable
                  key={item.id}
                  style={[styles.card, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isExpanded ? colors.primary + '40' : (isDark ? colors.border : '#E2E8F0') }]}
                  onPress={() => setExpandedCardId(isExpanded ? null : String(item.id))}
                >
                  {/* Üst: Fiş No & Borç/Alacak */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{item.fisNo || '-'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{formatTarih(item.fisTarihi)}</Text>
                        {item.kasaHesapKodu ? (
                          <>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, opacity: 0.5 }}>·</Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.kasaHesapKodu}</Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {item.toplamBorc > 0 && (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>B: {fmt(item.toplamBorc)}</Text>
                      )}
                      {item.toplamAlacak > 0 && (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>A: {fmt(item.toplamAlacak)}</Text>
                      )}
                    </View>
                  </View>

                  {/* Badge'ler */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
                    <View style={[styles.badge, { backgroundColor: tipiBadge.bg }]}>
                      <Icon name="pricetag-outline" size={12} color={tipiBadge.color} />
                      <Text style={[styles.badgeText, { color: tipiBadge.color }]}>{item.fisTipi}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: item.kasaDurum === 1 ? (isDark ? '#10B98115' : '#ECFDF5') : (isDark ? '#6B728015' : '#F3F4F6') }]}>
                      <Icon name={item.kasaDurum === 1 ? 'lock-open' : 'lock-closed'} size={12} color={item.kasaDurum === 1 ? '#10B981' : '#6B7280'} />
                      <Text style={[styles.badgeText, { color: item.kasaDurum === 1 ? '#10B981' : '#6B7280' }]}>{item.kasaDurum === 1 ? 'Açık' : 'Kapalı'}</Text>
                    </View>
                    {item.kayitTablo && item.kayitTablo !== 'diger' && (
                      <View style={[styles.badge, { backgroundColor: isDark ? '#8B5CF615' : '#F5F3FF' }]}>
                        <Icon name="link-outline" size={12} color="#8B5CF6" />
                        <Text style={[styles.badgeText, { color: '#8B5CF6' }]}>{item.kayitTablo.replace('_', ' ')}</Text>
                      </View>
                    )}
                    {item.detaySayisi > 0 && (
                      <View style={[styles.badge, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                        <Icon name="layers-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.detaySayisi} satır</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }} />
                    {item.kasaDurum === 1 && (
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: '#10B981' }]}
                        onPress={(e) => { e.stopPropagation(); setOnaylaItem(item); }}
                      >
                        <Icon name="checkmark-circle-outline" size={14} color="#fff" />
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.iconBtn, { backgroundColor: '#F59E0B' }]}
                      onPress={(e) => { e.stopPropagation(); setEditingItem(item); setFormVisible(true); }}
                    >
                      <Icon name="create-outline" size={14} color="#fff" />
                    </Pressable>
                  </View>

                  {/* Açıklama */}
                  {item.fisAciklama ? (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6, fontStyle: 'italic' }} numberOfLines={isExpanded ? undefined : 1}>{item.fisAciklama}</Text>
                  ) : null}

                  {/* Expanded: Detay Satırları */}
                  {isExpanded && item.detaylar && item.detaylar.length > 0 && (
                    <View style={[styles.detaySection, { borderTopColor: isDark ? colors.border : '#F1F5F9' }]}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Fiş Satırları</Text>
                      {item.detaylar.map((det: any, idx: number) => (
                        <View key={det.id || idx} style={[styles.detayRow, idx > 0 && { borderTopWidth: 1, borderTopColor: isDark ? colors.border : '#F1F5F9' }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>{det.hesapKodu || '-'}</Text>
                            {det.aciklama ? <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{det.aciklama}</Text> : null}
                            {/* Döviz bilgileri */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              {(det.dovizliBorc > 0 || det.dovizliAlacak > 0) && det.doviz !== (det.dovizliDoviz || '') && (
                                <Text style={{ fontSize: 10, color: '#8B5CF6', backgroundColor: isDark ? '#8B5CF610' : '#F5F3FF', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                                  Dvz: {det.dovizliBorc > 0 ? fmt(det.dovizliBorc) : fmt(det.dovizliAlacak)} {det.dovizliDoviz}
                                </Text>
                              )}
                              {(det.cariBorc > 0 || det.cariAlacak > 0) && det.doviz !== (det.cariDoviz || '') && (
                                <Text style={{ fontSize: 10, color: '#F59E0B', backgroundColor: isDark ? '#F59E0B10' : '#FFFBEB', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                                  Cari: {det.cariBorc > 0 ? fmt(det.cariBorc) : fmt(det.cariAlacak)} {det.cariDoviz}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            {det.borc > 0 && (
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>B: {fmt(det.borc)} {det.doviz}</Text>
                            )}
                            {det.alacak > 0 && (
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#10B981' }}>A: {fmt(det.alacak)} {det.doviz}</Text>
                            )}
                            {det.dovizKuru > 1 && (
                              <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>Kur: {det.dovizKuru}</Text>
                            )}
                          </View>
                        </View>
                      ))}

                      {/* Detay Toplamları */}
                      <View style={[styles.detayToplam, { borderTopColor: isDark ? colors.border : '#E2E8F0' }]}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Borç: {fmt(item.toplamBorc)}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>Alacak: {fmt(item.toplamAlacak)}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: Math.abs(item.toplamBorc - item.toplamAlacak) < 0.01 ? '#10B981' : '#EF4444' }}>
                          Fark: {fmt(item.toplamBorc - item.toplamAlacak)}
                        </Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
        )}

        <ConfirmDialog
          visible={!!onaylaItem}
          title="Fişi Onayla"
          message={`${onaylaItem?.fisNo || ''} numaralı fişi onaylamak (kapatmak) istediğinize emin misiniz?`}
          icon="checkmark-circle"
          iconColor="#10B981"
          confirmText="Onayla"
          cancelText="İptal"
          confirmIcon="checkmark-outline"
          cancelIcon="close-outline"
          onConfirm={handleOnaylaConfirm}
          onCancel={() => setOnaylaItem(null)}
        />

        <FisForm
          visible={formVisible}
          onClose={() => { setFormVisible(false); setEditingItem(null); }}
          onSave={() => { setFormVisible(false); setEditingItem(null); showSuccess('Fiş kaydedildi'); fetchData(); }}
          editingItem={editingItem}
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
    scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
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
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    card: {
      borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1,
    },
    badge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    },
    badgeText: { fontSize: 11, fontWeight: '600' },
    detaySection: {
      marginTop: 10, paddingTop: 10, borderTopWidth: 1,
    },
    detayRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingVertical: 8,
    },
    detayToplam: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: 10, marginTop: 6, borderTopWidth: 1,
    },
    iconBtn: {
      width: 28, height: 28, borderRadius: 7,
      alignItems: 'center', justifyContent: 'center',
    },
  });
