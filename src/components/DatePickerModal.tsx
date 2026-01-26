import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import XButton from './XButton';

interface DatePickerModalProps {
  visible: boolean;
  date: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
  title?: string;
}

export default function DatePickerModal({
  visible,
  date,
  onConfirm,
  onClose,
  title,
}: DatePickerModalProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const [selectedDate, setSelectedDate] = React.useState(date);

  // Date değiştiğinde state'i güncelle
  React.useEffect(() => {
    if (visible) {
      setSelectedDate(date);
    }
  }, [date, visible]);

  const handleDateChange = (event: any, newDate?: Date) => {
    if (newDate) {
      setSelectedDate(newDate);
      // Tarih değişince otomatik kaydet ve kapat
      onConfirm(newDate);
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Icon name="calendar" size={20} color={colors.primary} />
              </View>
              <Text style={styles.title}>
                {title || 'Tarih Seç'}
              </Text>
            </View>
            <XButton onPress={handleClose} iconSize={20} />
          </View>

          {/* Date Picker */}
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="inline"
              onChange={handleDateChange}
              locale="tr-TR"
              textColor={colors.text}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          </View>
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
      maxWidth: 380,
      backgroundColor: colors.card,
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? colors.border : 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '15',
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    pickerContainer: {
      paddingTop: 8,
      paddingBottom: 16,
      paddingHorizontal: 12,
      alignItems: 'center',
      backgroundColor: isDark ? colors.background : colors.backgroundSecondary,
    },
  });
