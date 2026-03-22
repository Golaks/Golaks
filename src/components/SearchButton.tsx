import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface SearchButtonProps {
  onPress: () => void;
  size?: number;
  iconSize?: number;
  disabled?: boolean;
}

export default function SearchButton({ onPress, size = 34, iconSize = 20, disabled = false }: SearchButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size * 0.29,
          backgroundColor: colors.primary,
        },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Icon name="search-outline" size={iconSize} color="#FFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
