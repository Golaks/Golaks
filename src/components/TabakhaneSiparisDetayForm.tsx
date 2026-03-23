import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import BottomSheet, { BottomSheetToastRef } from './BottomSheet';
import SelectInput from './SelectInput';
import TanimSelectInput from './TanimSelectInput';
import BarcodeScanInput from './BarcodeScanInput';

interface DetayFormRow {
  id: string;
  stokAdi: string;
  menseiId: string;
  cinsiId: string;
  rengiId: string;
  kaliteId: string;
  finisajId: string;
  musteriRenk: string;
  tuyBoyu: string;
  tuyRenkId: string;
  tuyEfektId: string;
  suedRenkId: string;
  suedEfektId: string;
  kalinlik: string;
  miktar: string;
  birimId: string;
  miktar2: string;
  birim2Id: string;
  birimFiyat: string;
  hesaplama: string;
  indirimTipi: string;
  indirim: string;
  tutar: string;
  aciklama: string;
}

const EMPTY_ROW: DetayFormRow = {
  id: '',
  stokAdi: '',
  menseiId: '',
  cinsiId: '',
  rengiId: '',
  kaliteId: '',
  finisajId: '',
  musteriRenk: '',
  tuyBoyu: '',
  tuyRenkId: '',
  tuyEfektId: '',
  suedRenkId: '',
  suedEfektId: '',
  kalinlik: '',
  miktar: '',
  birimId: '',
  miktar2: '',
  birim2Id: '',
  birimFiyat: '',
  hesaplama: 'miktar',
  indirimTipi: '%',
  indirim: '',
  tutar: '',
  aciklama: '',
};

const HESAPLAMA_OPTIONS = [
  { id: 'miktar', label: 'Miktar' },
  { id: 'miktar2', label: 'Miktar 2' },
];

const INDIRIM_TIPI_OPTIONS = [
  { id: '%', label: '%' },
  { id: 'tutar', label: 'Tutar' },
];

interface TabakhaneSiparisDetayFormProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (rows: DetayFormRow[]) => void;
  saving?: boolean;
  siparisKodu?: string;
  deriTipi?: string;
}

export default function TabakhaneSiparisDetayForm({
  visible,
  onClose,
  onSave,
  saving = false,
  siparisKodu,
  deriTipi,
}: TabakhaneSiparisDetayFormProps) {
  const { colors, isDark } = useTheme();
  const toastRef = useRef<BottomSheetToastRef | null>(null);
  const [rows, setRows] = useState<DetayFormRow[]>([{ ...EMPTY_ROW, id: '1' }]);
  const [expandedRow, setExpandedRow] = useState<string | null>('1');
  const [expandedSection, setExpandedSection] = useState<Record<string, string[]>>({ '1': ['stok', 'ozellik', 'tuy', 'fiyat'] });

  const styles = createStyles(colors, isDark);

  const addRow = () => {
    const newId = Date.now().toString();
    setRows(prev => [...prev, { ...EMPTY_ROW, id: newId }]);
    setExpandedRow(newId);
    setExpandedSection(prev => ({ ...prev, [newId]: ['stok', 'ozellik', 'tuy', 'fiyat'] }));
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) {
      toastRef.current?.show({ type: 'error', text: 'En az bir satır olmalıdır' });
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
    if (expandedRow === id) setExpandedRow(null);
  };

  const updateRow = (id: string, field: keyof DetayFormRow, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // Otomatik tutar hesaplama
      if (['miktar', 'miktar2', 'birimFiyat', 'hesaplama', 'indirim', 'indirimTipi'].includes(field)) {
        const qty = updated.hesaplama === 'miktar2'
          ? (parseFloat(updated.miktar2) || 0)
          : (parseFloat(updated.miktar) || 0);
        const price = parseFloat(updated.birimFiyat) || 0;
        let total = qty * price;
        const disc = parseFloat(updated.indirim) || 0;
        if (disc > 0) {
          total = updated.indirimTipi === '%' ? total * (1 - disc / 100) : total - disc;
        }
        updated.tutar = total > 0 ? total.toFixed(2) : '0,00';
      }
      return updated;
    }));
  };

  const toggleSection = (rowId: string, section: string) => {
    setExpandedSection(prev => {
      const current = prev[rowId] || [];
      if (current.includes(section)) {
        return { ...prev, [rowId]: current.filter(s => s !== section) };
      }
      return { ...prev, [rowId]: [...current, section] };
    });
  };

  const isSectionExpanded = (rowId: string, section: string) => {
    return (expandedSection[rowId] || []).includes(section);
  };

  const handleSave = () => {
    // Validasyon
    for (const row of rows) {
      if (!row.stokAdi.trim()) {
        toastRef.current?.show({ type: 'error', text: 'Stok adı zorunludur' });
        setExpandedRow(row.id);
        return;
      }
      if (!row.miktar || parseFloat(row.miktar) <= 0) {
        toastRef.current?.show({ type: 'error', text: 'Miktar zorunludur' });
        setExpandedRow(row.id);
        return;
      }
    }
    onSave?.(rows);
  };

  const SectionHeader = ({ rowId, section, icon, title, color: sColor }: { rowId: string; section: string; icon: string; title: string; color: string }) => (
    <Pressable
      style={[styles.sectionHeader, { backgroundColor: isDark ? colors.background : `${sColor}08` }]}
      onPress={() => toggleSection(rowId, section)}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.sectionIcon, { backgroundColor: `${sColor}15` }]}>
          <Icon name={icon} size={14} color={sColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <Icon name={isSectionExpanded(rowId, section) ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
    </Pressable>
  );

  const renderRow = (row: DetayFormRow, index: number) => {
    const isExpanded = expandedRow === row.id;

    return (
      <View key={row.id} style={[styles.rowCard, isExpanded && { borderColor: colors.primary + '40' }]}>
        {/* Row Header */}
        <Pressable style={styles.rowHeader} onPress={() => setExpandedRow(isExpanded ? null : row.id)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={[styles.rowNumber, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.rowNumberText, { color: colors.primary }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                {row.stokAdi || 'Yeni Kalem'}
              </Text>
              {row.tutar && parseFloat(row.tutar) > 0 ? (
                <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>
                  {row.miktar || '0'} × {row.birimFiyat || '0'} = {row.tutar}
                </Text>
              ) : null}
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

        {/* Row Content */}
        {isExpanded && (
          <View style={styles.rowContent}>
            {/* ─── STOK BİLGİSİ ─── */}
            <SectionHeader rowId={row.id} section="stok" icon="search-outline" title="Stok Bilgisi" color="#3B82F6" />
            {isSectionExpanded(row.id, 'stok') && (
              <View style={styles.sectionContent}>
                <View style={styles.formField}>
                  <BarcodeScanInput
                    label="Stok *"
                    value={row.stokAdi}
                    onChangeText={(v) => updateRow(row.id, 'stokAdi', v)}
                    placeholder="Stok adı veya barkod..."
                    scannerTitle="Barkod Tara"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>
            )}

            {/* ─── ÖZELLİKLER ─── */}
            <SectionHeader rowId={row.id} section="ozellik" icon="color-palette-outline" title="Özellikler" color="#8B5CF6" />
            {isSectionExpanded(row.id, 'ozellik') && (
              <View style={styles.sectionContent}>
                <View style={styles.formRowDouble}>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="MENSEI"
                      label="Menşei"
                      placeholder="Seçin..."
                      value={row.menseiId}
                      onSelect={(v) => updateRow(row.id, 'menseiId', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="DERI_CINSI"
                      label="Cinsi"
                      placeholder="Seçin..."
                      value={row.cinsiId}
                      onSelect={(v) => updateRow(row.id, 'cinsiId', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>
                <View style={styles.formRowDouble}>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="DERI_RENK"
                      label="Rengi"
                      placeholder="Seçin..."
                      value={row.rengiId}
                      onSelect={(v) => updateRow(row.id, 'rengiId', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="DERI_KALITE"
                      label="Kalite"
                      placeholder="Seçin..."
                      value={row.kaliteId}
                      onSelect={(v) => updateRow(row.id, 'kaliteId', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>
                <View style={styles.formRowDouble}>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="FINISAJ"
                      label="Finisaj"
                      placeholder="Seçin..."
                      value={row.finisajId}
                      onSelect={(v) => updateRow(row.id, 'finisajId', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel]}>Kalınlık</Text>
                    <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <Icon name="resize-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.formInputText, { color: colors.text }]}
                        value={row.kalinlik}
                        onChangeText={(v) => updateRow(row.id, 'kalinlik', v)}
                        placeholder="mm"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.formRowDouble}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel]}>Müşteri Renk</Text>
                    <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <Icon name="color-palette-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.formInputText, { color: colors.text }]}
                        value={row.musteriRenk}
                        onChangeText={(v) => updateRow(row.id, 'musteriRenk', v)}
                        placeholder="Renk adı"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel]}>Tüy Boyu</Text>
                    <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <Icon name="analytics-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.formInputText, { color: colors.text }]}
                        value={row.tuyBoyu}
                        onChangeText={(v) => updateRow(row.id, 'tuyBoyu', v)}
                        placeholder="mm"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ─── TÜY & SÜED (Sadece Kürk) ─── */}
            {deriTipi === 'Kürk' && (
            <>
            <SectionHeader rowId={row.id} section="tuy" icon="leaf-outline" title="Tüy & Süed" color="#10B981" />
            {isSectionExpanded(row.id, 'tuy') && (
              <View style={styles.sectionContent}>
                <View style={styles.formRowDouble}>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="TUY_RENK"
                      label="Tüy Renk"
                      placeholder="Seçin..."
                      value={row.tuyRenkId}
                      onSelect={(v) => updateRow(row.id, 'tuyRenkId', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="TUY_EFEKT"
                      label="Tüy Efekt"
                      placeholder="Seçin..."
                      value={row.tuyEfektId}
                      onSelect={(v) => updateRow(row.id, 'tuyEfektId', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>
                <View style={styles.formRowDouble}>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="SUED_RENK"
                      label="Süed Renk"
                      placeholder="Seçin..."
                      value={row.suedRenkId}
                      onSelect={(v) => updateRow(row.id, 'suedRenkId', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="SUED_EFEKT"
                      label="Süed Efekt"
                      placeholder="Seçin..."
                      value={row.suedEfektId}
                      onSelect={(v) => updateRow(row.id, 'suedEfektId', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>
              </View>
            )}
            </>
            )}

            {/* ─── FİYAT & MİKTAR ─── */}
            <SectionHeader rowId={row.id} section="fiyat" icon="calculator-outline" title="Fiyat & Miktar" color="#F59E0B" />
            {isSectionExpanded(row.id, 'fiyat') && (
              <View style={styles.sectionContent}>
                {/* Miktar & Birim */}
                <View style={styles.formRowDouble}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel]}>Miktar *</Text>
                    <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <Icon name="cube-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                        value={row.miktar}
                        onChangeText={(v) => updateRow(row.id, 'miktar', v)}
                        placeholder="0,00"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="BIRIM"
                      label="Birim"
                      placeholder="Seçin..."
                      value={row.birimId}
                      onSelect={(v) => updateRow(row.id, 'birimId', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>

                {/* Miktar 2 & Birim 2 */}
                <View style={styles.formRowDouble}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel]}>Miktar 2</Text>
                    <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <Icon name="layers-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                        value={row.miktar2}
                        onChangeText={(v) => updateRow(row.id, 'miktar2', v)}
                        placeholder="0,00"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <TanimSelectInput
                      tanimKodu="BIRIM"
                      label="Birim 2"
                      placeholder="Seçin..."
                      value={row.birim2Id}
                      onSelect={(v) => updateRow(row.id, 'birim2Id', v)}
                      useDbId
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>

                {/* B.Fiyat & Hesaplama */}
                <View style={styles.formRowDouble}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel]}>B.Fiyat</Text>
                    <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <Icon name="pricetag-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                        value={row.birimFiyat}
                        onChangeText={(v) => updateRow(row.id, 'birimFiyat', v)}
                        placeholder="0,00"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <SelectInput
                      label="Hesaplama"
                      value={row.hesaplama}
                      items={HESAPLAMA_OPTIONS}
                      onSelect={(v) => updateRow(row.id, 'hesaplama', v)}
                      noClear
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>

                {/* İndirim Tipi & İndirim */}
                <View style={styles.formRowDouble}>
                  <View style={{ flex: 1 }}>
                    <SelectInput
                      label="İnd.Tipi"
                      value={row.indirimTipi}
                      items={INDIRIM_TIPI_OPTIONS}
                      onSelect={(v) => updateRow(row.id, 'indirimTipi', v)}
                      noClear
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel]}>İndirim</Text>
                    <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <Icon name="trending-down-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                        value={row.indirim}
                        onChangeText={(v) => updateRow(row.id, 'indirim', v)}
                        placeholder="0,00"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>

                {/* Tutar (Hesaplanan) */}
                <View style={[styles.tutarCard, { backgroundColor: isDark ? colors.background : '#F0FDF4', borderColor: isDark ? colors.border : '#BBF7D0' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="wallet-outline" size={16} color="#10B981" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Tutar</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#10B981' }}>
                    {row.tutar || '0,00'}
                  </Text>
                </View>

                {/* Açıklama */}
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.formLabel]}>Açıklama</Text>
                  <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, height: 64, alignItems: 'flex-start', paddingTop: 10 }]}>
                    <Icon name="chatbubble-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
                    <TextInput
                      style={[styles.formInputText, { color: colors.text, textAlignVertical: 'top', height: 44 }]}
                      value={row.aciklama}
                      onChangeText={(v) => updateRow(row.id, 'aciklama', v)}
                      placeholder="Kalem notu..."
                      placeholderTextColor={colors.placeholder}
                      multiline
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={siparisKodu ? `Sipariş Detay - ${siparisKodu}` : 'Sipariş Kalemleri'}
      icon="layers-outline"
      toastRef={toastRef}
      footer={
        <>
          <Pressable
            style={[styles.footerBtn, styles.footerBtnCancel, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Icon name="close-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>İptal</Text>
          </Pressable>
          <Pressable
            style={[styles.footerBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Icon name="checkmark-outline" size={18} color="#fff" />
            <Text style={[styles.footerBtnText, { color: '#fff' }]}>Kaydet</Text>
          </Pressable>
        </>
      }
    >
      {/* Satır Ekle Header */}
      <View style={styles.listHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="cart-outline" size={16} color={colors.primary} />
          <Text style={[styles.listHeaderTitle, { color: colors.text }]}>
            Sipariş Kalemleri
          </Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.countBadgeText, { color: colors.primary }]}>{rows.length}</Text>
          </View>
        </View>
        <Pressable style={[styles.addRowBtn, { backgroundColor: colors.primary }]} onPress={addRow}>
          <Icon name="add" size={14} color="#fff" />
          <Text style={styles.addRowBtnText}>Satır Ekle</Text>
        </Pressable>
      </View>

      {/* Rows */}
      {rows.map((row, index) => renderRow(row, index))}

      {/* Alt Satır Ekle */}
      <Pressable style={[styles.addRowBtnBottom, { borderColor: colors.primary }]} onPress={addRow}>
        <Icon name="add-circle-outline" size={18} color={colors.primary} />
        <Text style={[styles.addRowBtnBottomText, { color: colors.primary }]}>Satır Ekle</Text>
      </Pressable>
    </BottomSheet>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    // List Header
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#F1F5F9',
    },
    listHeaderTitle: { fontSize: 15, fontWeight: '700' },
    countBadge: {
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    },
    countBadgeText: { fontSize: 12, fontWeight: '700' },
    addRowBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    },
    addRowBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
    addRowBtnBottom: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 14, borderRadius: 12,
      borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4, marginBottom: 16,
    },
    addRowBtnBottomText: { fontSize: 14, fontWeight: '600' },

    // Row Card
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

    // Section
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 10, borderRadius: 8, marginBottom: 4,
    },
    sectionIcon: {
      width: 24, height: 24, borderRadius: 6,
      alignItems: 'center', justifyContent: 'center',
    },
    sectionTitle: { fontSize: 13, fontWeight: '600' },
    sectionContent: { paddingHorizontal: 4, paddingBottom: 8 },

    // Form
    formField: { marginBottom: 8 },
    formRowDouble: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: colors.inputLabel },
    formInput: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1.5, borderRadius: 10,
      paddingHorizontal: 12, height: 48,
    },
    formInputText: { flex: 1, fontSize: 14, paddingVertical: 0 },

    // Tutar Card
    tutarCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8,
    },

    // Footer
    footerBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 12, borderRadius: 10,
    },
    footerBtnCancel: { borderWidth: 1 },
    footerBtnText: { fontSize: 14, fontWeight: '600' },
  });
