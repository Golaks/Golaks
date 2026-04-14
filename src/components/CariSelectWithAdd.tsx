import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import SelectInput from './SelectInput';
import CariEkleModal from './CariEkleModal';

interface CariSelectWithAddProps {
  label?: string;
  placeholder?: string;
  value: string;
  items: { id: string; label: string; doviz?: string }[];
  onSelect: (id: string) => void;
  onCariAdded?: (cari: { id: string; label: string }) => void;
  searchPlaceholder?: string;
  containerStyle?: any;
  error?: boolean;
  shake?: boolean;
  hesapKoduPrefix?: string;
  filterType?: string;
}

export default function CariSelectWithAdd({
  label = 'Cari Hesap *',
  placeholder = 'Cari seçiniz...',
  value,
  items,
  onSelect,
  onCariAdded,
  searchPlaceholder = 'Cari ara...',
  containerStyle,
  error,
  shake,
  hesapKoduPrefix = '120',
  filterType = 'customers',
}: CariSelectWithAddProps) {
  const { colors } = useTheme();
  const [showCariForm, setShowCariForm] = useState(false);

  return (
    <>
      <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, containerStyle]}>
        <View style={{ flex: 1 }}>
          <SelectInput
            label={label}
            placeholder={placeholder}
            value={value}
            items={items}
            onSelect={onSelect}
            searchPlaceholder={searchPlaceholder}
            containerStyle={{ marginBottom: 0 }}
            error={error}
            shake={shake}
          />
        </View>
        <Pressable
          style={{
            width: 48, height: 48, borderRadius: 10,
            backgroundColor: colors.primary,
            alignItems: 'center', justifyContent: 'center',
          }}
          onPress={() => setShowCariForm(true)}
        >
          <Icon name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <CariEkleModal
        visible={showCariForm}
        onClose={() => setShowCariForm(false)}
        onSaved={(cari) => {
          onCariAdded?.(cari);
          onSelect(cari.id);
          setShowCariForm(false);
        }}
        hesapKoduPrefix={hesapKoduPrefix}
        filterType={filterType}
      />
    </>
  );
}
