import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import DatePickerModal from './DatePickerModal';

interface DateInputProps {
  label?: string;
  icon?: string;
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  error?: string;
  clearable?: boolean;
}

export default function DateInput({
  label,
  icon = 'calendar-outline',
  value,
  onChange,
  placeholder = 'Tarih seçiniz',
  containerStyle,
  error,
  clearable = true,
}: DateInputProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const styles = createStyles(colors, !!error);

  const formatDate = (date?: Date) => {
    if (!date) return null;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const handleClear = () => {
    onChange(new Date());
  };

  const formattedDate = formatDate(value);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable onPress={() => setShowPicker(true)}>
        <View style={styles.inputWrapper}>
          {icon && (
            <Icon
              name={icon}
              size={20}
              color={colors.textSecondary}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              !formattedDate && styles.placeholder,
            ]}
          >
            {formattedDate || placeholder}
          </Text>
          {formattedDate && clearable ? (
            <Pressable onPress={handleClear} style={styles.clearButton}>
              <Icon
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          ) : (
            <Icon
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          )}
        </View>
      </Pressable>

      <DatePickerModal
        visible={showPicker}
        date={value || new Date()}
        onConfirm={(date) => {
          onChange(date);
          setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
        title={label}
      />
    </View>
  );
}

const createStyles = (colors: any, hasError: boolean) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.inputLabel,
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: hasError ? 1 : 1.5,
      borderColor: hasError ? colors.danger : colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 52,
    },
    icon: {
      marginRight: 10,
    },
    text: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    placeholder: {
      color: colors.placeholder,
    },
    clearButton: {
      padding: 4,
      marginRight: 4,
    },
  });
