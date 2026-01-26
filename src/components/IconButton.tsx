import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface IconButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  style?: ViewStyle;
  color?: string;
  backgroundColor?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 40,
  iconSize = 20,
  style,
  color,
  backgroundColor,
}) => {
  const { colors } = useTheme();

  const defaultColor = color || colors.primary;
  const defaultBgColor = backgroundColor || `${colors.primary}15`;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: 12,
          backgroundColor: defaultBgColor,
        },
        style,
      ]}
      activeOpacity={0.7}>
      <Icon name={icon} size={iconSize} color={defaultColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default IconButton;
