import React, { useRef } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export default function SearchInput({
  value,
  onChangeText,
  placeholder = 'Ara...',
  onClear,
}: SearchInputProps) {
  const { colors, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const styles = createStyles(colors, isDark);

  const handleClear = () => {
    onChangeText('');
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <Icon name="search-outline" size={20} color={colors.textSecondary} style={styles.icon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={handleClear} style={styles.clearButton}>
          <Icon name="close-circle" size={20} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.cardSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      height: 48,
    },
    icon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 0,
    },
    clearButton: {
      padding: 4,
      marginLeft: 8,
    },
  });
