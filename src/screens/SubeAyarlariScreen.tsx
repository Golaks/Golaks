import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Modal, Pressable, Switch } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import SelectInput from '../components/SelectInput';
import { authService } from '../services/auth.service';
import accountService from '../services/account.service';
import ordersService from '../services/orders.service';
import CariEkleModal from '../components/CariEkleModal';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAlert } from '../contexts/AlertContext';
import { useFieldErrors } from '../hooks/useFieldErrors';

interface SubeAyarlariScreenProps {
  onGoBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function SubeAyarlariScreen({ onGoBack, onTabChange, onLogout }: SubeAyarlariScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, user, notificationCount } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('profile');
  const styles = createStyles(colors, isDark);

  // Şube state
  const [subeler, setSubeler] = useState<{ id: string; label: string }[]>([]);
  const [selectedSubeId, setSelectedSubeId] = useState<string>('');

  // Hesap Kodları - Cari seçim (prefix'e göre)
  const [avansCariler, setAvansCariler] = useState<{ id: string; label: string }[]>([]);
  const [indirimCariler, setIndirimCariler] = useState<{ id: string; label: string }[]>([]);
  const [kasaCariler, setKasaCariler] = useState<{ id: string; label: string }[]>([]);
  const [bankaCariler, setBankaCariler] = useState<{ id: string; label: string }[]>([]);
  const [pasanMusteriCariler, setPasanMusteriCariler] = useState<{ id: string; label: string }[]>([]);
  const [avansHesapId, setAvansHesapId] = useState('');
  const [indirimHesapId, setIndirimHesapId] = useState('');
  const [varsayilanKasaId, setVarsayilanKasaId] = useState('');
  const [varsayilanBankaId, setVarsayilanBankaId] = useState('');
  const [pasanMusteriId, setPasanMusteriId] = useState('');
  const isMagazaAktif = !!user?.firmaAyarlar?.programlar?.magaza?.aktif;
  const [varsayilanDoviz, setVarsayilanDoviz] = useState('TL');
  const [dovizTipleri, setDovizTipleri] = useState<{ id: string; label: string }[]>([]);
  const [muhasebeFisiKapali, setMuhasebeFisiKapali] = useState(true);
  const [receteNormalHesaplama, setReceteNormalHesaplama] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAyarlar, setIsLoadingAyarlar] = useState(false);

  // Cari ekleme modal
  const [showCariForm, setShowCariForm] = useState(false);

  const loadSubeler = React.useCallback(async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const response = await fetch(
        `${require('../config/env').BASE_URL}/user/subeler`,
        { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success && data.data?.subeler) {
        const mapped = data.data.subeler.map((s: any) => ({ id: String(s.id), label: s.name || s.subeAdi }));
        setSubeler(mapped);
        const varsayilan = data.data.varsayilanSube ? String(data.data.varsayilanSube) : '';
        if (varsayilan) {
          setSelectedSubeId(varsayilan);
        } else if (mapped.length > 0) {
          setSelectedSubeId(mapped[0].id);
        }
      }
    } catch (_) {}
  }, []);

  const loadSubeAyarlar = React.useCallback(async () => {
    if (!selectedSubeId) return;
    setIsLoadingAyarlar(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;
      const response = await fetch(
        `${require('../config/env').BASE_URL}/account/sube-ayarlar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dataName, subeId: parseInt(selectedSubeId) }),
        }
      );
      const data = await response.json();
      if (data.success && data.data) {
        const ayar = data.data;
        setMuhasebeFisiKapali(ayar.fisleri_aktif_yaz ?? true);
        setReceteNormalHesaplama(ayar.recete_normal_hesaplama ?? true);
        setAvansHesapId(ayar.hesapKodlari?.siparisAvans ?? '');
        setIndirimHesapId(ayar.hesapKodlari?.siparisIndirim ?? '');
        setVarsayilanKasaId(ayar.hesapKodlari?.varsayilanKasa ?? '');
        setVarsayilanBankaId(ayar.hesapKodlari?.varsayilanBanka ?? '');
        setPasanMusteriId(ayar.hesapKodlari?.pasanMusteri ?? '');
        setVarsayilanDoviz(ayar.varsayilanDoviz ?? 'TL');

        // Döviz tiplerini yükle
        const lookupsRes = await ordersService.getLookups(token, dataName);
        if (lookupsRes.success && lookupsRes.data?.dovizTipleri) {
          setDovizTipleri(lookupsRes.data.dovizTipleri.map((d: any) => ({ id: d.dovizTipi, label: d.dovizTipi })));
        }
      }
    } catch (_) {}
    finally {
      setIsLoadingAyarlar(false);
    }
  }, [selectedSubeId, user]);

  const saveSubeAyarlar = async () => {
    if (!selectedSubeId) return;
    setIsSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;
      const hesapKodlari: Record<string, string> = {
        siparisAvans: avansHesapId,
        siparisIndirim: indirimHesapId,
        varsayilanKasa: varsayilanKasaId,
        varsayilanBanka: varsayilanBankaId,
      };
      if (isMagazaAktif) {
        hesapKodlari.pasanMusteri = pasanMusteriId;
      }
      const ayarlar = {
        fisleri_aktif_yaz: muhasebeFisiKapali,
        recete_normal_hesaplama: receteNormalHesaplama,
        hesapKodlari,
      };
      const response = await fetch(
        `${require('../config/env').BASE_URL}/account/sube-ayarlar-save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dataName, subeId: parseInt(selectedSubeId), ayarlar, varsayilanDoviz }),
        }
      );
      const data = await response.json();
      if (data.success) {
        showSuccess('Ayarlar kaydedildi');
      } else {
        showError(data.error?.message || data.message || 'Kaydetme başarısız');
      }
    } catch (err: any) {
      showError(err.message || 'Ayarlar kaydedilemedi');
    } finally {
      setIsSaving(false);
    }
  };

  const loadHesapListesi = async (filterType: any, prefix: string, setter: (items: { id: string; label: string }[]) => void) => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;
      const subeId = selectedSubeId ? parseInt(selectedSubeId) : undefined;
      const response = await accountService.getCariList(token, dataName, filterType, '', subeId, prefix);
      if (response.success) {
        setter(response.data.data.map((c: any) => ({ id: String(c.id), label: `${c.hesapKodu || ''}${c.unvan ? ' - ' + c.unvan : ''}`.trim() })));
      }
    } catch (_) {}
  };

  const loadAllCariler = React.useCallback(async () => {
    const tasks: Promise<void>[] = [
      loadHesapListesi('customers', '340', setAvansCariler),
      loadHesapListesi('customers', '611', setIndirimCariler),
      loadHesapListesi('safes', '100', setKasaCariler),
      loadHesapListesi('banks', '102', setBankaCariler),
    ];
    if (isMagazaAktif) {
      tasks.push(loadHesapListesi('customers', '120', setPasanMusteriCariler));
    }
    await Promise.all(tasks);
  }, [selectedSubeId, user, isMagazaAktif]);

  React.useEffect(() => {
    loadSubeler();
  }, []);

  React.useEffect(() => {
    if (selectedSubeId) {
      loadAllCariler();
      loadSubeAyarlar();
    }
  }, [selectedSubeId]);

  type CariField = 'avans' | 'indirim' | 'kasa' | 'banka' | 'pasan';
  const [cariFormField, setCariFormField] = useState<CariField>('avans');

  const HESAP_KODU_PREFIX: Record<CariField, { prefix: string; hesapTipi: string }> = {
    avans: { prefix: '340', hesapTipi: 'customers' },
    indirim: { prefix: '611', hesapTipi: 'customers' },
    kasa: { prefix: '100', hesapTipi: 'kasa' },
    banka: { prefix: '102', hesapTipi: 'banka' },
    pasan: { prefix: '120', hesapTipi: 'customers' },
  };

  const handleOpenCariForm = (field: CariField) => {
    setCariFormField(field);
    setShowCariForm(true);
  };

  const handleCariSaved = (cari: { id: string; label: string }) => {
    if (cariFormField === 'avans') { setAvansCariler(prev => [...prev, cari]); setAvansHesapId(cari.id); }
    else if (cariFormField === 'indirim') { setIndirimCariler(prev => [...prev, cari]); setIndirimHesapId(cari.id); }
    else if (cariFormField === 'kasa') { setKasaCariler(prev => [...prev, cari]); setVarsayilanKasaId(cari.id); }
    else if (cariFormField === 'banka') { setBankaCariler(prev => [...prev, cari]); setVarsayilanBankaId(cari.id); }
    else if (cariFormField === 'pasan') { setPasanMusteriCariler(prev => [...prev, cari]); setPasanMusteriId(cari.id); }
    setShowCariForm(false);
    showSuccess('Hesap oluşturuldu');
  };

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleLogout = async () => {
    try {
      await logout();
      onLogout?.();
    } catch {}
  };

  return (
    <>
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          title="Şube Ayarları"
          leftButton={<BackButton onPress={onGoBack || (() => {})} />}
          showMenu={true}
          onLogout={handleLogout}
        />
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleRow}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="business" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Şube Ayarları</Text>
            </View>
            {subeler.length > 0 && (
              <View style={styles.subeSelectorContainer}>
                <SelectInput
                  value={selectedSubeId}
                  onSelect={setSelectedSubeId}
                  items={subeler}
                  placeholder="Şube"
                  compact
                />
              </View>
            )}
          </View>
        </View>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Varsayılan Döviz */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#10B98115' }]}>
                <Icon name="cash-outline" size={16} color="#10B981" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Varsayılan Döviz</Text>
            </View>
            <View style={styles.sectionBody}>
              <SelectInput
                value={varsayilanDoviz}
                onSelect={setVarsayilanDoviz}
                items={dovizTipleri.length > 0 ? dovizTipleri : [
                  { id: 'TL', label: 'TL' },
                  { id: 'USD', label: 'USD' },
                  { id: 'EUR', label: 'EUR' },
                  { id: 'GBP', label: 'GBP' },
                ]}
                placeholder="Döviz seçiniz..."
                noClear
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </View>

          {/* Hesap Kodları */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="code-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Hesap Kodları</Text>
            </View>
            <View style={styles.sectionBody}>
              <View style={styles.fieldRow}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <SelectInput
                      label="Sipariş Avansları (340)"
                      icon="wallet-outline"
                      placeholder="Hesap seçiniz..."
                      value={avansHesapId}
                      items={avansCariler}
                      onSelect={setAvansHesapId}
                      searchPlaceholder="Hesap ara..."
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenCariForm('avans')}
                  >
                    <Icon name="add" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <SelectInput
                      label="Sipariş İndirim (611)"
                      icon="pricetag-outline"
                      placeholder="Hesap seçiniz..."
                      value={indirimHesapId}
                      items={indirimCariler}
                      onSelect={setIndirimHesapId}
                      searchPlaceholder="Hesap ara..."
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenCariForm('indirim')}
                  >
                    <Icon name="add" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <SelectInput
                      label="Varsayılan Kasa (100)"
                      icon="cash-outline"
                      placeholder="Kasa seçiniz..."
                      value={varsayilanKasaId}
                      items={kasaCariler}
                      onSelect={setVarsayilanKasaId}
                      searchPlaceholder="Kasa ara..."
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenCariForm('kasa')}
                  >
                    <Icon name="add" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>
              <View style={[styles.fieldRow, !isMagazaAktif && { marginBottom: 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <SelectInput
                      label="Varsayılan Banka (102)"
                      icon="business-outline"
                      placeholder="Banka seçiniz..."
                      value={varsayilanBankaId}
                      items={bankaCariler}
                      onSelect={setVarsayilanBankaId}
                      searchPlaceholder="Banka ara..."
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenCariForm('banka')}
                  >
                    <Icon name="add" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>
              {isMagazaAktif && (
                <View style={[styles.fieldRow, { marginBottom: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <SelectInput
                        label="Pasan Müşteri Hesabı (120)"
                        icon="person-outline"
                        placeholder="Müşteri seçiniz..."
                        value={pasanMusteriId}
                        items={pasanMusteriCariler}
                        onSelect={setPasanMusteriId}
                        searchPlaceholder="Müşteri ara..."
                        containerStyle={{ marginBottom: 0 }}
                      />
                    </View>
                    <Pressable
                      style={[styles.addBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleOpenCariForm('pasan')}
                    >
                      <Icon name="add" size={22} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              )}
              <View style={[styles.switchRow, { marginTop: 14 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Icon name="document-lock-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Muhasebe Fişi Kapalı Gönder</Text>
                </View>
                <Switch
                  value={muhasebeFisiKapali}
                  onValueChange={setMuhasebeFisiKapali}
                  trackColor={{ false: isDark ? '#3A3A3C' : '#E5E7EB', true: '#3B82F6' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={styles.switchRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Icon name="calculator-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Reçete Normal Hesaplama</Text>
                </View>
                <Switch
                  value={receteNormalHesaplama}
                  onValueChange={setReceteNormalHesaplama}
                  trackColor={{ false: isDark ? '#3A3A3C' : '#E5E7EB', true: '#3B82F6' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* Kaydet Butonu */}
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 }]}
            onPress={saveSubeAyarlar}
            disabled={isSaving}
          >
            <Icon name="checkmark-outline" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </Pressable>
        </ScrollView>
        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />
      </View>
    </SafeAreaProvider>
    <CariEkleModal
      visible={showCariForm}
      onClose={() => setShowCariForm(false)}
      onSaved={handleCariSaved}
      hesapKoduPrefix={HESAP_KODU_PREFIX[cariFormField]?.prefix || '120'}
      filterType={HESAP_KODU_PREFIX[cariFormField]?.hesapTipi || 'customers'}
    />
    </>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subeSelectorContainer: { minWidth: 140, maxWidth: 200 },
  pageTitleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 16, fontWeight: '700', color: colors.text, opacity: 0.6 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },

  // Section Card
  sectionCard: {
    backgroundColor: isDark ? colors.card : '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? colors.border : '#E2E8F0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? colors.border : '#F1F5F9',
  },
  sectionIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionBody: { padding: 14 },

  // Fields
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fieldInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 12, height: 48,
  },
  fieldInputText: { flex: 1, fontSize: 14, paddingVertical: 0 },
  addBtn: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 4, marginBottom: 24,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
