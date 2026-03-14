import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { useAlert } from '../contexts/AlertContext';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import BackButton from '../components/BackButton';
import AddButton from '../components/AddButton';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';
import Input from '../components/Input';
import SelectInput, { SelectItem } from '../components/SelectInput';
import TanimSelectInput from '../components/TanimSelectInput';
import TabBar, { TabName } from '../components/TabBar';
import DateFilter, { DatePreset } from '../components/DateFilter';
import DateTimePicker from '@react-native-community/datetimepicker';
import reservationsService, {
  ReservationItem,
  ReservationStats,
  ReservationDurum,
  LookupItem,
} from '../services/reservations.service';
import { authService } from '../services/auth.service';

type DurumFilter = 'all' | '0' | '1' | '2' | '3';

const DURUM_MAP: Record<number, { label: string; color: string; icon: string }> = {
  0: { label: 'Beklenen', color: '#F59E0B', icon: 'time-outline' },
  1: { label: 'İçerde', color: '#3B82F6', icon: 'enter-outline' },
  2: { label: 'Çıktı', color: '#10B981', icon: 'exit-outline' },
  3: { label: 'İptal', color: '#EF4444', icon: 'close-circle-outline' },
};

const DURUM_FILTERS: { id: DurumFilter; label: string; color?: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: '0', label: 'Beklenen', color: '#F59E0B' },
  { id: '1', label: 'İçerde', color: '#3B82F6' },
  { id: '2', label: 'Çıktı', color: '#10B981' },
  { id: '3', label: 'İptal', color: '#EF4444' },
];

interface ReservationsScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function ReservationsScreen({ onGoBack, onTabChange, onLogout }: ReservationsScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, logout, notificationCount } = useAuth();
  const { showError, showSuccess, showWarning, showInfo } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReservationItem[]>([]);
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [durumFilter, setDurumFilter] = useState<DurumFilter>('all');

  // Create / Edit modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<ReservationItem | null>(null);
  const [lookups, setLookups] = useState<{ acenteler: LookupItem[]; milliyetler: LookupItem[]; subeler: LookupItem[] }>({ acenteler: [], milliyetler: [], subeler: [] });

  // Create form fields
  const [formTarih, setFormTarih] = useState('');
  const [formTarihDate, setFormTarihDate] = useState(new Date());
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);
  const [formBeklenenPax, setFormBeklenenPax] = useState('');
  const [formBeklenenCocukPax, setFormBeklenenCocukPax] = useState('');
  const [formBeklenenSaat, setFormBeklenenSaat] = useState('');
  const [formInfocu, setFormInfocu] = useState('');
  const [formGirisNotu, setFormGirisNotu] = useState('');
  const [formSelectedAcente, setFormSelectedAcente] = useState<string>('');
  const [formSelectedRehber, setFormSelectedRehber] = useState<string>('');
  const [formSelectedMilliyet, setFormSelectedMilliyet] = useState<string>('');
  const [formSelectedSube, setFormSelectedSube] = useState<string>('');


  // Giriş modal
  const [showGirisModal, setShowGirisModal] = useState(false);
  const [girisItem, setGirisItem] = useState<ReservationItem | null>(null);
  const [girisKartNo, setGirisKartNo] = useState('');
  const [girisGelenPax, setGirisGelenPax] = useState('');
  const [girisGelenCocukPax, setGirisGelenCocukPax] = useState('');
  const [girisSaat, setGirisSaat] = useState('');
  const [girisNotu, setGirisNotu] = useState('');
  const [isGirisLoading, setIsGirisLoading] = useState(false);

  // Çıkış modal
  const [showCikisModal, setShowCikisModal] = useState(false);
  const [cikisItem, setCikisItem] = useState<ReservationItem | null>(null);
  const [cikisSaat, setCikisSaat] = useState('');
  const [cikisGelenPax, setCikisGelenPax] = useState('');
  const [cikisGelenCocukPax, setCikisGelenCocukPax] = useState('');
  const [cikisNotu, setCikisNotu] = useState('');
  const [isCikisLoading, setIsCikisLoading] = useState(false);

  // İptal modal
  const [showIptalModal, setShowIptalModal] = useState(false);
  const [iptalItem, setIptalItem] = useState<ReservationItem | null>(null);
  const [iptalNedeni, setIptalNedeni] = useState('');
  const [isIptalLoading, setIsIptalLoading] = useState(false);

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

  const acenteItems: SelectItem[] = useMemo(
    () => lookups.acenteler.map((a) => ({ id: a.id, label: a.unvan || '' })),
    [lookups.acenteler],
  );

  const subeItems: SelectItem[] = useMemo(
    () => lookups.subeler.map((s) => ({ id: s.id, label: s.name || '' })),
    [lookups.subeler],
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');

      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) {
        setData([]);
        setStats(null);
        return;
      }

      const response = await reservationsService.getList(token, dataName, {
        startDate: formatDateISO(startDate),
        endDate: formatDateISO(endDate),
        durum: null,
      });

      if (response.success && response.data) {
        setData(response.data.items || []);
        setStats(response.data.stats || null);
      } else {
        setData([]);
        setStats(null);
      }
    } catch (err: any) {
      setError(err.message || 'Veriler yüklenemedi');
      setData([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchLookups = useCallback(async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;

      const response = await reservationsService.getLookups(token, dataName);
      if (response.success && response.data) {
        setLookups({
          acenteler: response.data.acenteler || [],
          milliyetler: response.data.milliyetler || [],
          subeler: response.data.subeler || [],
        });
        // Varsayılan şubeyi seç
        const varsayilan = response.data.varsayilanSube || '';
        if (varsayilan) {
          setFormSelectedSube(varsayilan);
        } else if (response.data.subeler?.length === 1) {
          setFormSelectedSube(response.data.subeler[0].id);
        }
      }
    } catch (_err) {}
  }, [user]);


  const handleOpenCreateModal = () => {
    setEditingItem(null);
    const now = new Date();
    setFormTarihDate(now);
    setFormTarih(formatDateISO(now));
    setFormBeklenenPax('');
    setFormBeklenenCocukPax('');
    setFormBeklenenSaat('');
    setFormInfocu('');
    setFormGirisNotu('');
    setFormSelectedAcente('');
    setFormSelectedRehber('');
    setFormSelectedMilliyet('');
    setFormSelectedSube('');
    fetchLookups();
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (item: ReservationItem) => {
    setEditingItem(item);
    const tarihDate = new Date(item.tarih + 'T00:00:00');
    setFormTarihDate(tarihDate);
    setFormTarih(item.tarih);
    setFormBeklenenPax(item.beklenenPax ? String(item.beklenenPax) : '');
    setFormBeklenenCocukPax(item.beklenenCocukPax ? String(item.beklenenCocukPax) : '');
    setFormBeklenenSaat(item.beklenenSaat || '');
    setFormInfocu(item.infocu || '');
    setFormGirisNotu(item.girisNotu || '');
    setFormSelectedAcente(item.acenteId || '');
    setFormSelectedRehber(item.rehberId || '');
    setFormSelectedMilliyet(item.milliyetId ? String(item.milliyetId) : '');
    setFormSelectedSube('');
    fetchLookups();
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formTarih) {
      showError('Tarih alanı zorunludur');
      return;
    }

    setIsCreating(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');

      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) throw new Error('Firma bilgisi bulunamadı');

      if (editingItem) {
        await reservationsService.update(token, dataName, {
          rezervasyonId: editingItem.id,
          tarih: formTarih,
          acenteId: formSelectedAcente ? parseInt(formSelectedAcente) : 0,
          rehberId: formSelectedRehber ? parseInt(formSelectedRehber) : 0,
          beklenenPax: formBeklenenPax ? parseInt(formBeklenenPax) : 0,
          beklenenCocukPax: formBeklenenCocukPax ? parseInt(formBeklenenCocukPax) : 0,
          beklenenSaat: formBeklenenSaat || undefined,
          milliyetId: formSelectedMilliyet ? parseInt(formSelectedMilliyet) : 0,
          girisNotu: formGirisNotu || '',
          infocu: formInfocu || '',
        });
      } else {
        await reservationsService.create(token, dataName, {
          tarih: formTarih,
          subeId: formSelectedSube ? parseInt(formSelectedSube) : undefined,
          acenteId: formSelectedAcente ? parseInt(formSelectedAcente) : 0,
          rehberId: formSelectedRehber ? parseInt(formSelectedRehber) : 0,
          beklenenPax: formBeklenenPax ? parseInt(formBeklenenPax) : 0,
          beklenenCocukPax: formBeklenenCocukPax ? parseInt(formBeklenenCocukPax) : 0,
          beklenenSaat: formBeklenenSaat || undefined,
          milliyetId: formSelectedMilliyet ? parseInt(formSelectedMilliyet) : 0,
          girisNotu: formGirisNotu || '',
          infocu: formInfocu || '',
        });
      }

      setShowCreateModal(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || (editingItem ? 'Rezervasyon güncellenemedi' : 'Rezervasyon oluşturulamadı'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (item: ReservationItem, newDurum: ReservationDurum) => {
    // Giriş yapılırken form aç
    if (newDurum === 1) {
      setGirisItem(item);
      setGirisGelenPax(String(item.beklenenPax));
      setGirisGelenCocukPax(String(item.beklenenCocukPax));
      setGirisKartNo('');
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setGirisSaat(`${h}:${m}`);
      setGirisNotu('');
      setShowGirisModal(true);
      return;
    }

    // Çıkış yapılırken form aç
    if (newDurum === 2) {
      setCikisItem(item);
      setCikisGelenPax(String(item.gelenPax || item.beklenenPax));
      setCikisGelenCocukPax(String(item.gelenCocukPax || item.beklenenCocukPax));
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setCikisSaat(`${h}:${m}`);
      setCikisNotu('');
      setShowCikisModal(true);
      return;
    }

    // İptal yapılırken neden sor
    if (newDurum === 3) {
      setIptalItem(item);
      setIptalNedeni('');
      setShowIptalModal(true);
      return;
    }

    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;

      await reservationsService.update(token, dataName, {
        rezervasyonId: item.id,
        durum: newDurum,
      });
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Durum güncellenemedi');
    }
  };

  const handleGirisSubmit = async () => {
    if (!girisItem) return;
    setIsGirisLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;

      await reservationsService.update(token, dataName, {
        rezervasyonId: girisItem.id,
        durum: 1,
        girisSaati: girisSaat || undefined,
        kartNo: girisKartNo || undefined,
        gelenPax: girisGelenPax ? parseInt(girisGelenPax) : undefined,
        gelenCocukPax: girisGelenCocukPax ? parseInt(girisGelenCocukPax) : undefined,
        girisNotu: girisNotu || undefined,
      });
      setShowGirisModal(false);
      setGirisItem(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Giriş yapılamadı');
    } finally {
      setIsGirisLoading(false);
    }
  };

  const handleCikisSubmit = async () => {
    if (!cikisItem) return;
    setIsCikisLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;

      await reservationsService.update(token, dataName, {
        rezervasyonId: cikisItem.id,
        durum: 2,
        cikisSaati: cikisSaat || undefined,
        gelenPax: cikisGelenPax ? parseInt(cikisGelenPax) : undefined,
        gelenCocukPax: cikisGelenCocukPax ? parseInt(cikisGelenCocukPax) : undefined,
        cikisNotu: cikisNotu || undefined,
      });
      setShowCikisModal(false);
      setCikisItem(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Çıkış yapılamadı');
    } finally {
      setIsCikisLoading(false);
    }
  };

  const handleIptalSubmit = async () => {
    if (!iptalItem) return;
    if (!iptalNedeni.trim()) {
      showError('İptal nedeni zorunludur');
      return;
    }
    setIsIptalLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;

      await reservationsService.update(token, dataName, {
        rezervasyonId: iptalItem.id,
        durum: 3,
        iptalNotu: iptalNedeni,
      });
      setShowIptalModal(false);
      setIptalItem(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'İptal yapılamadı');
    } finally {
      setIsIptalLoading(false);
    }
  };

  // Frontend filtreleme
  const filteredData = data.filter((item) => {
    // Durum filtresi
    if (durumFilter !== 'all' && item.durum !== parseInt(durumFilter)) return false;
    // Arama filtresi
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      item.acenteAdi.toLowerCase().includes(q) ||
      item.rehberAdi.toLowerCase().includes(q) ||
      item.milliyetAdi.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
  };

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCardId(prev => prev === cardId ? null : cardId);
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

  const getDurumInfo = (durum: number) => {
    return DURUM_MAP[durum] || { label: 'Bilinmiyor', color: colors.textSecondary, icon: 'help-circle-outline' };
  };

  // ─── Özet Kartları ───
  const renderSummary = () => {
    if (!stats) return null;
    const totalRez = stats.totalBeklenen + stats.totalIcerde + stats.totalCikti + stats.totalIptal;
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="stats-chart-outline" size={16} color={colors.primary} />
            <Text style={styles.summaryTitle}>Özet</Text>
          </View>
          <Text style={styles.summarySubtext}>{totalRez} Rezervasyon</Text>
        </View>

        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.summaryCardLabel}>Beklenen</Text>
            <Text style={[styles.summaryCardValue, { color: '#F59E0B' }]}>{stats.totalBeklenen}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#3B82F6' }]}>
            <Text style={styles.summaryCardLabel}>İçerde</Text>
            <Text style={[styles.summaryCardValue, { color: '#3B82F6' }]}>{stats.totalIcerde}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
            <Text style={styles.summaryCardLabel}>Çıktı</Text>
            <Text style={[styles.summaryCardValue, { color: '#10B981' }]}>{stats.totalCikti}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#EF4444' }]}>
            <Text style={styles.summaryCardLabel}>İptal</Text>
            <Text style={[styles.summaryCardValue, { color: '#EF4444' }]}>{stats.totalIptal}</Text>
          </View>
        </View>

        {/* Pax Özet Satırı */}
        {(() => {
          const bYetiskin = data.reduce((s, i) => s + i.beklenenPax, 0);
          const bCocuk = data.reduce((s, i) => s + i.beklenenCocukPax, 0);
          const gYetiskin = data.reduce((s, i) => s + i.gelenPax, 0);
          const gCocuk = data.reduce((s, i) => s + i.gelenCocukPax, 0);
          return (
            <View style={styles.paxSummaryRow}>
              <View style={styles.paxSummaryItem}>
                <Text style={styles.paxSummaryLabel}>Beklenen</Text>
                <View style={styles.paxSummaryIcons}>
                  <Icon name="people-outline" size={13} color={colors.textSecondary} />
                  <Text style={[styles.paxSummaryValue, { color: colors.text }]}>{bYetiskin}</Text>
                  {bCocuk > 0 && (
                    <>
                      <Text style={styles.paxSummaryPlus}>+</Text>
                      <Icon name="happy-outline" size={13} color={colors.textSecondary} />
                      <Text style={[styles.paxSummaryValue, { color: colors.text }]}>{bCocuk}</Text>
                    </>
                  )}
                </View>
              </View>
              <View style={styles.paxSummaryDivider} />
              <View style={styles.paxSummaryItem}>
                <Text style={styles.paxSummaryLabel}>Gelen</Text>
                <View style={styles.paxSummaryIcons}>
                  <Icon name="people-outline" size={13} color="#10B981" />
                  <Text style={[styles.paxSummaryValue, { color: '#10B981' }]}>{gYetiskin}</Text>
                  {gCocuk > 0 && (
                    <>
                      <Text style={styles.paxSummaryPlus}>+</Text>
                      <Icon name="happy-outline" size={13} color="#10B981" />
                      <Text style={[styles.paxSummaryValue, { color: '#10B981' }]}>{gCocuk}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        })()}
      </View>
    );
  };

  // ─── Durum Filtreleri ───
  const renderDurumFilters = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.durumFilterScroll} contentContainerStyle={styles.durumFilterContent}>
      {DURUM_FILTERS.map((f) => {
        const isActive = durumFilter === f.id;
        const count = f.id === 'all'
          ? data.length
          : data.filter(d => d.durum === parseInt(f.id)).length;
        return (
          <Pressable
            key={f.id}
            style={[
              styles.durumFilterChip,
              isActive && { backgroundColor: (f.color || colors.primary), borderColor: (f.color || colors.primary) },
            ]}
            onPress={() => setDurumFilter(f.id)}
          >
            {f.color && !isActive && (
              <View style={[styles.durumDot, { backgroundColor: f.color }]} />
            )}
            <Text style={[styles.durumFilterText, isActive && { color: '#FFF' }]}>
              {f.label}
            </Text>
            <View style={[styles.durumCountBadge, isActive && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Text style={[styles.durumCountText, isActive && { color: '#FFF' }]}>{count}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  // ─── Durum Aksiyon Butonları ───
  const renderStatusActions = (item: ReservationItem) => {
    const actions: { key: string; label: string; icon: string; color: string; onPress: () => void }[] = [];

    // Düzenle butonu — sadece beklenen ve içerde durumunda
    if (item.durum === 0 || item.durum === 1) {
      actions.push({ key: 'edit', label: 'Düzenle', icon: 'create-outline', color: colors.primary, onPress: () => handleOpenEditModal(item) });
    }

    if (item.durum === 0) {
      actions.push({ key: 'giris', label: 'Giriş', icon: 'enter-outline', color: '#3B82F6', onPress: () => handleStatusChange(item, 1) });
      actions.push({ key: 'iptal', label: 'İptal', icon: 'close-circle-outline', color: '#EF4444', onPress: () => handleStatusChange(item, 3) });
    } else if (item.durum === 1) {
      actions.push({ key: 'cikis', label: 'Çıkış', icon: 'exit-outline', color: '#10B981', onPress: () => handleStatusChange(item, 2) });
    }

    if (actions.length === 0) return null;

    return (
      <View style={styles.statusActions}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            style={[styles.statusActionBtn, { backgroundColor: action.color + '12', borderColor: action.color + '30' }]}
            onPress={action.onPress}
          >
            <Icon name={action.icon} size={16} color={action.color} />
            <Text style={[styles.statusActionText, { color: action.color }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  // ─── Rezervasyon Kartı ───
  const renderCard = (item: ReservationItem) => {
    const durumInfo = getDurumInfo(item.durum);
    const isExpanded = expandedCardId === item.id;
    const totalBeklenen = item.beklenenPax + item.beklenenCocukPax;
    const totalGelen = item.gelenPax + item.gelenCocukPax;

    return (
      <Pressable key={item.id} style={styles.card} onPress={() => toggleCardExpansion(item.id)}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.durumIndicator, { backgroundColor: durumInfo.color }]} />
            <View style={styles.cardTitleArea}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.acenteAdi || 'Acente Belirtilmedi'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {item.rehberAdi ? `${item.rehberAdi} · ` : ''}{formatDate(item.tarih)}
              </Text>
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={[styles.durumBadge, { backgroundColor: durumInfo.color + '15' }]}>
              <View style={styles.durumBadgeRow}>
                <Icon name={durumInfo.icon} size={12} color={durumInfo.color} />
                <Text style={[styles.durumBadgeText, { color: durumInfo.color }]}>{durumInfo.label}</Text>
              </View>
              {item.infocu ? (
                <Text style={[styles.durumBadgeInfocu, { color: durumInfo.color }]} numberOfLines={1}>{item.infocu}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Card Body — Pax & Info */}
        <View style={styles.cardBody}>
          <View style={styles.cardInfoRow}>
            {/* Saat */}
            {item.beklenenSaat ? (
              <View style={styles.cardInfoChip}>
                <Icon name="time-outline" size={13} color={colors.primary} />
                <Text style={[styles.cardInfoChipText, { color: colors.primary }]}>{formatTime(item.beklenenSaat)}</Text>
              </View>
            ) : null}
            {/* Milliyet */}
            {item.milliyetAdi ? (
              <View style={styles.cardInfoChip}>
                <Icon name="flag-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.cardInfoChipText}>{item.milliyetAdi}</Text>
              </View>
            ) : null}
            {/* Pax */}
            <View style={styles.cardInfoChip}>
              <Icon name="people-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.cardInfoChipText}>{item.beklenenPax}</Text>
              {item.beklenenCocukPax > 0 && (
                <>
                  <Text style={[styles.cardInfoChipText, { color: colors.textSecondary }]}>+</Text>
                  <Icon name="happy-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.cardInfoChipText}>{item.beklenenCocukPax}</Text>
                </>
              )}
            </View>
          </View>

          {/* Gelen Pax Bar (sadece gelen varsa) */}
          {totalGelen > 0 && (
            <View style={styles.paxBarContainer}>
              <View style={styles.paxBarLabelRow}>
                <Text style={styles.paxBarLabel}>Gelen: {totalGelen}/{totalBeklenen}</Text>
                <Text style={[styles.paxBarPercent, { color: '#10B981' }]}>
                  %{totalBeklenen > 0 ? Math.round((totalGelen / totalBeklenen) * 100) : 0}
                </Text>
              </View>
              <View style={styles.paxBarTrack}>
                <View
                  style={[
                    styles.paxBarFill,
                    { width: `${totalBeklenen > 0 ? Math.min((totalGelen / totalBeklenen) * 100, 100) : 0}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedArea}>
            <View style={styles.detailGrid}>
              {item.girisSaati ? (
                <View style={styles.detailItem}>
                  <Icon name="enter-outline" size={14} color="#3B82F6" />
                  <Text style={styles.detailItemLabel}>Giriş</Text>
                  <Text style={styles.detailItemValue}>{formatTime(item.girisSaati)}</Text>
                </View>
              ) : null}
              {item.cikisSaati ? (
                <View style={styles.detailItem}>
                  <Icon name="exit-outline" size={14} color="#10B981" />
                  <Text style={styles.detailItemLabel}>Çıkış</Text>
                  <Text style={styles.detailItemValue}>{formatTime(item.cikisSaati)}</Text>
                </View>
              ) : null}
              {item.kartNo ? (
                <View style={styles.detailItem}>
                  <Icon name="card-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailItemLabel}>Kart No</Text>
                  <Text style={styles.detailItemValue}>{item.kartNo}</Text>
                </View>
              ) : null}
              {item.fisNo > 0 && (
                <View style={styles.detailItem}>
                  <Icon name="receipt-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailItemLabel}>Fiş No</Text>
                  <Text style={styles.detailItemValue}>{item.fisNo}</Text>
                </View>
              )}
            </View>

            {/* Notlar */}
            {item.girisNotu ? (
              <View style={styles.noteRow}>
                <Icon name="chatbubble-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.noteText}>{item.girisNotu}</Text>
              </View>
            ) : null}
            {item.cikisNotu ? (
              <View style={styles.noteRow}>
                <Icon name="chatbubble-outline" size={13} color="#10B981" />
                <Text style={[styles.noteText, { color: '#10B981' }]}>{item.cikisNotu}</Text>
              </View>
            ) : null}
            {item.iptalNotu ? (
              <View style={styles.noteRow}>
                <Icon name="alert-circle-outline" size={13} color="#EF4444" />
                <Text style={[styles.noteText, { color: '#EF4444' }]}>{item.iptalNotu}</Text>
              </View>
            ) : null}

            {/* Status Actions */}
            {renderStatusActions(item)}
          </View>
        )}
      </Pressable>
    );
  };

  // ─── Create Modal ───
  const renderCreateModal = () => (
    <BottomSheet
      visible={showCreateModal}
      onClose={() => { setShowCreateModal(false); setEditingItem(null); }}
      title={editingItem ? 'Rezervasyon Düzenle' : 'Yeni Rezervasyon'}
      icon={editingItem ? 'create-outline' : 'add-circle-outline'}
      footer={
        <>
          <Button
            text="İptal"
            variant="secondary"
            onPress={() => { setShowCreateModal(false); setEditingItem(null); }}
            icon="close-outline"
            style={{ flex: 1 }}
          />
          <Button
            text={editingItem ? 'Güncelle' : 'Kaydet'}
            variant="primary"
            onPress={handleSave}
            icon="checkmark-outline"
            loading={isCreating}
            style={{ flex: 1 }}
          />
        </>
      }
    >
      {/* Tarih */}
      <View style={styles.formFieldContainer}>
        <Text style={styles.formLabel}>Tarih *</Text>
        <Pressable
          style={styles.datePickerBtn}
          onPress={() => setShowFormDatePicker(!showFormDatePicker)}
        >
          <Icon name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.datePickerText}>{formatDateStr(formTarihDate)}</Text>
          <Icon name={showFormDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
        </Pressable>
        {showFormDatePicker && (
          <View style={styles.inlineDatePicker}>
            <DateTimePicker
              value={formTarihDate}
              mode="date"
              display="inline"
              onChange={(_event: any, date?: Date) => {
                if (date) {
                  setFormTarihDate(date);
                  setFormTarih(formatDateISO(date));
                  setShowFormDatePicker(false);
                }
              }}
              locale="tr-TR"
              themeVariant={isDark ? 'dark' : 'light'}
            />
          </View>
        )}
      </View>

      {/* Beklenen Saat + İnfocu */}
      <View style={styles.formRow}>
        <View style={styles.formHalf}>
          <Input
            label="Beklenen Saat"
            icon="time-outline"
            value={formBeklenenSaat}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '').slice(0, 4);
              if (digits.length <= 2) {
                setFormBeklenenSaat(digits);
              } else {
                setFormBeklenenSaat(`${digits.slice(0, 2)}:${digits.slice(2)}`);
              }
            }}
            placeholder="HH:MM"
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <View style={styles.formHalf}>
          <Input
            label="İnfocu"
            icon="person-circle-outline"
            value={formInfocu}
            onChangeText={setFormInfocu}
            placeholder="Personel adı"
          />
        </View>
      </View>

      {/* PAX */}
      <View style={styles.formRow}>
        <View style={styles.formHalf}>
          <Input
            label="Yetişkin"
            icon="person-outline"
            value={formBeklenenPax}
            onChangeText={setFormBeklenenPax}
            placeholder="0"
            keyboardType="numeric"
            textAlign="right"
          />
        </View>
        <View style={styles.formHalf}>
          <Input
            label="Çocuk"
            icon="happy-outline"
            value={formBeklenenCocukPax}
            onChangeText={setFormBeklenenCocukPax}
            placeholder="0"
            keyboardType="numeric"
            textAlign="right"
          />
        </View>
      </View>

      {/* Milliyet + Şube */}
      <View style={styles.formRow}>
        <View style={styles.formHalf}>
          <TanimSelectInput
            tanimKodu="MILLIYET"
            label="Milliyet"
            placeholder="Seçiniz"
            value={formSelectedMilliyet}
            onSelect={setFormSelectedMilliyet}
            useDbId
          />
        </View>
        <View style={styles.formHalf}>
          <SelectInput
            label="Şube"
            icon="storefront-outline"
            placeholder="Şube seçiniz"
            value={formSelectedSube}
            items={subeItems}
            onSelect={setFormSelectedSube}
            searchPlaceholder="Şube ara..."
          />
        </View>
      </View>

      {/* Acente Seçimi */}
      <SelectInput
        label="Acente"
        icon="business-outline"
        placeholder="Acente seçiniz..."
        value={formSelectedAcente}
        items={acenteItems}
        onSelect={setFormSelectedAcente}
        searchPlaceholder="Acente ara..."
      />

      {/* Rehber Seçimi */}
      <SelectInput
        label="Rehber"
        icon="person-outline"
        placeholder="Rehber seçiniz..."
        value={formSelectedRehber}
        items={acenteItems}
        onSelect={setFormSelectedRehber}
        searchPlaceholder="Rehber ara..."
      />

      {/* Not */}
      <Input
        label="Not"
        icon="document-text-outline"
        value={formGirisNotu}
        onChangeText={setFormGirisNotu}
        placeholder="Rezervasyon notu..."
        multiline
        numberOfLines={3}
      />
    </BottomSheet>
  );

  // ─── Giriş Modal ───
  const renderGirisModal = () => (
    <BottomSheet
      visible={showGirisModal}
      onClose={() => setShowGirisModal(false)}
      title={`Giriş — ${girisItem?.acenteAdi || ''}`}
      icon="enter-outline"
      iconColor="#3B82F6"
      footer={
        <>
          <Button
            text="İptal"
            variant="secondary"
            onPress={() => setShowGirisModal(false)}
            icon="close-outline"
            style={{ flex: 1 }}
          />
          <Button
            text="Giriş Yap"
            variant="primary"
            onPress={handleGirisSubmit}
            icon="enter-outline"
            loading={isGirisLoading}
            style={{ flex: 1 }}
          />
        </>
      }
    >
      {/* Giriş Saati */}
      <Input
        label="Giriş Saati"
        icon="time-outline"
        value={girisSaat}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '').slice(0, 4);
          if (digits.length <= 2) {
            setGirisSaat(digits);
          } else {
            setGirisSaat(`${digits.slice(0, 2)}:${digits.slice(2)}`);
          }
        }}
        placeholder="HH:MM"
        keyboardType="numeric"
        maxLength={5}
      />

      {/* Kart No */}
      <Input
        label="Kart No"
        icon="card-outline"
        value={girisKartNo}
        onChangeText={setGirisKartNo}
        placeholder="0"
        keyboardType="numeric"
        textAlign="right"
      />

      {/* Gelen Pax */}
      <View style={styles.formRow}>
        <View style={styles.formHalf}>
          <Input
            label="Gelen Yetişkin"
            icon="people-outline"
            value={girisGelenPax}
            onChangeText={setGirisGelenPax}
            placeholder="0"
            keyboardType="numeric"
            textAlign="right"
          />
        </View>
        <View style={styles.formHalf}>
          <Input
            label="Gelen Çocuk"
            icon="happy-outline"
            value={girisGelenCocukPax}
            onChangeText={setGirisGelenCocukPax}
            placeholder="0"
            keyboardType="numeric"
            textAlign="right"
          />
        </View>
      </View>

      {/* Giriş Notu */}
      <Input
        label="Giriş Notu"
        icon="chatbubble-outline"
        value={girisNotu}
        onChangeText={setGirisNotu}
        placeholder="Not ekle..."
        multiline
        numberOfLines={2}
      />
    </BottomSheet>
  );

  // ─── Çıkış Modal ───
  const renderCikisModal = () => (
    <BottomSheet
      visible={showCikisModal}
      onClose={() => setShowCikisModal(false)}
      title={`Çıkış — ${cikisItem?.acenteAdi || ''}`}
      icon="exit-outline"
      iconColor="#10B981"
      footer={
        <>
          <Button
            text="İptal"
            variant="secondary"
            onPress={() => setShowCikisModal(false)}
            icon="close-outline"
            style={{ flex: 1 }}
          />
          <Button
            text="Çıkış Yap"
            variant="primary"
            onPress={handleCikisSubmit}
            icon="exit-outline"
            loading={isCikisLoading}
            style={{ flex: 1 }}
          />
        </>
      }
    >
      {/* Çıkış Saati */}
      <Input
        label="Çıkış Saati"
        icon="time-outline"
        value={cikisSaat}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '').slice(0, 4);
          if (digits.length <= 2) {
            setCikisSaat(digits);
          } else {
            setCikisSaat(`${digits.slice(0, 2)}:${digits.slice(2)}`);
          }
        }}
        placeholder="HH:MM"
        keyboardType="numeric"
        maxLength={5}
      />

      {/* Pax Düzenleme */}
      <View style={styles.formRow}>
        <View style={styles.formHalf}>
          <Input
            label="Gelen Yetişkin"
            icon="people-outline"
            value={cikisGelenPax}
            onChangeText={setCikisGelenPax}
            placeholder="0"
            keyboardType="numeric"
            textAlign="right"
          />
        </View>
        <View style={styles.formHalf}>
          <Input
            label="Gelen Çocuk"
            icon="happy-outline"
            value={cikisGelenCocukPax}
            onChangeText={setCikisGelenCocukPax}
            placeholder="0"
            keyboardType="numeric"
            textAlign="right"
          />
        </View>
      </View>

      {/* Çıkış Notu */}
      <Input
        label="Çıkış Notu"
        icon="chatbubble-outline"
        value={cikisNotu}
        onChangeText={setCikisNotu}
        placeholder="Not ekle..."
        multiline
        numberOfLines={2}
      />
    </BottomSheet>
  );

  // ─── İptal Modal ───
  const renderIptalModal = () => (
    <BottomSheet
      visible={showIptalModal}
      onClose={() => setShowIptalModal(false)}
      title={`İptal — ${iptalItem?.acenteAdi || ''}`}
      icon="close-circle-outline"
      iconColor="#EF4444"
      footer={
        <>
          <Button
            text="Vazgeç"
            variant="secondary"
            onPress={() => setShowIptalModal(false)}
            icon="arrow-back-outline"
            style={{ flex: 1 }}
          />
          <Button
            text="İptal Et"
            variant="danger"
            onPress={handleIptalSubmit}
            icon="close-circle-outline"
            loading={isIptalLoading}
            style={{ flex: 1 }}
          />
        </>
      }
    >
      <Input
        label="İptal Nedeni *"
        icon="alert-circle-outline"
        value={iptalNedeni}
        onChangeText={setIptalNedeni}
        placeholder="İptal nedenini yazınız..."
        multiline
        numberOfLines={3}
      />
    </BottomSheet>
  );

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Rezervasyonlar"
          leftButton={<BackButton onPress={onGoBack} />}
          rightButton={
            <AddButton onPress={handleOpenCreateModal} />
          }
          showMenu={true}
          onLogout={handleLogout}
        />

        {/* Page Title */}
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleContainer}>
            <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.pageTitle}>Rezervasyonlar</Text>
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
            showSearch={true}
            searchValue={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder="Acente, rehber veya milliyet ara..."
          />
        </View>

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
        ) : filteredData.length === 0 && data.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
          >
            {renderSummary()}
            {renderDurumFilters()}

            {filteredData.length === 0 ? (
              <View style={styles.noFilterResult}>
                <Icon name="search-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.noFilterResultText}>Filtrele eşleşen rezervasyon bulunamadı</Text>
              </View>
            ) : (
              filteredData.map(renderCard)
            )}
          </ScrollView>
        )}

        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />

        {renderCreateModal()}
        {renderGirisModal()}
        {renderCikisModal()}
        {renderIptalModal()}

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
    pageSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
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
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 100,
    },

    // ─── Summary ───
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
      marginBottom: 10,
    },
    summaryTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
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
      fontSize: 18,
      fontWeight: '700',
    },
    paxSummaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
    paxSummaryItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    paxSummaryDivider: {
      width: 1,
      height: 20,
      backgroundColor: isDark ? colors.border : '#E2E8F0',
      marginHorizontal: 8,
    },
    paxSummaryLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    paxSummaryValue: {
      fontSize: 14,
      fontWeight: '700',
    },
    paxSummaryIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 2,
    },
    paxSummaryPlus: {
      fontSize: 12,
      color: colors.textSecondary,
    },

    // ─── Durum Filter ───
    durumFilterScroll: {
      marginBottom: 14,
    },
    durumFilterContent: {
      gap: 8,
    },
    durumFilterChip: {
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
    durumDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    durumFilterText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    durumCountBadge: {
      backgroundColor: isDark ? colors.background : '#F1F5F9',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
      minWidth: 22,
      alignItems: 'center',
    },
    durumCountText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },

    // ─── No Filter Result ───
    noFilterResult: {
      alignItems: 'center',
      paddingVertical: 40,
      gap: 10,
    },
    noFilterResultText: {
      fontSize: 13,
      color: colors.textSecondary,
    },

    // ─── Card ───
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
      alignItems: 'flex-start',
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },
    durumIndicator: {
      width: 4,
      height: 36,
      borderRadius: 2,
    },
    cardTitleArea: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardHeaderRight: {
      marginLeft: 8,
      alignItems: 'flex-end',
    },
    durumBadge: {
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    durumBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    durumBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    durumBadgeInfocu: {
      fontSize: 10,
      marginTop: 2,
    },

    // Card Body
    cardBody: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
    cardInfoRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    cardInfoChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
    },
    cardInfoChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },

    // Pax Progress Bar
    paxBarContainer: {
      marginTop: 10,
    },
    paxBarLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    paxBarLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    paxBarPercent: {
      fontSize: 11,
      fontWeight: '700',
    },
    paxBarTrack: {
      height: 6,
      backgroundColor: isDark ? colors.background : '#F1F5F9',
      borderRadius: 3,
      overflow: 'hidden',
    },
    paxBarFill: {
      height: '100%',
      backgroundColor: '#10B981',
      borderRadius: 3,
    },

    // ─── Expanded ───
    expandedArea: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
    detailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    detailItemLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    detailItemValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: 8,
    },
    noteText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
      flex: 1,
    },

    // ─── Status Actions ───
    statusActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    statusActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    statusActionText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // ─── Form ───
    formFieldContainer: {
      marginBottom: 12,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    datePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground || colors.card,
      borderWidth: 1.5,
      borderColor: colors.inputBorder || colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 52,
      gap: 10,
    },
    datePickerText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    inlineDatePicker: {
      marginTop: 8,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: isDark ? colors.background : colors.card,
    },
    formRow: {
      flexDirection: 'row',
      gap: 8,
    },
    formHalf: {
      flex: 1,
    },
    formThird: {
      flex: 1,
    },
  });
