import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  subtitle?: string;
  iconSize?: number;
}

export default function EmptyState({
  icon = 'document-text-outline',
  title = 'Listelenecek Kayıt Bulunamadı.',
  subtitle,
  iconSize = 80,
}: EmptyStateProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Icon name={icon} size={iconSize} color="#60A5FA" />
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      minHeight: Dimensions.get('window').height * 0.5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#60A5FA15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
