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
  const [tipiId, setTipiId] = useState('18');
  const [doviz, setDoviz] = useState('TL');
  const [cariId, setCariId] = useState('');
  const [acenteId, setAcenteId] = useState('');
  const [rehberId, setRehberId] = useState('');
  const [tezgahtarIds, setTezgahtarIds] = useState<string[]>([]);
  const [rezervasyonId, setRezervasyonId] = useState('');
  const [masterIndirimTipi, setMasterIndirimTipi] = useState(-1);
  const [masterIndirimDeger, setMasterIndirimDeger] = useState('');
  const [aciklama, setAciklama] = useState('');

  // Lookups
  const [cariler, setCariler] = useState<{ id: string; label: string }[]>([]);
  const [dovizTipleri, setDovizTipleri] = useState<any[]>([]);
  const [acenteList, setAcenteList] = useState<{ id: string; label: string }[]>([]);
  const [rehberList, setRehberList] = useState<{ id: string; label: string }[]>([]);
  const [personelList, setPersonelList] = useState<{ id: string; label: string }[]>([]);
  const [rezervasyonList, setRezervasyonList] = useState<{ id: string; label: string }[]>([]);
  const [rezervasyonRaw, setRezervasyonRaw] = useState<Record<string, any>>({});
  const [showCariForm, setShowCariForm] = useState(false);
  const fieldErrors = useFieldErrors();

  const styles = createStyles(colors, isDark);
  const isEdit = !!editingItem;

  useEffect(() => {
    if (visible) {
      // Yeni mod: formu sıfırla
      if (!editingItem) {
        setTipiId('18');
        setTarih(new Date());
        setCariId('');
        setAcenteId('');
        setRehberId('');
        setTezgahtarIds([]);
        setRezervasyonId('');
        setMasterIndirimTipi(-1);
        setMasterIndirimDeger('');
        setAciklama('');
      }
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

      // Acente ve Rehber listesi (320 prefix)
      const acenteRes = await accountService.getCariList(token, dataName, 'customers', '', undefined, '320');
      if (acenteRes.success && acenteRes.data) {
        const list = acenteRes.data.data?.map((c: any) => ({
          id: String(c.id),
          label: `${c.hesapKodu || ''}${c.unvan ? ' - ' + c.unvan : ''}`.trim(),
        })) || [];
        setAcenteList(list);
        setRehberList(list);
      }

      // Personel listesi
      const personelRes = await accountService.getCariList(token, dataName, 'personnel');
      if (personelRes.success && personelRes.data) {
        setPersonelList(personelRes.data.data?.map((c: any) => ({
          id: String(c.id),
          label: `${c.hesapKodu || ''}${c.unvan ? ' - ' + c.unvan : ''}`.trim(),
        })) || []);
      }

      // Rezervasyonlar (sadece beklenenler - durum=0)
      try {
        const rezRes = await fetch(API_ENDPOINTS.RESERVATIONS_LIST, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ dataName, durum: 0 }),
        });
        const rezData = await rezRes.json();
        if (rezData.success && rezData.data?.items) {
          const raw: Record<string, any> = {};
          setRezervasyonList(rezData.data.items.map((r: any) => {
            const totalPax = (r.beklenenPax || 0) + (r.beklenenCocukPax || 0);
            const saatStr = r.beklenenSaat ? String(r.beklenenSaat).slice(0, 5) : '';
            const parts = [
              saatStr,
              r.acenteAdi || '',
              totalPax ? `${totalPax} pax` : '',
            ].filter(Boolean);
            raw[String(r.id)] = r;
            return { id: String(r.id), label: parts.join(' · ') };
          }));
          setRezervasyonRaw(raw);
        }
      } catch {}

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
            if (seriData.data.pasanMusteriId) {
              setCariId(String(seriData.data.pasanMusteriId));
            }
          }
        } catch {}
      }
    } catch {}

    // Edit modda alanları doldur (lookups yüklendikten sonra)
    if (editingItem) {
      setTipiId(String(editingItem.tipiId || '18'));
      setSeriNo(editingItem.seriNo || '');
      setDoviz(editingItem.doviz || 'TL');
      setTarih(editingItem.tarih ? new Date(editingItem.tarih) : new Date());
      setCariId(editingItem.carilerId ? String(editingItem.carilerId) : '');
      const art = editingItem.artId || {};
      if (art.acente?.id) {
        const acId = String(art.acente.id);
        setAcenteList(prev => prev.find(a => a.id === acId) ? prev : [...prev, { id: acId, label: art.acente.adi || acId }]);
        setAcenteId(acId);
      } else {
        setAcenteId('');
      }
      if (art.rehber?.id) {
        const rhId = String(art.rehber.id);
        setRehberList(prev => prev.find(a => a.id === rhId) ? prev : [...prev, { id: rhId, label: art.rehber.adi || rhId }]);
        setRehberId(rhId);
      } else {
        setRehberId('');
      }
      setTezgahtarIds((art.tezgahtar || []).map((t: any) => String(t.id)));
      setRezervasyonId(art.rezervasyon?.id ? String(art.rezervasyon.id) : '');
      setMasterIndirimTipi(editingItem.masterIndirimTipi ?? -1);
      setMasterIndirimDeger(editingItem.masterIndirimDeger != null ? String(editingItem.masterIndirimDeger) : '');
      setAciklama(editingItem.aciklama || '');
    }
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

      const body: any = {
        dataName,
        tipiId: parseInt(tipiId, 10),
        carilerId: parseInt(cariId, 10),
        seriNo,
        tarih: formatDateISO(tarih),
        vade: formatDateISO(tarih),
        doviz,
        aciklama,
        artId: {
          acente: acenteId ? { id: parseInt(acenteId, 10), adi: acenteList.find(c => c.id === acenteId)?.label || '' } : null,
          rehber: rehberId ? { id: parseInt(rehberId, 10), adi: rehberList.find(c => c.id === rehberId)?.label || '' } : null,
          tezgahtar: tezgahtarIds.map(id => ({ id: parseInt(id, 10), adi: personelList.find(p => p.id === id)?.label || '' })),
          rezervasyon: rezervasyonId ? { id: parseInt(rezervasyonId, 10), adi: rezervasyonList.find(r => r.id === rezervasyonId)?.label || '' } : null,
        },
        masterIndirimTipi: masterIndirimTipi,
        masterIndirimDeger: masterIndirimDeger ? parseFloat(masterIndirimDeger) : null,
        modulKodu: 'magaza-satis',
      };

      const endpoint = isEdit ? API_ENDPOINTS.SALES_UPDATE : API_ENDPOINTS.SALES_CREATE;
      if (isEdit) body.id = editingItem.id;

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

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Satış Düzenle' : 'Yeni Satış'}
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

      {/* Rezervasyon */}
      <View style={{ marginBottom: 10 }}>
        <SelectInput
          label="Rezervasyon"
          placeholder="Rezervasyon seçiniz..."
          value={rezervasyonId}
          items={rezervasyonList}
          onSelect={(v) => {
            setRezervasyonId(v);
            const r = rezervasyonRaw[v];
            if (r) {
              if (r.acenteId) {
                const acId = String(r.acenteId);
                if (!acenteList.find(a => a.id === acId)) {
                  setAcenteList(prev => [...prev, { id: acId, label: r.acenteAdi || acId }]);
                }
                setAcenteId(acId);
              }
              if (r.rehberId) {
                const rhId = String(r.rehberId);
                if (!rehberList.find(a => a.id === rhId)) {
                  setRehberList(prev => [...prev, { id: rhId, label: r.rehberAdi || rhId }]);
                }
                setRehberId(rhId);
              }
            }
          }}
          searchPlaceholder="Rezervasyon ara..."
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

      {/* Acente & Rehber */}
      <View style={styles.formRowDouble}>
        <View style={{ flex: 1 }}>
          <SelectInput
            label="Acente"
            placeholder="Seçiniz..."
            value={acenteId}
            items={acenteList}
            onSelect={setAcenteId}
            searchPlaceholder="Acente ara..."
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SelectInput
            label="Rehber"
            placeholder="Seçiniz..."
            value={rehberId}
            items={rehberList}
            onSelect={setRehberId}
            searchPlaceholder="Rehber ara..."
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
      </View>

      {/* Tezgahtar - Çoklu Seçim */}
      <View style={{ marginBottom: 10 }}>
        <SelectInput
          label="Tezgahtar"
          placeholder="Personel seçiniz..."
          value=""
          items={personelList.filter(p => !tezgahtarIds.includes(p.id))}
          onSelect={(id) => {
            if (id && !tezgahtarIds.includes(id)) {
              setTezgahtarIds(prev => [...prev, id]);
            }
          }}
          searchPlaceholder="Personel ara..."
          containerStyle={{ marginBottom: 6 }}
        />
        {tezgahtarIds.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tezgahtarIds.map(id => {
              const p = personelList.find(x => x.id === id);
              return (
                <Pressable
                  key={id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                  onPress={() => setTezgahtarIds(prev => prev.filter(x => x !== id))}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{p?.label || id}</Text>
                  <Icon name="close-circle" size={14} color={colors.primary} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Master İndirim */}
      <View style={{ marginBottom: 10 }}>
        <Text style={[styles.formLabel, { color: colors.inputLabel }]}>İndirim</Text>
        <View style={styles.formRowDouble}>
          <View style={[styles.formSegment, { flex: 1 }]}>
            <Pressable
              style={[styles.formSegmentBtn, masterIndirimTipi === -1 && { backgroundColor: '#EF4444' }]}
              onPress={() => { setMasterIndirimTipi(-1); setMasterIndirimDeger(''); }}
            >
              <Text style={[styles.formSegmentText, masterIndirimTipi === -1 && { color: '#fff' }]}>✕</Text>
            </Pressable>
            <Pressable
              style={[styles.formSegmentBtn, masterIndirimTipi === 0 && { backgroundColor: '#F59E0B' }]}
              onPress={() => setMasterIndirimTipi(0)}
            >
              <Text style={[styles.formSegmentText, masterIndirimTipi === 0 && { color: '#fff' }]}>%</Text>
            </Pressable>
            <Pressable
              style={[styles.formSegmentBtn, masterIndirimTipi === 1 && { backgroundColor: '#F59E0B' }]}
              onPress={() => setMasterIndirimTipi(1)}
            >
              <Text style={[styles.formSegmentText, masterIndirimTipi === 1 && { color: '#fff' }]}>$</Text>
            </Pressable>
          </View>
          {masterIndirimTipi !== -1 && (
            <View style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, flex: 1 }]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginRight: 8 }}>
                {masterIndirimTipi === 0 ? '%' : doviz}
              </Text>
              <TextInput
                style={[styles.formInputText, { color: colors.text, textAlign: 'right' }]}
                value={masterIndirimDeger}
                onChangeText={setMasterIndirimDeger}
                placeholder="0,00"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
              />
            </View>
          )}
        </View>
      </View>

      {/* Açıklama */}
      <View style={{ marginTop: -2 }}>
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
    formSegment: {
      flexDirection: 'row', borderRadius: 10, overflow: 'hidden',
      backgroundColor: isDark ? colors.background : '#F1F5F9',
      height: 48,
    },
    formSegmentBtn: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
    },
    formSegmentText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  });
