import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, View, Text } from 'react-native';
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
  badge?: number | string | null;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 40,
  iconSize = 20,
  style,
  color,
  backgroundColor,
  badge,
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
      {badge != null && (
        <View style={[styles.badge, { backgroundColor: defaultColor }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default IconButton;
