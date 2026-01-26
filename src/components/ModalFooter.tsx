import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Button from './Button';

interface ModalFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  confirmDisabled?: boolean;
  cancelIcon?: string;
  confirmIcon?: string;
}

export default function ModalFooter({
  onCancel,
  onConfirm,
  cancelText = 'İptal',
  confirmText = 'Kaydet',
  confirmDisabled = false,
  cancelIcon = 'close',
  confirmIcon = 'checkmark',
}: ModalFooterProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Button
        text={cancelText}
        icon={cancelIcon}
        onPress={onCancel}
        variant="secondary"
        style={styles.button}
      />
      <Button
        text={confirmText}
        icon={confirmIcon}
        onPress={onConfirm}
        disabled={confirmDisabled}
        style={[styles.button, !confirmDisabled && styles.confirmButton]}
      />
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    button: {
      flex: 1,
    },
    confirmButton: {
      backgroundColor: colors.primary,
    },
  });
