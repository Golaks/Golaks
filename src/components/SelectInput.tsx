import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

export interface SelectItem {
  id: string;
  label: string;
}

interface SelectInputProps {
  label?: string;
  icon?: string;
  placeholder?: string;
  value: string;
  items: SelectItem[];
  onSelect: (id: string) => void;
  searchPlaceholder?: string;
  onAdd?: () => void;
  addLabel?: string;
  compact?: boolean;
  noClear?: boolean;
}

export default function SelectInput({
  label,
  icon,
  placeholder = 'Seçiniz...',
  value,
  items,
  onSelect,
  searchPlaceholder = 'Ara...',
  onAdd,
  addLabel = 'Yeni Ekle',
  compact = false,
  noClear = false,
}: SelectInputProps) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const styles = createStyles(colors, isDark);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === value),
    [items, value],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, search]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onSelect('');
    setSearch('');
  };

  const handleToggle = () => {
    setOpen(!open);
    if (open) setSearch('');
  };

  return (
    <View style={[styles.container, compact && { marginBottom: 0, zIndex: 10 }]}>
      {(label || onAdd) && !compact && (
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {onAdd && (
            <Pressable
              style={styles.addLabelBtn}
              onPress={() => {
                setOpen(false);
                setSearch('');
                onAdd();
              }}
              hitSlop={8}
            >
              <Icon name="add-circle-outline" size={14} color={colors.primary} />
              <Text style={[styles.addLabelText, { color: colors.primary }]}>{addLabel}</Text>
            </Pressable>
          )}
        </View>
      )}
      <Pressable style={[styles.inputWrapper, compact && styles.inputWrapperCompact, open && styles.inputWrapperActive]} onPress={handleToggle}>
        {icon && (
          <Icon name={icon} size={20} color={colors.textSecondary} style={styles.icon} />
        )}
        <Text
          style={[styles.inputText, compact && { fontSize: 13 }, !selectedItem && styles.placeholderText]}
          numberOfLines={1}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        {selectedItem && !compact && !noClear && (
          <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
            <Icon name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>

      {open && (
        <View style={[styles.dropdown, compact && styles.dropdownCompact]}>
          {/* Search */}
          <View style={styles.searchRow}>
            <Icon name="search-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Icon name="close-circle" size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* List */}
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {filtered.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
              </View>
            ) : (
              filtered.map((item) => {
                const isSelected = item.id === value;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(item.id)}
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Icon name="checkmark-circle" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.inputLabel,
    },
    addLabelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    addLabelText: {
      fontSize: 12,
      fontWeight: '600',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 52,
    },
    inputWrapperCompact: {
      height: 36,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: isDark ? colors.card : '#fff',
    },
    inputWrapperActive: {
      borderColor: colors.inputBorder,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    icon: {
      marginRight: 10,
    },
    inputText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    placeholderText: {
      color: colors.placeholder,
    },
    clearBtn: {
      padding: 4,
      marginRight: 4,
    },
    dropdown: {
      backgroundColor: isDark ? colors.card : '#fff',
      borderWidth: 1.5,
      borderTopWidth: 0,
      borderColor: colors.inputBorder,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      maxHeight: 220,
      overflow: 'hidden',
    },
    dropdownCompact: {
      position: 'absolute',
      top: 36,
      left: 0,
      right: 0,
      borderTopWidth: 1.5,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      paddingVertical: 0,
    },
    list: {
      maxHeight: 170,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionSelected: {
      backgroundColor: colors.primary + '12',
    },
    optionText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    optionTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    emptyContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
  });
