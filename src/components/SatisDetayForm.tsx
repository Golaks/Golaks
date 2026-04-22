import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BottomSheet, { BottomSheetToastRef } from './BottomSheet';
import BarcodeScanner from './BarcodeScanner';
import { VaryantData } from './VaryantSelectInput';
import SelectInput from './SelectInput';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import accountService from '../services/account.service';

interface SatisDetayRow {
  id: string;
  stokMasterId: string;
  stokAdi: string;
  stokKodu: string;
  miktar: string;
  fiyat: string;
  indirimTipi: number;
  indirimDeger: string;
  aciklama: string;
  tezgahtarIds: string[];
}

const EMPTY_ROW: SatisDetayRow = {
  id: '',
  stokMasterId: '',
  stokAdi: '',
  stokKodu: '',
  miktar: '1',
  fiyat: '',
  indirimTipi: -1,
  indirimDeger: '',
  aciklama: '',
  tezgahtarIds: [],
};

interface SatisDetayFormProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (data: { rows: SatisDetayRow[] }) => void;
  saving?: boolean;
  faturaId?: string;
  seriNo?: string;
  doviz?: string;
  defaultTezgahtarIds?: string[];
}

export default function SatisDetayForm({ visible, onClose, onSave, saving = false, faturaId, seriNo, doviz = 'TL', defaultTezgahtarIds = [] }: SatisDetayFormProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const toastRef = useRef<BottomSheetToastRef | null>(null);
  const [rows, setRows] = useState<SatisDetayRow[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Per-row tezgahtar seçimi için personel listesi
  const [personelList, setPersonelList] = useState<{ id: string; label: string }[]>([]);
  const [tezgahtarPickerRowId, setTezgahtarPickerRowId] = useState<string | null>(null);

  // Tek input arama + barkod
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<VaryantData[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styles = createStyles(colors, isDark);

  const fetchVaryantlar = async (query: string): Promise<VaryantData[]> => {
    try {
      const token = await authService.getToken();
      if (!token) return [];
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return [];
      setSearchLoading(true);
      const res = await fetch(API_ENDPOINTS.STOCK_VARYANT_SEARCH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dataName, search: query }),
      });
      const data = await res.json();
      setSearchLoading(false);
      if (res.ok && data.data) {
        return Array.isArray(data.data) ? data.data : (data.data.varyantlar || []);
      }
      return [];
    } catch {
      setSearchLoading(false);
      return [];
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    searchDebounceRef.current = setTimeout(async () => {
      const items = await fetchVaryantlar(text);
      setSearchResults(items);
    }, 300);
  };

  useEffect(() => {
    if (!visible) {
      setSearchText('');
      setSearchResults([]);
      setScannerVisible(false);
    } else if (personelList.length === 0) {
      (async () => {
        try {
          const token = await authService.getToken();
          if (!token) return;
          const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
          const res = await accountService.getCariList(token, dataName, 'personnel');
          if (res.success && res.data) {
            setPersonelList(res.data.data?.map((c: any) => ({
              id: String(c.id),
              label: `${c.hesapKodu || ''}${c.unvan ? ' - ' + c.unvan : ''}`.trim(),
            })) || []);
          }
        } catch {}
      })();
    }
  }, [visible]);

  const addVaryantRow = (varyant: VaryantData) => {
    const existing = rows.find(r => r.stokMasterId === String(varyant.id));
    if (existing) {
      const newMiktar = (parseFloat(existing.miktar) || 0) + 1;
      setRows(prev => prev.map(r => r.id === existing.id ? { ...r, miktar: String(newMiktar) } : r));
      setExpandedRow(existing.id);
      toastRef.current?.show({ type: 'success', text: `${varyant.varyantAdi} miktarı: ${newMiktar}` });
    } else {
      const newId = Date.now().toString();
      const newRow: SatisDetayRow = {
        ...EMPTY_ROW,
        id: newId,
        stokMasterId: String(varyant.id),
        stokKodu: varyant.barkod || varyant.stokKodu || '',
        stokAdi: varyant.varyantAdi || varyant.stokAdi || '',
        miktar: '1',
        fiyat: varyant.satisFiyat ? String(varyant.satisFiyat) : '',
        tezgahtarIds: [...defaultTezgahtarIds],
      };
      setRows(prev => [...prev, newRow]);
      setExpandedRow(newId);
      toastRef.current?.show({ type: 'success', text: `${newRow.stokAdi} eklendi` });
    }
    setSearchText('');
    setSearchResults([]);
  };

  const handleBarcodeFromCamera = async (barcode: string) => {
    setScannerVisible(false);
    if (!barcode.trim()) return;
    const items = await fetchVaryantlar(barcode);
    if (items.length === 1) {
      addVaryantRow(items[0]);
    } else if (items.length > 1) {
      setSearchText(barcode);
      setSearchResults(items);
      toastRef.current?.show({ type: 'info', text: `${items.length} eşleşme bulundu` });
    } else {
      const newId = Date.now().toString();
      const newRow = { ...EMPTY_ROW, id: newId, stokKodu: barcode, stokAdi: barcode, miktar: '1', tezgahtarIds: [...defaultTezgahtarIds] };
      setRows(prev => [...prev, newRow]);
      setExpandedRow(newId);
      toastRef.current?.show({ type: 'success', text: `${barcode} eklendi` });
    }
  };

  const addRow = () => {
    const newId = Date.now().toString();
    setRows(prev => [...prev, { ...EMPTY_ROW, id: newId, tezgahtarIds: [...defaultTezgahtarIds] }]);
    setExpandedRow(newId);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    if (expandedRow === id) setExpandedRow(null);
  };

  const updateRow = (id: string, field: keyof SatisDetayRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const calcRowTotal = (row: SatisDetayRow) => {
    const miktar = parseFloat(row.miktar) || 0;
    const fiyat = parseFloat(row.fiyat) || 0;
    let tutar = miktar * fiyat;
    const ind = parseFloat(row.indirimDeger) || 0;
    if (row.indirimTipi === 0 && ind > 0) tutar *= (1 - ind / 100);
    else if (row.indirimTipi === 1 && ind > 0) tutar -= ind;
    return { tutar: Math.max(tutar, 0) };
  };

  const genelToplam = rows.reduce((acc, r) => {
    const { tutar } = calcRowTotal(r);
    return { ara: acc.ara + tutar };
  }, { ara: 0 });

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSave = () => {
    if (rows.length === 0) {
      toastRef.current?.show({ type: 'error', text: 'En az bir ürün ekleyin' });
      return;
    }
    for (const row of rows) {
      if (!row.miktar || parseFloat(row.miktar) <= 0) {
        toastRef.current?.show({ type: 'error', text: 'Miktar zorunludur' });
        setExpandedRow(row.id);
        return;
      }
    }
    onSave?.({ rows });
  };

  const renderRow = (row: SatisDetayRow, index: number) => {
    const isExpanded = expandedRow === row.id;
    const { tutar } = calcRowTotal(row);

    return (
      <View key={row.id} style={[styles.rowCard, isExpanded && { borderColor: colors.primary + '40' }]}>
        {/* Header */}
        <Pressable style={styles.rowHeader} onPress={() => setExpandedRow(isExpanded ? null : row.id)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={[styles.rowNumber, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.rowNumberText, { color: colors.primary }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                {row.stokAdi || row.stokKodu || 'Yeni Ürün'}
              </Text>
              {tutar > 0 && (
                <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>
                  {row.miktar} × {row.fiyat || '0'} = {fmt(tutar)} {doviz}
                </Text>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => removeRow(row.id)} hitSlop={8}>
              <Icon name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </View>
        </Pressable>

        {/* Content */}
        {isExpanded && (
          <View style={styles.rowContent}>
            {/* Ürün Bilgisi */}
            <View style={[styles.productInfo, { backgroundColor: isDark ? colors.background : '#F8FAFC', borderColor: isDark ? colors.border : '#E2E8F0' }]}>
              <Icon name="barcode-outline" size={16} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={1}>{row.stokAdi || row.stokKodu || '-'}</Text>
            </View>

            {/* Miktar & Fiyat */}
            <View style={styles.formRowDouble}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Miktar *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Pressable
                    style={[styles.qtyBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                    onPress={() => {
                      const cur = parseFloat(row.miktar) || 1;
                      const next = Math.max(1, cur - 1);
                      updateRow(row.id, 'miktar', String(next));
                    }}
                  >
                    <Icon name="remove" size={18} color={colors.primary} />
                  </Pressable>
                  <View style={[styles.formInput, { flex: 1, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                    <TextInput
                      style={[styles.formInputText, { color: colors.text, textAlign: 'center' }]}
                      value={row.miktar}
                      onChangeText={(v) => updateRow(row.id, 'miktar', v)}
                      onBlur={() => {
                        const n = parseFloat(row.miktar);
                        if (!n || n < 1) updateRow(row.id, 'miktar', '1');
                      }}
                      placeholder="1"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <Pressable
                    style={[styles.qtyBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                    onPress={() => {
                      const cur = parseFloat(row.miktar) || 0;
                      updateRow(row.id, 'miktar', String(cur + 1));
                    }}
                  >
                    <Icon name="add" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Birim Fiyat</Text>
                <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                  <TextInput
                    style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                    value={row.fiyat}
                    onChangeText={(v) => updateRow(row.id, 'fiyat', v)}
                    placeholder="0,00"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            {/* İndirim + Tezgahtar butonu */}
            <View style={[styles.formRowDouble, { marginBottom: 0, alignItems: 'center' }]}>
              <View style={[styles.formSegment, { flex: 1 }]}>
                <Pressable
                  style={[styles.formSegmentBtn, row.indirimTipi === -1 && { backgroundColor: '#EF4444' }]}
                  onPress={() => { updateRow(row.id, 'indirimTipi', -1); updateRow(row.id, 'indirimDeger', ''); }}
                >
                  <Text style={[styles.formSegmentText, row.indirimTipi === -1 && { color: '#fff' }]}>✕</Text>
                </Pressable>
                <Pressable
                  style={[styles.formSegmentBtn, row.indirimTipi === 0 && { backgroundColor: '#F59E0B' }]}
                  onPress={() => updateRow(row.id, 'indirimTipi', 0)}
                >
                  <Text style={[styles.formSegmentText, row.indirimTipi === 0 && { color: '#fff' }]}>%</Text>
                </Pressable>
                <Pressable
                  style={[styles.formSegmentBtn, row.indirimTipi === 1 && { backgroundColor: '#F59E0B' }]}
                  onPress={() => updateRow(row.id, 'indirimTipi', 1)}
                >
                  <Text style={[styles.formSegmentText, row.indirimTipi === 1 && { color: '#fff' }]}>$</Text>
                </Pressable>
              </View>
              {row.indirimTipi !== -1 && (
                <View style={{ flex: 1 }}>
                  <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginRight: 8 }}>
                      {row.indirimTipi === 0 ? '%' : doviz}
                    </Text>
                    <TextInput
                      style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                      value={row.indirimDeger}
                      onChangeText={(v) => updateRow(row.id, 'indirimDeger', v)}
                      placeholder="0,00"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              )}
              <Pressable
                style={{
                  width: 48, height: 48, borderRadius: 10, borderWidth: 1,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: row.tezgahtarIds.length > 0 ? colors.primary + '15' : 'transparent',
                  borderColor: row.tezgahtarIds.length > 0 ? colors.primary : (isDark ? colors.border : '#CBD5E1'),
                }}
                onPress={() => setTezgahtarPickerRowId(row.id)}
              >
                <Icon name="people-outline" size={18} color={row.tezgahtarIds.length > 0 ? colors.primary : colors.textSecondary} />
                {row.tezgahtarIds.length > 0 && (
                  <View style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 16, height: 16, borderRadius: 8,
                    backgroundColor: colors.primary,
                    alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{row.tezgahtarIds.length}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Seçilen tezgahtar chip'leri */}
            {row.tezgahtarIds.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {row.tezgahtarIds.map((tid) => {
                  const p = personelList.find(x => x.id === tid);
                  return (
                    <Pressable
                      key={tid}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                      onPress={() => updateRow(row.id, 'tezgahtarIds', row.tezgahtarIds.filter(x => x !== tid))}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                        {(p?.label || tid).replace(/^[\d.]+\s*-\s*/, '')}
                      </Text>
                      <Icon name="close-circle" size={14} color={colors.primary} />
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Satır Tutar */}
            <View style={[styles.tutarCard, { backgroundColor: isDark ? colors.background : '#F0FDF4', borderColor: isDark ? colors.border : '#BBF7D0' }]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Satır Tutarı</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#10B981' }}>{fmt(tutar)} {doviz}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={seriNo ? `Ürün Ekle - ${seriNo}` : 'Ürün Ekle'}
      icon="cart-outline"
      toastRef={toastRef}
      footer={
        <>
          <Pressable style={[styles.footerBtn, styles.footerBtnCancel, { borderColor: colors.border }]} onPress={onClose}>
            <Icon name="close-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>İptal</Text>
          </Pressable>
          <Pressable style={[styles.footerBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]} onPress={handleSave} disabled={saving}>
            <Icon name="checkmark-outline" size={18} color="#fff" />
            <Text style={[styles.footerBtnText, { color: '#fff' }]}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </Pressable>
        </>
      }
    >
      {/* Tek Input: Stok Arama + Barkod */}
      <View style={{ marginBottom: 12 }}>
        <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Ürün Ara / Barkod</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[
            styles.searchInputWrapper,
            { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
          ]}>
            <Icon name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInputText, { color: colors.text }]}
              value={searchText}
              onChangeText={handleSearchChange}
              placeholder="Stok adı, kodu veya barkod..."
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchLoading && <ActivityIndicator size="small" color={colors.primary} />}
            {!!searchText && !searchLoading && (
              <Pressable onPress={() => { setSearchText(''); setSearchResults([]); }} hitSlop={8}>
                <Icon name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[styles.cameraBtn, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', borderColor: colors.primary }]}
            onPress={() => setScannerVisible(true)}
          >
            <View style={[styles.cameraIconCircle, { backgroundColor: colors.primary }]}>
              <Icon name="camera-outline" size={20} color="#fff" />
            </View>
          </Pressable>
        </View>

        {/* Sonuç Listesi */}
        {searchResults.length > 0 && (
          <View style={[styles.resultsList, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? colors.border : '#E2E8F0' }]}>
            {searchResults.slice(0, 8).map((item) => (
              <Pressable
                key={item.id}
                style={styles.resultItem}
                onPress={() => addVaryantRow(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.varyantAdi || item.stokAdi}
                  </Text>
                  <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.stokKodu}{item.barkod ? ` · ${item.barkod}` : ''}
                  </Text>
                </View>
                <Text style={[styles.resultPrice, { color: '#10B981' }]}>
                  {item.satisFiyat?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.satisDoviz}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Satır Listesi Header */}
      <View style={styles.listHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="layers-outline" size={16} color={colors.primary} />
          <Text style={[styles.listHeaderTitle, { color: colors.text }]}>Ürünler</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.countBadgeText, { color: colors.primary }]}>{rows.length}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>{fmt(genelToplam.ara)} {doviz}</Text>
      </View>

      {/* Rows */}
      {rows.map((row, index) => renderRow(row, index))}

      {/* Toplam */}
      <View style={[styles.totalCard, { backgroundColor: isDark ? colors.card : '#F0FDF4', borderColor: isDark ? colors.border : '#BBF7D0' }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: '#10B981', fontWeight: '700', fontSize: 15 }]}>Toplam</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981' }}>{fmt(genelToplam.ara)} {doviz}</Text>
        </View>
      </View>

      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onBarcodeScanned={handleBarcodeFromCamera}
        title="Barkod Tara"
      />

      {/* Tezgahtar Seçim Modal */}
      <Modal
        visible={!!tezgahtarPickerRowId}
        transparent
        animationType="fade"
        onRequestClose={() => setTezgahtarPickerRowId(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setTezgahtarPickerRowId(null)}
        >
          <Pressable
            style={{
              width: '88%', maxWidth: 420, maxHeight: '70%',
              backgroundColor: isDark ? colors.card : '#fff',
              borderRadius: 16, overflow: 'hidden',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="people-outline" size={16} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 }}>Tezgahtar Seç</Text>
              <Pressable onPress={() => setTezgahtarPickerRowId(null)} hitSlop={8}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView>
              {personelList.map((p) => {
                const currentRow = rows.find(r => r.id === tezgahtarPickerRowId);
                const selected = currentRow?.tezgahtarIds.includes(p.id) || false;
                return (
                  <Pressable
                    key={p.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingHorizontal: 16, paddingVertical: 12,
                      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
                      backgroundColor: selected ? colors.primary + '10' : 'transparent',
                    }}
                    onPress={() => {
                      if (!tezgahtarPickerRowId || !currentRow) return;
                      const newIds = selected
                        ? currentRow.tezgahtarIds.filter(x => x !== p.id)
                        : [...currentRow.tezgahtarIds, p.id];
                      updateRow(tezgahtarPickerRowId, 'tezgahtarIds', newIds);
                    }}
                  >
                    <View style={{
                      width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
                      borderColor: selected ? colors.primary : (isDark ? colors.border : '#CBD5E1'),
                      backgroundColor: selected ? colors.primary : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <Icon name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>
                      {(p.label || '').replace(/^[\d.]+\s*-\s*/, '')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </BottomSheet>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    searchInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 48,
    },
    searchInputText: {
      flex: 1,
      fontSize: 14,
      paddingVertical: 0,
    },
    cameraBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 12,
      width: 48,
      height: 48,
    },
    cameraIconCircle: {
      width: 28, height: 28, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    resultsList: {
      marginTop: 6,
      borderWidth: 1,
      borderRadius: 10,
      overflow: 'hidden',
    },
    resultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? colors.border : '#F1F5F9',
      gap: 8,
    },
    resultTitle: { fontSize: 13, fontWeight: '700' },
    resultSub: { fontSize: 11, marginTop: 1 },
    resultPrice: { fontSize: 12, fontWeight: '700' },
    listHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, marginBottom: 8,
      borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#F1F5F9',
    },
    listHeaderTitle: { fontSize: 15, fontWeight: '700' },
    countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    countBadgeText: { fontSize: 12, fontWeight: '700' },
    addRowBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    },
    addRowBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
    addRowBtnBottom: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 12, borderRadius: 10,
      borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 12,
    },
    addRowBtnBottomText: { fontSize: 13, fontWeight: '600' },
    rowCard: {
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 12, marginBottom: 10,
      borderWidth: 1, borderColor: isDark ? colors.border : '#E2E8F0',
      overflow: 'hidden',
    },
    rowHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 12,
    },
    rowNumber: {
      width: 28, height: 28, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    rowNumberText: { fontSize: 13, fontWeight: '700' },
    rowTitle: { fontSize: 14, fontWeight: '600' },
    rowContent: { paddingHorizontal: 12, paddingBottom: 12 },
    productInfo: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 10,
    },
    formRowDouble: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: colors.inputLabel },
    formInput: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1.5, borderRadius: 10,
      paddingHorizontal: 12, height: 48,
    },
    formInputText: { flex: 1, fontSize: 14, paddingVertical: 0 },
    qtyBtn: {
      width: 40, height: 48, borderRadius: 10, borderWidth: 1,
      alignItems: 'center', justifyContent: 'center',
    },
    formSegment: {
      flexDirection: 'row', borderRadius: 10, overflow: 'hidden',
      backgroundColor: isDark ? colors.background : '#F1F5F9',
      height: 48,
    },
    formSegmentBtn: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
    },
    formSegmentText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
    tutarCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8,
    },
    totalCard: {
      borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1,
    },
    totalRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
    },
    totalLabel: { fontSize: 13, fontWeight: '600' },
    totalValue: { fontSize: 14, fontWeight: '700' },
    footerBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 12, borderRadius: 10,
    },
    footerBtnCancel: { borderWidth: 1 },
    footerBtnText: { fontSize: 14, fontWeight: '600' },
  });
