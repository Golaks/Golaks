import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { createGlobalStyles } from '../styles/globalStyles';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: string;
  error?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  shake?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  rightIcon?: string;
  onRightIconPress?: () => void;
  textAlign?: 'left' | 'center' | 'right';
  showCharCounter?: boolean;
}

export default function Input({
  label,
  icon,
  error,
  containerStyle,
  isPassword = false,
  shake = false,
  clearable = false,
  onClear,
  rightIcon,
  onRightIconPress,
  textAlign = 'left',
  showCharCounter = false,
  ...textInputProps
}: InputProps) {
  const { colors, isDark } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const styles = createStyles(colors, !!error);
  const globalStyles = createGlobalStyles(colors);

  const showClearButton = clearable && textInputProps.value && String(textInputProps.value).length > 0;

  const handleWrapperPress = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (shake && error) {
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [shake, error]);

  const currentLength = textInputProps.value ? String(textInputProps.value).length : 0;
  const maxLength = textInputProps.maxLength || 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable onPress={handleWrapperPress}>
        <Animated.View
          style={[
            styles.inputWrapper,
            { transform: [{ translateX: shakeAnim }] }
          ]}
        >
          {icon && (
            <Icon
              name={icon}
              size={20}
              color={colors.textSecondary}
              style={styles.icon}
            />
          )}
          <TextInput
            ref={inputRef}
            style={[styles.input, { textAlign }]}
            placeholderTextColor={colors.placeholder}
            secureTextEntry={isPassword && !showPassword}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            {...textInputProps}
          />
          {showClearButton && (
            <Pressable
              onPress={() => { onClear?.(); inputRef.current?.focus(); }}
              style={styles.eyeIcon}
            >
              <Icon
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          )}
          {isPassword && (
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Icon
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          )}
          {rightIcon && onRightIconPress && (
            <Pressable
              onPress={onRightIconPress}
              style={styles.eyeIcon}
            >
              <Icon
                name={rightIcon}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          )}
        </Animated.View>
      </Pressable>
      {showCharCounter && maxLength > 0 && (
        <Text style={globalStyles.charCounter}>
          {currentLength}/{maxLength}
        </Text>
      )}
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
      marginBottom: 4,
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
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    eyeIcon: {
      padding: 4,
    },
  });
