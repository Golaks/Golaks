import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface ConfirmButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  text?: string;
  fullWidth?: boolean;
  backgroundColor?: string;
}

export default function ConfirmButton({
  onPress,
  disabled = false,
  style,
  text,
  fullWidth = true,
  backgroundColor,
}: ConfirmButtonProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const buttonText = text || 'Tamam';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        backgroundColor && { backgroundColor },
        fullWidth && styles.fullWidth,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
    >
      <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
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
      backgroundColor: colors.gold,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
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
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
