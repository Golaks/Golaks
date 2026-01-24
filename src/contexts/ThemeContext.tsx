import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for theme preference
const THEME_STORAGE_KEY = '@golaks_theme';

// Theme mode types
export type ThemeMode = 'light' | 'dark' | 'system';

// Color definitions
export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  card: string;
  cardSecondary: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Borders
  border: string;
  borderLight: string;

  // Primary colors (brand colors - same for both themes)
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryBackground: string;

  // Status colors
  success: string;
  successBackground: string;
  warning: string;
  warningBackground: string;
  danger: string;
  dangerBackground: string;
  info: string;
  infoBackground: string;

  // Input
  inputBackground: string;
  inputBorder: string;
  placeholder: string;

  // Modal/Overlay
  overlay: string;
  modalBackground: string;

  // Misc
  shadow: string;
  divider: string;
  icon: string;
  iconSecondary: string;
}

// Light theme colors
const lightColors: ThemeColors = {
  // Backgrounds
  background: '#F9FAFB',
  backgroundSecondary: '#FFFFFF',
  card: '#FFFFFF',
  cardSecondary: '#F3F4F6',

  // Text
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Primary colors
  primary: '#2B7FFF',
  primaryDark: '#1E5FCC',
  primaryLight: '#60A5FA',
  primaryBackground: '#EFF6FF',

  // Status colors
  success: '#10B981',
  successBackground: '#D1FAE5',
  warning: '#F59E0B',
  warningBackground: '#FEF3C7',
  danger: '#EF4444',
  dangerBackground: '#FEE2E2',
  info: '#3B82F6',
  infoBackground: '#DBEAFE',

  // Input
  inputBackground: '#F9FAFB',
  inputBorder: '#E5E7EB',
  placeholder: '#9CA3AF',

  // Modal/Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: '#FFFFFF',

  // Misc
  shadow: '#000000',
  divider: '#F3F4F6',
  icon: '#374151',
  iconSecondary: '#9CA3AF',
};

// Dark theme colors
const darkColors: ThemeColors = {
  // Backgrounds
  background: '#111827',
  backgroundSecondary: '#1F2937',
  card: '#1F2937',
  cardSecondary: '#374151',

  // Text
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders
  border: '#374151',
  borderLight: '#4B5563',

  // Primary colors
  primary: '#2B7FFF',
  primaryDark: '#1E5FCC',
  primaryLight: '#60A5FA',
  primaryBackground: '#1E3A5F',

  // Status colors
  success: '#10B981',
  successBackground: '#064E3B',
  warning: '#F59E0B',
  warningBackground: '#78350F',
  danger: '#EF4444',
  dangerBackground: '#7F1D1D',
  info: '#3B82F6',
  infoBackground: '#1E3A8A',

  // Input
  inputBackground: '#1F2937',
  inputBorder: '#374151',
  placeholder: '#6B7280',

  // Modal/Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: '#1F2937',

  // Misc
  shadow: '#000000',
  divider: '#374151',
  icon: '#D1D5DB',
  iconSecondary: '#9CA3AF',
};

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('system');

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
        setThemeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Determine if dark mode should be active
  const isDark = theme === 'system'
    ? systemColorScheme === 'dark'
    : theme === 'dark';

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
