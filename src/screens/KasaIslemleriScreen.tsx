import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Image, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import Tab, { TabOption } from '../components/Tab';
import AddButton from '../components/AddButton';
import BottomSheet, { BottomSheetToastRef } from '../components/BottomSheet';
import SelectInput from '../components/SelectInput';
import Input from '../components/Input';
import Button from '../components/Button';
import DatePickerModal from '../components/DatePickerModal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFieldErrors } from '../hooks/useFieldErrors';
import accountService from '../services/account.service';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import dovizService from '../services/doviz.service';
import ordersService, { DovizTipi } from '../services/orders.service';
import DovizSelect from '../components/DovizSelect';
import ImagePickerModal from '../components/ImagePickerModal';
import CariSelectWithAdd from '../components/CariSelectWithAdd';
import ConfirmDialog from '../components/ConfirmDialog';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

interface KasaIslemleriScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

interface KasaFis {
  id: number;
  fisNo: string;
  fisTipi: string;
  fisTarihi: string;
  fisAciklama: string;
  kasaHesapKodu: string;
  kasaUnvan: string;
  kasaDoviz: string;
  kasaDurum: number;
  subeAdi: string;
  kayitTarihi: string;
}

interface KasaBakiyeItem {
  doviz: string;
  borc: number;
  alacak: number;
  bakiye: number;
}

interface KasaHareketItem {
  id: number;
  hesapKodu: string;
  unvan: string;
  aciklama: string;
  tutar: number;
  doviz: string;
}

interface KasaDetailData {
  bakiye: KasaBakiyeItem[];
  girisler: KasaHareketItem[];
  cikislar: KasaHareketItem[];
}

interface KasaCari {
  id: number;
  hesapKodu: string;
  unvan: string;
  subeAdi: string;
}

type KasaDurumTab = 'acik' | 'kapali';

const KASA_DURUM_TABS: TabOption<KasaDurumTab>[] = [
  { id: 'acik', label: 'Açık Kasalar', icon: 'lock-open-outline' },
  { id: 'kapali', label: 'Kapalı Kasalar', icon: 'lock-closed-outline' },
];

export default function KasaIslemleriScreen({ onGoBack, onTabChange, onLogout }: KasaIslemleriScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount, user } = useAuth();
  const { showError, showSuccess } = useAlert();
  const fieldErrors = useFieldErrors();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  // List state
  const [kasaList, setKasaList] = useState<KasaFis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [kasaDurumFilter, setKasaDurumFilter] = useState<'acik' | 'kapali'>('acik');
  const [expandedKasaId, setExpandedKasaId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<Record<number, KasaDetailData>>({});
  const [detailLoading, setDetailLoading] = useState<number | null>(null);
  const [hareketTab, setHareketTab] = useState<'girisler' | 'cikislar'>('girisler');

  // Hareket ekleme state
  const [hareketFormVisible, setHareketFormVisible] = useState(false);
  const [hareketFormSaving, setHareketFormSaving] = useState(false);
  const [hareketTipi, setHareketTipi] = useState<'giris' | 'cikis'>('giris');
  const [hareketKasaId, setHareketKasaId] = useState<number | null>(null);
  const [hareketKasaLabel, setHareketKasaLabel] = useState('');
  const [hareketCariHesapKodu, setHareketCariHesapKodu] = useState('');
  const [hareketAciklama, setHareketAciklama] = useState('');
  const [hareketDovizliTutar, setHareketDovizliTutar] = useState('');
  const [hareketDovizliDoviz, setHareketDovizliDoviz] = useState('TL');
  const [hareketDovizliKur, setHareketDovizliKur] = useState('1');
  const [hareketMuhasebeTutar, setHareketMuhasebeTutar] = useState('');
  const [hareketMuhasebeDoviz, setHareketMuhasebeDoviz] = useState('TL');
  const [varsayilanDoviz, setVarsayilanDoviz] = useState('TL');
  const [hareketMuhasebeKur, setHareketMuhasebeKur] = useState('1');
  const [hareketCariTutar, setHareketCariTutar] = useState('');
  const [hareketCariDoviz, setHareketCariDoviz] = useState('TL');
  const [hareketCariKur, setHareketCariKur] = useState('1');
  const [cariList, setCariList] = useState<{ id: string; label: string; unvan?: string; doviz?: string }[]>([]);
  const [cariListLoading, setCariListLoading] = useState(false);
  const [selectedCari, setSelectedCari] = useState<{ id: string; label: string; unvan?: string; doviz?: string } | null>(null);
  const kurlarRef = useRef<Record<string, any>>({});

  const loadKurlar = async (tarih?: Date): Promise<Record<string, any>> => {
    try {
      const token = await authService.getToken();
      if (!token) { console.log('KURLAR: token yok'); return {}; }
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const tarihStr = tarih ? `${tarih.getFullYear()}-${String(tarih.getMonth() + 1).padStart(2, '0')}-${String(tarih.getDate()).padStart(2, '0')}` : undefined;
      console.log('KURLAR_FETCH:', tarihStr, dataName);
      const response = await dovizService.getKurlar(token, dataName, tarihStr);
      console.log('KURLAR_RESP:', response.success, Object.keys(response.data?.kurlar || {}).length);
      if (response.success && response.data?.kurlar) {
        kurlarRef.current = response.data.kurlar;
        return response.data.kurlar;
      }
    } catch (e: any) { console.log('KURLAR_ERR:', e.message); }
    return {};
  };
  const [dovizTipleri, setDovizTipleri] = useState<DovizTipi[]>([]);
  const [hareketImageUri, setHareketImageUri] = useState<string | null>(null);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const hareketToastRef = useRef<BottomSheetToastRef | null>(null);
  const hareketFieldErrors = useFieldErrors();

  // Form state
  const [formVisible, setFormVisible] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formKasaHesapKodu, setFormKasaHesapKodu] = useState('');
  const [editingKasa, setEditingKasa] = useState<any>(null);
  const [deleteKasaItem, setDeleteKasaItem] = useState<any>(null);
  const [deleteHareketItem, setDeleteHareketItem] = useState<any>(null);
  const [kapatKasaItem, setKapatKasaItem] = useState<any>(null);
  const [menuKasaId, setMenuKasaId] = useState<number | null>(null);
  const [editingHareket, setEditingHareket] = useState<any>(null);
  const [formTarih, setFormTarih] = useState(new Date());
  const [formAciklama, setFormAciklama] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Kasa cari list (for SelectInput)
  const [kasaCariList, setKasaCariList] = useState<KasaCari[]>([]);
  const [kasaCariLoading, setKasaCariLoading] = useState(false);

  // Subeler
  const [subeler, setSubeler] = useState<{ id: string; label: string }[]>([]);
  const [selectedSubeId, setSelectedSubeId] = useState('');
  const [subelerLoaded, setSubelerLoaded] = useState(false);

  const formToastRef = useRef<BottomSheetToastRef | null>(null);
  const styles = createStyles(colors, isDark);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === 'dashboard') onGoBack();
    onTabChange?.(tab);
  };

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  // Load subeler
  const loadSubeler = useCallback(async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const response = await fetch(
        `${require('../config/env').BASE_URL}/user/subeler`,
        { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success && data.data?.subeler) {
        const mapped = data.data.subeler.map((s: any) => ({ id: String(s.id), label: s.name || s.subeAdi }));
        setSubeler(mapped);
        const varsayilan = data.data.varsayilanSube ? String(data.data.varsayilanSube) : '';
        if (varsayilan) setSelectedSubeId(varsayilan);
        else if (mapped.length > 0) setSelectedSubeId(mapped[0].id);
        setSubelerLoaded(true);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadSubeler();
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
      } catch {}
    })();
  }, []);

  // Load kasa list
  const loadKasaList = useCallback(async (subeId?: string) => {
    try {
      setIsLoading(true);
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const sId = subeId || selectedSubeId;
      const response = await accountService.getKasaList(token, dataName, sId ? parseInt(sId) : undefined, kasaDurumFilter);
      if (response.success) {
        setKasaList(response.data?.data || response.data || []);
      } else {
        console.log('Kasa list response:', JSON.stringify(response));
      }
    } catch (err: any) {
      console.log('Kasa list error:', err.message);
      showError(err.message || 'Kasa listesi alınamadı');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedSubeId, kasaDurumFilter]);

  useEffect(() => {
    if (subelerLoaded && selectedSubeId) loadKasaList(selectedSubeId);
  }, [subelerLoaded, selectedSubeId, kasaDurumFilter]);

  // Load kasa cari list for select (şubeye göre)
  const loadKasaCariList = useCallback(async () => {
    try {
      setKasaCariLoading(true);
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const subeId = selectedSubeId ? parseInt(selectedSubeId) : undefined;
      const response = await accountService.getCariList(token, dataName, 'safes', '', subeId, '100');
      if (response.success) {
        setKasaCariList((response.data?.data || []).map((c: any) => ({ ...c, subeAdi: c.sube || '' })));
      }
    } catch (_) {}
    finally { setKasaCariLoading(false); }
  }, [user, selectedSubeId]);

  const handleOpenForm = () => {
    setEditingKasa(null);
    fieldErrors.clearAll();
    setFormKasaHesapKodu('');
    setFormTarih(new Date());
    setFormAciklama('');
    setFormVisible(true);
    loadKasaCariList();
  };

  const handleKapatKasa = async () => {
    if (!kapatKasaItem) return;
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const res = await fetch(API_ENDPOINTS.ACCOUNT_KASA_UPDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dataName, kasaId: kapatKasaItem.id, kasaDurum: 0 }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Kasa kapatıldı');
        setDetailData({});
        loadKasaList();
      } else {
        showError(data.error?.message || 'Kapatılamadı');
      }
    } catch (err: any) {
      showError(err.message || 'Kapatılamadı');
    } finally {
      setKapatKasaItem(null);
    }
  };

  const handleDeleteKasa = async () => {
    if (!deleteKasaItem) return;
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const res = await fetch(API_ENDPOINTS.ACCOUNT_KASA_DELETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dataName, kasaId: deleteKasaItem.id }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Kasa silindi');
        setDetailData({});
        loadKasaList();
      } else {
        showError(data.error?.message || data.message || 'Silinemedi');
      }
    } catch (err: any) {
      showError(err.message || 'Silinemedi');
    } finally {
      setDeleteKasaItem(null);
    }
  };

  const handleEditHareket = (kasaItem: any, hareket: any, tipi: 'giris' | 'cikis') => {
    setEditingHareket(hareket);
    hareketFieldErrors.clearAll();
    setHareketKasaId(kasaItem.id);
    setHareketKasaLabel(kasaItem.kasaUnvan || kasaItem.kasaHesapKodu);
    setHareketTipi(tipi);
    setHareketCariHesapKodu(hareket.hesapKodu || '');
    setHareketAciklama(hareket.aciklama || '');
    if (hareket.hesapKodu) {
      setSelectedCari({
        id: hareket.hesapKodu,
        label: `${hareket.unvan || hareket.hesapKodu} (${hareket.hesapKodu}) [${hareket.cariDoviz || hareket.doviz || 'TL'}]`,
        unvan: hareket.unvan || '',
        doviz: hareket.cariDoviz || hareket.doviz || '',
      });
    } else {
      setSelectedCari(null);
    }
    setHareketDovizliTutar(String(hareket.tutar || ''));
    setHareketDovizliDoviz(hareket.doviz || 'TL');
    setHareketDovizliKur(String(hareket.dovizKuru || '1'));
    setHareketMuhasebeTutar(String(hareket.muhasebeTutar || ''));
    setHareketMuhasebeDoviz(hareket.muhasebeDoviz || varsayilanDoviz);
    setHareketMuhasebeKur(String(hareket.muhasebeKur || '1'));
    setHareketCariTutar(String(hareket.cariTutar || ''));
    setHareketCariDoviz(hareket.cariDoviz || varsayilanDoviz);
    setHareketCariKur(String(hareket.cariKur || '1'));
    setHareketImageUri(null);
    setHareketFormVisible(true);

    const kasa = kasaList.find((k: any) => k.id === kasaItem.id);
    const fisTarihi = kasa?.fisTarihi ? new Date(kasa.fisTarihi) : new Date();
    loadKurlar(fisTarihi).then(k => { kurlarRef.current = k; });
    loadCariList();
    loadDovizTipleri();
  };

  const handleDeleteHareket = async () => {
    if (!deleteHareketItem) return;
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const res = await fetch(API_ENDPOINTS.ACCOUNT_KASA_HAREKET_DELETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dataName, detayId: deleteHareketItem.hareket.id }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Hareket silindi');
        setDetailData({});
        loadKasaList();
      } else {
        showError(data.error?.message || 'Silinemedi');
      }
    } catch (err: any) {
      showError(err.message || 'Silinemedi');
    } finally {
      setDeleteHareketItem(null);
    }
  };

  const handleOpenEditKasa = (item: any) => {
    setEditingKasa(item);
    fieldErrors.clearAll();
    setFormKasaHesapKodu(item.kasaHesapKodu || '');
    setFormTarih(item.fisTarihi ? new Date(item.fisTarihi) : new Date());
    setFormAciklama(item.fisAciklama || '');
    setFormVisible(true);
    loadKasaCariList();
  };

  const handleSave = async () => {
    if (!fieldErrors.validateRequired({ kasa: formKasaHesapKodu })) return;
    if (!selectedSubeId) {
      showError('Şube bilgisi bulunamadı');
      return;
    }

    setFormSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      const fisTarihi = formTarih.getFullYear() + '-' +
        String(formTarih.getMonth() + 1).padStart(2, '0') + '-' +
        String(formTarih.getDate()).padStart(2, '0') + ' 00:00:00';

      let response;
      if (editingKasa) {
        response = await accountService.updateKasa(token, dataName, editingKasa.id, {
          kasaHesapKodu: formKasaHesapKodu,
          fisTarihi,
          fisAciklama: formAciklama.trim(),
        });
      } else {
        response = await accountService.createKasa(token, dataName, {
          kasaHesapKodu: formKasaHesapKodu,
          fisTarihi,
          fisAciklama: formAciklama.trim(),
          subeId: parseInt(selectedSubeId),
        });
      }

      if (response.success) {
        formToastRef.current?.show({ type: 'success', text: editingKasa ? 'Kasa güncellendi' : 'Kasa fişi oluşturuldu' });
        setDetailData({});
        loadKasaList();
        setTimeout(() => { setFormVisible(false); setEditingKasa(null); }, 1200);
      } else {
        formToastRef.current?.show({ type: 'error', text: response.message || 'İşlem başarısız' });
      }
    } catch (err: any) {
      formToastRef.current?.show({ type: 'error', text: err.message || 'Kasa oluşturulamadı' });
    } finally {
      setFormSaving(false);
    }
  };

  const loadDovizTipleri = useCallback(async () => {
    if (dovizTipleri.length > 0) return;
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const response = await ordersService.getLookups(token, dataName);
      if (response.success && response.data?.dovizTipleri) {
        setDovizTipleri(response.data.dovizTipleri);
      }
    } catch (_) {}
  }, [dovizTipleri.length, user]);

  // Ref-based kur fonksiyonları (closure sorununu çözer)
  const getKurFromRef = (doviz: string): string => {
    if (!doviz || doviz === 'TL') return '1';
    const kur = kurlarRef.current[doviz];
    return kur ? String(kur.dovizAlis || 1) : '1';
  };

  const convertFromRef = (tutar: number, kaynak: string, hedef: string): string => {
    if (kaynak === hedef) return tutar.toFixed(2);
    const kaynakKur = kaynak === 'TL' ? 1 : (kurlarRef.current[kaynak]?.dovizAlis || 1);
    const hedefKur = hedef === 'TL' ? 1 : (kurlarRef.current[hedef]?.dovizAlis || 1);
    return (tutar * kaynakKur / hedefKur).toFixed(2);
  };

  const recalcFromDovizli = (tutar: string, dovizliDoviz?: string) => {
    const numTutar = parseFloat(tutar.replace(',', '.')) || 0;
    const dd = dovizliDoviz || hareketDovizliDoviz;
    setHareketMuhasebeTutar(convertFromRef(numTutar, dd, hareketMuhasebeDoviz));
    setHareketCariTutar(convertFromRef(numTutar, dd, hareketCariDoviz));
  };

  const handleDovizliDovizChange = (doviz: string) => {
    setHareketDovizliDoviz(doviz);
    setHareketDovizliKur(getKurFromRef(doviz));
    recalcFromDovizli(hareketDovizliTutar, doviz);
  };

  const handleCariDovizChange = (doviz: string) => {
    setHareketCariDoviz(doviz);
    setHareketCariKur(getKurFromRef(doviz));
    const numTutar = parseFloat(hareketDovizliTutar.replace(',', '.')) || 0;
    setHareketCariTutar(convertFromRef(numTutar, hareketDovizliDoviz, doviz));
  };

  const handleCamera = async () => {
    try {
      const result = await launchCamera({ mediaType: 'photo', quality: 0.8, maxWidth: 1024, maxHeight: 1024 });
      if (result.assets?.[0]?.uri) setHareketImageUri(result.assets[0].uri);
    } catch (_) {}
  };

  const handleGallery = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, maxWidth: 1024, maxHeight: 1024, selectionLimit: 1 });
      if (result.assets?.[0]?.uri) setHareketImageUri(result.assets[0].uri);
    } catch (_) {}
  };


  // Cari listesi yükle (100% hariç) - server-side arama destekli
  const fetchCariList = useCallback(async (search: string = '') => {
    setCariListLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const response = await accountService.getCariList(token, dataName, 'all', search);
      if (response.success) {
        const items = (response.data?.data || [])
          .filter((c: any) => c.hesapKodu && !c.hesapKodu.startsWith('100'))
          .map((c: any) => ({ id: c.hesapKodu, label: `${c.unvan} (${c.hesapKodu}) [${c.doviz || 'TL'}]`, unvan: c.unvan || '', doviz: c.doviz || '' }));
        setCariList(items);
      }
    } catch (_) {}
    finally { setCariListLoading(false); }
  }, [user]);

  const loadCariList = useCallback(() => fetchCariList(''), [fetchCariList]);

  const handleOpenHareketForm = async (kasaId: number, kasaLabel: string, tipi: 'giris' | 'cikis') => {
    hareketFieldErrors.clearAll();
    setHareketKasaId(kasaId);
    setHareketKasaLabel(kasaLabel);
    setHareketTipi(tipi);
    setHareketCariHesapKodu('');
    setHareketAciklama('');
    setSelectedCari(null);
    setHareketDovizliTutar('');
    setHareketMuhasebeTutar('');
    setHareketCariTutar('');

    // Kasanın fiş tarihindeki kurları çek
    const kasa = kasaList.find((k: any) => k.id === kasaId);
    const fisTarihi = kasa?.fisTarihi ? new Date(kasa.fisTarihi) : new Date();
    const yeniKurlar = await loadKurlar(fisTarihi);
    kurlarRef.current = yeniKurlar;
    console.log('KURLAR_LOADED:', Object.keys(yeniKurlar).length, 'USD:', yeniKurlar['USD']?.dovizAlis);

    // Kasanın dövizini set et (yeniKurlar'dan kur al)
    const kasaDoviz = kasa?.kasaDoviz || 'TL';
    const kurFromNew = (d: string) => d === 'TL' ? '1' : String(yeniKurlar[d]?.dovizAlis || 1);
    setHareketDovizliDoviz(kasaDoviz);
    setHareketDovizliKur(kurFromNew(kasaDoviz));

    setHareketMuhasebeDoviz(varsayilanDoviz);
    setHareketMuhasebeKur(kurFromNew(varsayilanDoviz));

    setHareketCariDoviz(varsayilanDoviz);
    setHareketCariKur(kurFromNew(varsayilanDoviz));
    setHareketImageUri(null);
    setHareketFormVisible(true);
    loadCariList();
    loadDovizTipleri();
  };

  const handleSaveHareket = async () => {
    if (!hareketFieldErrors.validateRequired({ cari: hareketCariHesapKodu, dovizliTutar: hareketDovizliTutar })) return;
    const dovizliTutar = parseFloat(hareketDovizliTutar.replace(',', '.'));
    if (isNaN(dovizliTutar) || dovizliTutar <= 0) {
      hareketFieldErrors.setFieldError('dovizliTutar');
      return;
    }

    setHareketFormSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      if (editingHareket) {
        // Düzenleme - random ile eşleyerek güncelle
        const kasaItem = kasaList.find((k: any) => k.id === hareketKasaId);
        const updateRes = await fetch(API_ENDPOINTS.ACCOUNT_KASA_HAREKET_UPDATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            dataName,
            detayId: editingHareket.id,
            hesapKodu: hareketCariHesapKodu,
            kasaHesapKodu: kasaItem?.kasaHesapKodu || '',
            aciklama: hareketAciklama.trim(),
            tutar: dovizliTutar,
            doviz: hareketDovizliDoviz,
            dovizKuru: parseFloat(hareketDovizliKur.replace(',', '.')) || 1,
            muhasebeTutar: parseFloat((hareketMuhasebeTutar || '0').replace(',', '.')) || dovizliTutar,
            muhasebeDoviz: hareketMuhasebeDoviz,
            muhasebeKuru: parseFloat(hareketMuhasebeKur.replace(',', '.')) || 1,
            cariTutar: parseFloat((hareketCariTutar || '0').replace(',', '.')) || dovizliTutar,
            cariDoviz: hareketCariDoviz,
            cariKuru: parseFloat(hareketCariKur.replace(',', '.')) || 1,
            tip: hareketTipi,
          }),
        });
        const updateData = await updateRes.json();
        if (updateData.success) {
          hareketToastRef.current?.show({ type: 'success', text: 'Hareket güncellendi' });
          setDetailData({});
          loadKasaList();
          setTimeout(() => { setHareketFormVisible(false); setEditingHareket(null); }, 1200);
        } else {
          hareketToastRef.current?.show({ type: 'error', text: updateData.error?.message || 'Güncelleme başarısız' });
        }
        setHareketFormSaving(false);
        return;
      }

      const response = await accountService.createKasaHareket(token, dataName, {
        fisMasterId: hareketKasaId!,
        hesapKodu: hareketCariHesapKodu,
        aciklama: hareketAciklama.trim(),
        tutar: dovizliTutar,
        doviz: hareketDovizliDoviz,
        dovizKuru: parseFloat(hareketDovizliKur.replace(',', '.')) || 1,
        muhasebeTutar: parseFloat((hareketMuhasebeTutar || '0').replace(',', '.')) || dovizliTutar,
        muhasebeDoviz: hareketMuhasebeDoviz,
        muhasebeKuru: parseFloat(hareketMuhasebeKur.replace(',', '.')) || 1,
        cariTutar: parseFloat((hareketCariTutar || '0').replace(',', '.')) || dovizliTutar,
        cariDoviz: hareketCariDoviz,
        cariKuru: parseFloat(hareketCariKur.replace(',', '.')) || 1,
        tip: hareketTipi,
        subeId: parseInt(selectedSubeId),
      });

      if (response.success) {
        // Fiş görseli varsa yükle
        if (hareketImageUri && response.data?.fisDetayId) {
          try {
            await accountService.uploadFisDosya(token, dataName, response.data.fisDetayId, parseInt(selectedSubeId), hareketImageUri);
          } catch (_) {
            // Dosya yükleme hatası hareketi engellemez
          }
        }
        hareketToastRef.current?.show({ type: 'success', text: `Kasa ${hareketTipi === 'giris' ? 'giriş' : 'çıkış'} kaydedildi` });
        // Detail cache temizle
        setDetailData(prev => {
          const next = { ...prev };
          delete next[hareketKasaId!];
          return next;
        });
        // Accordion'u yeniden yükle
        setTimeout(() => {
          toggleExpand(hareketKasaId!);
          setHareketFormVisible(false);
        }, 1200);
      } else {
        hareketToastRef.current?.show({ type: 'error', text: response.message || 'Hareket kaydedilemedi' });
      }
    } catch (err: any) {
      hareketToastRef.current?.show({ type: 'error', text: err.message || 'Hareket kaydedilemedi' });
    } finally {
      setHareketFormSaving(false);
    }
  };

  const toggleExpand = async (kasaId: number) => {
    if (expandedKasaId === kasaId) {
      setExpandedKasaId(null);
      return;
    }
    setExpandedKasaId(kasaId);
    setHareketTab('girisler');
    if (detailData[kasaId]) return;
    setDetailLoading(kasaId);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const response = await accountService.getKasaBakiye(token, dataName, kasaId);
      if (response.success) {
        setDetailData(prev => ({
          ...prev,
          [kasaId]: {
            bakiye: response.data?.data || [],
            girisler: response.data?.girisler || [],
            cikislar: response.data?.cikislar || [],
          },
        }));
      }
    } catch (_) {}
    finally { setDetailLoading(null); }
  };

  const formatMoney = (num: number) => {
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return String(d.getDate()).padStart(2, '0') + '.' +
      String(d.getMonth() + 1).padStart(2, '0') + '.' +
      d.getFullYear();
  };

  const kasaSelectItems = kasaCariList.map((k: any) => ({
    id: k.hesapKodu || k.hesap_kodu || '',
    label: `${k.unvan || k.hesap_kodu || k.hesapKodu || ''}`,
  }));

  const renderKasaItem = ({ item }: { item: KasaFis }) => {
    const statusColor = item.kasaDurum === 1 ? '#10B981' : '#EF4444';
    return (
      <View style={[styles.card, { backgroundColor: isDark ? colors.card : '#fff', borderColor: colors.border }]}>
        {/* Sol accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />

        <View style={styles.cardContent}>
          {/* Üst satır: Kasa adı + durum badge */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIcon, { backgroundColor: statusColor + '15' }]}>
                <Icon name="wallet-outline" size={16} color={statusColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.kasaUnvan || item.kasaHesapKodu} <Text style={{ fontSize: 12, fontWeight: '400', color: colors.textTertiary }}>- {item.kasaDoviz || 'TL'}</Text>
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textTertiary }]}>{item.kasaHesapKodu}</Text>
              </View>
            </View>
            <View style={[styles.cardBadge, { backgroundColor: statusColor + '15' }]}>
              <View style={[styles.cardBadgeDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.cardBadgeText, { color: statusColor }]}>{item.kasaDurum === 1 ? 'Açık' : 'Kapalı'}</Text>
            </View>
          </View>

          {/* Alt satır: Fiş no, tarih, şube */}
          <View style={styles.cardInfoRow}>
            <View style={styles.cardInfoItem}>
              <Icon name="document-text-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.cardInfoText, { color: colors.textSecondary }]}>{item.fisNo}</Text>
            </View>
            <View style={styles.cardInfoItem}>
              <Icon name="calendar-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.cardInfoText, { color: colors.textSecondary }]}>{formatDate(item.fisTarihi)}</Text>
            </View>
            {item.subeAdi ? (
              <View style={styles.cardInfoItem}>
                <Icon name="business-outline" size={12} color={colors.textTertiary} />
                <Text style={[styles.cardInfoText, { color: colors.textSecondary }]}>{item.subeAdi}</Text>
              </View>
            ) : null}
          </View>

          {/* Butonlar */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 6, marginTop: 6 }}>
            {item.kasaDurum === 1 && (
              <>
                <Pressable
                  style={[styles.hareketMiniBtn, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => handleOpenHareketForm(item.id, item.kasaUnvan || item.kasaHesapKodu, 'giris')}
                >
                  <Icon name="swap-vertical-outline" size={14} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Hareket</Text>
                </Pressable>
                <Pressable
                  style={[styles.hareketMiniBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}
                  onPress={() => setMenuKasaId(item.id)}
                >
                  <Icon name="settings-outline" size={14} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>İşlemler</Text>
                </Pressable>
              </>
            )}
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => toggleExpand(item.id)}
              style={[styles.expandBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}
            >
              <Icon
                name={expandedKasaId === item.id ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Detail Accordion */}
          {expandedKasaId === item.id && (
            <View style={[styles.bakiyeContainer, { borderTopColor: colors.border }]}>
              {detailLoading === item.id ? (
                <Text style={{ fontSize: 12, color: colors.textTertiary, textAlign: 'center', paddingVertical: 8 }}>Yükleniyor...</Text>
              ) : detailData[item.id] ? (
                <>
                  {/* Bakiye Özeti */}
                  {detailData[item.id].bakiye.length > 0 && (
                    <>
                      <View style={styles.bakiyeHeader}>
                        <Text style={[styles.bakiyeHeaderText, { color: colors.textTertiary, flex: 1 }]}>Döviz</Text>
                        <Text style={[styles.bakiyeHeaderText, { color: colors.textTertiary, flex: 1, textAlign: 'right' }]}>Borç</Text>
                        <Text style={[styles.bakiyeHeaderText, { color: colors.textTertiary, flex: 1, textAlign: 'right' }]}>Alacak</Text>
                        <Text style={[styles.bakiyeHeaderText, { color: colors.textTertiary, flex: 1, textAlign: 'right' }]}>Bakiye</Text>
                      </View>
                      {detailData[item.id].bakiye.map((b, i) => (
                        <View key={i} style={styles.bakiyeRow}>
                          <Text style={[styles.bakiyeCell, { color: colors.text, flex: 1, fontWeight: '600' }]}>{b.doviz}</Text>
                          <Text style={[styles.bakiyeCell, { color: '#EF4444', flex: 1, textAlign: 'right' }]}>{formatMoney(b.borc)}</Text>
                          <Text style={[styles.bakiyeCell, { color: '#10B981', flex: 1, textAlign: 'right' }]}>{formatMoney(b.alacak)}</Text>
                          <Text style={[styles.bakiyeCell, { color: b.bakiye >= 0 ? '#EF4444' : '#10B981', flex: 1, textAlign: 'right', fontWeight: '600' }]}>{formatMoney(Math.abs(b.bakiye))}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Girişler / Çıkışlar Mini Tab */}
                  <View style={[styles.miniTabRow, { borderColor: colors.border }]}>
                    <Pressable
                      style={[styles.miniTab, hareketTab === 'girisler' && { backgroundColor: '#10B981' + '18' }]}
                      onPress={() => setHareketTab('girisler')}
                    >
                      <Icon name="arrow-down-circle-outline" size={14} color={hareketTab === 'girisler' ? '#10B981' : colors.textTertiary} />
                      <Text style={[styles.miniTabText, { color: hareketTab === 'girisler' ? '#10B981' : colors.textTertiary }]}>
                        Girişler ({detailData[item.id].girisler.length})
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.miniTab, hareketTab === 'cikislar' && { backgroundColor: '#EF4444' + '18' }]}
                      onPress={() => setHareketTab('cikislar')}
                    >
                      <Icon name="arrow-up-circle-outline" size={14} color={hareketTab === 'cikislar' ? '#EF4444' : colors.textTertiary} />
                      <Text style={[styles.miniTabText, { color: hareketTab === 'cikislar' ? '#EF4444' : colors.textTertiary }]}>
                        Çıkışlar ({detailData[item.id].cikislar.length})
                      </Text>
                    </Pressable>
                  </View>

                  {/* Hareket Listesi */}
                  {(hareketTab === 'girisler' ? detailData[item.id].girisler : detailData[item.id].cikislar).map((h, i) => (
                    <View key={h.id || i} style={[styles.hareketItem, { borderBottomColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.hareketUnvan, { color: colors.text }]} numberOfLines={1}>
                          {h.unvan || h.hesapKodu}
                        </Text>
                        {h.aciklama ? (
                          <Text style={[styles.hareketAciklama, { color: colors.textTertiary }]} numberOfLines={1}>{h.aciklama}</Text>
                        ) : null}
                        <Text style={{ fontSize: 10, color: colors.textTertiary }}>{h.hesapKodu}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={[styles.hareketTutar, { color: hareketTab === 'girisler' ? '#10B981' : '#EF4444' }]}>
                          {formatMoney(h.tutar)} <Text style={{ fontSize: 10, color: colors.textTertiary }}>{h.doviz}</Text>
                        </Text>
                        {item.kasaDurum === 1 && (
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            <Pressable
                              style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: '#F59E0B15', alignItems: 'center', justifyContent: 'center' }}
                              onPress={() => handleEditHareket(item, h, hareketTab === 'girisler' ? 'giris' : 'cikis')}
                            >
                              <Icon name="create-outline" size={12} color="#F59E0B" />
                            </Pressable>
                            <Pressable
                              style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center' }}
                              onPress={() => setDeleteHareketItem({ kasaItem: item, hareket: h })}
                            >
                              <Icon name="trash-outline" size={12} color="#EF4444" />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}

                  {(hareketTab === 'girisler' ? detailData[item.id].girisler : detailData[item.id].cikislar).length === 0 && (
                    <Text style={{ fontSize: 12, color: colors.textTertiary, textAlign: 'center', paddingVertical: 8 }}>
                      {hareketTab === 'girisler' ? 'Giriş kaydı yok' : 'Çıkış kaydı yok'}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={{ fontSize: 12, color: colors.textTertiary, textAlign: 'center', paddingVertical: 8 }}>Veri yok</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };


  return (
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          title="Kasa İşlemleri"
          onLogout={handleLogout}
          leftButton={<BackButton onPress={onGoBack} />}
          rightButton={<AddButton onPress={handleOpenForm} />}
          showMenu={true}
        />

        {isLoading && !refreshing && kasaList.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <FlatList
            data={kasaList}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderKasaItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.pageHeader}>
                <View style={styles.pageTitleRow}>
                  <View style={styles.pageTitleContainer}>
                    <View style={[styles.pageTitleIcon, { backgroundColor: '#10B98115' }]}>
                      <Icon name="cash-outline" size={18} color="#10B981" />
                    </View>
                    <Text style={[styles.pageTitle, { color: colors.text }]}>Kasa İşlemleri</Text>
                  </View>
                  <View style={{ minWidth: 140, maxWidth: 200 }}>
                    <SelectInput
                      value={selectedSubeId}
                      onSelect={setSelectedSubeId}
                      items={subeler}
                      placeholder="Şube"
                      compact
                    />
                  </View>
                </View>
                {/* Durum Filtresi */}
                <View style={{ marginTop: 12, marginBottom: -6 }}>
                  <Tab
                    options={KASA_DURUM_TABS}
                    activeTab={kasaDurumFilter}
                    onTabChange={setKasaDurumFilter}
                  />
                </View>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                icon="cash-outline"
                title="Henüz kasa fişi yok"
                subtitle="Yeni kasa eklemek için + butonuna basın"
              />
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadKasaList(); }} />
            }
          />
        )}

        {/* İşlemler Menü Modal */}
        <Modal visible={!!menuKasaId} transparent animationType="fade" onRequestClose={() => setMenuKasaId(null)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setMenuKasaId(null)}>
            <Pressable style={[styles.menuModal, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>İşlemler</Text>
                <Pressable onPress={() => setMenuKasaId(null)} hitSlop={8}>
                  <Icon name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
              <Pressable style={styles.menuItem} onPress={() => { const item = kasaList.find((k: any) => k.id === menuKasaId); setMenuKasaId(null); if (item) handleOpenEditKasa(item); }}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#F59E0B15' }]}>
                  <Icon name="create-outline" size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.menuText, { color: colors.text }]}>Düzenle</Text>
                <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
              <Pressable style={styles.menuItem} onPress={() => { const item = kasaList.find((k: any) => k.id === menuKasaId); setMenuKasaId(null); if (item) setKapatKasaItem(item); }}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#6B728015' }]}>
                  <Icon name="lock-closed-outline" size={18} color="#6B7280" />
                </View>
                <Text style={[styles.menuText, { color: colors.text }]}>Kasayı Kapat</Text>
                <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
              <Pressable style={styles.menuItem} onPress={() => { const item = kasaList.find((k: any) => k.id === menuKasaId); setMenuKasaId(null); if (item) setDeleteKasaItem(item); }}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#EF444415' }]}>
                  <Icon name="trash-outline" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.menuText, { color: '#EF4444' }]}>Sil</Text>
                <Icon name="chevron-forward" size={16} color="#EF444460" />
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <ConfirmDialog
          visible={!!kapatKasaItem}
          title="Kasayı Kapat"
          message={`"${kapatKasaItem?.kasaUnvan || kapatKasaItem?.kasaHesapKodu || ''}" kasasını kapatmak istediğinize emin misiniz?\n\nKapatılan kasaya yeni hareket eklenemez.`}
          icon="lock-closed"
          iconColor="#3B82F6"
          confirmText="Kapat"
          cancelText="İptal"
          confirmIcon="lock-closed-outline"
          cancelIcon="close-outline"
          onConfirm={handleKapatKasa}
          onCancel={() => setKapatKasaItem(null)}
        />

        <ConfirmDialog
          visible={!!deleteHareketItem}
          title="Hareketi Sil"
          message={`"${deleteHareketItem?.hareket?.unvan || deleteHareketItem?.hareket?.hesapKodu || ''}" hareketi silmek istediğinize emin misiniz?`}
          icon="trash"
          iconColor="#EF4444"
          confirmText="Sil"
          cancelText="İptal"
          confirmIcon="trash-outline"
          cancelIcon="close-outline"
          onConfirm={handleDeleteHareket}
          onCancel={() => setDeleteHareketItem(null)}
        />

        <ConfirmDialog
          visible={!!deleteKasaItem}
          title="Kasayı Sil"
          message={`"${deleteKasaItem?.kasaUnvan || deleteKasaItem?.kasaHesapKodu || ''}" kasasını silmek istediğinize emin misiniz?${deleteKasaItem?.girisler?.length > 0 || deleteKasaItem?.cikislar?.length > 0 ? '\n\nDikkat: Bu kasaya ait tüm hareket kayıtları da silinecektir!' : ''}`}
          icon="trash"
          iconColor="#EF4444"
          confirmText="Sil"
          cancelText="İptal"
          confirmIcon="trash-outline"
          cancelIcon="close-outline"
          onConfirm={handleDeleteKasa}
          onCancel={() => setDeleteKasaItem(null)}
        />

        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />

        {/* Create Form BottomSheet */}
        <BottomSheet
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          title={editingKasa ? 'Kasa Düzenle' : 'Yeni Kasa'}
          icon="cash-outline"
          iconColor="#10B981"
          toastRef={formToastRef}
          footer={
            <>
              <Button
                text="İptal"
                variant="secondary"
                onPress={() => setFormVisible(false)}
                icon="close-outline"
                style={{ flex: 1 }}
              />
              <Button
                text="Kaydet"
                variant="primary"
                onPress={handleSave}
                icon="checkmark-outline"
                loading={formSaving}
                style={{ flex: 1 }}
              />
            </>
          }
        >
          <View style={{ gap: 12 }}>
            <CariSelectWithAdd
              label="Kasa *"
              placeholder={kasaCariLoading ? 'Yükleniyor...' : 'Kasa seçin...'}
              value={formKasaHesapKodu}
              items={kasaSelectItems}
              onSelect={(val) => { setFormKasaHesapKodu(val); fieldErrors.clearFieldError('kasa'); }}
              onCariAdded={(cari) => setKasaCariList(prev => [...prev, { hesapKodu: cari.id, unvan: cari.label } as any])}
              error={fieldErrors.errors.kasa}
              shake={fieldErrors.shakes.kasa}
              hesapKoduPrefix="100"
              filterType="safes"
            />

            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inputLabel, marginBottom: 4 }}>Tarih</Text>
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: 12, paddingHorizontal: 14, height: 48 }}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{formatDate(formTarih.toISOString())}</Text>
              </Pressable>
            </View>

          </View>
          <DatePickerModal
            visible={showDatePicker}
            date={formTarih}
            onConfirm={(d) => { setFormTarih(d); setShowDatePicker(false); loadKurlar(d); }}
            onClose={() => setShowDatePicker(false)}
            title="Tarih Seçin"
          />
        </BottomSheet>

        {/* Hareket Ekleme BottomSheet */}
        <BottomSheet
          visible={hareketFormVisible}
          onClose={() => setHareketFormVisible(false)}
          title={editingHareket ? 'Hareket Düzenle' : `Kasa ${hareketTipi === 'giris' ? 'Giriş' : 'Çıkış'}`}
          icon={hareketTipi === 'giris' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
          iconColor={hareketTipi === 'giris' ? '#10B981' : '#EF4444'}
          toastRef={hareketToastRef}
          footer={
            <>
              <Button
                text="İptal"
                variant="secondary"
                onPress={() => setHareketFormVisible(false)}
                icon="close-outline"
                style={{ flex: 1 }}
              />
              <Button
                text="Kaydet"
                variant="primary"
                onPress={handleSaveHareket}
                icon="checkmark-outline"
                loading={hareketFormSaving}
                style={{ flex: 1 }}
              />
            </>
          }
        >
          <View style={{ gap: 12 }}>
            {/* Kasa Bilgisi */}
            <View style={[styles.hareketKasaInfo, { backgroundColor: (hareketTipi === 'giris' ? '#10B981' : '#EF4444') + '10', borderColor: (hareketTipi === 'giris' ? '#10B981' : '#EF4444') + '30' }]}>
              <Icon name="wallet-outline" size={16} color={hareketTipi === 'giris' ? '#10B981' : '#EF4444'} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{hareketKasaLabel}</Text>
            </View>

            {/* Giriş / Çıkış Seçici */}
            <View style={styles.tipSelectorRow}>
              <Pressable
                style={[styles.tipBtn, hareketTipi === 'giris' && { backgroundColor: '#10B981', borderColor: '#10B981' }, { borderColor: colors.border }]}
                onPress={() => setHareketTipi('giris')}
              >
                <Icon name="arrow-down-circle-outline" size={16} color={hareketTipi === 'giris' ? '#fff' : colors.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: hareketTipi === 'giris' ? '#fff' : colors.textSecondary }}>Giriş</Text>
              </Pressable>
              <Pressable
                style={[styles.tipBtn, hareketTipi === 'cikis' && { backgroundColor: '#EF4444', borderColor: '#EF4444' }, { borderColor: colors.border }]}
                onPress={() => setHareketTipi('cikis')}
              >
                <Icon name="arrow-up-circle-outline" size={16} color={hareketTipi === 'cikis' ? '#fff' : colors.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: hareketTipi === 'cikis' ? '#fff' : colors.textSecondary }}>Çıkış</Text>
              </Pressable>
            </View>

            {/* Cari Hesap */}
            <CariSelectWithAdd
              label="Cari Hesap *"
              placeholder={cariListLoading ? 'Yükleniyor...' : 'Cari hesap seçin...'}
              value={hareketCariHesapKodu}
              items={selectedCari && !cariList.some(c => c.id === selectedCari.id) ? [selectedCari, ...cariList] : cariList}
              onSearchChange={(text) => fetchCariList(text)}
              searchLoading={cariListLoading}
              onSelect={(val) => {
                setHareketCariHesapKodu(val);
                hareketFieldErrors.clearFieldError('cari');
                if (!val) {
                  setHareketAciklama('');
                  setSelectedCari(null);
                  return;
                }
                const pickedItem = (selectedCari && selectedCari.id === val
                  ? selectedCari
                  : (cariList.find((c: any) => c.id === val) as any)) as any;
                if (pickedItem) setSelectedCari(pickedItem);
                const cariUnvan = pickedItem?.unvan || (pickedItem?.label ? String(pickedItem.label).split(' (')[0] : '');
                if (cariUnvan) {
                  setHareketAciklama(cariUnvan);
                }
                if (pickedItem?.doviz) {
                  const cDoviz = pickedItem.doviz as string;
                  const cKur = getKurFromRef(cDoviz);
                  setHareketCariDoviz(cDoviz);
                  setHareketCariKur(cKur);
                  setHareketDovizliDoviz(cDoviz);
                  setHareketDovizliKur(cKur);
                }
              }}
              onCariAdded={(cari) => setCariList(prev => [...prev, { id: cari.id, label: cari.label, doviz: '' } as any])}
              error={hareketFieldErrors.errors.cari}
              shake={hareketFieldErrors.shakes.cari}
            />

            {/* Tutar Tablosu - Dövizli / Muhasebe / Cari */}
            <View style={styles.tutarTable}>
              {/* Header */}
              <View style={styles.tutarHeaderRow}>
                <Text style={[styles.tutarHeaderLabel, { color: colors.textTertiary }]} />
                <Text style={[styles.tutarHeaderText, { color: colors.textTertiary }]}>Tutar</Text>
                <Text style={[styles.tutarHeaderText, { color: colors.textTertiary }]}>Döviz</Text>
                <Text style={[styles.tutarHeaderText, { color: colors.textTertiary }]}>Kur</Text>
              </View>

              {/* Dövizli */}
              <View style={styles.tutarRow}>
                <Text style={[styles.tutarRowLabel, { color: colors.text }]}>Dövizli</Text>
                <View style={[styles.tutarInput, { borderColor: hareketFieldErrors.errors.dovizliTutar ? '#EF4444' : colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                  <TextInput style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]} value={hareketDovizliTutar} onChangeText={(t) => { const v = t.replace(/[^0-9.,]/g, ''); setHareketDovizliTutar(v); hareketFieldErrors.clearFieldError('dovizliTutar'); recalcFromDovizli(v); }} placeholder="0,00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
                </View>
                <DovizSelect value={hareketDovizliDoviz} dovizTipleri={dovizTipleri} onSelect={handleDovizliDovizChange} compact shortLabel containerStyle={{ flex: 1, marginBottom: 0 }} />
                <View style={[styles.tutarInput, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                  <TextInput style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]} value={hareketDovizliKur} onChangeText={(t) => { setHareketDovizliKur(t.replace(/[^0-9.,]/g, '')); recalcFromDovizli(hareketDovizliTutar); }} placeholder="1" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
                </View>
              </View>

              {/* Muhasebe */}
              <View style={styles.tutarRow}>
                <Text style={[styles.tutarRowLabel, { color: colors.text }]}>Muhasebe</Text>
                <View style={[styles.tutarInput, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                  <TextInput style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]} value={hareketMuhasebeTutar} onChangeText={(t) => setHareketMuhasebeTutar(t.replace(/[^0-9.,]/g, ''))} placeholder="0,00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
                </View>
                <DovizSelect value={hareketMuhasebeDoviz} dovizTipleri={[{ dovizTipi: hareketMuhasebeDoviz, dovizAdi: hareketMuhasebeDoviz } as DovizTipi]} onSelect={() => {}} compact shortLabel containerStyle={{ flex: 1, marginBottom: 0 }} />
                <View style={[styles.tutarInput, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                  <TextInput style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]} value={hareketMuhasebeKur} onChangeText={(t) => { setHareketMuhasebeKur(t.replace(/[^0-9.,]/g, '')); }} placeholder="1" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
                </View>
              </View>

              {/* Cari */}
              <View style={styles.tutarRow}>
                <Text style={[styles.tutarRowLabel, { color: colors.text }]}>Cari</Text>
                <View style={[styles.tutarInput, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                  <TextInput style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]} value={hareketCariTutar} onChangeText={(t) => setHareketCariTutar(t.replace(/[^0-9.,]/g, ''))} placeholder="0,00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
                </View>
                <DovizSelect value={hareketCariDoviz} dovizTipleri={dovizTipleri} onSelect={handleCariDovizChange} compact shortLabel containerStyle={{ flex: 1, marginBottom: 0 }} />
                <View style={[styles.tutarInput, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                  <TextInput style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]} value={hareketCariKur} onChangeText={(t) => { setHareketCariKur(t.replace(/[^0-9.,]/g, '')); }} placeholder="1" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
                </View>
              </View>
            </View>

            {/* Açıklama */}
            <Input
              label="Açıklama"
              icon="document-text-outline"
              value={hareketAciklama}
              onChangeText={setHareketAciklama}
              placeholder="İşlem açıklaması..."
              containerStyle={{ marginBottom: 0 }}
            />

            {/* Fiş Görseli */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inputLabel, marginBottom: 6 }}>Fiş Görseli</Text>
              {hareketImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: hareketImageUri }} style={styles.imagePreview} resizeMode="cover" />
                  <View style={styles.imageActions}>
                    <Pressable style={[styles.imageActionBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => setImagePickerVisible(true)}>
                      <Icon name="swap-horizontal-outline" size={16} color={colors.primary} />
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Değiştir</Text>
                    </Pressable>
                    <Pressable style={[styles.imageActionBtn, { backgroundColor: '#EF4444' + '15' }]} onPress={() => setHareketImageUri(null)}>
                      <Icon name="trash-outline" size={16} color="#EF4444" />
                      <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>Kaldır</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={[styles.imageUploadBtn, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                  onPress={() => setImagePickerVisible(true)}
                >
                  <Icon name="camera-outline" size={24} color={colors.textTertiary} />
                  <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }}>Fotoğraf ekle</Text>
                </Pressable>
              )}
            </View>
          </View>

          <ImagePickerModal
            visible={imagePickerVisible}
            onClose={() => setImagePickerVisible(false)}
            onCamera={handleCamera}
            onGallery={handleGallery}
            title="Fiş Görseli"
          />
        </BottomSheet>
      </View>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  pageHeader: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    opacity: 0.6,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100,
    gap: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardInfoText: {
    fontSize: 12,
  },
  cardDescription: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  expandBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bakiyeContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 4,
  },
  bakiyeHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bakiyeHeaderText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  bakiyeRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  bakiyeCell: {
    fontSize: 12,
  },
  miniTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  miniTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hareketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hareketUnvan: {
    fontSize: 13,
    fontWeight: '500',
  },
  hareketAciklama: {
    fontSize: 11,
    marginTop: 1,
  },
  hareketTutar: {
    fontSize: 13,
    fontWeight: '700',
  },
  hareketMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hareketKasaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tipSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  tutarTable: {
    gap: 6,
  },
  tutarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tutarHeaderLabel: {
    width: 65,
  },
  tutarHeaderText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tutarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tutarRowLabel: {
    width: 65,
    fontSize: 12,
    fontWeight: '600',
  },
  tutarInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tutarInputText: {
    fontSize: 13,
    padding: 0,
  },
  imageUploadBtn: {
    height: 80,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  imageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  menuModal: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    left: 32,
    top: 0,
    minWidth: 140,
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dropdownText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
