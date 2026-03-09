import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import DatePickerModal from './DatePickerModal';
import SearchInput from './SearchInput';

export type DatePreset = 'today' | 'week' | 'month' | 'year';

interface DatePresetOption {
  id: DatePreset;
  label: string;
  icon: string;
}

interface DateFilterProps {
  selectedPreset: DatePreset | null;
  onPresetChange: (preset: DatePreset) => void;
  startDate: string;
  endDate: string;
  startDateObj: Date;
  endDateObj: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  // Search
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

export default function DateFilter({
  selectedPreset,
  onPresetChange,
  startDate,
  endDate,
  startDateObj,
  endDateObj,
  onStartDateChange,
  onEndDateChange,
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  showSearch = false,
}: DateFilterProps) {
  const { colors } = useTheme();
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  const styles = createStyles(colors);

  // Date presets
  const DATE_PRESETS: DatePresetOption[] = [
    { id: 'today', label: 'Bugün', icon: 'today' },
    { id: 'week', label: 'Bu Hafta', icon: 'calendar' },
    { id: 'month', label: 'Bu Ay', icon: 'calendar-outline' },
    { id: 'year', label: 'Bu Yıl', icon: 'calendar-number' },
  ];

  const handleStartDateConfirm = (date: Date) => {
    onStartDateChange(date);
    setShowStartDatePicker(false);
  };

  const handleEndDateConfirm = (date: Date) => {
    onEndDateChange(date);
    setShowEndDatePicker(false);
  };

  const handleDatePickerCancel = () => {
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
  };

  const handlePresetSelect = (preset: DatePreset) => {
    onPresetChange(preset);
    setShowPresetDropdown(false);
  };

  return (
    <View style={styles.filterArea}>
      {/* Search Box */}
      {showSearch && onSearchChange && (
        <View style={styles.searchContainer}>
          <SearchInput
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder || 'Ara...'}
          />
        </View>
      )}

      {/* Date Inputs and Dropdown Button */}
      <View style={styles.dateRangeRow}>
        {/* Start Date */}
        <Pressable
          style={styles.compactDateInput}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Icon name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.compactDateText}>
            {startDate}
          </Text>
        </Pressable>

        {/* Separator */}
        <Icon name="arrow-forward" size={16} color={colors.textTertiary} />

        {/* End Date */}
        <Pressable
          style={styles.compactDateInput}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Icon name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.compactDateText}>
            {endDate}
          </Text>
        </Pressable>

        {/* Dropdown Button */}
        <Pressable
          style={[styles.dropdownButton, showPresetDropdown && styles.dropdownButtonActive]}
          onPress={() => setShowPresetDropdown(!showPresetDropdown)}
        >
          <Icon
            name={showPresetDropdown ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {/* Quick Date Selection Dropdown */}
      {showPresetDropdown && (
        <View style={styles.presetDropdown}>
          {DATE_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <Pressable
                key={preset.id}
                style={[
                  styles.presetOption,
                  isSelected && styles.presetOptionSelected,
                ]}
                onPress={() => handlePresetSelect(preset.id)}
              >
                <View style={[styles.presetIconContainer, isSelected && { backgroundColor: colors.primary + '20' }]}>
                  <Icon
                    name={preset.icon as any}
                    size={18}
                    color={isSelected ? colors.primary : colors.text}
                  />
                </View>
                <Text
                  style={[
                    styles.presetOptionText,
                    isSelected && styles.presetOptionTextSelected,
                  ]}
                >
                  {preset.label}
                </Text>
                {isSelected && (
                  <Icon name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Date Pickers */}
      <DatePickerModal
        visible={showStartDatePicker}
        date={startDateObj}
        onConfirm={handleStartDateConfirm}
        onClose={handleDatePickerCancel}
        title="Başlangıç Tarihi"
      />
      <DatePickerModal
        visible={showEndDatePicker}
        date={endDateObj}
        onConfirm={handleEndDateConfirm}
        onClose={handleDatePickerCancel}
        title="Bitiş Tarihi"
      />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  filterArea: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  searchContainer: {
    width: '100%',
    marginBottom: 12,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactDateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  compactDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  dropdownButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownButtonActive: {
    backgroundColor: colors.primaryBackground,
    borderColor: colors.primary,
  },
  presetDropdown: {
    marginTop: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  presetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  presetOptionSelected: {
    backgroundColor: colors.primaryBackground,
  },
  presetIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  presetOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
