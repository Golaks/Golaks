import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import XButton from './XButton';

interface NotificationDetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  time: string;
  type: 'bilgi' | 'genel' | 'duyuru' | 'guncelleme' | 'uyari' | 'acil';
}

export default function NotificationDetailModal({
  visible,
  onClose,
  title,
  message,
  time,
  type,
}: NotificationDetailModalProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const getNotificationConfig = () => {
    switch (type) {
      case 'bilgi':
        return { icon: 'information-circle', color: '#3B82F6' };
      case 'genel':
        return { icon: 'notifications', color: '#8B5CF6' };
      case 'duyuru':
        return { icon: 'megaphone', color: '#F59E0B' };
      case 'guncelleme':
        return { icon: 'refresh-circle', color: '#10B981' };
      case 'uyari':
        return { icon: 'warning', color: '#EAB308' };
      case 'acil':
        return { icon: 'alert-circle', color: '#EF4444' };
      default:
        return { icon: 'information-circle', color: '#3B82F6' };
    }
  };

  const config = getNotificationConfig();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
                <Icon name={config.icon} size={24} color={config.color} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={styles.time}>{time}</Text>
              </View>
            </View>
            <XButton onPress={onClose} iconSize={20} />
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.message}>{message}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
      width: '90%',
      maxWidth: 420,
      backgroundColor: colors.card,
      borderRadius: 24,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? colors.border : 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      flex: 1,
      marginRight: 12,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextContainer: {
      flex: 1,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    time: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    body: {
      maxHeight: 300,
    },
    bodyContent: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    message: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 24,
    },
  });
