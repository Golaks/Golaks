import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import accountService from '../services/account.service';
import ordersService from '../services/orders.service';
import Input from './Input';
import SelectInput from './SelectInput';
import BottomSheet, { BottomSheetToastRef } from './BottomSheet';
import { useFieldErrors } from '../hooks/useFieldErrors';

interface CariEkleModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (cari: { id: string; label: string }) => void;
  hesapKoduPrefix?: string;
  filterType?: string;
}

export default function CariEkleModal({ visible, onClose, onSaved, hesapKoduPrefix = '120', filterType = 'customers' }: CariEkleModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toastRef = useRef<BottomSheetToastRef | null>(null);
  const [saving, setSaving] = useState(false);
  const [unvan, setUnvan] = useState('');
  const [kisaUnvan, setKisaUnvan] = useState('');
  const [hesapKodu, setHesapKodu] = useState('');
  const [doviz, setDoviz] = useState('TL');
  const [dovizTipleri, setDovizTipleri] = useState<{ id: string; label: string }[]>([]);
  const fieldErrors = useFieldErrors();

  useEffect(() => {
    if (visible) {
      setUnvan('');
      setKisaUnvan('');
      setHesapKodu('');
      setDoviz('TL');
      fieldErrors.clearAll();
      fetchNextHesapKodu();
      fetchDovizTipleri();
    }
  }, [visible]);

  const fetchDovizTipleri = async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const res = await ordersService.getLookups(token, dataName);
      if (res.success && res.data?.dovizTipleri) {
        setDovizTipleri(res.data.dovizTipleri.map((d: any) => ({ id: d.dovizTipi, label: d.dovizTipi })));
      }
    } catch {}
  };

  const fetchNextHesapKodu = async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const subeId = (user as any)?.varsayilanSube || 1;
      const response = await accountService.getNextHesapKodu(token, dataName, filterType, subeId, hesapKoduPrefix);
      if (response.success && response.data.hesapKodu) {
        setHesapKodu(response.data.hesapKodu);
      } else {
        setHesapKodu(`${hesapKoduPrefix}.01.001`);
      }
    } catch {
      setHesapKodu(`${hesapKoduPrefix}.01.001`);
    }
  };

  const handleSave = async () => {
    const required: Record<string, string> = { unvan: unvan.trim() };
    if (!fieldErrors.validateRequired(required)) return;

    setSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const subeId = (user as any)?.varsayilanSube || 1;

      const response = await accountService.createCari(token, dataName, {
        hesapKodu,
        unvan: unvan.trim(),
        kisaUnvan: kisaUnvan.trim(),
        doviz,
        subeId,
      });

      if (response.success && response.data) {
        const newId = String(response.data.id);
        const label = `${hesapKodu}${unvan ? ' - ' + unvan.trim() : ''}`;
        onSaved?.({ id: newId, label });
        onClose();
      } else {
        toastRef.current?.show({ type: 'error', text: 'Cari oluşturulamadı' });
      }
    } catch {
      toastRef.current?.show({ type: 'error', text: 'Cari oluşturulamadı' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Yeni Cari Hesap"
      icon="person-add-outline"
      toastRef={toastRef}
      footer={
        <>
          <Pressable
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
            onPress={onClose}
          >
            <Icon name="close-outline" size={18} color={colors.textSecondary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>İptal</Text>
          </Pressable>
          <Pressable
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }}
            onPress={handleSave}
            disabled={saving}
          >
            <Icon name="checkmark-outline" size={18} color="#fff" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </Pressable>
        </>
      }
    >
      <Input
        label="Hesap Kodu *"
        value={hesapKodu}
        onChangeText={(v) => { setHesapKodu(v); fieldErrors.clearFieldError('hesapKodu'); }}
        placeholder="Otomatik oluşturulacak..."
        autoCapitalize="none"
        editable={false}
        error={fieldErrors.errors.hesapKodu ? ' ' : ''}
        shake={fieldErrors.shakes.hesapKodu}
      />
      <Input
        label="Ünvan *"
        value={unvan}
        onChangeText={(v) => { setUnvan(v); fieldErrors.clearFieldError('unvan'); }}
        placeholder="Firma veya kişi adı"
        error={fieldErrors.errors.unvan ? ' ' : ''}
        shake={fieldErrors.shakes.unvan}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Kısa Ünvan"
            value={kisaUnvan}
            onChangeText={setKisaUnvan}
            placeholder="Kısaltılmış ad"
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SelectInput
            label="Döviz"
            value={doviz}
            onSelect={setDoviz}
            items={dovizTipleri.length > 0 ? dovizTipleri : [
              { id: 'TL', label: 'TL' },
              { id: 'USD', label: 'USD' },
              { id: 'EUR', label: 'EUR' },
              { id: 'GBP', label: 'GBP' },
            ]}
            placeholder="Seçin"
            noClear
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
      </View>
    </BottomSheet>
  );
}
