import React from 'react';
import SelectInput from './SelectInput';
import type { DovizTipi } from '../services/orders.service';

interface DovizSelectProps {
  label?: string;
  value: string;
  dovizTipleri: DovizTipi[];
  onSelect: (dovizTipi: string) => void;
  compact?: boolean;
  shortLabel?: boolean;
  containerStyle?: any;
  error?: boolean;
  shake?: boolean;
}

export default function DovizSelect({
  label = 'Döviz',
  value,
  dovizTipleri,
  onSelect,
  compact = false,
  shortLabel = false,
  containerStyle,
  error = false,
  shake = false,
}: DovizSelectProps) {
  const items = dovizTipleri.map((d) => ({
    id: d.dovizTipi,
    label: shortLabel ? d.dovizTipi : `${d.dovizTipi} - ${d.dovizAdi}`,
  }));

  return (
    <SelectInput
      label={compact ? undefined : label}
      icon={compact || shortLabel ? undefined : 'cash-outline'}
      placeholder="Döviz seçiniz..."
      value={value}
      items={items}
      onSelect={onSelect}
      searchPlaceholder="Döviz ara..."
      compact={compact}
      noClear
      containerStyle={containerStyle}
      error={error}
      shake={shake}
    />
  );
}
