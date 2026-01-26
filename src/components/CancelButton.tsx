import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface CancelButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  text?: string;
  fullWidth?: boolean;
}

export default function CancelButton({
  onPress,
  disabled = false,
  style,
  text,
  fullWidth = true,
}: CancelButtonProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const buttonText = text || 'İptal';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: colors.border }}
    >
      <Icon name="close-circle" size={20} color={colors.text} />
      <Text style={styles.buttonText}>{buttonText}</Text>
    </Pressable>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
      minHeight: 48,
    },
    fullWidth: {
      width: '100%',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    buttonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });
