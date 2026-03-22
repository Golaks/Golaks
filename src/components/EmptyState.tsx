import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  subtitle?: string;
  iconSize?: number;
}

export default function EmptyState({
  icon = 'file-tray-outline',
  title = 'Kayıt Bulunamadı..!',
  subtitle,
  iconSize = 40,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.iconCircle, { backgroundColor: colors.textSecondary + '10' }]}>
        <Icon name={icon} size={iconSize} color={colors.textSecondary + '50'} />
      </View>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.6,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.4,
  },
});
