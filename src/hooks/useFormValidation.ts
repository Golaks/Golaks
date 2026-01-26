import { useState } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  custom?: (value: string) => boolean;
  message?: string;
}

export interface FormField {
  value: string;
  error: string;
  shake: boolean;
}

export interface FormFields {
  [key: string]: FormField;
}

export interface ValidationRules {
  [key: string]: ValidationRule[];
}

export const useFormValidation = (initialValues: { [key: string]: string } = {}) => {
  const [fields, setFields] = useState<FormFields>(() => {
    const initialFields: FormFields = {};
    Object.keys(initialValues).forEach(key => {
      initialFields[key] = {
        value: initialValues[key],
        error: '',
        shake: false,
      };
    });
    return initialFields;
  });

  const setValue = (fieldName: string, value: string) => {
    setFields(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        value,
        error: '',
        shake: false,
      },
    }));
  };

  const setError = (fieldName: string, error: string, shake: boolean = true) => {
    setFields(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        error,
        shake,
      },
    }));

    // Reset shake after animation
    if (shake) {
      setTimeout(() => {
        setFields(prev => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            shake: false,
          },
        }));
      }, 300);
    }
  };

  const validateField = (fieldName: string, rules: ValidationRule[]): boolean => {
    const value = fields[fieldName]?.value || '';

    for (const rule of rules) {
      // Required
      if (rule.required && !value.trim()) {
        setError(fieldName, rule.message || 'Bu alan zorunludur');
        return false;
      }

      // Min length
      if (rule.minLength && value.length < rule.minLength) {
        setError(fieldName, rule.message || `En az ${rule.minLength} karakter olmalıdır`);
        return false;
      }

      // Max length
      if (rule.maxLength && value.length > rule.maxLength) {
        setError(fieldName, rule.message || `En fazla ${rule.maxLength} karakter olmalıdır`);
        return false;
      }

      // Email
      if (rule.email && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          setError(fieldName, rule.message || 'Geçerli bir e-posta adresi giriniz');
          return false;
        }
      }

      // Pattern
      if (rule.pattern && value && !rule.pattern.test(value)) {
        setError(fieldName, rule.message || 'Geçersiz format');
        return false;
      }

      // Custom validation
      if (rule.custom && value && !rule.custom(value)) {
        setError(fieldName, rule.message || 'Geçersiz değer');
        return false;
      }
    }

    return true;
  };

  const validateForm = (rules: ValidationRules): boolean => {
    let isValid = true;

    Object.keys(rules).forEach(fieldName => {
      if (!validateField(fieldName, rules[fieldName])) {
        isValid = false;
      }
    });

    return isValid;
  };

  const resetForm = () => {
    const resetFields: FormFields = {};
    Object.keys(fields).forEach(key => {
      resetFields[key] = {
        value: '',
        error: '',
        shake: false,
      };
    });
    setFields(resetFields);
  };

  const resetField = (fieldName: string) => {
    setFields(prev => ({
      ...prev,
      [fieldName]: {
        value: '',
        error: '',
        shake: false,
      },
    }));
  };

  return {
    fields,
    setValue,
    setError,
    validateField,
    validateForm,
    resetForm,
    resetField,
  };
};
