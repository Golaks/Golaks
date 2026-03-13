import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import XButton from './XButton';
import InModalToast, { ToastMessage } from './InModalToast';

const { height } = Dimensions.get('window');

export interface BottomSheetToastRef {
  show: (toast: ToastMessage) => void;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  iconColor?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightRatio?: number;
  toastRef?: React.MutableRefObject<BottomSheetToastRef | null>;
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  icon,
  iconColor,
  children,
  footer,
  maxHeightRatio = 0.92,
  toastRef,
}: BottomSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((t: ToastMessage) => {
    setToast(null);
    setTimeout(() => setToast(t), 50);
  }, []);

  // Expose show method via ref
  React.useEffect(() => {
    if (toastRef) {
      toastRef.current = { show: showToast };
    }
  }, [toastRef, showToast]);

  // Clear toast when modal closes
  React.useEffect(() => {
    if (!visible) setToast(null);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayTouchable} onPress={onClose} />

        <View style={[styles.sheet, { maxHeight: height * maxHeightRatio, paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {icon && (
                <Icon name={icon} size={22} color={iconColor || colors.primary} />
              )}
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <XButton onPress={onClose} size={36} iconSize={20} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces
            contentContainerStyle={styles.scrollContent}>
            {children}
          </ScrollView>

          {footer && (
            <View style={styles.footer}>
              {footer}
            </View>
          )}
        </View>

        <InModalToast toast={toast} onDismiss={() => setToast(null)} />
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    overlayTouchable: {
      flex: 1,
    },
    sheet: {
      backgroundColor: isDark ? colors.card : colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
    },
    handleContainer: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      flex: 1,
    },
    scrollView: {
      marginBottom: 8,
    },
    scrollContent: {
      paddingBottom: 16,
    },
    footer: {
      flexDirection: 'row' as const,
      gap: 12,
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
