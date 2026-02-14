import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import ModalFooter from './ModalFooter';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  title: string;
  icon?: string;
  iconColor?: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave?: () => void;
  saveText?: string;
  cancelText?: string;
  saveDisabled?: boolean;
  saveIcon?: string;
  cancelIcon?: string;
  showFooter?: boolean;
  height?: number;
  autoHeight?: boolean;
}

export default function BottomSheet({
  visible,
  title,
  icon = 'add-circle-outline',
  iconColor,
  children,
  onClose,
  onSave,
  saveText = 'Kaydet',
  cancelText = 'İptal',
  saveDisabled = false,
  saveIcon,
  cancelIcon,
  showFooter = true,
  height = SCREEN_HEIGHT * 0.75,
  autoHeight = false,
}: BottomSheetProps) {
  const { colors, isDark } = useTheme();
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const styles = createStyles(colors, isDark);
  const headerColor = iconColor || colors.primary;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.overlay}>
          {/* Backdrop */}
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={styles.backdropPress} onPress={handleClose} />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              autoHeight
                ? { maxHeight: height, transform: [{ translateY }] }
                : { height, transform: [{ translateY }] },
            ]}
          >
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIcon, { backgroundColor: headerColor + '15' }]}>
                  <Icon name={icon} size={20} color={headerColor} />
                </View>
                <Text style={styles.title}>{title}</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Icon name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView
              style={autoHeight ? styles.contentAuto : styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {/* Footer */}
            {showFooter && onSave && (
              <View style={styles.footer}>
                <ModalFooter
                  onCancel={handleClose}
                  onConfirm={onSave}
                  cancelText={cancelText}
                  confirmText={saveText}
                  confirmDisabled={saveDisabled}
                  {...(saveIcon ? { confirmIcon: saveIcon } : {})}
                  {...(cancelIcon ? { cancelIcon } : {})}
                />
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    keyboardView: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdropPress: {
      flex: 1,
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 20,
    },
    handleContainer: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 4,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      marginRight: 12,
    },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      flexShrink: 1,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    contentAuto: {
      flexGrow: 0,
      flexShrink: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 8,
    },
    footer: {
      backgroundColor: colors.background,
      paddingBottom: 32,
    },
  });
