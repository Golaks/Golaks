import React from 'react';
import { Pressable, View, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface MenuCardProps {
  name: string;
  icon: string;
  color: string;
  description: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  badgeCount?: number;
}

export default function MenuCard({
  name,
  icon,
  color,
  description,
  onPress,
  style,
  disabled = false,
  badgeCount,
}: MenuCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && !disabled && styles.cardPressed,
        disabled && styles.cardDisabled,
        style,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      android_ripple={{ color: disabled ? 'transparent' : 'rgba(0, 0, 0, 0.05)' }}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: disabled ? colors.border : `${color}15` }]}>
          <Icon name={icon} size={24} color={disabled ? colors.textSecondary : color} />
          {badgeCount !== undefined && badgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.name, disabled && styles.nameDisabled]}>{name}</Text>
          <Text style={[styles.description, disabled && styles.descriptionDisabled]} numberOfLines={1}>
            {description}
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <Icon
            name={disabled ? "lock-closed" : "chevron-forward"}
            size={20}
            color={disabled ? colors.textSecondary : colors.textSecondary}
          />
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
      marginBottom: 12,
    },
    cardPressed: {
      opacity: 0.7,
      backgroundColor: colors.border,
      transform: [{ scale: 0.98 }],
    },
    cardDisabled: {
      opacity: 0.5,
      backgroundColor: colors.cardSecondary,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.card,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    textContainer: {
      flex: 1,
    },
    arrowContainer: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    name: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    nameDisabled: {
      color: colors.textSecondary,
    },
    description: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 14,
    },
    descriptionDisabled: {
      opacity: 0.6,
    },
  });
