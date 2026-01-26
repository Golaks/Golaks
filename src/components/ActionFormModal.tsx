import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import Input from './Input';
import XButton from './XButton';
import ModalFooter from './ModalFooter';

export interface FormField {
  key: string;
  label: string;
  icon?: string;
  placeholder?: string;
  isPassword?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  value: string;
  error?: string;
}

interface ActionFormModalProps {
  visible: boolean;
  title: string;
  icon: string;
  iconColor?: string;
  fields?: FormField[];
  children?: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
  onFieldChange?: (key: string, value: string) => void;
  saveButtonText?: string;
  cancelButtonText?: string;
  saveDisabled?: boolean;
}

export default function ActionFormModal({
  visible,
  title,
  icon,
  iconColor,
  fields,
  children,
  onClose,
  onSave,
  onFieldChange,
  saveButtonText = 'Kaydet',
  cancelButtonText = 'İptal',
  saveDisabled = false,
}: ActionFormModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const headerIconColor = iconColor || colors.primary;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.keyboardView, { backgroundColor: colors.background }]}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalContent} pointerEvents="box-none">
            {/* Header */}
            <View style={styles.header} pointerEvents="auto">
              <View style={styles.headerLeft}>
                <View style={[styles.headerIconContainer, { backgroundColor: headerIconColor + '15' }]}>
                  <Icon name={icon} size={20} color={headerIconColor} />
                </View>
                <Text style={styles.title}>{title}</Text>
              </View>
              <XButton onPress={onClose} size={36} iconSize={20} />
            </View>

            {/* Form Content */}
            <ScrollView
              style={styles.formContainer}
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              pointerEvents="auto"
            >
              {children ? (
                children
              ) : (
                fields?.map((field, index) => (
                  <Input
                    key={field.key}
                    label={field.label}
                    icon={field.icon}
                    value={field.value}
                    onChangeText={(text) => onFieldChange?.(field.key, text)}
                    placeholder={field.placeholder}
                    isPassword={field.isPassword}
                    keyboardType={field.keyboardType}
                    error={field.error}
                    shake={!!field.error}
                    clearable
                    onClear={() => onFieldChange?.(field.key, '')}
                    containerStyle={{
                      marginBottom: index === fields.length - 1 ? 0 : 16,
                    }}
                  />
                ))
              )}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer} pointerEvents="auto">
              <ModalFooter
                onCancel={onClose}
                onConfirm={onSave}
                cancelText={cancelButtonText}
                confirmText={saveButtonText}
                confirmDisabled={saveDisabled}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    keyboardView: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    modalContent: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: colors.card,
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    formContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    formContent: {
      flexGrow: 1,
    },
    footer: {
      backgroundColor: colors.card,
      paddingBottom: 32,
    },
  });
