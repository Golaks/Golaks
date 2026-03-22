import React, { useState, useCallback } from 'react';
import SelectInput, { SelectItem } from './SelectInput';
import { authService } from '../services/auth.service';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../constants/ApiConfig';

export interface ModelKartData {
  id: number;
  modelKodu: string;
  modelAdi: string;
  bedenSetId: number;
}

interface ModelItem extends SelectItem {
  bedenSetId: number;
}

interface ModelSelectInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onSelect: (modelId: string, model: ModelKartData | null) => void;
  compact?: boolean;
  noClear?: boolean;
  containerStyle?: any;
  error?: boolean;
}

export default function ModelSelectInput({
  label = 'Model',
  placeholder = 'Model seçiniz...',
  value,
  onSelect,
  compact = false,
  noClear = false,
  containerStyle,
  error = false,
}: ModelSelectInputProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<ModelItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchItems = useCallback(async () => {
    if (loaded) return;
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) return;
      const res = await fetch(API_ENDPOINTS.ORDERS_DETAIL_LOOKUPS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dataName }),
      });
      const data = await res.json();
      if (res.ok && data.data?.modelKartlar) {
        setItems(data.data.modelKartlar.map((m: any) => ({
          id: String(m.id),
          label: m.modelKodu ? `${m.modelKodu} - ${m.modelAdi}` : m.modelAdi,
          bedenSetId: m.bedenSetId,
        })));
        setLoaded(true);
      }
    } catch {}
  }, [loaded, user]);

  // Fetch on first render
  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSelect = (id: string) => {
    if (!id) {
      onSelect('', null);
      return;
    }
    const item = items.find(i => i.id === id);
    if (item) {
      onSelect(id, {
        id: Number(id),
        modelKodu: '',
        modelAdi: item.label,
        bedenSetId: item.bedenSetId,
      });
    } else {
      onSelect(id, null);
    }
  };

  return (
    <SelectInput
      label={compact ? undefined : label}
      icon={compact ? undefined : 'shirt-outline'}
      placeholder={placeholder}
      value={value}
      items={items}
      onSelect={handleSelect}
      searchPlaceholder="Model ara..."
      modalTitle="Model Kartlar"
      modalIcon="shirt-outline"
      compact={compact}
      noClear={noClear}
      containerStyle={containerStyle}
      error={error}
    />
  );
}
