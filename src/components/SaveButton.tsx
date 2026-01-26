import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface SaveButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  text?: string;
  fullWidth?: boolean;
}

export default function SaveButton({
  onPress,
  disabled = false,
  loading = false,
  style,
  text,
  fullWidth = true,
}: SaveButtonProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const buttonText = text || 'Kaydet';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>{buttonText}</Text>
        </>
      )}
    </Pressable>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      gap: 8,
      minHeight: 48,
    },
    fullWidth: {
      width: '100%',
    },
    buttonDisabled: {
      backgroundColor: colors.border,
      opacity: 0.6,
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
