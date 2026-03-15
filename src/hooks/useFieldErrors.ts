import { useState, useCallback } from 'react';

/**
 * Basit field validation hook - kırmızı border + shake
 * Toast yerine inline validation için kullanılır.
 *
 * Kullanım:
 *   const { errors, setFieldError, clearFieldError, clearAll, validateRequired } = useFieldErrors();
 *   // Input'a: error={errors.fieldName} shake={errors.fieldName}
 *   // Validate: if (!validateRequired({ alan1: value1, alan2: value2 })) return;
 */

export interface FieldErrors {
  [key: string]: boolean;
}

export const useFieldErrors = () => {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [shakes, setShakes] = useState<FieldErrors>({});

  const setFieldError = useCallback((field: string) => {
    setErrors(prev => ({ ...prev, [field]: true }));
    setShakes(prev => ({ ...prev, [field]: true }));
    setTimeout(() => {
      setShakes(prev => ({ ...prev, [field]: false }));
    }, 300);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => ({ ...prev, [field]: false }));
    setShakes(prev => ({ ...prev, [field]: false }));
  }, []);

  const clearAll = useCallback(() => {
    setErrors({});
    setShakes({});
  }, []);

  /** Zorunlu alanları kontrol eder. Boş olanları kırmızı yapar. */
  const validateRequired = useCallback((fields: Record<string, string | number | null | undefined>): boolean => {
    let valid = true;
    const newErrors: FieldErrors = {};
    const newShakes: FieldErrors = {};

    Object.entries(fields).forEach(([key, value]) => {
      const isEmpty = value === null || value === undefined || String(value).trim() === '';
      if (isEmpty) {
        newErrors[key] = true;
        newShakes[key] = true;
        valid = false;
      } else {
        newErrors[key] = false;
        newShakes[key] = false;
      }
    });

    setErrors(prev => ({ ...prev, ...newErrors }));
    setShakes(prev => ({ ...prev, ...newShakes }));

    if (!valid) {
      setTimeout(() => {
        setShakes(prev => {
          const reset = { ...prev };
          Object.keys(newShakes).forEach(k => { reset[k] = false; });
          return reset;
        });
      }, 300);
    }

    return valid;
  }, []);

  return { errors, shakes, setFieldError, clearFieldError, clearAll, validateRequired };
};
