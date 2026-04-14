import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import BottomSheet, { BottomSheetToastRef } from './BottomSheet';
import BarcodeScanInput from './BarcodeScanInput';
import SelectInput from './SelectInput';

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
};

interface SatisDetayFormProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (rows: SatisDetayRow[]) => void;
  saving?: boolean;
  faturaId?: string;
  seriNo?: string;
  doviz?: string;
}

export default function SatisDetayForm({ visible, onClose, onSave, saving = false, faturaId, seriNo, doviz = 'TL' }: SatisDetayFormProps) {
  const { colors, isDark } = useTheme();
  const toastRef = useRef<BottomSheetToastRef | null>(null);
  const [rows, setRows] = useState<SatisDetayRow[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const styles = createStyles(colors, isDark);

  const handleBarcodeScanned = (barcode: string) => {
    if (!barcode.trim()) return;
    // Aynı barkod varsa miktarını artır
    const existing = rows.find(r => r.stokKodu === barcode);
    if (existing) {
      const newMiktar = (parseFloat(existing.miktar) || 0) + 1;
      setRows(prev => prev.map(r => r.id === existing.id ? { ...r, miktar: String(newMiktar) } : r));
      setExpandedRow(existing.id);
      toastRef.current?.show({ type: 'success', text: `${barcode} miktarı: ${newMiktar}` });
    } else {
      const newId = Date.now().toString();
      const newRow = { ...EMPTY_ROW, id: newId, stokKodu: barcode, stokAdi: barcode, miktar: '1' };
      setRows(prev => [...prev, newRow]);
      setExpandedRow(newId);
      toastRef.current?.show({ type: 'success', text: `${barcode} eklendi` });
    }
  };

  const addRow = () => {
    const newId = Date.now().toString();
    setRows(prev => [...prev, { ...EMPTY_ROW, id: newId }]);
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
    onSave?.(rows);
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
            {rows.length > 1 && (
              <Pressable onPress={() => removeRow(row.id)} hitSlop={8}>
                <Icon name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
            )}
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
                <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                  <TextInput
                    style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                    value={row.miktar}
                    onChangeText={(v) => updateRow(row.id, 'miktar', v)}
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="decimal-pad"
                  />
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

            {/* İndirim */}
            <View style={styles.formRowDouble}>
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
            </View>

            {/* Açıklama */}
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Açıklama</Text>
              <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <TextInput
                  style={[styles.formInputText, { color: colors.text }]}
                  value={row.aciklama}
                  onChangeText={(v) => updateRow(row.id, 'aciklama', v)}
                  placeholder="Not..."
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>

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
      {/* Barkod Okuma - Bağımsız */}
      <BarcodeScanInput
        label="Barkod Okut"
        value=""
        onChangeText={() => {}}
        onBarcodeScanned={handleBarcodeScanned}
        placeholder="Barkod okutun veya yazın..."
        scannerTitle="Barkod Tara"
        containerStyle={{ marginBottom: 12 }}
      />

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
    </BottomSheet>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
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
      padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 4,
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
