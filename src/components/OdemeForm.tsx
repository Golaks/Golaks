import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import BottomSheet, { BottomSheetToastRef } from './BottomSheet';
import SelectInput from './SelectInput';
import DateInput from './DateInput';

interface OdemeRow {
  id: string;
  tip: 'kasa' | 'banka';
  hesapId: string;
  tutar: string;
  doviz: string;
  aciklama: string;
}

interface OdemeFormProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (rows: OdemeRow[]) => void;
  saving?: boolean;
  faturaItem?: any;
}

const EMPTY_ROW = (doviz = 'TL'): OdemeRow => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  tip: 'kasa',
  hesapId: '',
  tutar: '',
  doviz,
  aciklama: '',
});

export default function OdemeForm({ visible, onClose, onSave, saving = false, faturaItem }: OdemeFormProps) {
  const { colors, isDark } = useTheme();
  const toastRef = useRef<BottomSheetToastRef | null>(null);
  const [tarih, setTarih] = useState(new Date());
  const [rows, setRows] = useState<OdemeRow[]>([]);

  const styles = createStyles(colors, isDark);

  const faturaDoviz = faturaItem?.doviz || 'TL';
  const faturaTutar = Number(faturaItem?.toplamTutar || 0);
  const odenen = Number(faturaItem?.odenenTutar || 0);
  const kalanInitial = Math.max(0, faturaTutar - odenen);

  useEffect(() => {
    if (visible) {
      setTarih(new Date());
      setRows([{ ...EMPTY_ROW(faturaDoviz), tutar: kalanInitial ? kalanInitial.toFixed(2) : '' }]);
    }
  }, [visible]);

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const toplamOdeme = useMemo(
    () => rows.reduce((acc, r) => acc + (parseFloat(r.tutar) || 0), 0),
    [rows]
  );
  const kalan = Math.max(0, kalanInitial - toplamOdeme);

  const addRow = () => {
    setRows(prev => [...prev, { ...EMPTY_ROW(faturaDoviz), tutar: kalan ? kalan.toFixed(2) : '' }]);
  };
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const updateRow = (id: string, field: keyof OdemeRow, value: any) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));

  const handleSave = () => {
    if (rows.length === 0) {
      toastRef.current?.show({ type: 'error', text: 'En az bir ödeme satırı ekleyin' });
      return;
    }
    for (const r of rows) {
      if (!r.tutar || parseFloat(r.tutar) <= 0) {
        toastRef.current?.show({ type: 'error', text: 'Tutar girilmelidir' });
        return;
      }
      if (!r.hesapId) {
        toastRef.current?.show({ type: 'error', text: r.tip === 'kasa' ? 'Kasa seçiniz' : 'Banka seçiniz' });
        return;
      }
    }
    onSave?.(rows);
  };

  // Mock data - placeholder
  const kasaItems = [
    { id: '1', label: 'Kasa - Ana' },
    { id: '2', label: 'Kasa - USD' },
  ];
  const bankaItems = [
    { id: '1', label: 'Ziraat - TL' },
    { id: '2', label: 'Garanti - EUR' },
  ];
  const dovizItems = [
    { id: 'TL', label: 'TL' },
    { id: 'USD', label: 'USD' },
    { id: 'EUR', label: 'EUR' },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Ödeme Ekle"
      icon="cash-outline"
      toastRef={toastRef}
      footer={
        <>
          <Pressable style={[styles.footerBtn, styles.footerBtnCancel, { borderColor: colors.border }]} onPress={onClose}>
            <Icon name="close-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>İptal</Text>
          </Pressable>
          <Pressable
            style={[styles.footerBtn, { backgroundColor: '#8B5CF6', opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Icon name="checkmark-outline" size={18} color="#fff" />
            <Text style={[styles.footerBtnText, { color: '#fff' }]}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </Pressable>
        </>
      }
    >
      {/* Bakiye Özet */}
      <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.card : '#FAF5FF', borderColor: '#8B5CF633' }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Müşteri</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1}>
            {faturaItem?.cariAdi || '-'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Fatura</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{faturaItem?.seriNo || '-'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Fatura Tutarı</Text>
          <Text style={[styles.summaryValue, { color: colors.text, fontWeight: '700' }]}>
            {fmt(faturaTutar)} {faturaDoviz}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ödenen</Text>
          <Text style={[styles.summaryValue, { color: '#10B981', fontWeight: '700' }]}>
            {fmt(odenen)} {faturaDoviz}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Kalan</Text>
          <Text style={[styles.summaryValue, { color: '#EF4444', fontWeight: '800', fontSize: 15 }]}>
            {fmt(Math.max(0, kalanInitial - toplamOdeme))} {faturaDoviz}
          </Text>
        </View>
      </View>

      {/* Tarih */}
      <View style={{ marginBottom: 12 }}>
        <DateInput label="Ödeme Tarihi" value={tarih} onChange={setTarih} clearable={false} containerStyle={{ marginBottom: 0 }} />
      </View>

      {/* Ödeme Satırları Header */}
      <View style={styles.listHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="wallet-outline" size={16} color="#8B5CF6" />
          <Text style={[styles.listHeaderTitle, { color: colors.text }]}>Ödemeler</Text>
          <View style={[styles.countBadge, { backgroundColor: '#8B5CF620' }]}>
            <Text style={[styles.countBadgeText, { color: '#8B5CF6' }]}>{rows.length}</Text>
          </View>
        </View>
        <Pressable
          style={[styles.addBtn, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF6' }]}
          onPress={addRow}
        >
          <Icon name="add" size={16} color="#8B5CF6" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>Satır Ekle</Text>
        </Pressable>
      </View>

      {/* Satırlar */}
      {rows.map((row, i) => (
        <View
          key={row.id}
          style={[styles.rowCard, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? colors.border : '#E2E8F0' }]}
        >
          <View style={styles.rowHeader}>
            <View style={styles.rowNumber}>
              <Text style={styles.rowNumberText}>{i + 1}</Text>
            </View>
            <View style={styles.tipSegment}>
              <Pressable
                style={[styles.tipBtn, row.tip === 'kasa' && { backgroundColor: '#10B981' }]}
                onPress={() => { updateRow(row.id, 'tip', 'kasa'); updateRow(row.id, 'hesapId', ''); }}
              >
                <Icon name="cash-outline" size={14} color={row.tip === 'kasa' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.tipBtnText, row.tip === 'kasa' && { color: '#fff' }]}>Kasa</Text>
              </Pressable>
              <Pressable
                style={[styles.tipBtn, row.tip === 'banka' && { backgroundColor: '#3B82F6' }]}
                onPress={() => { updateRow(row.id, 'tip', 'banka'); updateRow(row.id, 'hesapId', ''); }}
              >
                <Icon name="card-outline" size={14} color={row.tip === 'banka' ? '#fff' : colors.textSecondary} />
                <Text style={[styles.tipBtnText, row.tip === 'banka' && { color: '#fff' }]}>Banka</Text>
              </Pressable>
            </View>
            {rows.length > 1 && (
              <Pressable onPress={() => removeRow(row.id)} hitSlop={8} style={{ padding: 4 }}>
                <Icon name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
            )}
          </View>

          <View style={{ marginTop: 10 }}>
            <SelectInput
              label={row.tip === 'kasa' ? 'Kasa' : 'Banka'}
              placeholder={row.tip === 'kasa' ? 'Kasa seçiniz...' : 'Banka seçiniz...'}
              value={row.hesapId}
              items={row.tip === 'kasa' ? kasaItems : bankaItems}
              onSelect={(v) => updateRow(row.id, 'hesapId', v)}
              containerStyle={{ marginBottom: 10 }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Tutar</Text>
                <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                  <TextInput
                    style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                    value={row.tutar}
                    onChangeText={(v) => updateRow(row.id, 'tutar', v)}
                    placeholder="0,00"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <SelectInput
                  label="Döviz"
                  value={row.doviz}
                  items={dovizItems}
                  onSelect={(v) => updateRow(row.id, 'doviz', v)}
                  placeholder="TL"
                  noClear
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
            </View>
          </View>
        </View>
      ))}

      {/* Toplam */}
      <View style={[styles.totalCard, { backgroundColor: isDark ? colors.card : '#F0FDF4', borderColor: isDark ? colors.border : '#BBF7D0' }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Girilen Toplam</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#10B981' }}>{fmt(toplamOdeme)} {faturaDoviz}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Kalan Bakiye</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: kalan > 0 ? '#EF4444' : '#10B981' }}>
            {fmt(kalan)} {faturaDoviz}
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    summaryCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      marginBottom: 12,
      gap: 6,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: { fontSize: 12, fontWeight: '500' },
    summaryValue: { fontSize: 13, fontWeight: '600' },
    summaryDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? colors.border : '#E9D5FF',
      marginVertical: 2,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      marginBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#F1F5F9',
    },
    listHeaderTitle: { fontSize: 15, fontWeight: '700' },
    countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    countBadgeText: { fontSize: 12, fontWeight: '700' },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    rowCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      marginBottom: 10,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rowNumber: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: '#8B5CF615',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowNumberText: { fontSize: 12, fontWeight: '700', color: '#8B5CF6' },
    tipSegment: {
      flex: 1,
      flexDirection: 'row',
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: isDark ? colors.background : '#F1F5F9',
    },
    tipBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
    },
    tipBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
    formInput: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 48,
    },
    formInputText: { flex: 1, fontSize: 14, paddingVertical: 0 },
    totalCard: {
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      gap: 6,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLabel: { fontSize: 13, fontWeight: '600' },
    footerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
    },
    footerBtnCancel: { borderWidth: 1 },
    footerBtnText: { fontSize: 14, fontWeight: '600' },
  });
