import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { authService } from '../services/auth.service';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAlert } from '../contexts/AlertContext';

interface FiyatHesaplamaScreenProps {
  onGoBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

type KalemTip = 'yuzde' | 'deger';

interface Kart {
  id: 'giris' | 'maliyet' | 'etiket';
  baslik: string;
  aciklama: string;
  renk: string;
  icon: string;
  tip: KalemTip;
  deger: string;
}

const KART_META: Omit<Kart, 'tip' | 'deger'>[] = [
  {
    id: 'giris',
    baslik: 'Giriş Fiyatı',
    aciklama: 'Giriş Fiyatı üzerine eklenecek tutarı belirler',
    renk: '#3B82F6',
    icon: 'arrow-down-circle-outline',
  },
  {
    id: 'maliyet',
    baslik: 'Maliyet Fiyatı',
    aciklama: 'Maliyet Fiyatı üzerine eklenecek tutarı belirler',
    renk: '#F59E0B',
    icon: 'layers-outline',
  },
  {
    id: 'etiket',
    baslik: 'Etiket Fiyatı',
    aciklama: 'Etiket Fiyatı üzerine eklenecek tutarı belirler',
    renk: '#10B981',
    icon: 'trending-up-outline',
  },
];

// API: tip 0=yuzde, 1=deger
interface MobilAyarlar {
  girisFiyatTipi: number;
  girisFiyatDegeri: number;
  maliyetFiyatTipi: number;
  maliyetFiyatDegeri: number;
  etiketFiyatTipi: number;
  etiketFiyatDegeri: number;
}

const DEFAULT_MOBIL_AYARLAR: MobilAyarlar = {
  girisFiyatTipi: 0, girisFiyatDegeri: 0,
  maliyetFiyatTipi: 0, maliyetFiyatDegeri: 0,
  etiketFiyatTipi: 0, etiketFiyatDegeri: 0,
};

function mobilAyarlarToKartlar(a: MobilAyarlar): Kart[] {
  return KART_META.map(meta => {
    const tip: KalemTip = meta.id === 'giris'
      ? (a.girisFiyatTipi === 1 ? 'deger' : 'yuzde')
      : meta.id === 'maliyet'
      ? (a.maliyetFiyatTipi === 1 ? 'deger' : 'yuzde')
      : (a.etiketFiyatTipi === 1 ? 'deger' : 'yuzde');
    const deger = String(meta.id === 'giris'
      ? (a.girisFiyatDegeri ?? 0)
      : meta.id === 'maliyet'
      ? (a.maliyetFiyatDegeri ?? 0)
      : (a.etiketFiyatDegeri ?? 0));
    return { ...meta, tip, deger };
  });
}

function kartlarToMobilAyarlar(kartlar: Kart[]): MobilAyarlar {
  const g = kartlar.find(k => k.id === 'giris')!;
  const m = kartlar.find(k => k.id === 'maliyet')!;
  const e = kartlar.find(k => k.id === 'etiket')!;
  return {
    girisFiyatTipi:    g.tip === 'deger' ? 1 : 0,
    girisFiyatDegeri:  parseFloat(g.deger) || 0,
    maliyetFiyatTipi:  m.tip === 'deger' ? 1 : 0,
    maliyetFiyatDegeri:parseFloat(m.deger) || 0,
    etiketFiyatTipi:   e.tip === 'deger' ? 1 : 0,
    etiketFiyatDegeri: parseFloat(e.deger) || 0,
  };
}

export default function FiyatHesaplamaScreen({ onGoBack, onTabChange, onLogout }: FiyatHesaplamaScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('profile');
  const [kartlar, setKartlar] = useState<Kart[]>(mobilAyarlarToKartlar(DEFAULT_MOBIL_AYARLAR));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handleLogout = async () => {
    try { await logout(); if (onLogout) onLogout(); } catch {}
  };

  // API'den yükle
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await authService.getToken();
      const response = await fetch(API_ENDPOINTS.FIYAT_HESAPLAMA_GET, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const json = await response.json();
      if (json.success && json.data?.mobilAyarlar) {
        setKartlar(mobilAyarlarToKartlar(json.data.mobilAyarlar));
      }
    } catch (e) {
      console.error('FiyatHesaplama loadData error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // API'ye kaydet
  const handleKaydet = async () => {
    setSaving(true);
    try {
      const token = await authService.getToken();
      const response = await fetch(API_ENDPOINTS.FIYAT_HESAPLAMA_SAVE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mobilAyarlar: kartlarToMobilAyarlar(kartlar) }),
      });
      const json = await response.json();
      if (json.success) {
        showSuccess('Fiyat hesaplama ayarları kaydedildi.');
      } else {
        showError(json.error?.message || 'Kayıt sırasında bir hata oluştu.');
      }
    } catch (e) {
      showError('Sunucuya bağlanılamadı.');
    }
    setSaving(false);
  };

  const updateKart = (kartId: string, value: string) => {
    setKartlar(prev => prev.map(k => k.id === kartId ? { ...k, deger: value } : k));
  };

  const toggleTip = (kartId: string) => {
    setKartlar(prev => prev.map(k =>
      k.id === kartId ? { ...k, tip: k.tip === 'yuzde' ? 'deger' : 'yuzde' } : k
    ));
  };

  const styles = createStyles(colors, isDark);

  const renderKart = (kart: Kart) => (
    <View key={kart.id} style={[styles.kart, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Sol aksan çizgisi */}
      <View style={[styles.kartAccent, { backgroundColor: kart.renk }]} />

      <View style={styles.kartIcerik}>
        {/* Başlık */}
        <Text style={[styles.kartBaslik, { color: colors.text }]}>{kart.baslik}</Text>
        <Text style={[styles.kartAciklama, { color: colors.textSecondary }]}>{kart.aciklama}</Text>

        {/* Segment: % veya ₺ */}
        <View style={[styles.segment, { backgroundColor: colors.background, marginTop: 12 }]}>
          <Pressable
            style={[styles.segmentBtn, kart.tip === 'yuzde' && { backgroundColor: kart.renk }]}
            onPress={() => kart.tip !== 'yuzde' && toggleTip(kart.id)}
          >
            <Text style={[styles.segmentBtnText, { color: kart.tip === 'yuzde' ? '#fff' : colors.textSecondary }]}>
              Yüzde (%)
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, kart.tip === 'deger' && { backgroundColor: kart.renk }]}
            onPress={() => kart.tip !== 'deger' && toggleTip(kart.id)}
          >
            <Text style={[styles.segmentBtnText, { color: kart.tip === 'deger' ? '#fff' : colors.textSecondary }]}>
              Sabit (₺)
            </Text>
          </Pressable>
        </View>

        {/* Değer girişi */}
        <View style={[styles.inputRow, { borderColor: kart.renk + '50', backgroundColor: colors.background, marginTop: 10 }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="0,00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={kart.deger === '0' ? '' : kart.deger}
            onChangeText={(v) => {
              let val = v.replace(/[^0-9.,]/g, '').replace(',', '.');
              const parts = val.split('.');
              if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
              updateKart(kart.id, val || '0');
            }}
          />
          <Text style={[styles.inputSuffix, { color: kart.renk }]}>
            {kart.tip === 'yuzde' ? '%' : '₺'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Fiyat Hesaplama"
          leftButton={<BackButton onPress={onGoBack} />}
          showMenu={true}
          onLogout={handleLogout}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Sayfa Başlığı */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: '#3B82F615' }]}>
                <Icon name="calculator-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Fiyat Hesaplama Algoritması</Text>
            </View>
          </View>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <View style={{ gap: 12 }}>
              {kartlar.map(renderKart)}
            </View>
          )}

          {/* Kaydet Butonu */}
          {!loading && (
            <Pressable
              style={({ pressed }) => [
                styles.kaydetBtn,
                { backgroundColor: colors.primary, opacity: pressed || saving ? 0.85 : 1 },
              ]}
              onPress={handleKaydet}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Icon name="checkmark-outline" size={18} color="#FFFFFF" />
              }
              <Text style={styles.kaydetBtnText}>
                {saving ? 'Kaydediliyor…' : 'Algoritmayı Kaydet'}
              </Text>
            </Pressable>
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

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 120 },
    pageHeader: { marginBottom: 8 },
    pageTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageTitleIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    pageTitle: { fontSize: 16, fontWeight: '700', opacity: 0.6 },

    // Kart
    kart: {
      borderRadius: 14, borderWidth: 1,
      overflow: 'hidden', flexDirection: 'row',
    },
    kartAccent: { width: 4 },
    kartIcerik: { flex: 1, paddingHorizontal: 14, paddingVertical: 14 },
    kartBaslik: { fontSize: 14, fontWeight: '700' },
    kartAciklama: { fontSize: 12, marginTop: 3, opacity: 0.55 },

    // Segment
    segment: {
      flexDirection: 'row', borderRadius: 10, padding: 3, gap: 3,
    },
    segmentBtn: {
      flex: 1, paddingVertical: 7, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    segmentBtnText: { fontSize: 13, fontWeight: '600' },

    // Input
    inputRow: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1.5, borderRadius: 10,
      paddingHorizontal: 14, height: 48,
    },
    input: { flex: 1, fontSize: 20, fontWeight: '700', padding: 0 },
    inputSuffix: { fontSize: 18, fontWeight: '700' },

    // Kaydet
    kaydetBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, marginTop: 24, paddingVertical: 14, borderRadius: 12,
    },
    kaydetBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  });
