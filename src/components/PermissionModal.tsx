/**
 * Permission Modal Component
 * Kullanıcıya izin gereksinimlerini açıklayan modal
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import Button from './Button';

export type PermissionType = 'camera' | 'gallery' | 'notifications';

interface Permission {
  type: PermissionType;
  icon: string;
  title: string;
  description: string;
  required: boolean;
}

interface PermissionModalProps {
  visible: boolean;
  permissions: PermissionType[];
  onRequestPermissions: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

const PERMISSION_INFO: Record<PermissionType, Omit<Permission, 'type' | 'required'>> = {
  camera: {
    icon: 'camera-outline',
    title: 'Kamera',
    description: 'Profil fotoğrafı çekmek ve QR kod okutmak için kamera erişimi gereklidir.',
  },
  gallery: {
    icon: 'images-outline',
    title: 'Galeri',
    description: 'Galeriden fotoğraf seçmek için medya erişimi gereklidir.',
  },
  notifications: {
    icon: 'notifications-outline',
    title: 'Bildirimler',
    description: 'Önemli güncellemeler ve hatırlatmalar için bildirim izni gereklidir.',
  },
};

export default function PermissionModal({
  visible,
  permissions,
  onRequestPermissions,
  onCancel,
  title = 'İzinler Gerekli',
  subtitle = 'Uygulamanın düzgün çalışması için aşağıdaki izinlere ihtiyaç duyuyor:',
}: PermissionModalProps) {
  const { colors } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  const styles = createStyles(colors);

  const permissionList: Permission[] = permissions.map((type) => ({
    type,
    ...PERMISSION_INFO[type],
    required: true,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="shield-checkmark" size={40} color={colors.primary} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {/* Permission List */}
          <View style={styles.permissionListContainer}>
            {permissionList.map((permission, index) => (
              <View
                key={permission.type}
                style={[
                  styles.permissionItem,
                  index === permissionList.length - 1 && styles.permissionItemLast,
                ]}
              >
                <View style={styles.permissionIcon}>
                  <Icon name={permission.icon} size={28} color={colors.primary} />
                </View>
                <View style={styles.permissionContent}>
                  <View style={styles.permissionHeader}>
                    <Text style={styles.permissionTitle}>{permission.title}</Text>
                    {permission.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Gerekli</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.permissionDescription}>
                    {permission.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              text="İptal"
              icon="close-circle-outline"
              onPress={onCancel}
              variant="secondary"
              style={styles.cancelButton}
            />

            <Button
              text="İzin Ver"
              icon="shield-checkmark-outline"
              onPress={onRequestPermissions}
              style={styles.confirmButton}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
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
    modalContainer: {
      width: '85%',
      maxWidth: 400,
      backgroundColor: colors.card,
      borderRadius: 20,
      overflow: 'hidden',
    },
    header: {
      padding: 24,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.primary}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    permissionListContainer: {
      padding: 20,
    },
    permissionItem: {
      flexDirection: 'row',
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    permissionItemLast: {
      borderBottomWidth: 0,
      marginBottom: 0,
      paddingBottom: 0,
    },
    permissionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${colors.primary}10`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    permissionContent: {
      flex: 1,
    },
    permissionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    permissionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginRight: 8,
    },
    requiredBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    requiredText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    permissionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      padding: 16,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
    },
    confirmButton: {
      flex: 1,
    },
  });
