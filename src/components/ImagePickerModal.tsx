import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import MenuCard from './MenuCard';
import XButton from './XButton';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  title?: string;
}

export default function ImagePickerModal({
  visible,
  onClose,
  onCamera,
  onGallery,
  title = 'Fotoğraf Seç',
}: ImagePickerModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Icon name="image" size={20} color={colors.primary} />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>
            <XButton onPress={onClose} size={36} iconSize={20} />
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            <MenuCard
              name="Fotoğraf Çek"
              icon="camera"
              color="#3B82F6"
              description="Kamera ile yeni fotoğraf çek"
              onPress={() => {
                onClose();
                setTimeout(() => {
                  onCamera();
                }, 300);
              }}
              style={styles.menuCard}
            />
            <MenuCard
              name="Galeriden Seç"
              icon="images"
              color="#10B981"
              description="Mevcut fotoğraflardan seç"
              onPress={() => {
                onClose();
                setTimeout(() => {
                  onGallery();
                }, 300);
              }}
              style={styles.menuCard}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 32,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    optionsContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    menuCard: {
      marginBottom: 8,
    },
  });
