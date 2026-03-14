import React from 'react';
import SelectInput from './SelectInput';
import type { DetailModelKartItem } from '../services/orders.service';

interface ModelSelectProps {
  label?: string;
  value: string;
  modelKartlar: DetailModelKartItem[];
  onSelect: (modelId: string) => void;
  compact?: boolean;
  containerStyle?: any;
  error?: boolean;
}

export default function ModelSelect({
  label = 'Model',
  value,
  modelKartlar,
  onSelect,
  compact = false,
  containerStyle,
  error = false,
}: ModelSelectProps) {
  const items = modelKartlar.map((m) => ({
    id: m.id.toString(),
    label: m.modelKodu ? `${m.modelKodu} - ${m.modelAdi}` : m.modelAdi,
  }));

  return (
    <SelectInput
      label={compact ? undefined : label}
      icon={compact ? undefined : 'shirt-outline'}
      placeholder="Model seçiniz..."
      value={value}
      items={items}
      onSelect={onSelect}
      searchPlaceholder="Model ara..."
      compact={compact}
      noClear
      containerStyle={containerStyle}
      error={error}
    />
  );
}
