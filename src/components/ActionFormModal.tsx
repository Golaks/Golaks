import React from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Input from './Input';
import InputPhone from './InputPhone';
import Button from './Button';
import BottomSheet from './BottomSheet';

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

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      icon={icon}
      iconColor={iconColor || colors.primary}
      footer={
        <>
          <Button
            text={cancelButtonText}
            icon="close"
            onPress={onClose}
            variant="secondary"
            style={{ flex: 1 }}
          />
          <Button
            text={saveButtonText}
            icon="checkmark"
            onPress={onSave}
            disabled={saveDisabled}
            style={{ flex: 1, ...(!saveDisabled ? { backgroundColor: colors.primary } : {}) }}
          />
        </>
      }>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}>
        {children ? (
          children
        ) : (
          fields?.map((field, index) => (
            field.keyboardType === 'phone-pad' ? (
              <InputPhone
                key={field.key}
                label={field.label}
                icon={field.icon}
                value={field.value}
                onChangeText={(text) => onFieldChange?.(field.key, text)}
                placeholder={field.placeholder}
                error={field.error}
                shake={!!field.error}
                clearable
                onClear={() => onFieldChange?.(field.key, '')}
                containerStyle={{
                  marginBottom: index === (fields?.length ?? 0) - 1 ? 0 : 16,
                }}
              />
            ) : (
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
                  marginBottom: index === (fields?.length ?? 0) - 1 ? 0 : 16,
                }}
              />
            )
          ))
        )}
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}
