import React from 'react';
import { Switch, SwitchProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface IOSSwitchProps extends Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
  color?: string;
}

export default function IOSSwitch({ value, onValueChange, color, ...props }: IOSSwitchProps) {
  const { colors, isDark } = useTheme();
  const activeColor = color || colors.primary;
  const inactiveColor = isDark ? '#39393D' : '#E9E9EA';

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{
        false: inactiveColor,
        true: activeColor,
      }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={inactiveColor}
      {...props}
    />
  );
}
