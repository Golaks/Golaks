import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface BackButtonProps {
  onPress: () => void;
  size?: number;
  iconSize?: number;
  style?: ViewStyle;
  color?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  size = 40,
  iconSize = 24,
  style,
  color,
}) => {
  const { colors } = useTheme();

  const defaultColor = color || colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        {
          width: size,
          height: size,
        },
        style,
      ]}
      activeOpacity={0.6}>
      <Icon name="arrow-back" size={iconSize} color={defaultColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BackButton;
