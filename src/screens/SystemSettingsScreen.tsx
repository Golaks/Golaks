import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme, type ThemeColors } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import BottomSheet from '../components/BottomSheet';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────

interface PriceAlgorithm {
  tip: number;   // 0: yüzde, 1: sabit
  deger: string;
}

type PriceKey = 'giris' | 'maliyet' | 'etiket';

interface PriceConfig {
  key: PriceKey;
  label: string;
  description: string;
  icon: string;
  color: string;
}

// ─── Constants ──────────────────────────────────────────

const PRICE_CONFIGS: PriceConfig[] = [
  {
    key: 'giris',
    label: 'Giriş Fiyatı',
    description: 'Ürün giriş fiyatına uygulanacak hesaplama',
    icon: 'enter-outline',
    color: '#3B82F6',
  },
  {
    key: 'maliyet',
    label: 'Maliyet Fiyatı',
    description: 'Ürün maliyet fiyatına uygulanacak hesaplama',
    icon: 'calculator-outline',
    color: '#F59E0B',
  },
  {
    key: 'etiket',
    label: 'Etiket Fiyatı',
    description: 'Ürün etiket fiyatına uygulanacak hesaplama',
    icon: 'pricetag-outline',
    color: '#22C55E',
  },
];

const DEFAULT_ALGORITHMS: Record<PriceKey, PriceAlgorithm> = {
  giris: { tip: 0, deger: '0' },
  maliyet: { tip: 0, deger: '0' },
  etiket: { tip: 0, deger: '0' },
};

// ─── Props ──────────────────────────────────────────────

interface PriceSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────

export default function PriceSettingsSheet({
  visible,
  onClose,
}: PriceSettingsSheetProps) {
  const { colors, isDark } = useTheme();
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const styles = createStyles(colors, isDark);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [algorithms, setAlgorithms] = useState<Record<PriceKey, PriceAlgorithm>>({ ...DEFAULT_ALGORITHMS });

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const fiyatHesaplama = user?.firmaAyarlar?.fiyatHesaplama;
      if (fiyatHesaplama) {
        const loaded: Record<PriceKey, PriceAlgorithm> = { ...DEFAULT_ALGORITHMS };
        for (const config of PRICE_CONFIGS) {
          const ayar = fiyatHesaplama[config.key];
          if (ayar) {
            loaded[config.key] = {
              tip: ayar.tip ?? 0,
              deger: String(ayar.deger ?? 0),
            };
          }
        }
        setAlgorithms(loaded);
      } else {
        setAlgorithms({ ...DEFAULT_ALGORITHMS });
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const updateAlgorithm = (key: string, field: 'tip' | 'deger', value: any) => {
    setAlgorithms(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleDegerChange = (key: string, text: string) => {
    const fixed = text.replace(/\//g, '.').replace(/,/g, '.');
    const cleaned = fixed.replace(/[^0-9.]/g, '');
    updateAlgorithm(key, 'deger', cleaned);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) {
        showError('Hata', 'Oturum bulunamadı');
        return;
      }

      const fiyatHesaplama: Record<string, { tip: number; deger: number }> = {};
      for (const config of PRICE_CONFIGS) {
        const algo = algorithms[config.key];
        fiyatHesaplama[config.key] = {
          tip: algo.tip,
          deger: parseFloat(algo.deger) || 0,
        };
      }

      const response = await fetch(API_ENDPOINTS.SETTINGS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          firma_ayarlar_key: 'fiyatHesaplama',
          firma_ayarlar_value: fiyatHesaplama,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const currentUser = await authService.getStoredUser();
        if (currentUser) {
          if (!currentUser.firmaAyarlar) currentUser.firmaAyarlar = {} as any;
          currentUser.firmaAyarlar.fiyatHesaplama = fiyatHesaplama as any;
          await authService.updateUser(currentUser);
        }
        await refreshUser();
        showSuccess('Fiyat hesaplama ayarları kaydedildi');
        onClose();
      } else {
        showError(data.message || 'Ayarlar kaydedilemedi');
      }
    } catch (error: any) {
      showError(error?.message || 'Ayarlar kaydedilemedi');
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviewText = (algo: PriceAlgorithm) => {
    const deger = parseFloat(algo.deger);
    if (!deger || deger === 0) {
      return 'Fiyat değiştirilmeyecek (orijinal fiyat)';
    }
    if (algo.tip === 0) {
      return `Fiyata %${algo.deger} eklenecek (ör: 100 → ${(100 * (1 + deger / 100)).toFixed(2)})`;
    }
    return `Fiyata ${algo.deger} eklenecek (ör: 100 → ${(100 + deger).toFixed(2)})`;
  };

  return (
    <BottomSheet
      visible={visible}
      title="Fiyat Hesaplama Algoritması"
      icon="calculator-outline"
      iconColor={colors.primary}
      onClose={onClose}
      onSave={handleSave}
      saveText="Kaydet"
      saveDisabled={isSaving}
      height={SCREEN_HEIGHT * 0.88}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="calculator" size={22} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Fiyat Hesaplama</Text>
              <Text style={styles.infoDesc}>
                Her fiyat türü için ayrı hesaplama yöntemi belirleyebilirsiniz
              </Text>
            </View>
          </View>

          {/* Price Algorithm Cards */}
          {PRICE_CONFIGS.map((config) => {
            const algo = algorithms[config.key];
            return (
              <View key={config.key} style={styles.priceCard}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: config.color + '15' }]}>
                    <Icon name={config.icon} size={20} color={config.color} />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>{config.label}</Text>
                    <Text style={styles.cardDesc}>{config.description}</Text>
                  </View>
                </View>

                {/* Segment Control */}
                <View style={styles.segmentRow}>
                  <Text style={styles.segmentLabel}>Hesaplama Tipi</Text>
                  <View style={styles.segmentControl}>
                    <Pressable
                      style={[
                        styles.segmentButton,
                        algo.tip === 0 && [styles.segmentButtonActive, { backgroundColor: config.color }],
                      ]}
                      onPress={() => updateAlgorithm(config.key, 'tip', 0)}
                    >
                      <Icon
                        name="trending-up"
                        size={14}
                        color={algo.tip === 0 ? '#FFFFFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.segmentButtonText,
                          algo.tip === 0 && styles.segmentButtonTextActive,
                        ]}
                      >
                        Yüzde
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.segmentButton,
                        algo.tip === 1 && [styles.segmentButtonActive, { backgroundColor: config.color }],
                      ]}
                      onPress={() => updateAlgorithm(config.key, 'tip', 1)}
                    >
                      <Icon
                        name="add"
                        size={14}
                        color={algo.tip === 1 ? '#FFFFFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.segmentButtonText,
                          algo.tip === 1 && styles.segmentButtonTextActive,
                        ]}
                      >
                        Sabit
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Value Input */}
                <View style={styles.valueRow}>
                  <Text style={styles.valueLabel}>
                    {algo.tip === 0 ? 'Yüzde Değeri (%)' : 'Sabit Değer'}
                  </Text>
                  <View style={styles.valueInputWrapper}>
                    <View style={[styles.valueInputIcon, { backgroundColor: config.color + '15' }]}>
                      <Icon
                        name={algo.tip === 0 ? 'trending-up' : 'add'}
                        size={14}
                        color={config.color}
                      />
                    </View>
                    <TextInput
                      style={styles.valueInput}
                      value={algo.deger}
                      onChangeText={(text) => handleDegerChange(config.key, text)}
                      keyboardType="numbers-and-punctuation"
                      placeholder="0"
                      placeholderTextColor={colors.placeholder}
                    />
                    <Text style={[styles.valueUnit, { color: config.color }]}>
                      {algo.tip === 0 ? '%' : '₺'}
                    </Text>
                  </View>
                </View>

                {/* Preview */}
                <View style={[styles.previewCard, { backgroundColor: config.color + '08', borderColor: config.color + '20' }]}>
                  <Icon name="eye-outline" size={14} color={config.color} />
                  <Text style={[styles.previewText, { color: config.color }]}>
                    {getPreviewText(algo)}
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </BottomSheet>
  );
}

// ─── Styles ──────────────────────────────────────────────

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    // Info Card
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    infoContent: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    infoDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    // Price Card
    priceCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    cardIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    cardHeaderText: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    cardDesc: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    // Segment
    segmentRow: {
      marginBottom: 12,
    },
    segmentLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    segmentControl: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      padding: 3,
    },
    segmentButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 6,
      gap: 5,
    },
    segmentButtonActive: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    segmentButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentButtonTextActive: {
      color: '#FFFFFF',
    },
    // Value Input
    valueRow: {
      marginBottom: 12,
    },
    valueLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    valueInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
    },
    valueInputIcon: {
      width: 26,
      height: 26,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    valueInput: {
      flex: 1,
      height: 42,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    valueUnit: {
      fontSize: 15,
      fontWeight: '700',
      marginLeft: 6,
    },
    // Preview
    previewCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 8,
      padding: 10,
      gap: 6,
      borderWidth: 1,
    },
    previewText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '500',
      lineHeight: 15,
    },
  });
