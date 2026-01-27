import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface VersionBadgeProps {
  version: string;
  buildNumber?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function VersionBadge({
  version,
  buildNumber,
  size = 'medium',
}: VersionBadgeProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors, size);

  return (
    <View style={styles.container}>
      <View style={styles.versionContainer}>
        <Icon name="rocket" size={getSizeConfig(size).iconSize} color={colors.primary} />
        <Text style={styles.versionText}>v{version}</Text>
      </View>
      {buildNumber && (
        <>
          <View style={styles.separator} />
          <View style={styles.buildContainer}>
            <Icon name="build" size={getSizeConfig(size).iconSize} color={colors.textSecondary} />
            <Text style={styles.buildText}>{buildNumber}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const getSizeConfig = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return {
        iconSize: 12,
        fontSize: 11,
        padding: 6,
        gap: 4,
      };
    case 'large':
      return {
        iconSize: 18,
        fontSize: 15,
        padding: 12,
        gap: 8,
      };
    default: // medium
      return {
        iconSize: 14,
        fontSize: 13,
        padding: 8,
        gap: 6,
      };
  }
};

const createStyles = (colors: any, size: 'small' | 'medium' | 'large') => {
  const config = getSizeConfig(size);

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryBackground,
      borderRadius: 20,
      paddingHorizontal: config.padding,
      paddingVertical: config.padding - 2,
      borderWidth: 1,
      borderColor: colors.primary + '30',
      gap: config.gap,
    },
    versionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: config.gap - 2,
    },
    versionText: {
      fontSize: config.fontSize,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    separator: {
      width: 1,
      height: config.iconSize + 2,
      backgroundColor: colors.border,
    },
    buildContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: config.gap - 2,
    },
    buildText: {
      fontSize: config.fontSize - 1,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
};
