import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Modal,
  ActivityIndicator,
  TextInput,
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
import IconButton from '../components/IconButton';
import SearchButton from '../components/SearchButton';
import AddButton from '../components/AddButton';
import TabBar, { TabName } from '../components/TabBar';
import DateFilter, { DatePreset } from '../components/DateFilter';
import ordersService, { OrderItem, OrderSummaryItem, OrderStats, OrderDetailItem, ReceteItem, ReceteSummary, DovizTipi, CariLookupItem, DetailBedenSetItem, DetailVaryantItem } from '../services/orders.service';
import { authService } from '../services/auth.service';
import dovizService, { KurItem, mapKurTipi } from '../services/doviz.service';
import InModalToast from '../components/InModalToast';
import { useFieldErrors } from '../hooks/useFieldErrors';
import SelectInput from '../components/SelectInput';
import DovizSelect from '../components/DovizSelect';
import DatePickerModal from '../components/DatePickerModal';
import TanimSelectInput from '../components/TanimSelectInput';
import BottomSheet, { BottomSheetToastRef } from '../components/BottomSheet';
import SiparisDetayForm, { DetayFormData } from '../components/SiparisDetayForm';
import Input from '../components/Input';
import Button from '../components/Button';
import accountService from '../services/account.service';
import { generateSiparisPDF } from '../utils/pdfSiparis';

interface SiparisIslemleriScreenProps {
  onGoBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function SiparisIslemleriScreen({
  onGoBack,
  onTabChange,
  onLogout,
}: SiparisIslemleriScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, logout, notificationCount } = useAuth();
  const { showConfirm } = useAlert();
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
  const [uretimModalVisible, setUretimModalVisible] = useState(false);
  const [uretimSiparis, setUretimSiparis] = useState<OrderItem | null>(null);
  const [uretimLoading, setUretimLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const formToastRef = useRef<BottomSheetToastRef | null>(null);
  const detayToastRef = useRef<BottomSheetToastRef | null>(null);
  const [durumFilter, setDurumFilter] = useState<string | null>(null);
  const [receteModalVisible, setReceteModalVisible] = useState(false);
  const [receteSiparis, setReceteSiparis] = useState<OrderItem | null>(null);
  const [receteItems, setReceteItems] = useState<ReceteItem[]>([]);
  const [receteSummary, setReceteSummary] = useState<ReceteSummary[]>([]);
  const [receteLoading, setReceteLoading] = useState(false);
  // Sipariş Form State
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formEditingItem, setFormEditingItem] = useState<OrderItem | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formLookupsLoading, setFormLookupsLoading] = useState(false);
  const [formDovizTipleri, setFormDovizTipleri] = useState<DovizTipi[]>([]);
  const [formCariler, setFormCariler] = useState<CariLookupItem[]>([]);
  const [formSiparisKodu, setFormSiparisKodu] = useState('');
  const [formMusteriSiparisKodu, setFormMusteriSiparisKodu] = useState('');
  const [formSiparisTipi, setFormSiparisTipi] = useState(1);
  const [formCariId, setFormCariId] = useState('');
  const [formTarih, setFormTarih] = useState(new Date());
  const [formTeslimTarihi, setFormTeslimTarihi] = useState(new Date());
  const [formDoviz, setFormDoviz] = useState('USD');
  const [formTeslimSekliId, setFormTeslimSekliId] = useState('');
  const [formPaketlemeId, setFormPaketlemeId] = useState('');
  const [formIndirimTipi, setFormIndirimTipi] = useState(-1);
  const [formIndirimDeger, setFormIndirimDeger] = useState('');
  const [formAvansRows, setFormAvansRows] = useState<{ tutar: string; doviz: string; dovizliTutar: string; aciklama: string; cariIslendi: boolean }[]>([]);
  const [formIndirimCariIslendi, setFormIndirimCariIslendi] = useState(false);
  const [formKurlar, setFormKurlar] = useState<Record<string, KurItem>>({});
  const [formAciklama, setFormAciklama] = useState('');
  const [formMusteriSube, setFormMusteriSube] = useState('');
  const [formTarihPickerVisible, setFormTarihPickerVisible] = useState(false);
  const [formTeslimTarihPickerVisible, setFormTeslimTarihPickerVisible] = useState(false);
  const formFieldErrors = useFieldErrors();

  // Cari ekleme state
  const [showCariForm, setShowCariForm] = useState(false);
  const [cariFormSaving, setCariFormSaving] = useState(false);
  const [cariFormUnvan, setCariFormUnvan] = useState('');
  const [cariFormKisaUnvan, setCariFormKisaUnvan] = useState('');
  const [cariFormHesapKodu, setCariFormHesapKodu] = useState('');
  const [cariFormDoviz, setCariFormDoviz] = useState('TL');
  const [cariFormSubeId, setCariFormSubeId] = useState(0);
  const cariFormFieldErrors = useFieldErrors();

  // Seçili carinin kur tipi
  const activeKurTipi = useMemo(() => {
    if (!formCariId) return mapKurTipi();
    const cari = formCariler.find(c => c.id.toString() === formCariId);
    return mapKurTipi(cari?.kurTipi);
  }, [formCariId, formCariler]);

  // Sipariş Detay Form State
  const [detayFormVisible, setDetayFormVisible] = useState(false);
  const [detayFormSiparis, setDetayFormSiparis] = useState<OrderItem | null>(null);
  const [detayFormSaving, setDetayFormSaving] = useState(false);
  const [detayBedenSetleri, setDetayBedenSetleri] = useState<DetailBedenSetItem[]>([]);
  const [detayVaryantlar, setDetayVaryantlar] = useState<DetailVaryantItem[]>([]);
  const [detayVaryantLoading, setDetayVaryantLoading] = useState(false);
  const [detayLookupsLoaded, setDetayLookupsLoaded] = useState(false);

  // PDF Paylaş
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfSiparis, setPdfSiparis] = useState<OrderItem | null>(null);

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
        siparisTipi: 1,
      });

      if (response.success && response.data) {
        setData(response.data.items || []);
        setSummaryData(response.data.summary || []);
        setStats(response.data.stats || { totalSatis: 0, totalSatinalma: 0, totalUretimde: 0, totalBeklemede: 0, totalKapali: 0, totalIptal: 0 });
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

  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchDetail = async (siparisId: string) => {
    if (detailData[siparisId]) return;
    setDetailLoading(siparisId);
    setDetailError(null);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;
      const response = await ordersService.getDetail(token, dataName, siparisId);
      if (response.success && response.data) {
        setDetailData(prev => ({ ...prev, [siparisId]: response.data.details || [] }));
      } else {
        setDetailError(response.message || 'Detay alınamadı');
      }
    } catch (e: any) {
      setDetailError(e?.message || 'Detay yüklenemedi');
    } finally {
      setDetailLoading(null);
    }
  };

  // Arama filtresi (stats buna göre hesaplanır)
  const searchFilteredData = data.filter((item) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      item.cariAdi.toLowerCase().includes(q) ||
      item.siparisKodu.toLowerCase().includes(q) ||
      item.musteriSiparisKodu.toLowerCase().includes(q)
    );
  });

  // Arama sonucuna göre stats hesapla
  const filteredStats = {
    total: searchFilteredData.length,
    uretimde: searchFilteredData.filter(i => i.durum === 'uretimde').length,
    beklemede: searchFilteredData.filter(i => i.durum === 'beklemede').length,
    kapali: searchFilteredData.filter(i => i.durum === 'kapali').length,
    iptal: searchFilteredData.filter(i => i.durum === 'iptal').length,
  };

  // Durum filtresi (liste buna göre gösterilir)
  const filteredData = durumFilter
    ? searchFilteredData.filter(item => item.durum === durumFilter)
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
    } catch {}
  };

  const handleRecetePress = async (item: OrderItem) => {
    setReceteSiparis(item);
    setReceteModalVisible(true);
    setReceteLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;
      const response = await ordersService.getRecete(token, dataName, item.id);
      if (response.success && response.data) {
        setReceteItems(response.data.items || []);
        setReceteSummary(response.data.summary || []);
      }
    } catch (_e) {
    } finally {
      setReceteLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
  };

  const handleSharePDF = (item: OrderItem) => {
    if (item.detaySayisi === 0) {
      showToast('error', 'Detay kaydı olmayan sipariş PDF olarak paylaşılamaz');
      return;
    }
    setPdfSiparis(item);
    setPdfModalVisible(true);
  };

  const handlePdfGenerate = async (fiyatli: boolean) => {
    setPdfModalVisible(false);
    if (!pdfSiparis) return;
    try {
      let details = detailData[pdfSiparis.id];
      if (!details || details.length === 0) {
        const token = await authService.getToken();
        if (!token) return;
        const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
        if (!dataName) return;
        const response = await ordersService.getDetail(token, dataName, pdfSiparis.id);
        if (response.success && response.data) {
          details = response.data;
        }
      }
      if (!details || details.length === 0) {
        showToast('error', 'Sipariş detayları bulunamadı');
        return;
      }
      await generateSiparisPDF({ siparis: pdfSiparis, detaylar: details, fiyatli });
    } catch (_e) {
      showToast('error', 'PDF oluşturulurken hata oluştu');
    }
  };

  const handleUretimeAlPress = (item: OrderItem) => {
    if (item.uretim === 1) {
      showToast('info', 'Bu sipariş zaten üretime alınmış');
      return;
    }
    if (item.detaySayisi === 0) {
      showToast('error', 'Detay kaydı olmayan sipariş üretime alınamaz');
      return;
    }
    setUretimSiparis(item);
    setUretimModalVisible(true);
  };

  const handleUretimeAlConfirm = async () => {
    if (!uretimSiparis) return;
    setUretimLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      const response = await ordersService.uretimeAl(token, dataName, uretimSiparis.id);
      if (response.success) {
        setUretimModalVisible(false);
        setUretimSiparis(null);
        showToast('success', `${uretimSiparis.siparisKodu} üretime alındı`);
        await fetchData();
      } else {
        showToast('error', response.message || 'Üretime alma başarısız');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Üretime alma başarısız');
    } finally {
      setUretimLoading(false);
    }
  };

  const handleCancelOrder = (item: OrderItem) => {
    if (item.aktif === -2 || item.durum === 'iptal') {
      showToast('info', 'Bu sipariş zaten iptal edilmiş');
      return;
    }
    if (item.durum === 'uretimde') {
      showToast('info', 'Üretime alınan sipariş iptal edilemez');
      return;
    }
    showConfirm({
      title: 'Sipariş İptal',
      message: `"${item.siparisKodu}" kodlu siparişi iptal etmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`,
      confirmText: 'İptal Et',
      icon: 'close-circle-outline',
      iconColor: '#EF4444',
      onConfirm: async () => {
        try {
          const token = await authService.getToken();
          if (!token) throw new Error('Token bulunamadı');
          const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
          const response = await ordersService.cancelOrder(token, dataName, item.id);
          if (response.success) {
            showToast('success', `${item.siparisKodu} iptal edildi`);
            await fetchData();
          } else {
            showToast('error', response.message || 'İptal işlemi başarısız');
          }
        } catch (err: any) {
          showToast('error', err.message || 'İptal işlemi başarısız');
        }
      },
    });
  };

  // Sipariş Form Handlers
  const resetForm = () => {
    setFormSiparisKodu('');
    setFormMusteriSiparisKodu('');
    setFormSiparisTipi(1);
    setFormCariId('');
    setFormTarih(new Date());
    setFormTeslimTarihi(new Date());
    setFormDoviz('USD');
    setFormTeslimSekliId('');
    setFormPaketlemeId('');
    setFormIndirimTipi(-1);
    setFormIndirimDeger('');
    setFormIndirimCariIslendi(false);
    setFormAvansRows([]);
    setFormAciklama('');
    setFormMusteriSube('');
    setFormEditingItem(null);
    formFieldErrors.clearAll();
  };

  const handleOpenCariForm = () => {
    setCariFormUnvan('');
    setCariFormKisaUnvan('');
    setCariFormHesapKodu('');
    setCariFormDoviz('TL');
    cariFormFieldErrors.clearAll();
    // Sipariş formunu geçici kapat, cari formunu aç
    setFormModalVisible(false);
    setTimeout(() => {
      setShowCariForm(true);
    }, 350);
    // Varsayılan şube ve otomatik hesap kodu al
    (async () => {
      try {
        const token = await authService.getToken();
        if (!token) return;
        // Varsayılan şubeyi al
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
        // Hesap kodu al
        const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
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
        subeId: cariFormSubeId || 1,
      });
      if (response.success) {
        setShowCariForm(false);
        // Lookupları yenile ve yeni cariyi seç
        await fetchLookups();
        if (response.data?.id) {
          setFormCariId(response.data.id.toString());
        }
        setTimeout(() => {
          setFormModalVisible(true);
        }, 350);
      }
    } catch (err: any) {
      showError(err.message || 'Cari oluşturulamadı');
    } finally {
      setCariFormSaving(false);
    }
  };

  const fetchLookups = async (isNewOrder = false) => {
    setFormLookupsLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;
      const [response, kurResponse] = await Promise.all([
        ordersService.getLookups(token, dataName),
        dovizService.getKurlar(token, dataName),
      ]);
      if (response.success && response.data) {
        setFormDovizTipleri(response.data.dovizTipleri || []);
        setFormCariler(response.data.cariler || []);
        if (isNewOrder) {
          setFormSiparisKodu(response.data.nextSiparisKodu || '');
        }
      }
      if (kurResponse.success && kurResponse.data) {
        setFormKurlar(kurResponse.data.kurlar || {});
      }
    } catch (_e) {
    } finally {
      setFormLookupsLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    resetForm();
    setFormModalVisible(true);
    fetchLookups(true);
  };

  const handleOpenEditForm = (item: OrderItem) => {
    setFormEditingItem(item);
    setFormSiparisKodu(item.siparisKodu);
    setFormMusteriSiparisKodu(item.musteriSiparisKodu || '');
    setFormSiparisTipi(item.siparisTipi);
    setFormCariId(item.carilerId != null && item.carilerId > 0 ? item.carilerId.toString() : '');
    setFormTarih(item.tarih ? new Date(item.tarih) : new Date());
    setFormTeslimTarihi(item.teslimTarihi ? new Date(item.teslimTarihi) : new Date());
    setFormDoviz(item.doviz || 'USD');
    setFormTeslimSekliId(item.teslimSekliId ? item.teslimSekliId.toString() : '');
    setFormPaketlemeId(item.paketlemeId ? item.paketlemeId.toString() : '');
    setFormIndirimTipi(item.masterAvansIndirim?.indirim?.tip ?? -1);
    setFormIndirimDeger(item.masterAvansIndirim?.indirim?.deger ? item.masterAvansIndirim.indirim.deger.toString() : '');
    setFormIndirimCariIslendi(item.masterAvansIndirim?.indirim?.cariIslendi ?? false);
    setFormAvansRows((item.masterAvansIndirim?.avans || []).map(a => ({
      tutar: a.tutar.toString(),
      doviz: a.doviz,
      dovizliTutar: a.dovizliTutar ? a.dovizliTutar.toString() : '',
      aciklama: a.aciklama || '',
      cariIslendi: a.cariIslendi ?? false,
    })));
    setFormAciklama(item.aciklama || '');
    setFormMusteriSube(item.musteriSube || '');
    setFormModalVisible(true);
    fetchLookups();
  };



  const handleSaveOrder = async () => {
    const requiredFields: Record<string, string | null | undefined> = {
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
        musteriSiparisKodu: formMusteriSiparisKodu,
        siparisTipi: formSiparisTipi,
        siparisModul: 'konfeksiyon',
        carilerId: parseInt(formCariId, 10),
        teslimSekliId: formTeslimSekliId ? parseInt(formTeslimSekliId, 10) : 0,
        paketlemeId: formPaketlemeId ? parseInt(formPaketlemeId, 10) : 0,
        tarih: formatDateISO(formTarih),
        teslimTarihi: formatDateISO(formTeslimTarihi),
        doviz: formDoviz,
        aciklama: formAciklama,
        masterAvansIndirim: {
          avans: formAvansRows.filter(r => r.tutar && parseFloat(r.tutar) > 0).map(r => ({
            tutar: parseFloat(r.tutar),
            doviz: r.doviz,
            dovizliTutar: r.dovizliTutar ? parseFloat(r.dovizliTutar) : 0,
            aciklama: r.aciklama,
            cariIslendi: r.cariIslendi,
          })),
          indirim: { tip: formIndirimTipi, deger: formIndirimDeger ? parseFloat(formIndirimDeger) : 0, doviz: formDoviz, cariIslendi: formIndirimCariIslendi },
        },
        musteriSube: formMusteriSube,
      };

      if (formEditingItem) {
        const response = await ordersService.updateOrder(token, dataName, formEditingItem.id, orderData);
        if (response.success) {
          setFormModalVisible(false);
          setTimeout(() => showToast('success', 'Sipariş güncellendi'), 400);
          await fetchData();
        } else {
          formToastRef.current?.show({ type: 'error', text: response.message || 'Güncelleme başarısız' });
        }
      } else {
        const response = await ordersService.createOrder(token, dataName, orderData);
        if (response.success) {
          setFormModalVisible(false);
          setTimeout(() => showToast('success', `${response.data?.siparisKodu || 'Sipariş'} oluşturuldu`), 400);
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

  // ─── Detay Form Handlers ──────────────────────────────────────
  const fetchDetailLookups = async () => {
    if (detayLookupsLoaded) return;
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;

      // Detay lookups + döviz tipleri
      const [detayRes, lookupsRes] = await Promise.all([
        ordersService.getDetailLookups(token, dataName),
        formDovizTipleri.length === 0 ? ordersService.getLookups(token, dataName) : Promise.resolve(null),
      ]);

      if (detayRes.success && detayRes.data) {
        setDetayBedenSetleri(detayRes.data.bedenSetleri || []);
        setDetayLookupsLoaded(true);
      }
      if (lookupsRes && lookupsRes.success && lookupsRes.data) {
        setFormDovizTipleri(lookupsRes.data.dovizTipleri || []);
      }
    } catch (_e) {}
  };

  const handleOpenDetayForm = (siparis: OrderItem) => {
    setDetayFormSiparis(siparis);
    setDetayVaryantlar([]);
    setDetayFormVisible(true);
    fetchDetailLookups();
  };

  const handleDetayModelChange = async (modelId: string) => {
    setDetayVaryantlar([]);
    if (!modelId) return;
    setDetayVaryantLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;
      const response = await ordersService.getDetailVaryantlar(token, dataName, modelId);
      if (response.success && response.data) {
        setDetayVaryantlar(response.data.varyantlar || []);
      }
    } catch (_e) {
    } finally {
      setDetayVaryantLoading(false);
    }
  };

  const handleSaveDetay = async (formData: DetayFormData) => {
    if (!detayFormSiparis) return;
    setDetayFormSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      const response = await ordersService.addDetail(token, dataName, detayFormSiparis.id, {
        modelId: formData.modelId ? parseInt(formData.modelId, 10) : 0,
        varyantId: formData.varyantId ? parseInt(formData.varyantId, 10) : 0,
        bedenSetId: formData.bedenSetId ? parseInt(formData.bedenSetId, 10) : 0,
        bedenMiktarlar: formData.bedenMiktarlar,
        fiyat: parseFloat(formData.fiyat) || 0,
        doviz: formData.doviz,
        indirimTipi: formData.indirimTipi,
        indirimDeger: parseFloat(formData.indirimDeger) || 0,
        aciklama: formData.aciklama,
      });

      if (response.success) {
        setDetayFormVisible(false);
        setTimeout(() => showToast('success', 'Sipariş kalemi eklendi'), 400);
        // Refresh detail data for this order
        setDetailData(prev => {
          const next = { ...prev };
          delete next[detayFormSiparis.id];
          return next;
        });
        fetchDetail(detayFormSiparis.id);
        await fetchData();
      } else {
        detayToastRef.current?.show({ type: 'error', text: response.message || 'Kalem eklenemedi' });
      }
    } catch (err: any) {
      detayToastRef.current?.show({ type: 'error', text: err.message || 'Kalem eklenemedi' });
    } finally {
      setDetayFormSaving(false);
    }
  };

  const totalCount = summaryData.reduce((sum, s) => sum + s.totalCount, 0);

  return (
    <>
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Sipariş İşlemleri"
          leftButton={<BackButton onPress={onGoBack} />}
          rightButton={
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <AddButton onPress={handleOpenCreateForm} />
              <SearchButton onPress={() => {
                setFilterVisible(v => !v);
                if (filterVisible) setSearchText('');
              }} />
            </View>
          }
          showMenu
          onLogout={handleLogout}
        />

        {/* Page Title */}
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleContainer}>
            <View style={[styles.pageTitleIcon, { backgroundColor: '#3B82F615' }]}>
              <Icon name="receipt-outline" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.pageTitle}>Sipariş İşlemleri</Text>
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
              <Pressable style={[styles.statCard, { borderLeftColor: '#3B82F6' }, durumFilter === null && styles.statCardActive]} onPress={() => setDurumFilter(null)}>
                <Text style={styles.statLabel}>Toplam</Text>
                <Text style={[styles.statValue, { color: '#3B82F6' }]}>{filteredStats.total}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#10B981' }, durumFilter === 'uretimde' && styles.statCardActive]} onPress={() => setDurumFilter(durumFilter === 'uretimde' ? null : 'uretimde')}>
                <Text style={styles.statLabel}>Üretim</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{filteredStats.uretimde}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#F59E0B' }, durumFilter === 'beklemede' && styles.statCardActive]} onPress={() => setDurumFilter(durumFilter === 'beklemede' ? null : 'beklemede')}>
                <Text style={styles.statLabel}>Bekleme</Text>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{filteredStats.beklemede}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#6B7280' }, durumFilter === 'kapali' && styles.statCardActive]} onPress={() => setDurumFilter(durumFilter === 'kapali' ? null : 'kapali')}>
                <Text style={styles.statLabel}>Kapalı</Text>
                <Text style={[styles.statValue, { color: '#6B7280' }]}>{filteredStats.kapali}</Text>
              </Pressable>
              <Pressable style={[styles.statCard, { borderLeftColor: '#EF4444' }, durumFilter === 'iptal' && styles.statCardActive]} onPress={() => setDurumFilter(durumFilter === 'iptal' ? null : 'iptal')}>
                <Text style={styles.statLabel}>İptal</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>{filteredStats.iptal}</Text>
              </Pressable>
            </View>

            {/* Summary by Currency */}
            {(() => {
              const filteredSummary: Record<string, { currency: string; totalQuantity: number; totalAmount: number }> = {};
              filteredData.forEach((item) => {
                const key = item.doviz || 'TL';
                if (!filteredSummary[key]) filteredSummary[key] = { currency: key, totalQuantity: 0, totalAmount: 0 };
                filteredSummary[key].totalQuantity += item.miktar;
                filteredSummary[key].totalAmount += item.tutar;
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

            {/* Order List */}
            {filteredData.length === 0 && (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="filter-outline" size={40} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 14 }}>Bu durumda sipariş bulunamadı</Text>
                <Pressable onPress={() => setDurumFilter(null)} style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Tümünü Göster</Text>
                </Pressable>
              </View>
            )}
            {filteredData.map((item) => {
              const durumInfo = getDurumInfo(item.durum);
              const tipiInfo = getSiparisTipiInfo(item.siparisTipi);
              const isExpanded = expandedCardId === item.id;
              const details = detailData[item.id];
              const isDetailLoading = detailLoading === item.id;

              return (
                <Pressable key={item.id} style={[styles.card, isExpanded && { borderColor: colors.primary + '40' }]} onPress={() => toggleCardExpansion(item.id)}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.durumDot, { backgroundColor: durumInfo.color }]} />
                      <View style={styles.cardTitleContainer}>
                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.cariAdi}{item.musteriSube ? ` - ${item.musteriSube}` : ''}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{item.siparisKodu || '-'}</Text>
                          <Text style={[styles.cardSubtitle, { color: colors.textSecondary, opacity: 0.5 }]}>·</Text>
                          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{formatDate(item.tarih)}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={styles.cardAmount}>{formatAmount(item.tutar)} <Text style={[styles.cardCurrency, { color: colors.textSecondary }]}>{item.doviz}</Text></Text>
                      {item.masterAvansIndirim?.avans && item.masterAvansIndirim.avans.length > 0 ? (() => {
                        const topAvans = item.masterAvansIndirim.avans.reduce((s, a) => s + (a.dovizliTutar || a.tutar), 0);
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
                        const avansTop = (item.masterAvansIndirim?.avans || []).reduce((s, a) => s + (a.dovizliTutar || a.tutar), 0);
                        const ind = item.masterAvansIndirim?.indirim;
                        const indTutar = ind && ind.tip !== -1 && ind.deger > 0
                          ? (ind.tip === 0 ? item.tutar * ind.deger / 100 : ind.deger)
                          : 0;
                        const kalan = item.tutar - indTutar - avansTop;
                        return (avansTop > 0 || indTutar > 0) ? (
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981', textAlign: 'right', marginTop: 3 }}>
                            Kalan: {formatAmount(kalan)} {item.doviz}
                          </Text>
                        ) : null;
                      })()}
                    </View>
                  </View>

                  {/* Quick Info Row */}
                  <View style={styles.quickInfoRow}>
                    <View style={[styles.quickInfoBadge, { backgroundColor: durumInfo.bg }]}>
                      <Icon name={durumInfo.icon} size={12} color={durumInfo.color} />
                      <Text style={[styles.quickInfoText, { color: durumInfo.color }]}>{durumInfo.label}</Text>
                    </View>
                    <View style={[styles.quickInfoBadge, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                      <Icon name="layers-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.quickInfoText, { color: colors.textSecondary }]}>{item.detaySayisi} kalem</Text>
                    </View>
                    {item.miktar > 0 && (
                      <View style={[styles.quickInfoBadge, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                        <Icon name="cube-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.quickInfoText, { color: colors.textSecondary }]}>{item.miktar.toLocaleString('tr-TR')} ad.</Text>
                      </View>
                    )}
                    {item.teslimTarihi && item.teslimTarihi !== '0000-00-00' && (
                      <View style={[styles.quickInfoBadge, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                        <Icon name="calendar-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.quickInfoText, { color: colors.textSecondary }]}>{formatDate(item.teslimTarihi)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <View style={[styles.cardDetail, { borderTopColor: isDark ? colors.border : '#F1F5F9' }]}>
                      {/* Info Grid */}
                      <View style={styles.infoGrid}>

                      </View>

                      {/* Progress Bar */}
                      {item.detaySayisi > 0 && (
                        <View style={[styles.progressSection, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                          <View style={styles.progressHeader}>
                            <Text style={[styles.progressLabel, { color: colors.text }]}>Üretim İlerlemesi</Text>
                            <Text style={styles.progressPercent}>
                              {Math.round((item.uretimdeCount / item.detaySayisi) * 100)}%
                            </Text>
                          </View>
                          <View style={[styles.progressBar, { backgroundColor: isDark ? colors.border : '#E2E8F0' }]}>
                            <View style={[
                              styles.progressFill,
                              { width: `${(item.uretimdeCount / item.detaySayisi) * 100}%` },
                            ]} />
                          </View>
                          <View style={styles.progressInfo}>
                            <Text style={[styles.progressInfoText, { color: colors.textSecondary }]}>
                              <Text style={{ color: '#3B82F6', fontWeight: '600' }}>{item.uretimdeCount}</Text> üretimde
                            </Text>
                            <Text style={[styles.progressInfoText, { color: colors.textSecondary }]}>
                              <Text style={{ color: '#F59E0B', fontWeight: '600' }}>{item.beklemedeSayisi}</Text> beklemede
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Detail Items */}
                      {isDetailLoading ? (
                        <View style={styles.detailLoadingContainer}>
                          <Text style={[styles.detailLoadingText, { color: colors.textSecondary }]}>Detaylar yükleniyor...</Text>
                        </View>
                      ) : detailError ? (
                        <View style={styles.detailLoadingContainer}>
                          <Text style={{ color: '#EF4444', fontSize: 12 }}>Hata: {detailError}</Text>
                        </View>
                      ) : details && details.length > 0 ? (
                        <View style={styles.detailSection}>
                          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Sipariş Kalemleri</Text>
                          {details.map((det, idx) => (
                            <View key={det.id} style={[styles.detailItem, idx > 0 && { borderTopWidth: 1, borderTopColor: isDark ? colors.border : '#F1F5F9' }]}>
                              {/* Satır 1: Ürün adı + Toplam fiyat */}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                  <Text style={[styles.detailItemName, { color: colors.text }]} numberOfLines={1}>
                                    {det.modelAdi || det.stokAdi || 'Ürün'}{det.varyantAdi ? <Text style={{ color: '#8B5CF6' }}> · {det.varyantAdi}</Text> : null}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                  {det.miktar.toLocaleString('tr-TR')} × {formatAmount(det.fiyat)} = <Text style={{ fontWeight: '700', color: '#10B981' }}>{formatAmount(det.fiyat * det.miktar)} {det.doviz}</Text>
                                </Text>
                              </View>

                              {/* Satır 2: KDV · İndirim · Hammadde tek satırda */}
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4, gap: 4 }}>
                                {det.indirim > 0 && (
                                  <Text style={{ fontSize: 10, color: '#EF4444', backgroundColor: isDark ? '#EF444415' : '#FEF2F2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                    İnd. {det.indirimTip === 1 ? `%${det.indirim}` : formatAmount(det.indirim)}
                                  </Text>
                                )}
                              </View>

                              {/* Maliyet */}
                              {det.maliyetFiyat > 0 && (
                                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>Maliyet: <Text style={{ fontWeight: '600', color: colors.text }}>{formatAmount(det.maliyetFiyat)}</Text></Text>
                              )}

                              {/* Beden Dağılımı */}
                              {det.bedenler && det.bedenler.length > 0 && (
                                <View style={[styles.bedenRow, { marginTop: 6 }]}>
                                  {det.bedenler.map((b, bi) => (
                                    <View key={bi} style={[styles.bedenChip, { backgroundColor: isDark ? colors.background : '#F0F4FF' }]}>
                                      <Text style={styles.bedenChipLabel}>{b.beden}</Text>
                                      <Text style={[styles.bedenChipValue, { color: colors.text }]}>{b.miktar}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              {/* Açıklama */}
                              {det.aciklama ? (
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }} numberOfLines={2}>{det.aciklama}</Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {/* Açıklama */}
                      {item.aciklama ? (
                        <Text style={[styles.cardNote, { color: colors.textSecondary }]} numberOfLines={3}>{item.aciklama}</Text>
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
                          onPress={(e) => { e.stopPropagation(); handleOpenDetayForm(item); }}
                        >
                          <Icon name="add-circle-outline" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Detay</Text>
                        </Pressable>
                        {item.uretim === 0 ? (
                          <Pressable
                            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                            onPress={(e) => { e.stopPropagation(); handleUretimeAlPress(item); }}
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
                          style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                          onPress={(e) => { e.stopPropagation(); handleRecetePress(item); }}
                        >
                          <Icon name="document-text-outline" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Reçete</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: '#0EA5E9' }]}
                          onPress={(e) => { e.stopPropagation(); handleSharePDF(item); }}
                        >
                          <Icon name="share-outline" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>PDF</Text>
                        </Pressable>
                        {item.aktif !== -2 && item.durum !== 'iptal' && item.durum !== 'uretimde' && (
                          <Pressable
                            style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                            onPress={(e) => { e.stopPropagation(); handleCancelOrder(item); }}
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

        {/* PDF Seçim Modalı */}
        <Modal
          visible={pdfModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPdfModalVisible(false)}
        >
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setPdfModalVisible(false)}>
            <Pressable style={{ backgroundColor: isDark ? colors.card : '#fff', borderRadius: 16, padding: 24, width: '80%', maxWidth: 320 }} onPress={() => {}}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                <Icon name="document-text-outline" size={22} color={colors.primary} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>PDF Paylaş</Text>
              </View>
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: isDark ? colors.background : '#F0FDF4', borderWidth: 1, borderColor: '#10B981', borderRadius: 12, padding: 14, marginBottom: 10 }}
                onPress={() => handlePdfGenerate(true)}
              >
                <Icon name="cash-outline" size={22} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Fiyatlı</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>Fiyat ve toplam bilgileri ile</Text>
                </View>
                <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: isDark ? colors.background : '#EFF6FF', borderWidth: 1, borderColor: '#3B82F6', borderRadius: 12, padding: 14 }}
                onPress={() => handlePdfGenerate(false)}
              >
                <Icon name="eye-off-outline" size={22} color="#3B82F6" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Fiyatsız</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>Model, varyant ve miktar</Text>
                </View>
                <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Üretime Al Onay Modalı */}
        <Modal
          visible={uretimModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => !uretimLoading && setUretimModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalIconWrap}>
                <Icon name="construct-outline" size={32} color="#10B981" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Üretime Al</Text>
              <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{uretimSiparis?.siparisKodu}</Text>
                {'\n'}kodlu siparişi üretime almak istediğinize emin misiniz?
              </Text>
              {uretimSiparis && (
                <View style={[styles.modalInfo, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                  <Text style={[styles.modalInfoText, { color: colors.text }]}>{uretimSiparis.cariAdi}</Text>
                  <Text style={[styles.modalInfoSub, { color: colors.textSecondary }]}>
                    {uretimSiparis.detaySayisi} kalem · {uretimSiparis.miktar.toLocaleString('tr-TR')} adet
                  </Text>
                </View>
              )}
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]}
                  onPress={() => setUretimModalVisible(false)}
                  disabled={uretimLoading}
                >
                  <Icon name="close-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>İptal</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={handleUretimeAlConfirm}
                  disabled={uretimLoading}
                >
                  {uretimLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="checkmark-outline" size={18} color="#fff" />
                      <Text style={[styles.modalBtnText, { color: '#fff' }]}>Onayla</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Reçete Modal */}
        <Modal
          visible={receteModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setReceteModalVisible(false)}
        >
          <View style={styles.receteModalOverlay}>
            <View style={[styles.receteModalContent, { backgroundColor: isDark ? colors.card : '#fff' }]}>
              {/* Header */}
              <View style={styles.receteModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.receteModalTitle, { color: colors.text }]}>Reçete</Text>
                  {receteSiparis && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{receteSiparis.siparisKodu} · {receteSiparis.cariAdi}</Text>
                  )}
                </View>
                <Pressable onPress={() => setReceteModalVisible(false)} style={styles.receteCloseBtn}>
                  <Icon name="close" size={22} color={colors.text} />
                </Pressable>
              </View>

              {receteLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : receteItems.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name="document-text-outline" size={48} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 14 }}>Reçete kaydı bulunamadı</Text>
                </View>
              ) : (
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {/* Özet */}
                  {receteSummary.length > 0 && (
                    <View style={[styles.receteSummaryRow, { borderBottomColor: isDark ? colors.border : '#F1F5F9' }]}>
                      {receteSummary.map((s, i) => (
                        <View key={i} style={[styles.receteSummaryItem, { backgroundColor: isDark ? colors.background : '#F0FDF4' }]}>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Toplam</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>{formatAmount(s.toplam)} <Text style={{ fontSize: 11, fontWeight: '500' }}>{s.doviz}</Text></Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Kalemler - kalem tipine göre grupla */}
                  {(() => {
                    const grouped: Record<string, ReceteItem[]> = {};
                    receteItems.forEach(item => {
                      const key = item.kalemTipiLabel;
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(item);
                    });
                    return Object.entries(grouped).map(([grupAdi, items]) => (
                      <View key={grupAdi} style={{ marginBottom: 12 }}>
                        <Text style={[styles.receteGroupTitle, { color: colors.primary }]}>{grupAdi}</Text>
                        {items.map((r, ri) => (
                          <View key={r.id} style={[styles.receteItem, ri > 0 && { borderTopWidth: 1, borderTopColor: isDark ? colors.border : '#F1F5F9' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                                  {r.varyantAdi || r.stokAdi || r.islemAdi || 'Kalem'}
                                </Text>
                                {r.malzemeTipi ? (
                                  <Text style={{ fontSize: 10, color: '#8B5CF6', marginTop: 1 }}>{r.malzemeTipi}</Text>
                                ) : null}
                              </View>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>
                                {formatAmount(r.toplamTutar)} <Text style={{ fontSize: 10, fontWeight: '500', color: colors.textSecondary }}>{r.doviz}</Text>
                              </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                              {r.miktar.toLocaleString('tr-TR')} {r.birimAdi} × {formatAmount(r.birimFiyat)}
                            </Text>
                            {r.aciklama ? (
                              <Text style={{ fontSize: 10, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 }} numberOfLines={2}>{r.aciklama}</Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    ));
                  })()}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Sipariş Form BottomSheet */}
        <BottomSheet
          visible={formModalVisible}
          onClose={() => setFormModalVisible(false)}
          title={formEditingItem ? `Sipariş Düzenle - ${formEditingItem.siparisKodu}` : 'Yeni Sipariş'}
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
              {/* Sipariş Kodu & Döviz */}
              <View style={[styles.formRow, { gap: 10 }]}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Sipariş Kodu</Text>
                  <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: formFieldErrors.errors.siparisKodu ? colors.danger : colors.inputBorder }]}>
                    <Icon name="barcode-outline" size={18} color={formFieldErrors.errors.siparisKodu ? colors.danger : colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.formInputText, { color: colors.text }]}
                      value={formSiparisKodu}
                      onChangeText={(v) => { setFormSiparisKodu(v); formFieldErrors.clearFieldError('siparisKodu'); }}
                      placeholder="ORD..."
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>
                <View style={{ width: 110 }}>
                  <DovizSelect
                    value={formDoviz}
                    dovizTipleri={formDovizTipleri}
                    onSelect={(v) => { setFormDoviz(v); formFieldErrors.clearFieldError('doviz'); }}
                    shortLabel
                    containerStyle={{ marginBottom: 0 }}
                    error={formFieldErrors.errors.doviz}
                    shake={formFieldErrors.shakes.doviz}
                  />
                </View>
              </View>

              {/* Cari */}
              <View style={styles.formRow}>
                <View style={[styles.formField, { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <SelectInput
                      label="Cari"
                      icon="person-outline"
                      placeholder="Cari seçiniz..."
                      value={formCariId}
                      items={formCariler.map(c => ({ id: c.id.toString(), label: c.unvan }))}
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

              {/* Teslim Şekli & Paketleme */}
              <View style={[styles.formRow, { gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="TESLIM_SEKLI"
                    label="Teslim Şekli"
                    placeholder="Seçiniz..."
                    value={formTeslimSekliId}
                    onSelect={setFormTeslimSekliId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="PAKETLEME"
                    label="Paketleme"
                    placeholder="Seçiniz..."
                    value={formPaketlemeId}
                    onSelect={setFormPaketlemeId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* Müşteri Sipariş Kodu & Müşteri Şube */}
              <View style={[styles.formRow, { gap: 10 }]}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Müşteri Sip. Kodu</Text>
                  <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                    <Icon name="document-text-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.formInputText, { color: colors.text }]}
                      value={formMusteriSiparisKodu}
                      onChangeText={setFormMusteriSiparisKodu}
                      placeholder="Opsiyonel"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Müşteri Şube</Text>
                  <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                    <Icon name="business-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.formInputText, { color: colors.text }]}
                      value={formMusteriSube}
                      onChangeText={setFormMusteriSube}
                      placeholder="Opsiyonel"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
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
                    onPress={() => setFormAvansRows(prev => [...prev, { tutar: '', doviz: formDoviz, dovizliTutar: '', aciklama: '', cariIslendi: false }])}
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
                              const numVal = parseFloat(v) || 0;
                              const converted = dovizService.convert(numVal, formDoviz, row.doviz, formKurlar, activeKurTipi);
                              updated[idx] = { ...updated[idx], tutar: v, dovizliTutar: converted ? converted.toFixed(2) : '' };
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
                            const numVal = parseFloat(row.tutar) || 0;
                            const converted = dovizService.convert(numVal, formDoviz, v, formKurlar, activeKurTipi);
                            updated[idx] = { ...updated[idx], doviz: v, dovizliTutar: converted ? converted.toFixed(2) : '' };
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

        {/* Sipariş Detay Form */}
        <SiparisDetayForm
          visible={detayFormVisible}
          onClose={() => setDetayFormVisible(false)}
          onSave={handleSaveDetay}
          saving={detayFormSaving}
          bedenSetleri={detayBedenSetleri}
          dovizTipleri={formDovizTipleri}
          defaultDoviz={detayFormSiparis?.doviz || 'USD'}
          varyantlar={detayVaryantlar}
          varyantLoading={detayVaryantLoading}
          onModelChange={handleDetayModelChange}
          toastRef={detayToastRef}
        />

        {/* Toast - en üstte görünmesi için en son render */}
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
    {/* Cari Ekleme Modal - en dışta, BottomSheet üzerinde açılabilmesi için */}
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
    pageHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
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
    scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },
    emptyContainer: { flex: 1 },
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
    statCardActive: {
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: '700' },

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

    // Order Card
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

    // Quick Info
    quickInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    quickInfoBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    },
    quickInfoText: { fontSize: 11, fontWeight: '500' },

    // Card Detail
    cardDetail: { marginTop: 6, paddingTop: 6, borderTopWidth: 1 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    infoItem: { minWidth: '45%', borderRadius: 8, padding: 6 },
    infoLabel: { fontSize: 11, marginBottom: 3 },
    infoValue: { fontSize: 13, fontWeight: '600' },

    // Progress
    progressSection: { marginBottom: 10, borderRadius: 10, padding: 6 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressLabel: { fontSize: 12, fontWeight: '600' },
    progressPercent: { fontSize: 13, fontWeight: '700', color: '#3B82F6' },
    progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
    progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    progressInfoText: { fontSize: 11 },

    // Detail Items
    detailSection: { marginBottom: 10 },
    detailSectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
    detailItem: { paddingVertical: 10 },
    detailItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    detailItemName: { fontSize: 13, fontWeight: '600' },
    detailItemCode: { fontSize: 11, marginTop: 2 },
    detailItemRight: { alignItems: 'flex-end', marginLeft: 8 },
    detailItemPrice: { fontSize: 13, fontWeight: '600', color: '#10B981' },
    detailItemQty: { fontSize: 11, marginTop: 2 },

    // Beden
    bedenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    bedenChip: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, gap: 4,
    },
    bedenChipLabel: { fontSize: 11, fontWeight: '600', color: '#6366F1' },
    bedenChipValue: { fontSize: 11, fontWeight: '700' },

    // Detail price grid
    detailPriceGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8,
      padding: 8, borderRadius: 8,
    },
    detailPriceItem: { minWidth: '28%' },
    detailPriceLabel: { fontSize: 10, marginBottom: 2 },
    detailPriceValue: { fontSize: 12, fontWeight: '600' },

    // Detail badges
    detailItemFooter: { flexDirection: 'row', gap: 6, marginTop: 8 },
    detailBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    detailBadgeText: { fontSize: 11, fontWeight: '600' },

    // Loading
    detailLoadingContainer: { paddingVertical: 16, alignItems: 'center' },
    detailLoadingText: { fontSize: 12 },

    // Footer
    cardNote: { fontSize: 12, marginTop: 1, marginBottom: 6, fontStyle: 'italic' },
    cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    branchTag: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    },
    branchTagText: { fontSize: 11 },

    // Üretime Al Butonu
    cardBottomButtons: {
      flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
      gap: 6, marginTop: 0,
    },
    actionBtn: {
      flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 2, paddingVertical: 8, borderRadius: 8,
    },
    actionBtnText: { fontSize: 11, fontWeight: '600', color: '#fff' },

    // Reçete Modal
    receteModalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    receteModalContent: {
      maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 16, paddingBottom: 30,
    },
    receteModalHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 16, borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#F1F5F9',
    },
    receteModalTitle: { fontSize: 18, fontWeight: '700' },
    receteCloseBtn: { padding: 4 },
    receteSummaryRow: {
      flexDirection: 'row', gap: 8, paddingVertical: 12,
      borderBottomWidth: 1,
    },
    receteSummaryItem: {
      flex: 1, padding: 10, borderRadius: 10, alignItems: 'center',
    },
    receteGroupTitle: {
      fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 6,
    },
    receteItem: { paddingVertical: 8 },

    // Modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalContent: {
      width: '100%', borderRadius: 16, padding: 24, alignItems: 'center',
    },
    modalIconWrap: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: '#10B98115', alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    modalMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    modalInfo: {
      width: '100%', borderRadius: 10, padding: 12, marginBottom: 20, alignItems: 'center',
    },
    modalInfoText: { fontSize: 14, fontWeight: '600' },
    modalInfoSub: { fontSize: 12, marginTop: 4 },
    modalButtons: { flexDirection: 'row', gap: 10, width: '100%' },
    modalBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 12, borderRadius: 10,
    },
    modalBtnCancel: { borderWidth: 1 },
    modalBtnConfirm: { backgroundColor: '#10B981' },
    modalBtnText: { fontSize: 14, fontWeight: '600' },

    // Sipariş Form Modal
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
    formFooter: {
      flexDirection: 'row', gap: 10, paddingTop: 12,
      borderTopWidth: 1, borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
  });
