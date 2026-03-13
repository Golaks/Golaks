import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ViewStyle,
} from 'react-native';
import MaskedTextInput from 'react-native-mask-input';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface InputPhoneProps {
  label?: string;
  icon?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  shake?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  containerStyle?: ViewStyle;
}

export default function InputPhone({
  label,
  icon = 'call-outline',
  value,
  onChangeText,
  placeholder = '(5__) ___-____',
  error,
  shake,
  clearable,
  onClear,
  containerStyle,
}: InputPhoneProps) {
  const { colors, isDark } = useTheme();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<any>(null);
  const styles = createStyles(colors, !!error);

  const showClearButton = clearable && value && value.length > 0;

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

  // Phone mask: (532)274-2233
  const phoneMask = ['(', /\d/, /\d/, /\d/, ')', /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/];

  const handleMaskedChange = (masked: string, unmasked: string) => {
    // Pass only unmasked value (digits only) to parent
    onChangeText(unmasked);
  };

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
          <MaskedTextInput
            ref={inputRef}
            style={styles.input}
            value={value}
            onChangeText={handleMaskedChange}
            mask={phoneMask}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            keyboardAppearance={isDark ? 'dark' : 'light'}
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
        </Animated.View>
      </Pressable>
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
