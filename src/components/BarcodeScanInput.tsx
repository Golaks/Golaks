import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import BarcodeScanner from './BarcodeScanner';

interface BarcodeScanInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBarcodeScanned?: (barcode: string) => void;
  scannerTitle?: string;
  containerStyle?: any;
  editable?: boolean;
}

export default function BarcodeScanInput({
  label = 'Barkod',
  placeholder = 'Barkod girin veya tarayın...',
  value,
  onChangeText,
  onBarcodeScanned,
  scannerTitle = 'Barkod Tara',
  containerStyle,
  editable = true,
}: BarcodeScanInputProps) {
  const { colors, isDark } = useTheme();
  const [scannerVisible, setScannerVisible] = useState(false);

  const handleScanned = (barcode: string) => {
    setScannerVisible(false);
    onChangeText(barcode);
    onBarcodeScanned?.(barcode);
  };

  return (
    <>
      <View style={containerStyle}>
        {label && (
          <Text style={[styles.label, { color: colors.inputLabel }]}>{label}</Text>
        )}
        <View style={styles.row}>
          {/* Input alanı */}
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: isDark ? colors.card : '#F0F9FF',
                borderColor: value ? colors.primary : (isDark ? colors.border : '#BAE6FD'),
              },
            ]}
          >
            <Icon name="barcode-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={colors.placeholder}
              editable={editable}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {value ? (
              <Pressable
                style={styles.clearBtn}
                onPress={() => onChangeText('')}
                hitSlop={8}
              >
                <Icon name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {/* Kamera butonu */}
          <Pressable
            style={[styles.scanBtn, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', borderColor: colors.primary }]}
            onPress={() => setScannerVisible(true)}
          >
            <View style={[styles.scanIconCircle, { backgroundColor: colors.primary }]}>
              <Icon name="camera-outline" size={22} color="#fff" />
            </View>
          </Pressable>
        </View>
      </View>

      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onBarcodeScanned={handleScanned}
        title={scannerTitle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 0,
    height: 48,
  },
  clearBtn: {
    paddingHorizontal: 10,
  },
  scanBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    width: 48,
    height: 48,
  },
  scanIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: -1,
  },
});
