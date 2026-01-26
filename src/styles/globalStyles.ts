import { StyleSheet } from 'react-native';

/**
 * Global reusable styles
 * These styles can be used across the application
 */

interface GlobalStylesProps {
  colors: any;
}

export const createGlobalStyles = (colors: any) =>
  StyleSheet.create({
    // Character counter for inputs and textareas
    // Position: bottom right, outside the input
    charCounter: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'right',
      marginTop: 6,
    },

    // Character counter for absolute positioned (inside textarea)
    charCounterAbsolute: {
      position: 'absolute',
      bottom: 12,
      right: 16,
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

export default createGlobalStyles;
