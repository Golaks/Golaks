import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Image } from 'react-native';
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
import dovizService, { KurItem } from '../services/doviz.service';
import ordersService, { DovizTipi } from '../services/orders.service';
import DovizSelect from '../components/DovizSelect';
import ImagePickerModal from '../components/ImagePickerModal';
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
  const [hareketMuhasebeKur, setHareketMuhasebeKur] = useState('1');
  const [hareketCariTutar, setHareketCariTutar] = useState('');
  const [hareketCariDoviz, setHareketCariDoviz] = useState('TL');
  const [hareketCariKur, setHareketCariKur] = useState('1');
  const [cariList, setCariList] = useState<{ id: string; label: string }[]>([]);
  const [cariListLoading, setCariListLoading] = useState(false);
  const [kurlar, setKurlar] = useState<Record<string, KurItem>>({});
  const [dovizTipleri, setDovizTipleri] = useState<DovizTipi[]>([]);
  const [hareketImageUri, setHareketImageUri] = useState<string | null>(null);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const hareketToastRef = useRef<BottomSheetToastRef | null>(null);
  const hareketFieldErrors = useFieldErrors();

  // Form state
  const [formVisible, setFormVisible] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formKasaHesapKodu, setFormKasaHesapKodu] = useState('');
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

  useEffect(() => { loadSubeler(); }, []);

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

  // Load kasa cari list for select
  const loadKasaCariList = useCallback(async () => {
    if (kasaCariList.length > 0) return;
    try {
      setKasaCariLoading(true);
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const response = await accountService.getKasaCariList(token, dataName);
      if (response.success) {
        setKasaCariList(response.data.data);
      }
    } catch (_) {}
    finally { setKasaCariLoading(false); }
  }, [kasaCariList.length, user]);

  const handleOpenForm = () => {
    fieldErrors.clearAll();
    setFormKasaHesapKodu('');
    setFormTarih(new Date());
    setFormAciklama('');
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

      const response = await accountService.createKasa(token, dataName, {
        kasaHesapKodu: formKasaHesapKodu,
        fisTarihi,
        fisAciklama: formAciklama.trim(),
        subeId: parseInt(selectedSubeId),
      });

      if (response.success) {
        formToastRef.current?.show({ type: 'success', text: 'Kasa fişi oluşturuldu' });
        loadKasaList();
        setTimeout(() => setFormVisible(false), 1200);
      } else {
        formToastRef.current?.show({ type: 'error', text: response.message || 'Kasa oluşturulamadı' });
      }
    } catch (err: any) {
      formToastRef.current?.show({ type: 'error', text: err.message || 'Kasa oluşturulamadı' });
    } finally {
      setFormSaving(false);
    }
  };

  // Kurları yükle
  const loadKurlar = useCallback(async () => {
    if (Object.keys(kurlar).length > 0) return;
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const response = await dovizService.getKurlar(token, dataName);
      if (response.success && response.data?.kurlar) {
        setKurlar(response.data.kurlar);
      }
    } catch (_) {}
  }, [kurlar, user]);

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

  const handleDovizliDovizChange = (doviz: string) => {
    setHareketDovizliDoviz(doviz);
    setHareketDovizliKur(getKurForDoviz(doviz));
  };

  const handleCariDovizChange = (doviz: string) => {
    setHareketCariDoviz(doviz);
    setHareketCariKur(getKurForDoviz(doviz));
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

  const getKurForDoviz = (doviz: string): string => {
    if (doviz === 'TL') return '1';
    const kur = kurlar[doviz];
    if (!kur) return '1';
    return String(kur.dovizAlis || 1);
  };

  // Cari listesi yükle (100% hariç)
  const loadCariList = useCallback(async () => {
    if (cariList.length > 0) return;
    setCariListLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const response = await accountService.getCariList(token, dataName, 'all', '');
      if (response.success) {
        const items = (response.data?.data || [])
          .filter((c: any) => !c.hesapKodu?.startsWith('100'))
          .map((c: any) => ({ id: c.hesapKodu, label: `${c.unvan} (${c.hesapKodu})` }));
        setCariList(items);
      }
    } catch (_) {}
    finally { setCariListLoading(false); }
  }, [cariList.length, user]);

  const handleOpenHareketForm = (kasaId: number, kasaLabel: string, tipi: 'giris' | 'cikis') => {
    hareketFieldErrors.clearAll();
    setHareketKasaId(kasaId);
    setHareketKasaLabel(kasaLabel);
    setHareketTipi(tipi);
    setHareketCariHesapKodu('');
    setHareketAciklama('');
    setHareketDovizliTutar('');
    setHareketDovizliDoviz('TL');
    setHareketDovizliKur('1');
    setHareketMuhasebeTutar('');
    setHareketMuhasebeDoviz('TL');
    setHareketMuhasebeKur('1');
    setHareketCariTutar('');
    setHareketCariDoviz('TL');
    setHareketCariKur('1');
    setHareketImageUri(null);
    setHareketFormVisible(true);
    loadCariList();
    loadKurlar();
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

  const kasaSelectItems = kasaCariList.map(k => ({
    id: k.hesapKodu,
    label: k.unvan + (k.subeAdi ? ` (${k.subeAdi})` : ''),
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
            {item.kasaDurum === 1 ? (
              <Pressable
                style={[styles.hareketMiniBtn, { backgroundColor: colors.primary + '15' }]}
                onPress={() => handleOpenHareketForm(item.id, item.kasaUnvan || item.kasaHesapKodu, 'giris')}
              >
                <Icon name="swap-vertical-outline" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Hareket</Text>
              </Pressable>
            ) : (
              <View style={[styles.cardBadge, { backgroundColor: statusColor + '15' }]}>
                <View style={[styles.cardBadgeDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.cardBadgeText, { color: statusColor }]}>Kapalı</Text>
              </View>
            )}
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

          {/* Açıklama + Accordion butonu */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.cardDescription, { color: colors.textTertiary, flex: 1 }]} numberOfLines={1}>
              {item.fisAciklama || '-'}
            </Text>
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
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.hareketTutar, { color: hareketTab === 'girisler' ? '#10B981' : '#EF4444' }]}>
                          {formatMoney(h.tutar)}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textTertiary }}>{h.doviz}</Text>
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

        {isLoading && !refreshing ? (
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
                  {subeler.length > 1 && (
                    <View style={{ minWidth: 140, maxWidth: 200 }}>
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

        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />

        {/* Create Form BottomSheet */}
        <BottomSheet
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          title="Yeni Kasa"
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
            <SelectInput
              label="Kasa *"
              icon="cash-outline"
              placeholder={kasaCariLoading ? 'Yükleniyor...' : 'Kasa seçin...'}
              value={formKasaHesapKodu}
              items={kasaSelectItems}
              onSelect={(val) => { setFormKasaHesapKodu(val); fieldErrors.clearFieldError('kasa'); }}
              error={fieldErrors.errors.kasa}
              shake={fieldErrors.shakes.kasa}
              containerStyle={{ marginBottom: 0 }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inputLabel, marginBottom: 4 }}>Tarih</Text>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: 12, paddingHorizontal: 14, height: 48 }}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{formatDate(formTarih.toISOString())}</Text>
                </Pressable>
              </View>
              {subeler.length > 1 && (
                <View style={{ flex: 1 }}>
                  <SelectInput
                    label="Şube"
                    icon="business-outline"
                    placeholder="Şube seçin..."
                    value={selectedSubeId}
                    items={subeler}
                    onSelect={setSelectedSubeId}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              )}
            </View>

            <Input
              label="Açıklama"
              icon="document-text-outline"
              value={formAciklama}
              onChangeText={setFormAciklama}
              placeholder="Açıklama..."
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
          <DatePickerModal
            visible={showDatePicker}
            date={formTarih}
            onConfirm={(d) => { setFormTarih(d); setShowDatePicker(false); }}
            onClose={() => setShowDatePicker(false)}
            title="Tarih Seçin"
          />
        </BottomSheet>

        {/* Hareket Ekleme BottomSheet */}
        <BottomSheet
          visible={hareketFormVisible}
          onClose={() => setHareketFormVisible(false)}
          title={`Kasa ${hareketTipi === 'giris' ? 'Giriş' : 'Çıkış'}`}
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
            <SelectInput
              label="Cari Hesap *"
              icon="person-outline"
              placeholder={cariListLoading ? 'Yükleniyor...' : 'Cari hesap seçin...'}
              value={hareketCariHesapKodu}
              items={cariList}
              onSelect={(val) => { setHareketCariHesapKodu(val); hareketFieldErrors.clearFieldError('cari'); }}
              error={hareketFieldErrors.errors.cari}
              shake={hareketFieldErrors.shakes.cari}
              containerStyle={{ marginBottom: 0 }}
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
                  <TextInput style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]} value={hareketDovizliTutar} onChangeText={(t) => { setHareketDovizliTutar(t.replace(/[^0-9.,]/g, '')); hareketFieldErrors.clearFieldError('dovizliTutar'); }} placeholder="0,00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
                </View>
                <DovizSelect value={hareketDovizliDoviz} dovizTipleri={dovizTipleri} onSelect={handleDovizliDovizChange} compact shortLabel containerStyle={{ flex: 1, marginBottom: 0 }} />
                <View style={[styles.tutarInput, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                  <TextInput style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]} value={hareketDovizliKur} onChangeText={(t) => setHareketDovizliKur(t.replace(/[^0-9.,]/g, ''))} placeholder="1" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
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
                  <TextInput style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]} value={hareketMuhasebeKur} onChangeText={(t) => setHareketMuhasebeKur(t.replace(/[^0-9.,]/g, ''))} placeholder="1" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
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
                  <TextInput style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]} value={hareketCariKur} onChangeText={(t) => setHareketCariKur(t.replace(/[^0-9.,]/g, ''))} placeholder="1" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
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
    paddingTop: 4,
    marginBottom: 4,
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
  },
  listContent: {
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
});
