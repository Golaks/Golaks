import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { authService } from '../services/auth.service';

interface KonfeksiyonUretimScreenProps {
  onGoBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

interface UretimIslem {
  id: number;
  fisNo: string;
  tarih: string;
  modelAdi: string;
  modelKodu?: string;
  islemTuru: string;
  personelAdi?: string;
  adet: number;
  birim?: string;
  durum?: string;
  aciklama?: string;
}

const DURUM_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  tamamlandi: { label: 'Tamamlandı', color: '#10B981', icon: 'checkmark-circle-outline' },
  devamEdiyor: { label: 'Devam Ediyor', color: '#3B82F6', icon: 'time-outline' },
  bekliyor: { label: 'Bekliyor', color: '#F59E0B', icon: 'hourglass-outline' },
  iptal: { label: 'İptal', color: '#EF4444', icon: 'close-circle-outline' },
};

const ISLEM_COLORS: Record<string, string> = {
  kesim: '#3B82F6',
  dikim: '#10B981',
  ütü: '#F59E0B',
  paketleme: '#8B5CF6',
  kontrol: '#EC4899',
};

function getIslemColor(tur: string): string {
  const key = Object.keys(ISLEM_COLORS).find(k => tur?.toLowerCase().includes(k));
  return key ? ISLEM_COLORS[key] : '#6B7280';
}

function formatTarih(tarih: string): string {
  if (!tarih) return '-';
  try {
    return new Date(tarih).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return tarih;
  }
}

export default function KonfeksiyonUretimScreen({
  onGoBack,
  onTabChange,
  onLogout,
}: KonfeksiyonUretimScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [islemler, setIslemler] = useState<UretimIslem[]>([]);
  const [filtered, setFiltered] = useState<UretimIslem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const styles = createStyles(colors, isDark);

  const fetchData = async () => {
    try {
      setError(null);
      const token = await authService.getToken();
      const response = await fetch(API_ENDPOINTS.CONFECTION_TRANSACTIONS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await response.json();
      if (json.success) {
        const data: UretimIslem[] = json.data?.transactions ?? json.data ?? [];
        setIslemler(data);
        setFiltered(data);
      } else {
        setError(json.error?.message || 'Veriler alınamadı.');
      }
    } catch {
      setError('Sunucuya bağlanılamadı.');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFiltered(islemler);
      return;
    }
    const q = text.toLowerCase();
    setFiltered(
      islemler.filter(
        i =>
          i.modelAdi?.toLowerCase().includes(q) ||
          i.fisNo?.toLowerCase().includes(q) ||
          i.islemTuru?.toLowerCase().includes(q) ||
          i.personelAdi?.toLowerCase().includes(q),
      ),
    );
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

  const renderCard = (item: UretimIslem) => {
    const isExpanded = expandedId === item.id;
    const durumConfig = item.durum ? (DURUM_CONFIG[item.durum] ?? null) : null;
    const islemColor = getIslemColor(item.islemTuru);

    return (
      <Pressable
        key={item.id}
        style={[styles.card, { backgroundColor: colors.card, borderColor: isExpanded ? colors.primary + '50' : colors.border }]}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        {/* Sol aksan */}
        <View style={[styles.cardAccent, { backgroundColor: islemColor }]} />

        <View style={styles.cardBody}>
          {/* Üst satır */}
          <View style={styles.cardTop}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.modelAdi, { color: colors.text }]} numberOfLines={1}>
                {item.modelAdi || '-'}
              </Text>
              {item.modelKodu ? (
                <Text style={[styles.modelKodu, { color: colors.textSecondary }]}>
                  {item.modelKodu}
                </Text>
              ) : null}
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.adet, { color: islemColor }]}>
                {item.adet} {item.birim || 'adet'}
              </Text>
              <View style={[styles.expandBtn, isExpanded && { backgroundColor: colors.primary + '15' }]}>
                <Icon
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={isExpanded ? colors.primary : colors.textSecondary}
                />
              </View>
            </View>
          </View>

          {/* Chip satırı */}
          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: islemColor + '18' }]}>
              <Icon name="construct-outline" size={11} color={islemColor} />
              <Text style={[styles.chipText, { color: islemColor }]}>{item.islemTuru}</Text>
            </View>
            {durumConfig && (
              <View style={[styles.chip, { backgroundColor: durumConfig.color + '18' }]}>
                <Icon name={durumConfig.icon} size={11} color={durumConfig.color} />
                <Text style={[styles.chipText, { color: durumConfig.color }]}>{durumConfig.label}</Text>
              </View>
            )}
            <Text style={[styles.tarih, { color: colors.textTertiary }]}>{formatTarih(item.tarih)}</Text>
          </View>

          {/* Detay (genişletilmiş) */}
          {isExpanded && (
            <View style={styles.detayBox}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <DetailRow icon="receipt-outline" label="Fiş No" value={item.fisNo} colors={colors} />
              <DetailRow icon="calendar-outline" label="Tarih" value={formatTarih(item.tarih)} colors={colors} />
              <DetailRow icon="construct-outline" label="İşlem Türü" value={item.islemTuru} colors={colors} />
              <DetailRow icon="shirt-outline" label="Model" value={item.modelAdi} colors={colors} />
              {item.modelKodu && (
                <DetailRow icon="barcode-outline" label="Model Kodu" value={item.modelKodu} colors={colors} />
              )}
              <DetailRow
                icon="cube-outline"
                label="Miktar"
                value={`${item.adet} ${item.birim || 'adet'}`}
                colors={colors}
              />
              {item.personelAdi && (
                <DetailRow icon="person-outline" label="Personel" value={item.personelAdi} colors={colors} />
              )}
              {item.aciklama && (
                <View style={[styles.aciklamaBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                  <Icon name="information-circle-outline" size={15} color={colors.textSecondary} />
                  <Text style={[styles.aciklamaText, { color: colors.text }]}>{item.aciklama}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Üretim İşlemleri"
          leftButton={<BackButton onPress={onGoBack} />}
          rightButton={
            <Pressable
              style={styles.searchToggle}
              onPress={() => {
                setSearchVisible(v => !v);
                if (searchVisible) handleSearch('');
              }}
            >
              <Icon
                name={searchVisible ? 'close-outline' : 'search-outline'}
                size={22}
                color={colors.text}
              />
            </Pressable>
          }
          showMenu
          onLogout={handleLogout}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          {/* Arama */}
          {searchVisible && (
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Icon name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Model, fiş no veya personel ara..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
            </View>
          )}

          {/* Başlık */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleRow}>
              <View style={[styles.pageTitleIcon, { backgroundColor: '#10B98115' }]}>
                <Icon name="construct-outline" size={18} color="#10B981" />
              </View>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Üretim İşlemleri</Text>
            </View>
            {!loading && !error && (
              <Text style={[styles.countText, { color: colors.textSecondary }]}>
                {filtered.length} kayıt
              </Text>
            )}
          </View>

          {/* İçerik */}
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <View style={styles.errorWrap}>
              <EmptyState icon="alert-circle-outline" title="Hata" subtitle={error} />
              <Pressable
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}
              >
                <Icon name="refresh-outline" size={18} color="#fff" />
                <Text style={styles.retryBtnText}>Tekrar Dene</Text>
              </Pressable>
            </View>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="construct-outline"
              title="İşlem Bulunamadı"
              subtitle={searchQuery ? 'Aramanızla eşleşen üretim işlemi bulunamadı.' : 'Henüz üretim işlemi kaydı bulunmuyor.'}
            />
          ) : (
            <View style={{ gap: 8 }}>
              {filtered.map(renderCard)}
            </View>
          )}
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

function DetailRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={detailStyles.row}>
      <View style={detailStyles.left}>
        <Icon name={icon} size={15} color={colors.textSecondary} />
        <Text style={[detailStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[detailStyles.value, { color: colors.text }]} numberOfLines={2}>
        {value || '-'}
      </Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  label: { fontSize: 13, fontWeight: '500' },
  value: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
});

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },

    searchToggle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 44,
      marginBottom: 14,
    },
    searchInput: { flex: 1, fontSize: 14 },

    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageTitleIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    pageTitle: { fontSize: 16, fontWeight: '700', opacity: 0.6 },
    countText: { fontSize: 13, fontWeight: '500' },

    card: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    cardAccent: { width: 4 },
    cardBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    cardTitleRow: { flex: 1 },
    modelAdi: { fontSize: 14, fontWeight: '700' },
    modelKodu: { fontSize: 12, marginTop: 2 },
    cardRight: { alignItems: 'flex-end', gap: 6 },
    adet: { fontSize: 15, fontWeight: '700' },
    expandBtn: {
      width: 30, height: 22, borderRadius: 6,
      backgroundColor: 'transparent',
      alignItems: 'center', justifyContent: 'center',
    },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    chipText: { fontSize: 11, fontWeight: '600' },
    tarih: { fontSize: 11, marginLeft: 'auto' },

    detayBox: { marginTop: 8 },
    divider: { height: 1, marginBottom: 8 },
    aciklamaBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 10,
      padding: 10,
      borderRadius: 8,
    },
    aciklamaText: { fontSize: 13, lineHeight: 18, flex: 1 },

    errorWrap: { alignItems: 'center' },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 16,
    },
    retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  });
