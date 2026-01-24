import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface ButtonProps {
  onPress: () => void;
  text: string;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  onPress,
  text,
  icon,
  disabled = false,
  loading = false,
  fullWidth = true,
  variant = 'primary',
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors, variant);

  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          {icon && <Icon name={icon} size={20} color="#FFFFFF" style={styles.icon} />}
          <Text style={[styles.buttonText, textStyle]}>{text}</Text>
        </>
      )}
    </Pressable>
  );
}

const createStyles = (colors: any, variant: 'primary' | 'secondary' | 'danger') => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.cardSecondary;
      case 'danger':
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return colors.text;
      default:
        return '#FFFFFF';
    }
  };

  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: getBackgroundColor(),
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      minHeight: 52,
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
      color: getTextColor(),
      fontSize: 16,
      fontWeight: '600',
    },
    icon: {
      marginRight: 8,
    },
  });
};
