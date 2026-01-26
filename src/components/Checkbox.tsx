import React from 'react';
import {Pressable, Text, StyleSheet, View, ViewStyle} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onPress,
  style,
}) => {
  const {colors} = useTheme();

  return (
    <Pressable onPress={onPress} style={[styles.container, style]}>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : 'transparent',
          },
        ]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.label, {color: colors.textSecondary}]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 5,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Checkbox;
