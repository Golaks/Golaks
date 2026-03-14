import React from 'react';
import SelectInput from './SelectInput';
import type { DetailBedenSetItem } from '../services/orders.service';

interface BedenSetSelectProps {
  label?: string;
  value: string;
  bedenSetleri: DetailBedenSetItem[];
  onSelect: (bedenSetId: string) => void;
  compact?: boolean;
  containerStyle?: any;
  error?: boolean;
}

export default function BedenSetSelect({
  label = 'Beden Seti',
  value,
  bedenSetleri,
  onSelect,
  compact = false,
  containerStyle,
  error = false,
}: BedenSetSelectProps) {
  const items = bedenSetleri.map((b) => ({
    id: b.id.toString(),
    label: b.setTipi,
  }));

  return (
    <SelectInput
      label={compact ? undefined : label}
      icon={compact ? undefined : 'resize-outline'}
      placeholder="Beden seti seciniz..."
      value={value}
      items={items}
      onSelect={onSelect}
      searchPlaceholder="Beden seti ara..."
      compact={compact}
      noClear
      containerStyle={containerStyle}
      error={error}
    />
  );
}
