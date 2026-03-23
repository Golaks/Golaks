import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
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
import SearchButton from '../components/SearchButton';
import AddButton from '../components/AddButton';
import TabBar, { TabName } from '../components/TabBar';
import DateFilter, { DatePreset } from '../components/DateFilter';
import InModalToast from '../components/InModalToast';
import { useFieldErrors } from '../hooks/useFieldErrors';
import SelectInput from '../components/SelectInput';
import DovizSelect from '../components/DovizSelect';
import DatePickerModal from '../components/DatePickerModal';
import TanimSelectInput from '../components/TanimSelectInput';
import BottomSheet, { BottomSheetToastRef } from '../components/BottomSheet';
import Input from '../components/Input';
import Button from '../components/Button';
import TabakhaneSiparisDetayForm from '../components/TabakhaneSiparisDetayForm';
import accountService from '../services/account.service';
import { authService } from '../services/auth.service';
import ordersService from '../services/orders.service';

interface TabakhaneSiparisScreenProps {
  onGoBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

const DERI_TIPI_OPTIONS = [
  { id: 'Kürk', label: 'Kürk' },
  { id: 'Zig', label: 'Zig' },
  { id: 'Vidala', label: 'Vidala' },
];

export default function TabakhaneSiparisScreen({
  onGoBack,
  onTabChange,
  onLogout,
}: TabakhaneSiparisScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, logout, notificationCount } = useAuth();
  const { showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  const [searchText, setSearchText] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [durumFilter, setDurumFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const formToastRef = useRef<BottomSheetToastRef | null>(null);

  // Sipariş Form State
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formEditingItem, setFormEditingItem] = useState<any | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formLookupsLoading, setFormLookupsLoading] = useState(false);
  const [formDeriTipi, setFormDeriTipi] = useState('');
  const lastDeriTipi = useRef('');
  const [formSiparisKodu, setFormSiparisKodu] = useState('');
  const [formDoviz, setFormDoviz] = useState('USD');
  const [formDovizTipleri, setFormDovizTipleri] = useState<any[]>([]);
  const [formCariId, setFormCariId] = useState('');
  const [formCariler, setFormCariler] = useState<any[]>([]);
  const [formTarih, setFormTarih] = useState(new Date());
  const [formTeslimTarihi, setFormTeslimTarihi] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [formTeslimSekliId, setFormTeslimSekliId] = useState('');
  const [formPaketlemeId, setFormPaketlemeId] = useState('');
  const [formSiparisGrubuId, setFormSiparisGrubuId] = useState('');
  const [formSiparisTipiId, setFormSiparisTipiId] = useState('');
  const [formSiparisiAlan, setFormSiparisiAlan] = useState('');
  const [formIndirimTipi, setFormIndirimTipi] = useState(-1);
  const [formIndirimDeger, setFormIndirimDeger] = useState('');
  const [formAvansRows, setFormAvansRows] = useState<{ tutar: string; doviz: string; dovizliTutar: string; cariIslendi: boolean; fisId?: number; fisNo?: string }[]>([]);
  const [formIndirimCariIslendi, setFormIndirimCariIslendi] = useState(false);
  const [formIndirimFisId, setFormIndirimFisId] = useState<number | undefined>(undefined);
  const [formIndirimFisNo, setFormIndirimFisNo] = useState<string | undefined>(undefined);
  const [formAciklama, setFormAciklama] = useState('');
  const [formTarihPickerVisible, setFormTarihPickerVisible] = useState(false);
  const [formTeslimTarihPickerVisible, setFormTeslimTarihPickerVisible] = useState(false);
  const formFieldErrors = useFieldErrors();

  // Detay Form State
  const [detayFormVisible, setDetayFormVisible] = useState(false);
  const [detayFormSiparis, setDetayFormSiparis] = useState<any | null>(null);

  // Cari ekleme state
  const [showCariForm, setShowCariForm] = useState(false);
  const [cariFormSaving, setCariFormSaving] = useState(false);
  const [cariFormUnvan, setCariFormUnvan] = useState('');
  const [cariFormKisaUnvan, setCariFormKisaUnvan] = useState('');
  const [cariFormHesapKodu, setCariFormHesapKodu] = useState('');
  const [cariFormDoviz, setCariFormDoviz] = useState('TL');
  const [cariFormSubeId, setCariFormSubeId] = useState(0);
  const cariFormFieldErrors = useFieldErrors();

  // Tarih filtreleri
  const getYearStart = () => new Date(new Date().getFullYear() - 2, 0, 1);
  const getTodayEnd = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };
  const [startDate, setStartDate] = useState<Date>(getYearStart());
  const [endDate, setEndDate] = useState<Date>(getTodayEnd());
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>('year');

  const styles = createStyles(colors, isDark);

  const formatDateStr = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${d}.${m}.${date.getFullYear()}`;
  };

  const formatDateDisplay = (date: Date) => {
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
    const end = new Date();
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

  const searchFilteredData = data.filter((item: any) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      (item.cariAdi || '').toLowerCase().includes(q) ||
      (item.siparisKodu || '').toLowerCase().includes(q)
    );
  });

  const filteredStats = {
    total: searchFilteredData.length,
    uretimde: searchFilteredData.filter((i: any) => i.durum === 'uretimde').length,
    beklemede: searchFilteredData.filter((i: any) => i.durum === 'beklemede').length,
    kapali: searchFilteredData.filter((i: any) => i.durum === 'kapali').length,
    iptal: searchFilteredData.filter((i: any) => i.durum === 'iptal').length,
  };

  const filteredData = durumFilter
    ? searchFilteredData.filter((item: any) => item.durum === durumFilter)
    : searchFilteredData;

  const formatAmount = (value: number) =>
    value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '0000-00-00') return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDurumInfo = (durum: string) => {
    switch (durum) {
      case 'uretimde': return { label: 'Üretim', color: '#3B82F6', icon: 'construct', bg: isDark ? '#3B82F620' : '#EFF6FF' };
      case 'kapali': return { label: 'Kapalı', color: '#6B7280', icon: 'lock-closed', bg: isDark ? '#6B728020' : '#F3F4F6' };
      case 'iptal': return { label: 'İptal', color: '#EF4444', icon: 'close-circle', bg: isDark ? '#EF444420' : '#FEF2F2' };
      default: return { label: 'Bekleme', color: '#F59E0B', icon: 'time', bg: isDark ? '#F59E0B20' : '#FFFBEB' };
    }
  };

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId);
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

  const fetchLookups = async (isNewOrder = false) => {
    setFormLookupsLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;
      const response = await ordersService.getLookups(token, dataName);
      if (response.success && response.data) {
        setFormDovizTipleri(response.data.dovizTipleri || []);
        setFormCariler(response.data.cariler || []);
        if (isNewOrder) {
          setFormSiparisKodu(response.data.nextSiparisKodu || '');
        }
      }
    } catch (_) {}
    finally {
      setFormLookupsLoading(false);
    }
  };

  const resetForm = () => {
    setFormDeriTipi(lastDeriTipi.current);
    setFormSiparisKodu('');
    setFormDoviz('USD');
    setFormCariId('');
    setFormTarih(new Date());
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setFormTeslimTarihi(d);
    setFormTeslimSekliId('');
    setFormPaketlemeId('');
    setFormSiparisGrubuId('');
    setFormSiparisTipiId('');
    setFormSiparisiAlan(user?.name || '');
    setFormIndirimTipi(-1);
    setFormIndirimDeger('');
    setFormIndirimCariIslendi(false);
    setFormIndirimFisId(undefined);
    setFormIndirimFisNo(undefined);
    setFormAvansRows([]);
    setFormAciklama('');
    formFieldErrors.clearAll();
  };

  const handleOpenEditForm = (item: any) => {
    setFormEditingItem(item);
    setFormDeriTipi(item.deriGrubu || '');
    setFormSiparisKodu(item.siparisKodu || '');
    setFormDoviz(item.doviz || 'USD');
    setFormCariId(item.carilerId != null && item.carilerId > 0 ? item.carilerId.toString() : '');
    setFormTarih(item.tarih ? new Date(item.tarih) : new Date());
    setFormTeslimTarihi(item.teslimTarihi ? new Date(item.teslimTarihi) : new Date());
    setFormTeslimSekliId(item.teslimSekliId ? item.teslimSekliId.toString() : '');
    setFormPaketlemeId(item.paketlemeId ? item.paketlemeId.toString() : '');
    setFormSiparisiAlan(item.siparisiAlan || user?.name || '');
    setFormSiparisGrubuId(item.siparisGrubuId && item.siparisGrubuId > 0 ? item.siparisGrubuId.toString() : '');
    setFormSiparisTipiId(item.siparisTipiId && item.siparisTipiId > 0 ? item.siparisTipiId.toString() : '');
    setFormIndirimTipi(item.masterAvansIndirim?.indirim?.tip ?? -1);
    setFormIndirimDeger(item.masterAvansIndirim?.indirim?.deger ? item.masterAvansIndirim.indirim.deger.toString() : '');
    setFormIndirimCariIslendi(item.masterAvansIndirim?.indirim?.cariIslendi ?? false);
    setFormIndirimFisId(item.masterAvansIndirim?.indirim?.fisId || undefined);
    setFormIndirimFisNo(item.masterAvansIndirim?.indirim?.fisNo || undefined);
    setFormAvansRows((item.masterAvansIndirim?.avans || []).map((a: any) => ({
      tutar: a.tutar.toString(),
      doviz: a.doviz,
      dovizliTutar: a.dovizliTutar ? a.dovizliTutar.toString() : '',
      cariIslendi: a.cariIslendi ?? false,
      fisId: a.fisId || undefined,
      fisNo: a.fisNo || undefined,
    })));
    setFormAciklama(item.aciklama || '');
    setFormModalVisible(true);
    fetchLookups();
  };

  const handleNewOrder = () => {
    resetForm();
    setFormEditingItem(null);
    setFormModalVisible(true);
    fetchLookups(true);
  };

  const handleOpenCariForm = () => {
    setCariFormUnvan('');
    setCariFormKisaUnvan('');
    setCariFormHesapKodu('');
    setCariFormDoviz('TL');
    cariFormFieldErrors.clearAll();
    setFormModalVisible(false);
    setTimeout(() => {
      setShowCariForm(true);
    }, 350);
    (async () => {
      try {
        const token = await authService.getToken();
        if (!token) return;
        const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
        const subeRes = await fetch(
          `${require('../config/env').BASE_URL}/user/subeler`,
          { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
        );
        const subeData = await subeRes.json();
        let subeId = 1;
        if (subeData.success && subeData.data) {
          subeId = subeData.data.varsayilanSube || subeData.data.subeler?.[0]?.id || 1;
        }
        setCariFormSubeId(subeId);
        const response = await accountService.getNextHesapKodu(token, dataName, 'customers', subeId);
        if (response.success && response.data.hesapKodu) {
          setCariFormHesapKodu(response.data.hesapKodu);
        }
      } catch (_) {}
    })();
  };

  const handleCloseCariForm = () => {
    setShowCariForm(false);
    setTimeout(() => setFormModalVisible(true), 350);
  };

  const handleSaveCari = async () => {
    if (!cariFormFieldErrors.validateRequired({
      unvan: cariFormUnvan.trim(),
      hesapKodu: cariFormHesapKodu.trim(),
    })) return;

    setCariFormSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const response = await accountService.createCari(token, dataName, {
        hesapKodu: cariFormHesapKodu.trim(),
        unvan: cariFormUnvan.trim(),
        kisaUnvan: cariFormKisaUnvan.trim(),
        doviz: cariFormDoviz,
        subeId: cariFormSubeId,
      });
      if (response.success && response.data) {
        const newCari = response.data as any;
        setFormCariler((prev: any[]) => [...prev, { id: newCari.id, unvan: newCari.unvan }]);
        setFormCariId(newCari.id.toString());
        formFieldErrors.clearFieldError('cari');
        setShowCariForm(false);
        setTimeout(() => setFormModalVisible(true), 350);
      } else {
        cariFormFieldErrors.setFieldError('unvan');
      }
    } catch (_) {
      cariFormFieldErrors.setFieldError('unvan');
    } finally {
      setCariFormSaving(false);
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) { setError('Firma veritabanı bilgisi bulunamadı'); return; }

      const response = await ordersService.getList(token, dataName, {
        modul: 'tabakhane',
        startDate: formatDateISO(startDate),
        endDate: formatDateISO(endDate),
        siparisTipi: 1,
      });

      if (response.success && response.data) {
        setData(response.data.items || []);
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

  const handleSaveOrder = async () => {
    const requiredFields: Record<string, string | null | undefined> = {
      deriTipi: formDeriTipi,
      siparisKodu: formSiparisKodu.trim(),
      cari: formCariId,
      doviz: formDoviz,
    };
    if (formIndirimTipi !== -1) requiredFields.indirimDeger = formIndirimDeger.trim();

    if (!formFieldErrors.validateRequired(requiredFields)) return;

    setFormSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      const orderData = {
        siparisKodu: formSiparisKodu,
        siparisModul: 'tabakhane',
        deriGrubu: formDeriTipi,
        siparisTipi: 1,
        carilerId: parseInt(formCariId, 10),
        teslimSekliId: formTeslimSekliId ? parseInt(formTeslimSekliId, 10) : 0,
        paketlemeId: formPaketlemeId ? parseInt(formPaketlemeId, 10) : 0,
        tarih: formatDateISO(formTarih),
        teslimTarihi: formatDateISO(formTeslimTarihi),
        doviz: formDoviz,
        aciklama: formAciklama,
        siparisGrubuId: formSiparisGrubuId ? parseInt(formSiparisGrubuId, 10) : 0,
        siparisTipiId: formSiparisTipiId ? parseInt(formSiparisTipiId, 10) : 0,
        siparisiAlan: formSiparisiAlan,
        masterAvansIndirim: {
          avans: formAvansRows.filter(r => r.tutar && parseFloat(r.tutar) > 0).map(r => ({
            tutar: parseFloat(r.tutar),
            doviz: r.doviz,
            dovizliTutar: r.dovizliTutar ? parseFloat(r.dovizliTutar) : 0,
            cariIslendi: r.cariIslendi,
            ...(r.fisId ? { fisId: r.fisId } : {}),
            ...(r.fisNo ? { fisNo: r.fisNo } : {}),
          })),
          indirim: {
            tip: formIndirimTipi,
            deger: formIndirimDeger ? parseFloat(formIndirimDeger) : 0,
            doviz: formDoviz,
            cariIslendi: formIndirimCariIslendi,
            ...(formIndirimFisId ? { fisId: formIndirimFisId } : {}),
            ...(formIndirimFisNo ? { fisNo: formIndirimFisNo } : {}),
          },
        },
      };

      if (formEditingItem) {
        const response = await ordersService.updateOrder(token, dataName, formEditingItem.id, orderData as any);
        if (response.success) {
          setFormModalVisible(false);
          setTimeout(() => showToast('success', 'Sipariş güncellendi'), 400);
          await fetchData();
        } else {
          formToastRef.current?.show({ type: 'error', text: response.message || 'Güncelleme başarısız' });
        }
      } else {
        const response = await ordersService.createOrder(token, dataName, orderData as any);
        if (response.success) {
          setFormModalVisible(false);
          setTimeout(() => showToast('success', `${(response.data as any)?.siparisKodu || 'Sipariş'} oluşturuldu`), 400);
          await fetchData();
        } else {
          formToastRef.current?.show({ type: 'error', text: response.message || 'Oluşturma başarısız' });
        }
      }
    } catch (err: any) {
      formToastRef.current?.show({ type: 'error', text: err.message || 'İşlem başarısız' });
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <>
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Tabakhane Siparişleri"
          leftButton={<BackButton onPress={onGoBack || (() => {})} />}
          showMenu={true}
          onLogout={handleLogout}
          rightButton={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AddButton onPress={handleNewOrder} />
              <SearchButton onPress={() => setFilterVisible(!filterVisible)} />
            </View>
          }
        />

        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleContainer}>
            <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="document-text" size={18} color={colors.primary} />
            </View>
            <Text style={styles.pageTitle}>Tabakhane Siparişleri</Text>
          </View>
        </View>

        {/* Filtre */}
        {filterVisible && (
          <View style={styles.filterCard}>
            <DateFilter
              startDate={formatDateDisplay(startDate)}
              endDate={formatDateDisplay(endDate)}
              startDateObj={startDate}
              endDateObj={endDate}
              selectedPreset={selectedPreset}
              onPresetChange={handlePresetChange}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              showSearch
              searchValue={searchText}
              onSearchChange={setSearchText}
              searchPlaceholder="Sipariş kodu, cari adı ara..."
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
        ) : data.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState icon="receipt-outline" title="Sipariş Bulunamadı" subtitle={searchText ? 'Aramanızla eşleşen sipariş bulunamadı.' : 'Seçilen tarih aralığında sipariş kaydı yok.'} />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, filteredData.length === 0 && { flexGrow: 1 }]}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
          >
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <Pressable style={[styles.statCard, { borderLeftColor: '#3B82F6' }, durumFilter === null && { borderColor: '#3B82F6', borderWidth: 1.5 }]} onPress={() => setDurumFilter(null)}>
                <Text style={styles.statLabel}>Toplam</Text>
                <Text style={[styles.statValue, { color: '#3B82F6' }]}>{filteredStats.total}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#10B981' }, durumFilter === 'uretimde' && { borderColor: '#10B981', borderWidth: 1.5 }]} onPress={() => setDurumFilter(durumFilter === 'uretimde' ? null : 'uretimde')}>
                <Text style={styles.statLabel}>Üretim</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{filteredStats.uretimde}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#F59E0B' }, durumFilter === 'beklemede' && { borderColor: '#F59E0B', borderWidth: 1.5 }]} onPress={() => setDurumFilter(durumFilter === 'beklemede' ? null : 'beklemede')}>
                <Text style={styles.statLabel}>Bekleme</Text>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{filteredStats.beklemede}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#6B7280' }, durumFilter === 'kapali' && { borderColor: '#6B7280', borderWidth: 1.5 }]} onPress={() => setDurumFilter(durumFilter === 'kapali' ? null : 'kapali')}>
                <Text style={styles.statLabel}>Kapalı</Text>
                <Text style={[styles.statValue, { color: '#6B7280' }]}>{filteredStats.kapali}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#EF4444' }, durumFilter === 'iptal' && { borderColor: '#EF4444', borderWidth: 1.5 }]} onPress={() => setDurumFilter(durumFilter === 'iptal' ? null : 'iptal')}>
                <Text style={styles.statLabel}>İptal</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>{filteredStats.iptal}</Text>
              </Pressable>
            </View>

            {/* Summary by Currency */}
            {(() => {
              const filteredSummary: Record<string, { currency: string; totalQuantity: number; totalAmount: number }> = {};
              filteredData.forEach((item: any) => {
                const key = item.doviz || 'TL';
                if (!filteredSummary[key]) filteredSummary[key] = { currency: key, totalQuantity: 0, totalAmount: 0 };
                filteredSummary[key].totalQuantity += item.miktar || 0;
                filteredSummary[key].totalAmount += item.tutar || 0;
              });
              const summaryList = Object.values(filteredSummary);
              if (summaryList.length === 0) return null;
              const isSummaryExpanded = expandedCardId === 'summary';
              return (
                <View style={styles.summaryContainer}>
                  <Pressable onPress={() => toggleCardExpansion('summary')}>
                    <View style={styles.summaryHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="wallet-outline" size={16} color={colors.primary} />
                        <Text style={[styles.summaryTitle, { color: colors.primary }]}>Sipariş Özeti</Text>
                      </View>
                      <View style={styles.summaryHeaderRight}>
                        <Text style={[styles.summarySubtext, { color: colors.textSecondary }]}>{filteredData.length} Sipariş</Text>
                        <Icon name={isSummaryExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                      </View>
                    </View>
                  </Pressable>
                  {isSummaryExpanded && (
                    <View style={styles.summaryDetail}>
                      <View style={styles.summaryDetailHeader}>
                        <Text style={[styles.summaryDetailHeaderCell, { flex: 1, color: colors.textSecondary }]}>DÖVİZ</Text>
                        <Text style={[styles.summaryDetailHeaderCell, { flex: 0.7, textAlign: 'right', color: colors.textSecondary }]}>ADET</Text>
                        <Text style={[styles.summaryDetailHeaderCell, { flex: 1.2, textAlign: 'right', color: colors.textSecondary }]}>TUTAR</Text>
                      </View>
                      {summaryList.map((s, i) => (
                        <View key={s.currency} style={[styles.summaryDetailRow, i % 2 === 0 && styles.summaryDetailRowAlt]}>
                          <View style={{ flex: 1 }}>
                            <View style={[styles.currencyBadge, { backgroundColor: `${colors.primary}15` }]}>
                              <Text style={[styles.currencyBadgeText, { color: colors.primary }]}>{s.currency}</Text>
                            </View>
                          </View>
                          <Text style={[styles.summaryDetailValue, { flex: 0.7, color: colors.text }]}>{s.totalQuantity.toLocaleString('tr-TR')}</Text>
                          <Text style={[styles.summaryDetailValue, { flex: 1.2, color: '#10B981' }]}>{formatAmount(s.totalAmount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Filtre sonucu boş */}
            {filteredData.length === 0 && (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="filter-outline" size={40} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 14 }}>Bu durumda sipariş bulunamadı</Text>
                <Pressable onPress={() => setDurumFilter(null)} style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Tümünü Göster</Text>
                </Pressable>
              </View>
            )}

            {/* Order List */}
            {filteredData.map((item: any) => {
              const durumInfo = getDurumInfo(item.durum);
              const isExpanded = expandedCardId === item.id;
              return (
                <Pressable key={item.id} style={[styles.card, isExpanded && { borderColor: colors.primary + '40' }]} onPress={() => toggleCardExpansion(item.id)}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.durumDot, { backgroundColor: durumInfo.color }]} />
                      <View style={styles.cardTitleContainer}>
                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.cariAdi || '-'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{item.siparisKodu || '-'}</Text>
                          <Text style={[styles.cardSubtitle, { color: colors.textSecondary, opacity: 0.5 }]}>·</Text>
                          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{formatDate(item.tarih)}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={styles.cardAmount}>{formatAmount(item.tutar || 0)} <Text style={[styles.cardCurrency, { color: colors.textSecondary }]}>{item.doviz}</Text></Text>
                      {item.masterAvansIndirim?.avans && item.masterAvansIndirim.avans.length > 0 ? (() => {
                        const topAvans = item.masterAvansIndirim.avans.reduce((s: number, a: any) => s + (a.dovizliTutar || a.tutar), 0);
                        return topAvans > 0 ? (
                          <Text style={{ fontSize: 11, color: '#3B82F6', textAlign: 'right', marginTop: 2 }}>
                            Avans: {formatAmount(topAvans)} {item.doviz}
                          </Text>
                        ) : null;
                      })() : null}
                      {item.masterAvansIndirim?.indirim && item.masterAvansIndirim.indirim.tip !== -1 && item.masterAvansIndirim.indirim.deger > 0 ? (
                        <Text style={{ fontSize: 11, color: '#EF4444', textAlign: 'right', marginTop: 2 }}>
                          İnd. {item.masterAvansIndirim.indirim.tip === 0 ? `%${item.masterAvansIndirim.indirim.deger}` : `${formatAmount(item.masterAvansIndirim.indirim.deger)} ${item.masterAvansIndirim.indirim.doviz || item.doviz}`}
                        </Text>
                      ) : null}
                      {(() => {
                        const avansTop = (item.masterAvansIndirim?.avans || []).reduce((s: number, a: any) => s + (a.dovizliTutar || a.tutar), 0);
                        const ind = item.masterAvansIndirim?.indirim;
                        const indTutar = ind && ind.tip !== -1 && ind.deger > 0
                          ? (ind.tip === 0 ? (item.tutar || 0) * ind.deger / 100 : ind.deger)
                          : 0;
                        const kalan = (item.tutar || 0) - indTutar - avansTop;
                        return (avansTop > 0 || indTutar > 0) ? (
                          <Text style={{ fontSize: 12, fontWeight: '700', color: kalan >= 0 ? '#10B981' : '#EF4444', textAlign: 'right', marginTop: 3 }}>
                            Kalan: {formatAmount(kalan)} {item.doviz}
                          </Text>
                        ) : null;
                      })()}
                    </View>
                  </View>

                  {/* Quick Info Row */}
                  <View style={styles.quickInfoRow}>
                    {item.deriGrubu ? (() => {
                      const deriInfo = item.deriGrubu === 'Kürk'
                        ? { color: '#8B5CF6', bg: isDark ? '#8B5CF620' : '#F5F3FF', icon: 'paw-outline' }
                        : item.deriGrubu === 'Zig'
                        ? { color: '#F59E0B', bg: isDark ? '#F59E0B20' : '#FFFBEB', icon: 'flash-outline' }
                        : { color: '#EC4899', bg: isDark ? '#EC489920' : '#FDF2F8', icon: 'construct-outline' };
                      return (
                        <View style={[styles.quickInfoBadge, { backgroundColor: deriInfo.bg }]}>
                          <Icon name={deriInfo.icon} size={12} color={deriInfo.color} />
                          <Text style={[styles.quickInfoText, { color: deriInfo.color }]}>{item.deriGrubu}</Text>
                        </View>
                      );
                    })() : null}
                    <View style={[styles.quickInfoBadge, { backgroundColor: durumInfo.bg }]}>
                      <Icon name={durumInfo.icon} size={12} color={durumInfo.color} />
                      <Text style={[styles.quickInfoText, { color: durumInfo.color }]}>{durumInfo.label}</Text>
                    </View>
                    {(item.miktar || 0) > 0 && (
                      <View style={[styles.quickInfoBadge, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                        <Icon name="cube-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.quickInfoText, { color: colors.textSecondary }]}>{item.miktar.toLocaleString('tr-TR')} ad.</Text>
                      </View>
                    )}
                    {item.teslimTarihi && item.teslimTarihi !== '0000-00-00' && (
                      <View style={[styles.quickInfoBadge, { backgroundColor: isDark ? '#6B728020' : '#F3F4F6' }]}>
                        <Icon name="calendar-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.quickInfoText, { color: colors.textSecondary }]}>{formatDate(item.teslimTarihi)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <View style={[styles.cardDetail, { borderTopColor: isDark ? colors.border : '#F1F5F9' }]}>
                      {/* Detay Bilgileri */}
                      <View style={styles.infoGrid}>
                        {item.siparisiAlan ? (
                          <View style={[styles.infoItem, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Siparişi Alan</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{item.siparisiAlan}</Text>
                          </View>
                        ) : null}
                        {item.siparisGrubuAdi ? (
                          <View style={[styles.infoItem, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Sipariş Grubu</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{item.siparisGrubuAdi}</Text>
                          </View>
                        ) : null}
                        {item.siparisTipiAdi ? (
                          <View style={[styles.infoItem, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Sipariş Tipi</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{item.siparisTipiAdi}</Text>
                          </View>
                        ) : null}
                        {item.teslimSekliAdi ? (
                          <View style={[styles.infoItem, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Teslim Şekli</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{item.teslimSekliAdi}</Text>
                          </View>
                        ) : null}
                        {item.paketlemeAdi ? (
                          <View style={[styles.infoItem, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Paketleme</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{item.paketlemeAdi}</Text>
                          </View>
                        ) : null}
                        <View style={[styles.infoItem, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>İndirim Fişi</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>
                              {item.masterAvansIndirim?.indirim && item.masterAvansIndirim.indirim.tip !== -1 && item.masterAvansIndirim.indirim.deger > 0
                                ? (item.masterAvansIndirim.indirim.fisNo || '-')
                                : '-'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Avans Fişi</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>
                              {item.masterAvansIndirim?.avans?.length > 0
                                ? item.masterAvansIndirim.avans.map((a: any) => a.fisNo || '-').join(', ')
                                : '-'}
                            </Text>
                          </View>
                        </View>
                        {item.musteriSube ? (
                          <View style={[styles.infoItem, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Müşteri Şube</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{item.musteriSube}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Açıklama */}
                      {item.aciklama ? (
                        <Text style={[styles.cardNote, { color: colors.textSecondary }]}>{item.aciklama}</Text>
                      ) : null}

                      {/* Alt Butonlar */}
                      <View style={styles.cardBottomButtons}>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
                          onPress={(e) => { e.stopPropagation(); handleOpenEditForm(item); }}
                        >
                          <Icon name="create-outline" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Düzenle</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                          onPress={(e) => { e.stopPropagation(); setDetayFormSiparis(item); setDetayFormVisible(true); }}
                        >
                          <Icon name="add-circle-outline" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Detay</Text>
                        </Pressable>
                        {item.uretim === 0 ? (
                          <Pressable
                            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                            onPress={(e) => { e.stopPropagation(); /* TODO: handleUretimeAl(item); */ }}
                          >
                            <Icon name="construct-outline" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Üretime</Text>
                          </Pressable>
                        ) : (
                          <View style={[styles.actionBtn, { backgroundColor: isDark ? colors.background : '#F0FDF4', borderWidth: 1, borderColor: '#10B981' }]}>
                            <Icon name="checkmark-circle" size={18} color="#10B981" />
                            <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Üretimde</Text>
                          </View>
                        )}
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: '#0EA5E9' }]}
                          onPress={(e) => { e.stopPropagation(); /* TODO: handleSharePDF(item); */ }}
                        >
                          <Icon name="share-outline" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>PDF</Text>
                        </Pressable>
                        {item.aktif !== -2 && item.durum !== 'iptal' && item.durum !== 'uretimde' && (
                          <Pressable
                            style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                            onPress={(e) => { e.stopPropagation(); /* TODO: handleCancelOrder(item); */ }}
                          >
                            <Icon name="close-circle-outline" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>İptal</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Sipariş Form BottomSheet */}
        <BottomSheet
          visible={formModalVisible}
          onClose={() => setFormModalVisible(false)}
          title={formEditingItem ? `Sipariş Düzenle - ${formEditingItem.siparisKodu}` : `Yeni Sipariş${formDeriTipi ? ` · ${formDeriTipi}` : ''}`}
          icon={formEditingItem ? 'create-outline' : 'receipt-outline'}
          toastRef={formToastRef}
          footer={!formLookupsLoading ? (
            <>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]}
                onPress={() => setFormModalVisible(false)}
                disabled={formSaving}
              >
                <Icon name="close-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>İptal</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveOrder}
                disabled={formSaving}
              >
                {formSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark-outline" size={18} color="#fff" />
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{formEditingItem ? 'Güncelle' : 'Kaydet'}</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : undefined}
        >
          {formLookupsLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13 }}>Veriler yükleniyor...</Text>
            </View>
          ) : (
            <View style={styles.formSection}>
              {/* Deri Tipi */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <SelectInput
                    label="Deri Tipi *"
                    icon="layers-outline"
                    placeholder="Deri tipi seçiniz..."
                    value={formDeriTipi}
                    items={DERI_TIPI_OPTIONS}
                    onSelect={(v) => { setFormDeriTipi(v); lastDeriTipi.current = v; formFieldErrors.clearFieldError('deriTipi'); }}
                    containerStyle={{ marginBottom: 0 }}
                    error={formFieldErrors.errors.deriTipi}
                    shake={formFieldErrors.shakes.deriTipi}
                  />
                </View>
              </View>

              {/* Sipariş Kodu & Döviz */}
              <View style={[styles.formRow, { gap: 10 }]}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Sipariş Kodu *</Text>
                  <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: formFieldErrors.errors.siparisKodu ? colors.danger : colors.inputBorder }]}>
                    <Icon name="barcode-outline" size={18} color={formFieldErrors.errors.siparisKodu ? colors.danger : colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.formInputText, { color: colors.text }]}
                      value={formSiparisKodu}
                      onChangeText={(v) => { setFormSiparisKodu(v); formFieldErrors.clearFieldError('siparisKodu'); }}
                      placeholder="ORD2026..."
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>
                <View style={{ width: 110 }}>
                  <DovizSelect
                    value={formDoviz}
                    dovizTipleri={formDovizTipleri}
                    onSelect={setFormDoviz}
                    shortLabel
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* Tarihler */}
              <View style={[styles.formRow, { gap: 10 }]}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Sipariş Tarihi</Text>
                  <Pressable
                    style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                    onPress={() => setFormTarihPickerVisible(true)}
                  >
                    <Icon name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <Text style={[styles.formInputText, { color: colors.text }]}>{formatDateStr(formTarih)}</Text>
                  </Pressable>
                </View>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Teslim Tarihi</Text>
                  <Pressable
                    style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                    onPress={() => setFormTeslimTarihPickerVisible(true)}
                  >
                    <Icon name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <Text style={[styles.formInputText, { color: colors.text }]}>{formatDateStr(formTeslimTarihi)}</Text>
                  </Pressable>
                </View>
              </View>

              {/* Cari */}
              <View style={styles.formRow}>
                <View style={[styles.formField, { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <SelectInput
                      label="Cari *"
                      icon="person-outline"
                      placeholder="Cari seçiniz..."
                      value={formCariId}
                      items={formCariler.map((c: any) => ({ id: c.id.toString(), label: c.unvan }))}
                      onSelect={(v) => { setFormCariId(v); formFieldErrors.clearFieldError('cari'); }}
                      searchPlaceholder="Cari ara..."
                      containerStyle={{ marginBottom: 0 }}
                      error={formFieldErrors.errors.cari}
                      shake={formFieldErrors.shakes.cari}
                    />
                  </View>
                  <Pressable
                    style={{
                      width: 48, height: 48, borderRadius: 12,
                      backgroundColor: colors.primary,
                      justifyContent: 'center', alignItems: 'center',
                    }}
                    onPress={handleOpenCariForm}
                  >
                    <Icon name="add" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>

              {/* Siparişi Alan */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Siparişi Alan</Text>
                  <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                    <Icon name="person-circle-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.formInputText, { color: colors.text }]}
                      value={formSiparisiAlan}
                      onChangeText={setFormSiparisiAlan}
                      placeholder="Siparişi alan kişi"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>
              </View>

              {/* Sipariş Grubu & Sipariş Tipi */}
              <View style={[styles.formRow, { gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="SIPARIS_GRUBU"
                    label="Sipariş Grubu"
                    placeholder="Grup seçin..."
                    value={formSiparisGrubuId}
                    onSelect={setFormSiparisGrubuId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="SIPARIS_TIPI"
                    label="Sipariş Tipi"
                    placeholder="Tip seçin..."
                    value={formSiparisTipiId}
                    onSelect={setFormSiparisTipiId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* Paketleme & Teslim Şekli */}
              <View style={[styles.formRow, { gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="PAKETLEME"
                    label="Paketleme"
                    placeholder="Seçin..."
                    value={formPaketlemeId}
                    onSelect={setFormPaketlemeId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="TESLIM_SEKLI"
                    label="Teslim Şekli"
                    placeholder="Seçin..."
                    value={formTeslimSekliId}
                    onSelect={setFormTeslimSekliId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* Açıklama */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Açıklama</Text>
                  <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                    <Icon name="chatbubble-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
                    <TextInput
                      style={[styles.formInputText, { color: colors.text, textAlignVertical: 'top', height: 60 }]}
                      value={formAciklama}
                      onChangeText={setFormAciklama}
                      placeholder="Sipariş notu..."
                      placeholderTextColor={colors.placeholder}
                      multiline
                    />
                  </View>
                </View>
              </View>

              {/* İndirim */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.inputLabel }]}>İndirim</Text>
                  <View style={[styles.formRow, { gap: 8, marginBottom: 0 }]}>
                    <View style={[styles.formSegment, { flex: 1 }]}>
                      <Pressable
                        style={[styles.formSegmentBtn, { flex: 1 }, formIndirimTipi === -1 && { backgroundColor: '#EF4444' }]}
                        onPress={() => { setFormIndirimTipi(-1); setFormIndirimDeger(''); formFieldErrors.clearFieldError('indirimDeger'); }}
                      >
                        <Text style={[styles.formSegmentText, { fontSize: 16 }, formIndirimTipi === -1 && { color: '#fff' }]}>✕</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.formSegmentBtn, { flex: 1 }, formIndirimTipi === 0 && { backgroundColor: '#F59E0B' }]}
                        onPress={() => setFormIndirimTipi(0)}
                      >
                        <Text style={[styles.formSegmentText, { fontSize: 16 }, formIndirimTipi === 0 && { color: '#fff' }]}>%</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.formSegmentBtn, { flex: 1 }, formIndirimTipi === 1 && { backgroundColor: '#F59E0B' }]}
                        onPress={() => setFormIndirimTipi(1)}
                      >
                        <Text style={[styles.formSegmentText, { fontSize: 16 }, formIndirimTipi === 1 && { color: '#fff' }]}>$</Text>
                      </Pressable>
                    </View>
                    {formIndirimTipi !== -1 && (
                      <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: formFieldErrors.errors.indirimDeger ? colors.danger : colors.inputBorder, flex: 1 }]}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: formFieldErrors.errors.indirimDeger ? colors.danger : colors.textSecondary, marginRight: 8 }}>
                          {formIndirimTipi === 0 ? '%' : '$'}
                        </Text>
                        <TextInput
                          style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                          value={formIndirimDeger}
                          onChangeText={(v) => { setFormIndirimDeger(v); formFieldErrors.clearFieldError('indirimDeger'); }}
                          placeholder="0.00"
                          placeholderTextColor={colors.placeholder}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Avans Satırları */}
              <View style={{ backgroundColor: isDark ? colors.card : '#F0F9FF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: isDark ? colors.border : '#BFDBFE' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: formAvansRows.length > 0 ? 10 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="wallet-outline" size={18} color="#3B82F6" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Avans</Text>
                  </View>
                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B82F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                    onPress={() => setFormAvansRows(prev => [...prev, { tutar: '', doviz: formDoviz, dovizliTutar: '', cariIslendi: false }])}
                    hitSlop={8}
                  >
                    <Icon name="add" size={14} color="#fff" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Satır Ekle</Text>
                  </Pressable>
                </View>
                {formAvansRows.map((row, idx) => (
                  <View key={idx} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Tutar</Text>
                        <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                          <TextInput
                            style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                            value={row.tutar}
                            onChangeText={(v) => {
                              const updated = [...formAvansRows];
                              updated[idx] = { ...updated[idx], tutar: v };
                              setFormAvansRows(updated);
                            }}
                            placeholder="0.00"
                            placeholderTextColor={colors.placeholder}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                      <View style={{ width: 90 }}>
                        <DovizSelect
                          value={row.doviz}
                          dovizTipleri={formDovizTipleri}
                          onSelect={(v) => {
                            const updated = [...formAvansRows];
                            updated[idx] = { ...updated[idx], doviz: v };
                            setFormAvansRows(updated);
                          }}
                          shortLabel
                          containerStyle={{ marginBottom: 0 }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Dövizli Tutar</Text>
                        <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                          <TextInput
                            style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                            value={row.dovizliTutar}
                            onChangeText={(v) => {
                              const updated = [...formAvansRows];
                              updated[idx] = { ...updated[idx], dovizliTutar: v };
                              setFormAvansRows(updated);
                            }}
                            placeholder="0.00"
                            placeholderTextColor={colors.placeholder}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                      <Pressable
                        style={{ paddingBottom: 14, paddingHorizontal: 2 }}
                        onPress={() => setFormAvansRows(prev => prev.filter((_, i) => i !== idx))}
                        hitSlop={8}
                      >
                        <Icon name="trash-outline" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Date Pickers */}
          <DatePickerModal
            visible={formTarihPickerVisible}
            date={formTarih}
            onConfirm={(d) => { setFormTarih(d); setFormTarihPickerVisible(false); }}
            onClose={() => setFormTarihPickerVisible(false)}
            title="Sipariş Tarihi"
          />
          <DatePickerModal
            visible={formTeslimTarihPickerVisible}
            date={formTeslimTarihi}
            onConfirm={(d) => { setFormTeslimTarihi(d); setFormTeslimTarihPickerVisible(false); }}
            onClose={() => setFormTeslimTarihPickerVisible(false)}
            title="Teslim Tarihi"
          />
        </BottomSheet>

        {/* Detay Form */}
        <TabakhaneSiparisDetayForm
          visible={detayFormVisible}
          onClose={() => setDetayFormVisible(false)}
          siparisKodu={detayFormSiparis?.siparisKodu}
          deriTipi={detayFormSiparis?.deriGrubu}
        />

        {/* Toast */}
        <InModalToast
          toast={toast}
          onDismiss={() => setToast(null)}
        />

        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />
      </View>
    </SafeAreaProvider>
    {/* Cari Ekleme Modal */}
    <Modal visible={showCariForm} animationType="fade" transparent onRequestClose={handleCloseCariForm}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} onPress={handleCloseCariForm}>
        <Pressable style={{ backgroundColor: colors.card, borderRadius: 14, padding: 20 }} onPress={(e) => e.stopPropagation()}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="person-add-outline" size={20} color={colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Yeni Cari Hesap</Text>
            </View>
            <Pressable onPress={handleCloseCariForm} hitSlop={8}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Input
            label="Hesap Kodu *"
            value={cariFormHesapKodu}
            onChangeText={(v) => { setCariFormHesapKodu(v); cariFormFieldErrors.clearFieldError('hesapKodu'); }}
            placeholder="Otomatik oluşturulacak..."
            autoCapitalize="none"
            editable={false}
            error={cariFormFieldErrors.errors.hesapKodu ? ' ' : ''}
            shake={cariFormFieldErrors.shakes.hesapKodu}
          />
          <Input
            label="Ünvan *"
            value={cariFormUnvan}
            onChangeText={(v) => { setCariFormUnvan(v); cariFormFieldErrors.clearFieldError('unvan'); }}
            placeholder="Firma veya kişi adı"
            error={cariFormFieldErrors.errors.unvan ? ' ' : ''}
            shake={cariFormFieldErrors.shakes.unvan}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: '48%' }}>
              <Input
                label="Kısa Ünvan"
                value={cariFormKisaUnvan}
                onChangeText={setCariFormKisaUnvan}
                placeholder="Kısaltılmış ad"
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            <View style={{ width: '48%' }}>
              <SelectInput
                label="Döviz"
                value={cariFormDoviz}
                onSelect={setCariFormDoviz}
                items={[
                  { id: 'TL', label: 'TL' },
                  { id: 'USD', label: 'USD' },
                  { id: 'EUR', label: 'EUR' },
                  { id: 'GBP', label: 'GBP' },
                ]}
                placeholder="Seçin"
                noClear
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Button
              text="İptal"
              variant="secondary"
              onPress={handleCloseCariForm}
              icon="close-outline"
              style={{ flex: 1 }}
            />
            <Button
              text="Kaydet"
              variant="primary"
              onPress={handleSaveCari}
              icon="checkmark-outline"
              loading={cariFormSaving}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    pageHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    pageTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageTitleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    pageTitle: { fontSize: 16, fontWeight: '700', color: colors.text, opacity: 0.6 },
    filterCard: {
      marginHorizontal: 16, marginBottom: 8,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12, padding: 4,
      borderWidth: 1, borderColor: isDark ? colors.border : '#E2E8F0',
    },
    content: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
    retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

    // Stats
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

    // Summary
    summaryContainer: {
      marginBottom: 10,
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: isDark ? colors.border : '#E2E8F0',
    },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryTitle: { fontSize: 14, fontWeight: '700' },
    summaryHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summarySubtext: { fontSize: 12, fontWeight: '600' },
    summaryDetail: {
      marginTop: 12, borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
      paddingTop: 10,
    },
    summaryDetailHeader: {
      flexDirection: 'row', paddingBottom: 6, marginBottom: 4,
      borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#F1F5F9',
    },
    summaryDetailHeaderCell: { fontSize: 11, fontWeight: '600' },
    summaryDetailRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 8, borderRadius: 6, paddingHorizontal: 4,
    },
    summaryDetailRowAlt: { backgroundColor: isDark ? colors.background : '#F8FAFC' },
    summaryDetailValue: { fontSize: 13, fontWeight: '600', textAlign: 'right' },
    currencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    currencyBadgeText: { fontSize: 12, fontWeight: '700' },
    card: {
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12, padding: 10, marginBottom: 10,
      borderWidth: 1, borderColor: isDark ? colors.border : '#E2E8F0',
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    durumDot: { width: 8, height: 8, borderRadius: 4 },
    cardTitleContainer: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: '600' },
    cardSubtitle: { fontSize: 12 },
    cardHeaderRight: { alignItems: 'flex-end', marginLeft: 8 },
    cardAmount: { fontSize: 15, fontWeight: '700', color: '#10B981' },
    cardCurrency: { fontSize: 11, marginTop: 1 },
    quickInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    quickInfoBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    },
    quickInfoText: { fontSize: 11, fontWeight: '500' },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    infoItem: { width: '48%', flexGrow: 1, borderRadius: 8, padding: 8 },
    infoLabel: { fontSize: 11, marginBottom: 3 },
    infoValue: { fontSize: 13, fontWeight: '600' },
    cardNote: { fontSize: 12, marginTop: 1, marginBottom: 6, fontStyle: 'italic' },
    cardDetail: { marginTop: 6, paddingTop: 6, borderTopWidth: 1 },
    cardBottomButtons: {
      flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
      gap: 6, marginTop: 0,
    },
    actionBtn: {
      flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 2, paddingVertical: 8, borderRadius: 8,
    },
    actionBtnText: { fontSize: 11, fontWeight: '600', color: '#fff' },

    // Form
    formSection: { paddingTop: 16, paddingBottom: 20 },
    formRow: { marginBottom: 12, flexDirection: 'row' },
    formField: { flex: 1 },
    formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    formInput: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1.5, borderRadius: 12,
      paddingHorizontal: 14, height: 48,
    },
    formInputText: { flex: 1, fontSize: 15, paddingVertical: 0 },
    formSegment: {
      flexDirection: 'row', borderRadius: 10, overflow: 'hidden',
      borderWidth: 1, borderColor: isDark ? colors.border : '#E2E8F0',
    },
    formSegmentBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 4, paddingVertical: 10, paddingHorizontal: 14,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
    },
    formSegmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

    // Modal buttons
    modalBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 12, borderRadius: 10,
    },
    modalBtnCancel: { borderWidth: 1 },
    modalBtnText: { fontSize: 14, fontWeight: '600' },
  });
