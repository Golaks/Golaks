import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

export interface TabOption<T extends string> {
  id: T;
  label: string;
  icon: string;
}

interface TabProps<T extends string> {
  options: TabOption<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export default function Tab<T extends string>({ options, activeTab, onTabChange }: TabProps<T>) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.tabsContainer}>
      {options.map((option) => (
        <Pressable
          key={option.id}
          style={[
            styles.tabButton,
            activeTab === option.id && styles.tabButtonActive,
          ]}
          onPress={() => onTabChange(option.id)}
        >
          <Icon
            name={option.icon}
            size={18}
            color={activeTab === option.id ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === option.id && styles.tabButtonTextActive,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 4,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    tabButtonActive: {
      backgroundColor: colors.primary + '15',
    },
    tabButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabButtonTextActive: {
      color: colors.primary,
    },
  });
