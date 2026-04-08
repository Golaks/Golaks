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
import CariEkleModal from './CariEkleModal';
import FaturaTipiSelect from './FaturaTipiSelect';
import { authService } from '../services/auth.service';
import ordersService from '../services/orders.service';
import accountService from '../services/account.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { useFieldErrors } from '../hooks/useFieldErrors';

interface SatisFormProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
  saving?: boolean;
  editingItem?: any;
}

export default function SatisForm({ visible, onClose, onSave, saving = false, editingItem }: SatisFormProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const toastRef = useRef<BottomSheetToastRef | null>(null);

  // Master
  const [seriNo, setSeriNo] = useState('');
  const [tarih, setTarih] = useState(new Date());
  const [tipiId, setTipiId] = useState('');
  const [doviz, setDoviz] = useState('TL');
  const [cariId, setCariId] = useState('');
  const [aciklama, setAciklama] = useState('');

  // Lookups
  const [cariler, setCariler] = useState<{ id: string; label: string }[]>([]);
  const [dovizTipleri, setDovizTipleri] = useState<any[]>([]);
  const [showCariForm, setShowCariForm] = useState(false);
  const fieldErrors = useFieldErrors();

  const styles = createStyles(colors, isDark);
  const isEdit = !!editingItem;

  useEffect(() => {
    if (visible) {
      fetchLookups();
    }
  }, [visible]);

  const fetchLookups = async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      const lookupsRes = await ordersService.getLookups(token, dataName);
      if (lookupsRes.success && lookupsRes.data) {
        setDovizTipleri(lookupsRes.data.dovizTipleri?.map((d: any) => ({
          id: d.dovizTipi,
          label: d.dovizTipi,
        })) || []);
      }

      const cariRes = await accountService.getCariList(token, dataName, 'customers');
      if (cariRes.success && cariRes.data) {
        setCariler(cariRes.data.data?.map((c: any) => ({
          id: String(c.id),
          label: `${c.hesapKodu || ''}${c.unvan ? ' - ' + c.unvan : ''}`.trim(),
        })) || []);
      }

      // Seri no
      if (!isEdit) {
        try {
          const seriRes = await fetch(API_ENDPOINTS.SALES_NEXT_SERI_NO, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ dataName, prefix: 'FAT' }),
          });
          const seriData = await seriRes.json();
          if (seriData.success && seriData.data?.seriNo) {
            setSeriNo(seriData.data.seriNo);
            if (seriData.data.varsayilanDoviz) {
              setDoviz(seriData.data.varsayilanDoviz);
            }
          }
        } catch {}
      }
    } catch {}
  };

  const [isSaving, setIsSaving] = useState(false);

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
    if (!fieldErrors.validateRequired({ tipiId, seriNo: seriNo.trim(), doviz, cari: cariId })) return;

    setIsSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      const res = await fetch(API_ENDPOINTS.SALES_CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          dataName,
          tipiId: parseInt(tipiId, 10),
          carilerId: parseInt(cariId, 10),
          seriNo,
          tarih: formatDateISO(tarih),
          vade: formatDateISO(tarih),
          doviz,
          aciklama,
          modulKodu: 'magaza-satis',
        }),
      });
      const data = await res.json();

      if (data.success) {
        onSave?.(data.data);
        onClose();
      } else {
        toastRef.current?.show({ type: 'error', text: data.message || 'Kayıt başarısız' });
      }
    } catch (err: any) {
      toastRef.current?.show({ type: 'error', text: err.message || 'Bir hata oluştu' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEdit ? `Satış Düzenle - ${seriNo}` : 'Yeni Satış'}
      icon={isEdit ? 'create-outline' : 'cart-outline'}
      toastRef={toastRef}
      footer={
        <>
          <Pressable style={[styles.footerBtn, styles.footerBtnCancel, { borderColor: colors.border }]} onPress={onClose}>
            <Icon name="close-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>İptal</Text>
          </Pressable>
          <Pressable style={[styles.footerBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 }]} onPress={handleSave} disabled={isSaving}>
            <Icon name="checkmark-outline" size={18} color="#fff" />
            <Text style={[styles.footerBtnText, { color: '#fff' }]}>{isEdit ? 'Güncelle' : 'Kaydet'}</Text>
          </Pressable>
        </>
      }
    >
      {/* Fatura Tipi */}
      <View style={{ marginBottom: 10 }}>
        <FaturaTipiSelect
          label="Fatura Tipi *"
          value={tipiId}
          onSelect={(v) => { setTipiId(v); fieldErrors.clearFieldError('tipiId'); }}
          tur={1}
          gc={-1}
          noClear
          containerStyle={{ marginBottom: 0 }}
          error={fieldErrors.errors.tipiId}
          shake={fieldErrors.shakes.tipiId}
        />
      </View>

      {/* Seri No & Döviz */}
      <View style={styles.formRowDouble}>
        <View style={{ flex: 2 }}>
          <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Seri No</Text>
          <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: fieldErrors.errors.seriNo ? colors.danger : colors.inputBorder }]}>
            <TextInput
              style={[styles.formInputText, { color: colors.text }]}
              value={seriNo}
              onChangeText={(v) => { setSeriNo(v); fieldErrors.clearFieldError('seriNo'); }}
              placeholder="FAT-2026-000001"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <SelectInput
            label="Döviz"
            value={doviz}
            onSelect={(v) => { setDoviz(v); fieldErrors.clearFieldError('doviz'); }}
            items={dovizTipleri}
            placeholder="Seçin"
            noClear
            containerStyle={{ marginBottom: 0 }}
            error={fieldErrors.errors.doviz}
            shake={fieldErrors.shakes.doviz}
          />
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

      {/* Müşteri */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <SelectInput
            label="Müşteri *"
            placeholder="Müşteri seçiniz..."
            value={cariId}
            items={cariler}
            onSelect={(v) => { setCariId(v); fieldErrors.clearFieldError('cari'); }}
            searchPlaceholder="Müşteri ara..."
            containerStyle={{ marginBottom: 0 }}
            error={fieldErrors.errors.cari}
            shake={fieldErrors.shakes.cari}
          />
        </View>
        <Pressable style={[styles.addCariBtn, { backgroundColor: colors.primary }]} onPress={() => setShowCariForm(true)}>
          <Icon name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Açıklama */}
      <View>
        <Text style={[styles.formLabel, { color: colors.inputLabel }]}>Açıklama</Text>
        <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, height: 64, alignItems: 'flex-start', paddingTop: 10 }]}>
          <TextInput
            style={[styles.formInputText, { color: colors.text, textAlignVertical: 'top', height: 44 }]}
            value={aciklama}
            onChangeText={setAciklama}
            placeholder="Fatura notu..."
            placeholderTextColor={colors.placeholder}
            multiline
          />
        </View>
      </View>

      {/* Cari Ekleme Modal */}
      <CariEkleModal
        visible={showCariForm}
        onClose={() => setShowCariForm(false)}
        onSaved={(cari) => {
          setCariler(prev => [...prev, cari]);
          setCariId(cari.id);
        }}
      />
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
    addCariBtn: {
      width: 48, height: 48, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    footerBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 12, borderRadius: 10,
    },
    footerBtnCancel: { borderWidth: 1 },
    footerBtnText: { fontSize: 14, fontWeight: '600' },
  });
