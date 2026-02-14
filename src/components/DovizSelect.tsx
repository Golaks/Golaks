import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ViewStyle, ActivityIndicator, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import BottomSheet from './BottomSheet';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DovizTipi {
  kod: string;
  ad: string;
}

interface DovizSelectProps {
  value: string;
  onChange: (dovizKodu: string) => void;
  label?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

// Module-level cache
let cachedDovizler: DovizTipi[] | null = null;

const DOVIZ_ICONS: Record<string, { icon: string; color: string }> = {
  TL: { icon: 'cash-outline', color: '#EF4444' },
  USD: { icon: 'logo-usd', color: '#10B981' },
  EUR: { icon: 'logo-euro', color: '#3B82F6' },
  GBP: { icon: 'cash-outline', color: '#8B5CF6' },
};

const getIconInfo = (kod: string) => DOVIZ_ICONS[kod] || { icon: 'cash-outline', color: '#F59E0B' };

export default function DovizSelect({
  value,
  onChange,
  label = 'Döviz',
  required = false,
  containerStyle,
}: DovizSelectProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [dovizler, setDovizler] = useState<DovizTipi[]>(cachedDovizler || []);
  const [loading, setLoading] = useState(!cachedDovizler);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    if (!cachedDovizler) {
      fetchDovizTipleri();
    }
  }, []);

  const fetchDovizTipleri = async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;

      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
      const response = await fetch(API_ENDPOINTS.ACCOUNT_DOVIZ_TIPLERI, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataName }),
      });

      const data = await response.json();
      if (data.success && data.data?.dovizler) {
        cachedDovizler = data.data.dovizler;
        setDovizler(data.data.dovizler);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const selectedDoviz = dovizler.find(d => d.kod === value);
  const selectedIcon = getIconInfo(value);

  if (loading) {
    return (
      <View style={containerStyle}>
        {label && (
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
            {label}{required ? ' *' : ''}
          </Text>
        )}
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const sheetHeight = Math.min(dovizler.length * 62 + 140, SCREEN_HEIGHT * 0.5);

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
          {label}{required ? ' *' : ''}
        </Text>
      )}

      {/* Trigger Button */}
      <Pressable
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          backgroundColor: pressed ? colors.border : colors.card,
          borderColor: colors.border,
        })}
        onPress={() => setShowSheet(true)}
      >
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: selectedIcon.color + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}>
          <Icon name={selectedIcon.icon} size={18} color={selectedIcon.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
            {value || 'Seçiniz'}
          </Text>
          {selectedDoviz?.ad && (
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
              {selectedDoviz.ad}
            </Text>
          )}
        </View>
        <Icon name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      {/* Selection Bottom Sheet */}
      <BottomSheet
        visible={showSheet}
        title="Döviz Seçimi"
        icon="cash-outline"
        iconColor="#F59E0B"
        onClose={() => setShowSheet(false)}
        showFooter={false}
        height={sheetHeight}
      >
        {dovizler.map((doviz) => {
          const isSelected = value === doviz.kod;
          const iconInfo = getIconInfo(doviz.kod);
          return (
            <Pressable
              key={doviz.kod}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: isSelected ? iconInfo.color + '10' : pressed ? colors.border : colors.card,
                borderColor: isSelected ? iconInfo.color + '40' : colors.border,
                marginBottom: 8,
              })}
              onPress={() => {
                onChange(doviz.kod);
                setShowSheet(false);
              }}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: iconInfo.color + '15',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Icon name={iconInfo.icon} size={20} color={iconInfo.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{doviz.kod}</Text>
                {doviz.ad && (
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{doviz.ad}</Text>
                )}
              </View>
              {isSelected && (
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: iconInfo.color,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

/** Cache'i temizlemek için (örn. firma değişikliğinde) */
export function clearDovizCache() {
  cachedDovizler = null;
}
