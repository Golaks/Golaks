import React, { useState, useEffect, useCallback } from 'react';
import SelectInput, { SelectItem } from './SelectInput';
import { authService } from '../services/auth.service';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { API_ENDPOINTS } from '../constants/ApiConfig';

interface TanimItem extends SelectItem {
  dbId: string; // veritabanındaki gerçek id
}

const TANIM_META: Record<string, { title: string; icon: string; addPlaceholder: string }> = {
  SIPARIS_OZELLIK: { title: 'Sipariş Özellikleri', icon: 'pricetags-outline', addPlaceholder: 'Yeni özellik adı...' },
  TESLIM_SEKLI: { title: 'Teslim Şekilleri', icon: 'car-outline', addPlaceholder: 'Yeni teslim şekli...' },
  PAKETLEME: { title: 'Paketleme Tipleri', icon: 'cube-outline', addPlaceholder: 'Yeni paketleme tipi...' },
  ODEME_SEKLI: { title: 'Ödeme Şekilleri', icon: 'card-outline', addPlaceholder: 'Yeni ödeme şekli...' },
  RENK: { title: 'Renkler', icon: 'color-palette-outline', addPlaceholder: 'Yeni renk adı...' },
  BEDEN: { title: 'Bedenler', icon: 'resize-outline', addPlaceholder: 'Yeni beden...' },
  MILLIYET: { title: 'Milliyetler', icon: 'flag-outline', addPlaceholder: 'Yeni milliyet...' },
  ANA_MODEL: { title: 'Ana Modeller', icon: 'albums-outline', addPlaceholder: 'Yeni ana model...' },
  MODEL_TIPI: { title: 'Model Tipleri', icon: 'shirt-outline', addPlaceholder: 'Yeni model tipi...' },
  CINSIYET: { title: 'Cinsiyetler', icon: 'person-outline', addPlaceholder: 'Yeni cinsiyet...' },
  SEZON: { title: 'Sezonlar', icon: 'sunny-outline', addPlaceholder: 'Yeni sezon...' },
  TARZ: { title: 'Tarzlar', icon: 'color-palette-outline', addPlaceholder: 'Yeni tarz...' },
};

const getDefaultMeta = (tanimKodu: string) => {
  const readable = tanimKodu.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  return { title: readable, icon: 'list-outline', addPlaceholder: `Yeni ${readable.toLowerCase()}...` };
};

interface TanimSelectInputProps {
  tanimKodu: string;
  label?: string;
  placeholder?: string;
  value: string;
  onSelect: (id: string) => void;
  addPlaceholder?: string;
  /** true ise value/onSelect DB id ile çalışır, false ise tanimDeger ile */
  useDbId?: boolean;
  compact?: boolean;
  noClear?: boolean;
  containerStyle?: any;
  error?: boolean;
  shake?: boolean;
}

export default function TanimSelectInput({
  tanimKodu,
  label,
  placeholder = 'Seçiniz...',
  value,
  onSelect,
  addPlaceholder,
  useDbId = false,
  compact = false,
  noClear = false,
  containerStyle,
  error = false,
  shake = false,
}: TanimSelectInputProps) {
  const { user } = useAuth();
  const { showConfirm } = useAlert();
  const [items, setItems] = useState<TanimItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const getToken = async () => {
    const token = await authService.getToken();
    if (!token) throw new Error('Token bulunamadı');
    return token;
  };

  const fetchItems = useCallback(async () => {
    if (loaded) return;
    try {
      const token = await getToken();
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;
      const res = await fetch(API_ENDPOINTS.TANIMLAR_LIST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dataName, tanimKodu }),
      });
      const data = await res.json();
      if (res.ok && data.data?.items) {
        setItems(data.data.items.map((t: any) => ({
          id: useDbId ? String(t.id) : t.tanimDeger,
          label: t.tanimDeger,
          dbId: String(t.id),
        })));
        setLoaded(true);
      }
    } catch {}
  }, [tanimKodu, loaded, user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddInline = async (val: string): Promise<SelectItem | null> => {
    try {
      const token = await getToken();
      const res = await fetch(API_ENDPOINTS.TANIMLAR_CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tanimKodu, tanimDeger: val }),
      });
      const data = await res.json();
      if (res.ok && data.data?.id) {
        const dbId = String(data.data.id);
        const newItem: TanimItem = { id: useDbId ? dbId : val, label: val, dbId };
        setItems(prev => [...prev, newItem]);
        return newItem;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleEdit = async (item: SelectItem, newLabel: string): Promise<boolean> => {
    const tanimItem = items.find(i => i.id === item.id) as TanimItem | undefined;
    if (!tanimItem) return false;
    try {
      const token = await getToken();
      const res = await fetch(API_ENDPOINTS.TANIMLAR_UPDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: tanimItem.dbId, tanimDeger: newLabel }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i =>
          i.dbId === tanimItem.dbId
            ? { ...i, id: useDbId ? i.id : newLabel, label: newLabel }
            : i,
        ));
        // Seçili olan düzenlendiyse value'yu güncelle (sadece tanimDeger modunda)
        if (!useDbId && value === item.id) onSelect(newLabel);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDelete = (item: SelectItem): Promise<boolean> => {
    return new Promise((resolve) => {
      showConfirm({
        title: 'Silme Onayı',
        message: `"${item.label}" silinecek. Emin misiniz?`,
        confirmText: 'Sil',
        icon: 'trash-outline',
        iconColor: '#EF4444',
        onConfirm: async () => {
          const tanimItem = items.find(i => i.id === item.id) as TanimItem | undefined;
          if (!tanimItem) { resolve(false); return; }
          try {
            const token = await getToken();
            const res = await fetch(API_ENDPOINTS.TANIMLAR_DELETE, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ id: tanimItem.dbId }),
            });
            if (res.ok) {
              setItems(prev => prev.filter(i => i.dbId !== tanimItem.dbId));
              resolve(true);
            } else {
              resolve(false);
            }
          } catch {
            resolve(false);
          }
        },
        onCancel: () => resolve(false),
      });
    });
  };

  const meta = TANIM_META[tanimKodu] || getDefaultMeta(tanimKodu);

  return (
    <SelectInput
      label={label}
      icon={meta.icon}
      placeholder={placeholder}
      value={value}
      items={items}
      onSelect={onSelect}
      onAddInline={handleAddInline}
      onItemEdit={handleEdit}
      onItemDelete={handleDelete}
      addLabel="Ekle"
      addPlaceholder={addPlaceholder || meta.addPlaceholder}
      modalTitle={meta.title}
      modalIcon={meta.icon}
      compact={compact}
      noClear={noClear}
      containerStyle={containerStyle}
      error={error}
      shake={shake}
    />
  );
}
