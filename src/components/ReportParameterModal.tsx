import React, { useState } from 'react';
import { View, StyleSheet, Modal, Text, Pressable, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import Button from './Button';
import Input from './Input';

interface ReportParameter {
  id: string;
  label: string;
  type: 'date' | 'select' | 'radio' | 'checkbox';
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface ReportParameterModalProps {
  visible: boolean;
  onClose: () => void;
  reportTitle: string;
  parameters: ReportParameter[];
  onGenerate: (values: Record<string, any>) => void;
}

export default function ReportParameterModal({
  visible,
  onClose,
  reportTitle,
  parameters,
  onGenerate,
}: ReportParameterModalProps) {
  const { colors, isDark } = useTheme();
  const [values, setValues] = useState<Record<string, any>>({});
  const styles = createStyles(colors, isDark);

  const handleValueChange = (parameterId: string, value: any) => {
    setValues((prev) => ({ ...prev, [parameterId]: value }));
  };

  const handleGenerate = () => {
    onGenerate(values);
    onClose();
  };

  const renderParameter = (param: ReportParameter) => {
    switch (param.type) {
      case 'date':
        return (
          <View key={param.id} style={styles.parameterContainer}>
            <Text style={styles.parameterLabel}>
              {param.label}
              {param.required && <Text style={styles.required}> *</Text>}
            </Text>
            <Input
              placeholder="GG.AA.YYYY"
              value={values[param.id] || ''}
              onChangeText={(text) => handleValueChange(param.id, text)}
            />
          </View>
        );

      case 'select':
        return (
          <View key={param.id} style={styles.parameterContainer}>
            <Text style={styles.parameterLabel}>
              {param.label}
              {param.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.selectContainer}>
              {param.options?.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.selectOption,
                    values[param.id] === option.value && styles.selectOptionActive,
                  ]}
                  onPress={() => handleValueChange(param.id, option.value)}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      values[param.id] === option.value && styles.selectOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 'radio':
        return (
          <View key={param.id} style={styles.parameterContainer}>
            <Text style={styles.parameterLabel}>
              {param.label}
              {param.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.radioContainer}>
              {param.options?.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.radioOption}
                  onPress={() => handleValueChange(param.id, option.value)}
                >
                  <View style={styles.radioButton}>
                    {values[param.id] === option.value && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={styles.radioText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 'checkbox':
        return (
          <View key={param.id} style={styles.parameterContainer}>
            <Text style={styles.parameterLabel}>{param.label}</Text>
            <View style={styles.checkboxContainer}>
              {param.options?.map((option) => {
                const isChecked = values[param.id]?.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    style={styles.checkboxOption}
                    onPress={() => {
                      const currentValues = values[param.id] || [];
                      const newValues = isChecked
                        ? currentValues.filter((v: string) => v !== option.value)
                        : [...currentValues, option.value];
                      handleValueChange(param.id, newValues);
                    }}
                  >
                    <View
                      style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                    >
                      {isChecked && (
                        <Icon name="checkmark" size={16} color={colors.primary} />
                      )}
                    </View>
                    <Text style={styles.checkboxText}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Icon name="document-text" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>{reportTitle}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>Rapor Parametreleri</Text>
            {parameters.map((param) => renderParameter(param))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <Button
              title="İptal"
              onPress={onClose}
              variant="outline"
              style={styles.footerButton}
            />
            <Button
              title="Rapor Oluştur"
              onPress={handleGenerate}
              style={styles.footerButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      paddingBottom: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    modalContent: {
      padding: 20,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    parameterContainer: {
      marginBottom: 24,
    },
    parameterLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    required: {
      color: '#EF4444',
    },
    selectContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    selectOption: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    selectOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    selectOptionText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    selectOptionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    radioContainer: {
      gap: 12,
    },
    radioOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    radioButton: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioButtonInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    radioText: {
      fontSize: 15,
      color: colors.text,
    },
    checkboxContainer: {
      gap: 12,
    },
    checkboxOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    checkboxText: {
      fontSize: 15,
      color: colors.text,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerButton: {
      flex: 1,
    },
  });
