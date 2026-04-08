import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import SelectInput from './SelectInput';

interface FaturaTipiSelectProps {
  label?: string;
  value: string;
  onSelect: (id: string) => void;
  tur?: number;       // 0=İrsaliye, 1=Fatura, undefined=Tümü
  gc?: number;         // 1=Giriş, -1=Çıkış, undefined=Tümü
  placeholder?: string;
  containerStyle?: any;
  error?: boolean;
  shake?: boolean;
  noClear?: boolean;
}

interface FaturaTipi {
  id: number;
  tur: number;
  gc: number;
  kod: string;
  aciklama: string;
}

export default function FaturaTipiSelect({
  label = 'Fatura Tipi',
  value,
  onSelect,
  tur,
  gc,
  placeholder = 'Seçiniz...',
  containerStyle,
  error,
  shake,
  noClear = false,
}: FaturaTipiSelectProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    fetchTipler();
  }, [tur, gc]);

  const fetchTipler = async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';

      const res = await fetch(API_ENDPOINTS.FATURA_TIPI_LIST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dataName, tur, gc }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setItems(data.data.map((t: FaturaTipi) => ({
          id: String(t.id),
          label: t.aciklama,
        })));
      }
    } catch {}
  };

  return (
    <SelectInput
      label={label}
      value={value}
      onSelect={onSelect}
      items={items}
      placeholder={placeholder}
      containerStyle={containerStyle}
      error={error}
      shake={shake}
      noClear={noClear}
      searchPlaceholder="Fatura tipi ara..."
    />
  );
}
