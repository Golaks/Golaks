import React from 'react';
import {TouchableOpacity, StyleSheet, ViewStyle} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../contexts/ThemeContext';

interface XButtonProps {
  onPress: () => void;
  size?: number;
  iconSize?: number;
  style?: ViewStyle;
  color?: string;
  backgroundColor?: string;
}

const XButton: React.FC<XButtonProps> = ({
  onPress,
  size = 32,
  iconSize = 20,
  style,
  color,
  backgroundColor,
}) => {
  const {colors, isDark} = useTheme();

  const defaultColor = color || colors.textSecondary;
  const defaultBgColor =
    backgroundColor ||
    (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)');

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: defaultBgColor,
        },
        style,
      ]}
      activeOpacity={0.7}>
      <Icon name="close" size={iconSize} color={defaultColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default XButton;
