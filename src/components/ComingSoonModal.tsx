import React from 'react';
import { View, StyleSheet, Modal, Text, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import Button from './Button';

interface ComingSoonModalProps {
  visible: boolean;
  onClose: () => void;
  appName: string;
  appIcon: string;
  appColor: string;
}

export default function ComingSoonModal({
  visible,
  onClose,
  appName,
  appIcon,
  appColor,
}: ComingSoonModalProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark, appColor);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon name={appIcon} size={64} color={appColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Geliştirme Aşamasında</Text>

          {/* Message */}
          <Text style={styles.message}>
            <Text style={styles.appName}>{appName}</Text> uygulaması şu anda geliştirme
            aşamasında. Tamamlandığında sizlere duyuracağız.
          </Text>

          {/* Close Button */}
          <Button
            text="Tamam"
            onPress={onClose}
            icon="checkmark-circle-outline"
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean, appColor: string) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContainer: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 32,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: appColor + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    message: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    appName: {
      fontWeight: '600',
      color: colors.primary,
    },
    button: {
      width: '100%',
    },
  });
