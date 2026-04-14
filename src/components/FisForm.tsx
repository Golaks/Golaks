import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BottomSheet, { BottomSheetToastRef } from './BottomSheet';
import SelectInput from './SelectInput';
import DateInput from './DateInput';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import accountService from '../services/account.service';
import ordersService from '../services/orders.service';
import { useFieldErrors } from '../hooks/useFieldErrors';

const FIS_TIPLERI = [
  { id: 'Mahsup', label: 'Mahsup' },
  { id: 'Tahsil', label: 'Tahsil' },
  { id: 'Tediye', label: 'Tediye' },
];

interface DetayRow {
  id: string;
  hesapKodu: string;
  hesapAdi: string;
  aciklama: string;
  // Dövizli
  dovizliBorc: string;
  dovizliAlacak: string;
  dovizliDoviz: string;
  dovizliKur: string;
  // Muhasebe
  borc: string;
  alacak: string;
  doviz: string;
  dovizKuru: string;
  // Cari
  cariBorc: string;
  cariAlacak: string;
  cariDoviz: string;
  cariKur: string;
}

const EMPTY_DETAY: DetayRow = {
  id: '',
  hesapKodu: '',
  hesapAdi: '',
  aciklama: '',
  dovizliBorc: '',
  dovizliAlacak: '',
  dovizliDoviz: 'USD',
  dovizliKur: '1',
  borc: '',
  alacak: '',
  doviz: 'TL',
  dovizKuru: '1',
  cariBorc: '',
  cariAlacak: '',
  cariDoviz: 'USD',
  cariKur: '1',
};

interface FisFormProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
  editingItem?: any;
}

export default function FisForm({ visible, onClose, onSave, editingItem }: FisFormProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const toastRef = useRef<BottomSheetToastRef | null>(null);
  const fieldErrors = useFieldErrors();

  // Master
  const [fisNo, setFisNo] = useState('');
  const [fisTipi, setFisTipi] = useState('Mahsup');
  const [tarih, setTarih] = useState(new Date());
  const [aciklama, setAciklama] = useState('');
  const [kasaDurum, setKasaDurum] = useState(1);

  // Detay
  const [rows, setRows] = useState<DetayRow[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Lookups
  const [hesaplar, setHesaplar] = useState<{ id: string; label: string }[]>([]);
  const [dovizTipleri, setDovizTipleri] = useState<{ id: string; label: string }[]>([]);
  const [varsayilanDoviz, setVarsayilanDoviz] = useState('TL');
  const [isSaving, setIsSaving] = useState(false);

  const styles = createStyles(colors, isDark);
  const isEdit = !!editingItem;

  useEffect(() => {
    if (visible) {
      if (!isEdit) {
        setFisTipi('Mahsup');
        setTarih(new Date());
        setAciklama('');
        setKasaDurum(1);
        setRows([]);
        setExpandedRow(null);
      }
      fetchLookups();
    }
  }, [visible]);

  const fetchLookups = async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      // Hesap listesi (tüm cariler)
      const cariRes = await accountService.getCariList(token, dataName, 'all');
      if (cariRes.success && cariRes.data) {
        setHesaplar(cariRes.data.data?.map((c: any) => ({
          id: c.hesapKodu || String(c.id),
          label: `${c.hesapKodu || ''}${c.unvan ? ' - ' + c.unvan : ''}`.trim(),
        })) || []);
      }

      // Döviz tipleri + varsayılan döviz
      const lookupsRes = await ordersService.getLookups(token, dataName);
      if (lookupsRes.success && lookupsRes.data?.dovizTipleri) {
        setDovizTipleri(lookupsRes.data.dovizTipleri.map((d: any) => ({ id: d.dovizTipi, label: d.dovizTipi })));
      }
      const seriRes2 = await fetch(API_ENDPOINTS.SALES_NEXT_SERI_NO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dataName, prefix: 'FAT' }),
      });
      const seriData2 = await seriRes2.json();
      if (seriData2.success && seriData2.data?.varsayilanDoviz) {
        setVarsayilanDoviz(seriData2.data.varsayilanDoviz);
      }

      // Fiş no
      if (!isEdit) {
        const seriRes = await fetch(API_ENDPOINTS.FIS_NEXT_NO, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ dataName }),
        });
        const seriData = await seriRes.json();
        if (seriData.success && seriData.data?.fisNo) {
          setFisNo(seriData.data.fisNo);
        }
      }

      // Edit modda alanları doldur
      if (editingItem) {
        setFisNo(editingItem.fisNo || '');
        setFisTipi(editingItem.fisTipi || 'Mahsup');
        setTarih(editingItem.fisTarihi ? new Date(editingItem.fisTarihi) : new Date());
        setAciklama(editingItem.fisAciklama || '');
        setKasaDurum(editingItem.kasaDurum ?? 1);
        if (editingItem.detaylar?.length > 0) {
          setRows(editingItem.detaylar.map((d: any, i: number) => ({
            id: String(d.id || Date.now() + i),
            hesapKodu: d.hesapKodu || '',
            hesapAdi: d.hesapAdi || '',
            aciklama: d.aciklama || '',
            borc: d.borc > 0 ? String(d.borc) : '',
            alacak: d.alacak > 0 ? String(d.alacak) : '',
          })));
        }
      }
    } catch {}
  };

  const addRow = () => {
    const newId = Date.now().toString();
    setRows(prev => [...prev, { ...EMPTY_DETAY, id: newId }]);
    setExpandedRow(newId);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    if (expandedRow === id) setExpandedRow(null);
  };

  const updateRow = (id: string, field: keyof DetayRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toplamBorc = rows.reduce((s, r) => s + (parseFloat(r.dovizliBorc) || 0), 0);
  const toplamAlacak = rows.reduce((s, r) => s + (parseFloat(r.dovizliAlacak) || 0), 0);
  const fark = toplamBorc - toplamAlacak;
  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  };

  const handleSave = async () => {
    if (rows.length === 0) {
      toastRef.current?.show({ type: 'error', text: 'En az bir satır ekleyin' });
      return;
    }
    if (Math.abs(fark) > 0.01) {
      toastRef.current?.show({ type: 'error', text: `Borç-Alacak farkı: ${fmt(fark)}. Fark sıfır olmalı.` });
      return;
    }

    setIsSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      const body = {
        dataName,
        fisNo,
        fisTipi,
        fisTarihi: formatDateISO(tarih),
        fisAciklama: aciklama,
        kasaDurum,
        detaylar: rows.map(r => ({
          hesapKodu: r.hesapKodu,
          aciklama: r.aciklama,
          borc: parseFloat(r.borc) || 0,
          alacak: parseFloat(r.alacak) || 0,
          doviz: r.doviz || varsayilanDoviz,
          dovizKuru: parseFloat(r.dovizKuru) || 1,
          dovizliBorc: parseFloat(r.dovizliBorc) || 0,
          dovizliAlacak: parseFloat(r.dovizliAlacak) || 0,
          dovizliDoviz: r.dovizliDoviz,
          dovizliKur: parseFloat(r.dovizliKur) || 1,
          cariBorc: parseFloat(r.cariBorc) || 0,
          cariAlacak: parseFloat(r.cariAlacak) || 0,
          cariDoviz: r.cariDoviz,
          cariKur: parseFloat(r.cariKur) || 1,
        })),
      };

      const endpoint = isEdit ? API_ENDPOINTS.FIS_UPDATE : API_ENDPOINTS.FIS_CREATE;
      if (isEdit) (body as any).id = editingItem.id;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        onSave?.(data.data);
        onClose();
      } else {
        toastRef.current?.show({ type: 'error', text: data.error?.message || data.message || 'Kayıt başarısız' });
      }
    } catch (err: any) {
      toastRef.current?.show({ type: 'error', text: err.message || 'Bir hata oluştu' });
    } finally {
      setIsSaving(false);
    }
  };

  const TutarRow = ({ label, borcKey, alacakKey, dovizKey, kurKey, row, borcColor, alacakColor }: {
    label: string; borcKey: keyof DetayRow; alacakKey: keyof DetayRow; dovizKey: keyof DetayRow; kurKey: keyof DetayRow; row: DetayRow; borcColor?: string; alacakColor?: string;
  }) => (
    <View style={styles.tutarRow}>
      <Text style={[styles.tutarRowLabel, { color: colors.text }]}>{label}</Text>
      <View style={[styles.tutarInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <TextInput
          style={[styles.tutarInputText, { color: parseFloat(row[borcKey] as string) > 0 ? (borcColor || '#EF4444') : colors.text, textAlign: 'right' }]}
          value={row[borcKey] as string}
          onChangeText={(v) => { updateRow(row.id, borcKey, v); if (v) updateRow(row.id, alacakKey, ''); }}
          placeholder="0,00"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={[styles.tutarInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <TextInput
          style={[styles.tutarInputText, { color: parseFloat(row[alacakKey] as string) > 0 ? (alacakColor || '#10B981') : colors.text, textAlign: 'right' }]}
          value={row[alacakKey] as string}
          onChangeText={(v) => { updateRow(row.id, alacakKey, v); if (v) updateRow(row.id, borcKey, ''); }}
          placeholder="0,00"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={[styles.tutarInputSmall, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <SelectInput
          value={row[dovizKey] as string}
          items={dovizTipleri}
          onSelect={(v) => updateRow(row.id, dovizKey, v)}
          compact
          noClear
          containerStyle={{ marginBottom: 0 }}
        />
      </View>
      <View style={[styles.tutarInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <TextInput
          style={[styles.tutarInputText, { color: colors.text, textAlign: 'right' }]}
          value={row[kurKey] as string}
          onChangeText={(v) => updateRow(row.id, kurKey, v)}
          placeholder="1"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  );

  const renderRow = (row: DetayRow, index: number) => {
    const isExpanded = expandedRow === row.id;
    const rowBorc = parseFloat(row.dovizliBorc) || 0;
    const rowAlacak = parseFloat(row.dovizliAlacak) || 0;

    return (
      <View key={row.id} style={[styles.rowCard, isExpanded && { borderColor: colors.primary + '40' }]}>
        <Pressable style={styles.rowHeader} onPress={() => setExpandedRow(isExpanded ? null : row.id)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={[styles.rowNumber, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.rowNumberText, { color: colors.primary }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                {row.hesapKodu || 'Hesap seçin'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                {rowBorc > 0 && <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444' }}>B: {fmt(rowBorc)} {row.dovizliDoviz}</Text>}
                {rowAlacak > 0 && <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981' }}>A: {fmt(rowAlacak)} {row.dovizliDoviz}</Text>}
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => removeRow(row.id)} hitSlop={8}>
              <Icon name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.rowContent}>
            {/* Hesap Seçimi */}
            <SelectInput
              label="Hesap Kodu *"
              placeholder="Hesap seçiniz..."
              value={row.hesapKodu}
              items={hesaplar}
              onSelect={(v) => updateRow(row.id, 'hesapKodu', v)}
              searchPlaceholder="Hesap kodu veya ünvan ara..."
              containerStyle={{ marginBottom: 10 }}
            />

            {/* Tutar Tablosu - Dövizli / Muhasebe / Cari */}
            <View style={styles.tutarTable}>
              {/* Header */}
              <View style={styles.tutarHeaderRow}>
                <Text style={[styles.tutarHeaderLabel, { color: colors.textSecondary }]} />
                <Text style={[styles.tutarHeaderText, { color: colors.textSecondary }]}>Borç</Text>
                <Text style={[styles.tutarHeaderText, { color: colors.textSecondary }]}>Alacak</Text>
                <Text style={[styles.tutarHeaderText, { color: colors.textSecondary }]}>Döviz</Text>
                <Text style={[styles.tutarHeaderText, { color: colors.textSecondary }]}>Kur</Text>
              </View>

              <TutarRow label="Dövizli" borcKey="dovizliBorc" alacakKey="dovizliAlacak" dovizKey="dovizliDoviz" kurKey="dovizliKur" row={row} />
              <TutarRow label="Muhasebe" borcKey="borc" alacakKey="alacak" dovizKey="doviz" kurKey="dovizKuru" row={row} />
              <TutarRow label="Cari" borcKey="cariBorc" alacakKey="cariAlacak" dovizKey="cariDoviz" kurKey="cariKur" row={row} />
            </View>

            {/* Açıklama */}
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Açıklama</Text>
              <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <TextInput
                  style={[styles.formInputText, { color: colors.text }]}
                  value={row.aciklama}
                  onChangeText={(v) => updateRow(row.id, 'aciklama', v)}
                  placeholder="Satır açıklaması..."
                  placeholderTextColor={colors.placeholder}
                />
              </View>
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
      title={isEdit ? 'Fiş Düzenle' : 'Yeni Fiş'}
      icon="document-text-outline"
      toastRef={toastRef}
      footer={
        <>
          <Pressable style={[styles.footerBtn, styles.footerBtnCancel, { borderColor: colors.border }]} onPress={onClose}>
            <Icon name="close-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>İptal</Text>
          </Pressable>
          <Pressable style={[styles.footerBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 }]} onPress={handleSave} disabled={isSaving}>
            <Icon name="checkmark-outline" size={18} color="#fff" />
            <Text style={[styles.footerBtnText, { color: '#fff' }]}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </Pressable>
        </>
      }
    >
      {/* Fiş Tipi & Fiş No */}
      <View style={styles.formRowDouble}>
        <View style={{ flex: 1 }}>
          <SelectInput
            label="Fiş Tipi"
            value={fisTipi}
            items={FIS_TIPLERI}
            onSelect={setFisTipi}
            noClear
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Fiş No</Text>
          <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <TextInput
              style={[styles.formInputText, { color: colors.text }]}
              value={fisNo}
              onChangeText={setFisNo}
              placeholder="Otomatik"
              placeholderTextColor={colors.placeholder}
              editable={false}
            />
          </View>
        </View>
      </View>

      {/* Tarih */}
      <View style={{ marginBottom: 10 }}>
        <DateInput
          label="Tarih"
          value={tarih}
          onChange={setTarih}
          clearable={false}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      {/* Açıklama */}
      <View style={{ marginBottom: 10 }}>
        <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Açıklama</Text>
        <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <TextInput
            style={[styles.formInputText, { color: colors.text }]}
            value={aciklama}
            onChangeText={setAciklama}
            placeholder="Fiş açıklaması..."
            placeholderTextColor={colors.placeholder}
          />
        </View>
      </View>

      {/* Satır Header */}
      <View style={styles.listHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="layers-outline" size={16} color={colors.primary} />
          <Text style={[styles.listHeaderTitle, { color: colors.text }]}>Fiş Satırları</Text>
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
      {rows.length > 0 && (
        <Pressable style={[styles.addRowBtnBottom, { borderColor: colors.primary }]} onPress={addRow}>
          <Icon name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.addRowBtnBottomText, { color: colors.primary }]}>Satır Ekle</Text>
        </Pressable>
      )}

      {/* Toplam Kartı */}
      {rows.length > 0 && (
        <View style={[styles.totalCard, { backgroundColor: isDark ? colors.card : '#F8FAFC', borderColor: isDark ? colors.border : '#E2E8F0' }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: '#EF4444' }]}>Toplam Borç</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>{fmt(toplamBorc)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: '#10B981' }]}>Toplam Alacak</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>{fmt(toplamAlacak)}</Text>
          </View>
          <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: isDark ? colors.border : '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
            <Text style={[styles.totalLabel, { fontWeight: '700', fontSize: 14, color: Math.abs(fark) < 0.01 ? '#10B981' : '#EF4444' }]}>Fark</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: Math.abs(fark) < 0.01 ? '#10B981' : '#EF4444' }}>
              {Math.abs(fark) < 0.01 ? '0,00 ✓' : fmt(fark)}
            </Text>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
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
    formSegmentText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
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
    rowContent: { paddingHorizontal: 12, paddingBottom: 12 },
    totalCard: {
      borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1,
    },
    totalRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
    },
    totalLabel: { fontSize: 13, fontWeight: '600' },
    footerBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 12, borderRadius: 10,
    },
    footerBtnCancel: { borderWidth: 1 },
    footerBtnText: { fontSize: 14, fontWeight: '600' },
    // Tutar Tablosu
    tutarTable: {
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
      borderRadius: 10,
      overflow: 'hidden',
    },
    tutarHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    tutarHeaderLabel: { width: 65, fontSize: 10, fontWeight: '600' },
    tutarHeaderText: { flex: 1, fontSize: 10, fontWeight: '600', textAlign: 'center' },
    tutarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 4,
      gap: 3,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
    tutarRowLabel: { width: 65, fontSize: 11, fontWeight: '600' },
    tutarInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 6,
      height: 34,
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    tutarInputSmall: {
      width: 60,
      borderWidth: 0,
      borderRadius: 6,
      height: 34,
      justifyContent: 'center',
    },
    tutarInputText: { fontSize: 12, paddingVertical: 0, fontWeight: '600' },
  });
