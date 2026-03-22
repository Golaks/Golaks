import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import BottomSheet, { BottomSheetToastRef } from './BottomSheet';
import SelectInput from './SelectInput';
import TanimSelectInput from './TanimSelectInput';
import DovizSelect from './DovizSelect';
import ModelSelectInput from './ModelSelectInput';
import type { ModelKartData } from './ModelSelectInput';
import BedenSetSelect from './BedenSetSelect';
import BarcodeScanInput from './BarcodeScanInput';
import IconButton from './IconButton';
import VaryantSelectInput from './VaryantSelectInput';
import type { VaryantData } from './VaryantSelectInput';
import type { DovizTipi } from '../services/orders.service';

// ─── Types ───────────────────────────────────────────────────────────

export interface BedenSetItem {
  id: number;
  setTipi: string;
  bedenler: string[]; // ['S','M','L','XL',...]
}

export interface ModelKartItem {
  id: number;
  modelKodu: string;
  modelAdi: string;
  bedenSetId: number;
}

export interface StokVaryantItem {
  id: number;
  varyantAdi: string;
  varyantKodu: string;
  stokGrupKodu: string;
  barkod: string;
}

export interface DetayFormData {
  barkod: string;
  modelId: string;
  varyantId: string;
  varyantDisplayValue?: string;
  stokGrupKodu: string;
  bedenSetId: string;
  bedenMiktarlar: Record<string, number>; // { 'S': 10, 'M': 20, ... }
  fiyat: string;
  doviz: string;
  indirimTipi: number; // -1=yok, 0=yüzde, 1=değer
  indirimDeger: string;
  ozellikler: { ad: string; deger: string }[];
  aciklama: string;
}

interface SiparisDetayFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: DetayFormData) => void;
  saving?: boolean;
  // Lookup data
  bedenSetleri: BedenSetItem[];
  dovizTipleri: DovizTipi[];
  defaultDoviz?: string;
  // Varyant loading
  varyantlar: StokVaryantItem[];
  varyantLoading?: boolean;
  onModelChange?: (modelId: string) => void;
  onRecetePress?: (modelId: string) => void;
  // Edit mode
  editData?: DetayFormData | null;
  toastRef?: React.MutableRefObject<BottomSheetToastRef | null>;
}

export default function SiparisDetayForm({
  visible,
  onClose,
  onSave,
  saving = false,
  bedenSetleri,
  dovizTipleri,
  defaultDoviz = 'USD',
  varyantlar,
  varyantLoading = false,
  onModelChange,
  onRecetePress,
  editData,
  toastRef,
}: SiparisDetayFormProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // ─── Form State ─────────────────────────────────────────────────
  const [barkod, setBarkod] = useState('');
  const [modelId, setModelId] = useState('');
  const [varyantId, setVaryantId] = useState('');
  const [varyantDisplayValue, setVaryantDisplayValue] = useState('');
  const [stokGrupKodu, setStokGrupKodu] = useState('');
  const [bedenSetId, setBedenSetId] = useState('');
  const [bedenMiktarlar, setBedenMiktarlar] = useState<Record<string, number>>({});
  const [fiyat, setFiyat] = useState('');
  const [doviz, setDoviz] = useState(defaultDoviz);
  const [indirimTipi, setIndirimTipi] = useState(-1);
  const [indirimDeger, setIndirimDeger] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [ozellikRows, setOzellikRows] = useState<{ ad: string; deger: string; mod: 'text' | 'varyant' }[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [gecmisSatisVisible, setGecmisSatisVisible] = useState(false);

  // Mock geçmiş satış data
  const mockGecmisSatislar = useMemo(() => [
    { id: 1, tarih: '2026-01-15', siparisKodu: 'SP-2026-001', cariAdi: 'ABC Tekstil Ltd.', fiyat: 12.50, doviz: 'USD', miktar: 500, bedenler: 'S:100 M:200 L:150 XL:50', durum: 'Teslim Edildi' },
    { id: 2, tarih: '2025-11-22', siparisKodu: 'SP-2025-045', cariAdi: 'DEF Giyim A.Ş.', fiyat: 11.80, doviz: 'USD', miktar: 300, bedenler: 'M:150 L:100 XL:50', durum: 'Teslim Edildi' },
    { id: 3, tarih: '2025-09-10', siparisKodu: 'SP-2025-032', cariAdi: 'ABC Tekstil Ltd.', fiyat: 13.00, doviz: 'USD', miktar: 1000, bedenler: 'S:200 M:300 L:300 XL:200', durum: 'Teslim Edildi' },
    { id: 4, tarih: '2025-06-05', siparisKodu: 'SP-2025-018', cariAdi: 'GHI Moda SRL', fiyat: 12.00, doviz: 'EUR', miktar: 200, bedenler: 'M:100 L:100', durum: 'Üretimde' },
    { id: 5, tarih: '2025-03-18', siparisKodu: 'SP-2025-009', cariAdi: 'JKL Fashion GmbH', fiyat: 14.20, doviz: 'EUR', miktar: 750, bedenler: 'S:150 M:250 L:200 XL:150', durum: 'Teslim Edildi' },
    { id: 6, tarih: '2024-12-02', siparisKodu: 'SP-2024-089', cariAdi: 'ABC Tekstil Ltd.', fiyat: 11.50, doviz: 'USD', miktar: 400, bedenler: 'S:100 M:150 L:100 XL:50', durum: 'Teslim Edildi' },
  ], []);

  // ─── Reset form when opened/closed ──────────────────────────────
  useEffect(() => {
    if (visible) {
      if (editData) {
        setBarkod(editData.barkod || '');
        setModelId(editData.modelId);
        setVaryantId(editData.varyantId);
        setVaryantDisplayValue(editData.varyantDisplayValue || '');
        setStokGrupKodu(editData.stokGrupKodu);
        setBedenSetId(editData.bedenSetId);
        setBedenMiktarlar(editData.bedenMiktarlar);
        setFiyat(editData.fiyat);
        setDoviz(editData.doviz);
        setIndirimTipi(editData.indirimTipi);
        setIndirimDeger(editData.indirimDeger);
        setOzellikRows((editData.ozellikler || []).map(o => ({ ...o, mod: (o as any).mod || 'text' })));
        setAciklama(editData.aciklama);
      } else {
        setBarkod('');
        setModelId('');
        setVaryantId('');
        setVaryantDisplayValue('');
        setStokGrupKodu('');
        setBedenSetId('');
        setBedenMiktarlar({});
        setFiyat('');
        setDoviz(defaultDoviz);
        setIndirimTipi(-1);
        setIndirimDeger('');
        setOzellikRows([]);
        setAciklama('');
      }
      setErrors({});
    }
  }, [visible, editData, defaultDoviz]);

  // ─── Selected beden set ─────────────────────────────────────────
  const selectedBedenSet = useMemo(() => {
    if (!bedenSetId) return null;
    return bedenSetleri.find(b => b.id.toString() === bedenSetId) || null;
  }, [bedenSetId, bedenSetleri]);

  // ─── Auto-select beden set when model changes ──────────────────
  const handleModelChange = useCallback((id: string, model: ModelKartData | null) => {
    setModelId(id);
    setVaryantId('');
    setVaryantDisplayValue('');
    setErrors(prev => ({ ...prev, model: false }));

    if (id) {
      if (model?.bedenSetId) {
        setBedenSetId(model.bedenSetId.toString());
        setBedenMiktarlar({});
      }
      onModelChange?.(id);
    }
  }, [onModelChange]);

  // ─── Calculated values ──────────────────────────────────────────
  const toplamMiktar = useMemo(() => {
    return Object.values(bedenMiktarlar).reduce((sum, v) => sum + (v || 0), 0);
  }, [bedenMiktarlar]);

  const birimFiyat = parseFloat(fiyat) || 0;
  const toplamTutar = birimFiyat * toplamMiktar;

  const indirimliTutar = useMemo(() => {
    if (indirimTipi === -1 || !indirimDeger) return toplamTutar;
    const ind = parseFloat(indirimDeger) || 0;
    if (indirimTipi === 0) return toplamTutar * (1 - ind / 100);
    return toplamTutar - ind;
  }, [toplamTutar, indirimTipi, indirimDeger]);

  // ─── Beden miktar handler ──────────────────────────────────────
  const handleBedenMiktarChange = useCallback((beden: string, value: string) => {
    const num = parseInt(value, 10);
    setBedenMiktarlar(prev => ({
      ...prev,
      [beden]: isNaN(num) ? 0 : num,
    }));
    setErrors(prev => ({ ...prev, bedenMiktar: false }));
  }, []);

  // ─── Validation & Save ─────────────────────────────────────────
  const handleSave = useCallback(() => {
    const newErrors: Record<string, boolean> = {};

    if (!modelId) newErrors.model = true;
    if (!bedenSetId) newErrors.bedenSet = true;
    if (toplamMiktar === 0) newErrors.bedenMiktar = true;
    if (!fiyat || birimFiyat <= 0) newErrors.fiyat = true;
    if (indirimTipi !== -1 && (!indirimDeger || parseFloat(indirimDeger) <= 0)) {
      newErrors.indirimDeger = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      barkod,
      modelId,
      varyantId,
      varyantDisplayValue,
      stokGrupKodu,
      bedenSetId,
      bedenMiktarlar,
      fiyat,
      doviz,
      indirimTipi,
      indirimDeger,
      ozellikler: ozellikRows.filter(r => r.ad.trim()),
      aciklama,
    });
  }, [barkod, modelId, varyantId, stokGrupKodu, bedenSetId, bedenMiktarlar, fiyat, doviz, indirimTipi, indirimDeger, ozellikRows, aciklama, birimFiyat, toplamMiktar, onSave]);

  // ─── Format helpers ─────────────────────────────────────────────
  const formatAmount = (v: number) =>
    v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editData ? 'Detay Düzenle' : 'Detay Ekle'}
      icon={editData ? 'create-outline' : 'add-circle-outline'}
      toastRef={toastRef}
      footer={
        <>
          <Pressable
            style={[styles.footerBtn, styles.footerBtnCancel, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={saving}
          >
            <Icon name="close-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>İptal</Text>
          </Pressable>
          <Pressable
            style={[styles.footerBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="checkmark-outline" size={18} color="#fff" />
                <Text style={[styles.footerBtnText, { color: '#fff' }]}>
                  {editData ? 'Güncelle' : 'Ekle'}
                </Text>
              </>
            )}
          </Pressable>
        </>
      }
    >
      <View style={styles.formSection}>
        {/* ── Barkod Tarama ── */}
        <View style={styles.formRow}>
          <View style={styles.formField}>
            <BarcodeScanInput
              value={barkod}
              onChangeText={setBarkod}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
        </View>

        {/* ── Model Seçimi + Reçete ── */}
        <View style={[styles.formRow, { gap: 8, alignItems: 'flex-end' }]}>
          <View style={{ flex: 1 }}>
            <ModelSelectInput
              value={modelId}
              onSelect={handleModelChange}
              containerStyle={{ marginBottom: 0 }}
              error={errors.model}
            />
          </View>
          <Pressable
            style={[styles.receteBtn, { backgroundColor: '#8B5CF615', borderColor: modelId ? '#8B5CF6' : (isDark ? colors.border : '#E2E8F0') }]}
            onPress={() => modelId && onRecetePress?.(modelId)}
            disabled={!modelId}
          >
            <Icon name="document-text-outline" size={20} color={modelId ? '#8B5CF6' : colors.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.receteBtn, { backgroundColor: modelId ? '#F59E0B15' : (isDark ? colors.card : '#F8FAFC'), borderColor: modelId ? '#F59E0B' : (isDark ? colors.border : '#E2E8F0') }]}
            onPress={() => modelId && setGecmisSatisVisible(true)}
            disabled={!modelId}
          >
            <Icon name="time-outline" size={20} color={modelId ? '#F59E0B' : colors.textSecondary} />
          </Pressable>
        </View>

        {/* ── Varyant Seçimi ── */}
        <VaryantSelectInput
          label="Varyant"
          placeholder="Varyant seçiniz..."
          value={varyantId}
          displayValue={varyantDisplayValue}
          onSelect={(id, varyant) => {
            setVaryantId(id);
            setVaryantDisplayValue(varyant ? (varyant.varyantAdi || varyant.varyantKodu) : '');
            if (varyant) {
              setStokGrupKodu(varyant.stokGrupKodu);
              if (varyant.barkod && !barkod) setBarkod(varyant.barkod);
            }
          }}
          containerStyle={{ marginBottom: 8 }}
        />

        {/* ── Beden Seti + Fiyat + Döviz ── */}
        <View style={[styles.formRow, { gap: 10 }]}>
          <View style={{ flex: 1 }}>
            <BedenSetSelect
              value={bedenSetId}
              bedenSetleri={bedenSetleri}
              onSelect={(v) => {
                setBedenSetId(v);
                setBedenMiktarlar({});
                setErrors(prev => ({ ...prev, bedenSet: false, bedenMiktar: false }));
              }}
              containerStyle={{ marginBottom: 0 }}
              error={errors.bedenSet}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Satış Fiyatı</Text>
            <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: errors.fiyat ? colors.danger : colors.inputBorder }]}>
              <TextInput
                style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                value={fiyat}
                onChangeText={(v) => { setFiyat(v); setErrors(prev => ({ ...prev, fiyat: false })); }}
                placeholder="0.00"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <DovizSelect
              value={doviz}
              dovizTipleri={dovizTipleri}
              onSelect={setDoviz}
              shortLabel
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
        </View>

        {/* ── Beden Grid ── */}
        {selectedBedenSet && selectedBedenSet.bedenler.length > 0 && (
          <View style={[styles.bedenSection, { backgroundColor: isDark ? colors.background : '#F8FAFC', borderColor: errors.bedenMiktar ? colors.danger : (isDark ? colors.border : '#E2E8F0') }]}>
            <View style={styles.bedenHeader}>
              <Icon name="grid-outline" size={16} color={colors.primary} />
              <Text style={[styles.bedenTitle, { color: colors.text }]}>
                Beden Miktarları
              </Text>
              <View style={[styles.bedenTotalBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.bedenTotalText, { color: colors.primary }]}>
                  Toplam: {toplamMiktar}
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bedenGridContent}
            >
              {selectedBedenSet.bedenler.map((beden) => (
                <View key={beden} style={styles.bedenCol}>
                  <Text style={[styles.bedenLabel, { color: colors.primary }]}>{beden}</Text>
                  <View style={[
                    styles.bedenInput,
                    {
                      backgroundColor: isDark ? colors.card : '#fff',
                      borderColor: (bedenMiktarlar[beden] || 0) > 0 ? colors.primary : (isDark ? colors.border : '#D1D5DB'),
                    },
                  ]}>
                    <TextInput
                      style={[styles.bedenInputText, { color: colors.text }]}
                      value={bedenMiktarlar[beden] ? bedenMiktarlar[beden].toString() : ''}
                      onChangeText={(v) => handleBedenMiktarChange(beden, v)}
                      placeholder="0"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="number-pad"
                      textAlign="center"
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Özellikler ── */}
        <View style={{ backgroundColor: isDark ? colors.card : '#FFF7ED', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: isDark ? colors.border : '#FED7AA', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ozellikRows.length > 0 ? 10 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="pricetag-outline" size={18} color="#F59E0B" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Özellikler</Text>
            </View>
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
              onPress={() => setOzellikRows(prev => [...prev, { ad: '', deger: '', mod: 'text' }])}
              hitSlop={8}
            >
              <Icon name="add" size={14} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Ekle</Text>
            </Pressable>
          </View>
          {ozellikRows.map((row, idx) => (
            <View key={idx} style={{ marginBottom: 6, backgroundColor: isDark ? colors.background : '#FFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: isDark ? colors.border : '#FDE68A' }}>
              {/* Üst satır: Ad + Sil */}
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="SIPARIS_OZELLIK"
                    label="Özellik"
                    placeholder="Özellik seçiniz..."
                    value={row.ad}
                    onSelect={(v) => {
                      const updated = [...ozellikRows];
                      updated[idx] = { ...updated[idx], ad: v };
                      setOzellikRows(updated);
                    }}
                    addPlaceholder="Yeni özellik adı..."
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <IconButton
                  icon="trash-outline"
                  onPress={() => setOzellikRows(prev => prev.filter((_, i) => i !== idx))}
                  size={48}
                  iconSize={18}
                  color="#EF4444"
                  backgroundColor="#EF444415"
                  style={{ borderWidth: 1.5, borderColor: '#EF444430' }}
                />
              </View>
              {/* Alt satır: Değer + mod toggle (tam genişlik) */}
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Değer</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    {row.mod === 'varyant' ? (
                      <VaryantSelectInput
                        label=""
                        placeholder="Varyant seçiniz..."
                        value={row.deger}
                        onSelect={(id, varyant) => {
                          const updated = [...ozellikRows];
                          updated[idx] = { ...updated[idx], deger: varyant ? (varyant.varyantAdi || varyant.varyantKodu) : '' };
                          setOzellikRows(updated);
                        }}
                        containerStyle={{ marginBottom: 0 }}
                      />
                    ) : (
                      <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                        <TextInput
                          style={[styles.formInputText, { color: colors.text }]}
                          value={row.deger}
                          onChangeText={(v) => {
                            const updated = [...ozellikRows];
                            updated[idx] = { ...updated[idx], deger: v };
                            setOzellikRows(updated);
                          }}
                          placeholder="Değer"
                          placeholderTextColor={colors.placeholder}
                        />
                      </View>
                    )}
                  </View>
                  <IconButton
                    icon={row.mod === 'varyant' ? 'create-outline' : 'cube-outline'}
                    onPress={() => {
                      const updated = [...ozellikRows];
                      updated[idx] = { ...updated[idx], deger: '', mod: row.mod === 'text' ? 'varyant' : 'text' };
                      setOzellikRows(updated);
                    }}
                    size={48}
                    iconSize={18}
                    color={row.mod === 'varyant' ? colors.primary : colors.textSecondary}
                    backgroundColor={row.mod === 'varyant' ? colors.primary + '15' : (isDark ? colors.background : '#F1F5F9')}
                    style={{ borderWidth: 1.5, borderColor: row.mod === 'varyant' ? colors.primary + '30' : colors.inputBorder }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Açıklama ── */}
        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Açıklama</Text>
            <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, height: 72, alignItems: 'flex-start', paddingTop: 10 }]}>
              <Icon name="chatbubble-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
              <TextInput
                style={[styles.formInputText, { color: colors.text, textAlignVertical: 'top', height: 52 }]}
                value={aciklama}
                onChangeText={setAciklama}
                placeholder="Not ekleyiniz..."
                placeholderTextColor={colors.placeholder}
                multiline
              />
            </View>
          </View>
        </View>

        {/* ── İndirim ── */}
        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.inputLabel }]}>İndirim</Text>
            <View style={[styles.formRow, { gap: 8, marginBottom: 0 }]}>
              <View style={[styles.segmentGroup, { flex: 1 }]}>
                <Pressable
                  style={[styles.segmentBtn, { flex: 1 }, indirimTipi === -1 && { backgroundColor: '#EF4444' }]}
                  onPress={() => { setIndirimTipi(-1); setIndirimDeger(''); setErrors(prev => ({ ...prev, indirimDeger: false })); }}
                >
                  <Text style={[styles.segmentText, { fontSize: 16 }, indirimTipi === -1 && { color: '#fff' }]}>✕</Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentBtn, { flex: 1 }, indirimTipi === 0 && { backgroundColor: '#F59E0B' }]}
                  onPress={() => setIndirimTipi(0)}
                >
                  <Text style={[styles.segmentText, { fontSize: 16 }, indirimTipi === 0 && { color: '#fff' }]}>%</Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentBtn, { flex: 1 }, indirimTipi === 1 && { backgroundColor: '#F59E0B' }]}
                  onPress={() => setIndirimTipi(1)}
                >
                  <Text style={[styles.segmentText, { fontSize: 16 }, indirimTipi === 1 && { color: '#fff' }]}>$</Text>
                </Pressable>
              </View>
              {indirimTipi !== -1 && (
                <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: errors.indirimDeger ? colors.danger : colors.inputBorder, flex: 1 }]}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: errors.indirimDeger ? colors.danger : colors.textSecondary, marginRight: 8 }}>
                    {indirimTipi === 0 ? '%' : '$'}
                  </Text>
                  <TextInput
                    style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                    value={indirimDeger}
                    onChangeText={(v) => { setIndirimDeger(v); setErrors(prev => ({ ...prev, indirimDeger: false })); }}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Toplam Özet ── */}
        {toplamMiktar > 0 && birimFiyat > 0 && (
          <View style={[styles.totalCard, { backgroundColor: isDark ? colors.background : '#F0FDF4', borderColor: isDark ? colors.border : '#BBF7D0' }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Miktar</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{toplamMiktar.toLocaleString('tr-TR')} adet</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Satış Fiyatı</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{formatAmount(birimFiyat)} {doviz}</Text>
            </View>
            {indirimTipi !== -1 && indirimDeger && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: '#EF4444' }]}>İndirim</Text>
                <Text style={[styles.totalValue, { color: '#EF4444' }]}>
                  {indirimTipi === 0 ? `%${indirimDeger}` : `${formatAmount(parseFloat(indirimDeger) || 0)} ${doviz}`}
                </Text>
              </View>
            )}
            <View style={[styles.totalDivider, { borderTopColor: isDark ? colors.border : '#BBF7D0' }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text, fontWeight: '700', fontSize: 14 }]}>Toplam</Text>
              <Text style={[styles.totalGrand, { color: '#10B981' }]}>
                {formatAmount(indirimliTutar)} {doviz}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Geçmiş Satışlar Modal - BottomSheet (Modal) içinde olmalı */}
      <Modal
        visible={gecmisSatisVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGecmisSatisVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.gecmisOverlay}>
          <View style={[styles.gecmisContent, { backgroundColor: isDark ? colors.card : '#fff' }]}>
            {/* Header */}
            <View style={styles.gecmisHeader}>
              <View style={[styles.gecmisHeaderIcon, { backgroundColor: '#F59E0B18' }]}>
                <Icon name="time-outline" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.gecmisTitle, { color: colors.text }]}>Geçmiş Satışlar</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                  {mockGecmisSatislar.length} satış kaydı
                </Text>
              </View>
              <Pressable onPress={() => setGecmisSatisVisible(false)} style={styles.gecmisCloseBtn}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Summary Bar */}
            <View style={[styles.gecmisSummary, { backgroundColor: isDark ? colors.background : '#F8FAFC', borderColor: isDark ? colors.border : '#E2E8F0' }]}>
              <View style={styles.gecmisSummaryItem}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Ort. Fiyat</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  {(mockGecmisSatislar.reduce((s, i) => s + i.fiyat, 0) / mockGecmisSatislar.length).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.gecmisSummaryDivider, { backgroundColor: isDark ? colors.border : '#E2E8F0' }]} />
              <View style={styles.gecmisSummaryItem}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Top. Miktar</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  {mockGecmisSatislar.reduce((s, i) => s + i.miktar, 0).toLocaleString('tr-TR')}
                </Text>
              </View>
              <View style={[styles.gecmisSummaryDivider, { backgroundColor: isDark ? colors.border : '#E2E8F0' }]} />
              <View style={styles.gecmisSummaryItem}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Min / Max</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  {Math.min(...mockGecmisSatislar.map(i => i.fiyat)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} / {Math.max(...mockGecmisSatislar.map(i => i.fiyat)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Son Satışlar Tablosu */}
            <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
              <View style={[styles.gecmisTableHeader, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                <Text style={[styles.gecmisThText, { flex: 2 }]}>TARİH</Text>
                <Text style={[styles.gecmisThText, { flex: 2, textAlign: 'right' }]}>FİYAT</Text>
                <Text style={[styles.gecmisThText, { flex: 1, textAlign: 'center' }]}>DÖVİZ</Text>
                <Text style={[styles.gecmisThText, { flex: 1.5, textAlign: 'right' }]}>MİKTAR</Text>
              </View>
              {mockGecmisSatislar.slice(0, 5).map((s, idx) => (
                <View key={s.id} style={[styles.gecmisTableRow, { borderBottomColor: isDark ? colors.border : '#F1F5F9' }, idx % 2 === 0 && { backgroundColor: isDark ? colors.background + '60' : '#FAFBFC' }]}>
                  <Text style={[styles.gecmisTdText, { flex: 2, color: colors.textSecondary }]}>{formatDate(s.tarih)}</Text>
                  <Text style={[styles.gecmisTdText, { flex: 2, textAlign: 'right', fontWeight: '700', color: colors.text }]}>
                    {s.fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </Text>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: s.doviz === 'EUR' ? '#3B82F615' : '#10B98115' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: s.doviz === 'EUR' ? '#3B82F6' : '#10B981' }}>{s.doviz}</Text>
                    </View>
                  </View>
                  <Text style={[styles.gecmisTdText, { flex: 1.5, textAlign: 'right', color: colors.textSecondary }]}>
                    {s.miktar.toLocaleString('tr-TR')}
                  </Text>
                </View>
              ))}
            </View>

          </View>
        </View>
      </Modal>
    </BottomSheet>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    formSection: {
      paddingTop: 16,
      paddingBottom: 20,
    },
    formRow: {
      marginBottom: 12,
      flexDirection: 'row',
    },
    formField: {
      flex: 1,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 6,
    },
    formInput: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
    },
    formInputText: {
      flex: 1,
      fontSize: 15,
      paddingVertical: 0,
    },

    // Reçete button
    receteBtn: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Beden section
    bedenSection: {
      marginBottom: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      padding: 12,
    },
    bedenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    bedenTitle: {
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    bedenTotalBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    bedenTotalText: {
      fontSize: 12,
      fontWeight: '700',
    },
    bedenGridContent: {
      gap: 8,
      paddingBottom: 4,
    },
    bedenCol: {
      alignItems: 'center',
      minWidth: 56,
    },
    bedenLabel: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
    },
    bedenInput: {
      width: 56,
      height: 44,
      borderRadius: 10,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bedenInputText: {
      fontSize: 15,
      fontWeight: '600',
      width: '100%',
      textAlign: 'center',
      paddingVertical: 0,
    },

    // Segment control (indirim)
    segmentGroup: {
      flexDirection: 'row',
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    segmentBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    // Total card
    totalCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      marginTop: 4,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    totalLabel: {
      fontSize: 13,
    },
    totalValue: {
      fontSize: 13,
      fontWeight: '600',
    },
    totalDivider: {
      borderTopWidth: 1,
      marginVertical: 6,
    },
    totalGrand: {
      fontSize: 16,
      fontWeight: '700',
    },

    // Footer buttons
    footerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
    },
    footerBtnCancel: {
      borderWidth: 1,
    },
    footerBtnText: {
      fontSize: 14,
      fontWeight: '600',
    },

    // Geçmiş Satışlar Modal
    gecmisOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    gecmisContent: {
      width: '100%',
      maxHeight: '70%',
      borderRadius: 20,
      overflow: 'hidden',
    },
    gecmisHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? colors.border : '#E2E8F0',
    },
    gecmisHeaderIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gecmisTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    gecmisCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.background : '#F1F5F9',
    },
    gecmisSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginVertical: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    gecmisSummaryItem: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    gecmisSummaryDivider: {
      width: 1,
      height: 28,
      marginHorizontal: 4,
    },
    gecmisTableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 2,
    },
    gecmisThText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.3,
    },
    gecmisTableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    gecmisTdText: {
      fontSize: 13,
    },
  });
