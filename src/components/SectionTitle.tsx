import React from 'react';
import { Text, StyleSheet, TextStyle, ViewStyle, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface SectionTitleProps {
  title: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function SectionTitle({ title, style, textStyle }: SectionTitleProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, textStyle]}>{title.toLocaleUpperCase('tr-TR')}</Text>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    title: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginLeft: 4,
      letterSpacing: 0.8,
      opacity: 0.7,
    },
  });
