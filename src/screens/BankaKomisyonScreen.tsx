import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import AddButton from '../components/AddButton';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import BottomSheet from '../components/BottomSheet';
import SelectInput, { SelectItem } from '../components/SelectInput';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import accountService, {
  BankaKomisyonTaksitOran,
  CariAccount,
} from '../services/account.service';
import { authService } from '../services/auth.service';

interface BankaKomisyonScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

const TAKSIT_SECENEKLERI: { taksit: string; label: string }[] = [
  { taksit: 'tek', label: 'Tek Çekim' },
  { taksit: '2', label: '2 Ay' },
  { taksit: '3', label: '3 Ay' },
  { taksit: '4', label: '4 Ay' },
  { taksit: '5', label: '5 Ay' },
  { taksit: '6', label: '6 Ay' },
  { taksit: '7', label: '7 Ay' },
  { taksit: '8', label: '8 Ay' },
  { taksit: '9', label: '9 Ay' },
  { taksit: '10', label: '10 Ay' },
  { taksit: '11', label: '11 Ay' },
  { taksit: '12', label: '12 Ay' },
];

// Bir bankaya ait tanım kartında göstereceğimiz yapı
interface BankaKomisyonDef {
  banka: CariAccount;
  oranlar: BankaKomisyonTaksitOran[];
}

export default function BankaKomisyonScreen({ onGoBack, onTabChange, onLogout }: BankaKomisyonScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, logout, notificationCount } = useAuth();
  const { showError, showSuccess, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  const [bankalar, setBankalar] = useState<CariAccount[]>([]);
  const [tanimlar, setTanimlar] = useState<BankaKomisyonDef[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDef, setEditingDef] = useState<BankaKomisyonDef | null>(null); // null = yeni ekleme
  const [selectedBankaId, setSelectedBankaId] = useState('');
  const [satirlar, setSatirlar] = useState<BankaKomisyonTaksitOran[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const styles = createStyles(colors, isDark);

  // Banka listesi + mevcut tanımları yükle
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await authService.getToken();
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
      if (!token || !dataName) return;
      const res = await accountService.getCariList(token, dataName, 'banks');
      if (res.success) {
        const banks = res.data.data || [];
        setBankalar(banks);
        // Her banka için tanımları paralel çek
        const defs = await Promise.all(
          banks.map(async (b) => {
            try {
              const r = await accountService.getBankaKomisyonOran(token, dataName, b.id);
              if (r.success && r.data.komisyonOranlar?.length > 0) {
                return { banka: b, oranlar: r.data.komisyonOranlar };
              }
            } catch (_e) {}
            return null;
          })
        );
        setTanimlar(defs.filter((d): d is BankaKomisyonDef => d !== null));
      }
    } catch (_err) {
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Yeni ekleme modalı
  const handleAddNew = () => {
    setEditingDef(null);
    setSelectedBankaId('');
    setSatirlar([]);
    setModalError('');
    setModalVisible(true);
  };

  // Düzenleme modalı
  const handleEdit = async (def: BankaKomisyonDef) => {
    setEditingDef(def);
    setSelectedBankaId(String(def.banka.id));
    setSatirlar([...def.oranlar]);
    setModalError('');
    setModalVisible(true);
  };

  // Silme
  const handleDelete = (def: BankaKomisyonDef) => {
    showConfirm({
      title: 'Tanımı Sil',
      message: `${def.banka.unvan} için komisyon tanımları silinsin mi?`,
      confirmText: 'Sil',
      icon: 'trash-outline',
      iconColor: '#EF4444',
      onConfirm: async () => {
        try {
          const token = await authService.getToken();
          const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
          if (!token || !dataName) return;
          await accountService.updateBankaKomisyonOran(token, dataName, def.banka.id, []);
          setTanimlar(prev => prev.filter(d => d.banka.id !== def.banka.id));
        } catch (err: any) {
          showError(err.message);
        }
      },
    });
  };

  const handleTaksitToggle = (taksit: string) => {
    const active = satirlar.some(r => r.taksit === taksit);
    if (active) {
      setSatirlar(prev => prev.filter(r => r.taksit !== taksit));
    } else {
      setSatirlar(prev => [...prev, { taksit, oran: 0 }]);
    }
  };

  const handleSatirOranChange = (taksit: string, value: string) => {
    setSatirlar(prev =>
      prev.map(r => r.taksit === taksit ? { ...r, oran: parseFloat(value.replace(',', '.')) || 0 } : r)
    );
  };

  const handleSave = async () => {
    setModalError('');
    if (!selectedBankaId) {
      setModalError('Lütfen banka seçin.');
      return;
    }
    if (satirlar.length === 0) {
      setModalError('En az bir taksit seçeneği ekleyin.');
      return;
    }
    setIsSaving(true);
    try {
      const token = await authService.getToken();
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
      if (!token || !dataName) {
        setModalError('Oturum bilgisi alınamadı.');
        return;
      }
      const cariId = Number(selectedBankaId);
      await accountService.updateBankaKomisyonOran(token, dataName, cariId, satirlar);

      const banka = bankalar.find(b => b.id === cariId)!;
      setTanimlar(prev => {
        const existing = prev.findIndex(d => d.banka.id === cariId);
        const newDef: BankaKomisyonDef = { banka, oranlar: satirlar };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newDef;
          return updated;
        }
        return [...prev, newDef];
      });
      setModalVisible(false);
      showSuccess('Komisyon oranları kaydedildi.');
    } catch (err: any) {
      setModalError(err.message || 'Kaydedilemedi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleLogout = async () => {
    try { await logout(); onLogout?.(); } catch (_e) {}
  };

  const getTaksitLabel = (taksit: string) =>
    TAKSIT_SECENEKLERI.find(s => s.taksit === taksit)?.label ?? taksit;

  const bankaSelectItems: SelectItem[] = bankalar.map(b => ({ id: String(b.id), label: b.unvan }));

  // Ana liste kartı — accordion
  const renderItem = ({ item }: { item: BankaKomisyonDef }) => {
    const isExpanded = expandedId === item.banka.id;
    return (
      <View style={styles.card}>
        {/* Kart başlığı — tıklanınca açılır/kapanır */}
        <Pressable
          style={styles.cardHeader}
          onPress={() => setExpandedId(isExpanded ? null : item.banka.id)}
        >
          <View style={[styles.iconBox, { backgroundColor: '#F59E0B18' }]}>
            <Icon name="business-outline" size={20} color="#F59E0B" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.bankaAdi} numberOfLines={1}>{item.banka.unvan}</Text>
            <Text style={styles.hesapKodu}>
              {item.banka.hesapKodu} · {item.oranlar.length} taksit seçeneği
            </Text>
          </View>
          <View style={styles.cardActions}>
            <IconButton icon="create-outline" size={18} color={colors.primary} onPress={() => handleEdit(item)} />
            <IconButton icon="trash-outline" size={18} color="#EF4444" onPress={() => handleDelete(item)} />
            <Icon
              name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color={colors.textTertiary}
            />
          </View>
        </Pressable>

        {/* Açılır taksit tablosu */}
        {isExpanded && (
          <View style={[styles.accordionBody, { borderTopColor: colors.border }]}>
            {/* Başlık satırı */}
            <View style={[styles.accordionHeaderRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.accordionHeaderText, { color: colors.textTertiary, flex: 1 }]}>Taksit</Text>
              <Text style={[styles.accordionHeaderText, { color: colors.textTertiary, width: 80, textAlign: 'right' }]}>Komisyon</Text>
            </View>
            {item.oranlar.map((o) => (
              <View key={o.taksit} style={[styles.accordionRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.accordionTaksit, { color: colors.text }]}>{getTaksitLabel(o.taksit)}</Text>
                <View style={[styles.accordionOranBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.accordionOran, { color: colors.primary }]}>%{o.oran}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Banka Komisyon Tanımları"
          leftButton={<BackButton onPress={onGoBack} />}
          rightButton={<AddButton onPress={handleAddNew} />}
          showMenu
          onLogout={handleLogout}
        />

        {isLoading ? (
          <LoadingSpinner />
        ) : tanimlar.length === 0 ? (
          <EmptyState
            icon="card-outline"
            title="Tanım bulunamadı"
            description="Sağ üstteki + butonuyla yeni komisyon tanımı ekleyin"
          />
        ) : (
          <FlatList
            data={tanimlar}
            keyExtractor={item => String(item.banka.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )}

        <TabBar activeTab={activeTab} onTabPress={handleTabPress} notificationCount={notificationCount} />

        {/* Ekle / Düzenle Modal */}
        <BottomSheet
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editingDef ? `${editingDef.banka.unvan} - Düzenle` : 'Yeni Komisyon Tanımı'}
          icon="card-outline"
          iconColor={colors.primary}
          footer={
            <>
              <Button text="İptal" variant="secondary" icon="close-outline" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
              <Button text="Kaydet" icon="checkmark-outline" onPress={handleSave} loading={isSaving} style={{ flex: 1 }} />
            </>
          }
        >
          <View>

              {/* Inline hata — her zaman görünür */}
              {modalError ? (
                <View style={styles.inlineError}>
                  <Icon name="alert-circle-outline" size={15} color="#EF4444" />
                  <Text style={styles.inlineErrorText}>{modalError}</Text>
                </View>
              ) : null}

              {/* Banka Seçimi */}
              <SelectInput
                label="Banka"
                icon="business-outline"
                placeholder="Banka seçin..."
                value={selectedBankaId}
                items={bankaSelectItems}
                onSelect={setSelectedBankaId}
                noClear={!!editingDef}
              />

              <View style={{ height: 12 }} />

              {/* Taksit Listesi — hepsi gösterilir, aktif olanların oran girişi açılır */}
              <View style={[styles.satirlarContainer, { borderColor: colors.border }]}>
                <View style={[styles.satirHeader, { borderBottomColor: colors.border }]}>
                  <View style={{ width: 36 }} />
                  <Text style={[styles.satirHeaderText, { color: colors.textTertiary, flex: 1 }]}>Taksit</Text>
                  <Text style={[styles.satirHeaderText, { color: colors.textTertiary, width: 90, textAlign: 'right' }]}>Oran (%)</Text>
                </View>
                {TAKSIT_SECENEKLERI.map(({ taksit, label }) => {
                  const satir = satirlar.find(r => r.taksit === taksit);
                  const isActive = !!satir;
                  return (
                    <View
                      key={taksit}
                      style={[
                        styles.satirRow,
                        { borderBottomColor: colors.border },
                        isActive && { backgroundColor: colors.primary + '08' },
                      ]}
                    >
                      {/* Sadece sol taraf (checkbox + label) toggle yapar */}
                      <Pressable
                        style={styles.satirToggleArea}
                        onPress={() => handleTaksitToggle(taksit)}
                      >
                        <View style={[styles.taksitCheckbox, { borderColor: isActive ? colors.primary : colors.border, backgroundColor: isActive ? colors.primary : 'transparent' }]}>
                          {isActive && <Icon name="checkmark" size={13} color="#fff" />}
                        </View>
                        <Text style={[styles.satirLabel, { color: isActive ? colors.primary : colors.text, fontWeight: isActive ? '600' : '400' }]}>
                          {label}
                        </Text>
                      </Pressable>
                      {/* Oran girişi ayrı, toggle'ı tetiklemez */}
                      {isActive ? (
                        <View style={styles.oranInputWrap}>
                          <TextInput
                            style={[styles.oranInput, {
                              color: colors.text,
                              borderColor: colors.primary + '60',
                              backgroundColor: colors.background,
                            }]}
                            value={satir.oran === 0 ? '' : String(satir.oran)}
                            onChangeText={v => handleSatirOranChange(taksit, v)}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={colors.textTertiary}
                            selectTextOnFocus
                          />
                          <Text style={[styles.percentSign, { color: colors.textSecondary }]}>%</Text>
                        </View>
                      ) : (
                        <View style={{ width: 90 }} />
                      )}
                    </View>
                  );
                })}
              </View>

          </View>
        </BottomSheet>
      </View>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: 16, paddingBottom: 100 },

    // Ana kart
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardInfo: { flex: 1 },
    bankaAdi: { fontSize: 15, fontWeight: '600', color: colors.text },
    hesapKodu: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: 4, alignItems: 'center' },

    // Accordion body
    accordionBody: {
      borderTopWidth: 1,
      marginTop: 10,
      paddingTop: 6,
    },
    accordionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingBottom: 6,
      borderBottomWidth: 1,
      marginBottom: 2,
    },
    accordionHeaderText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    accordionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    accordionTaksit: { flex: 1, fontSize: 14 },
    accordionOranBadge: {
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    accordionOran: { fontSize: 13, fontWeight: '700' },

    // Modal tablo
    satirlarContainer: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 4,
    },
    satirHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    satirHeaderText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    satirRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    satirToggleArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    satirLabel: { fontSize: 14, flex: 1 },
    oranInputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
    },
    oranInput: {
      width: 70,
      height: 34,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      textAlign: 'right',
      fontSize: 14,
      fontWeight: '500',
    },
    percentSign: { fontSize: 14, fontWeight: '500', width: 16 },
    inlineError: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      padding: 10,
      borderRadius: 8,
      backgroundColor: '#EF444415',
    },
    inlineErrorText: {
      flex: 1,
      fontSize: 13,
      color: '#EF4444',
    },
    taksitCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
  });
