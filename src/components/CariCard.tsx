import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import type { CariAccount } from '../services/account.service';

interface CariCardProps {
  cari: CariAccount;
  onPress?: () => void;
  expanded?: boolean;
  onToggle?: () => void;
  onLoadBalance?: () => void;
  isLoadingBalance?: boolean;
  showExpandIcon?: boolean;
}

export default function CariCard({ cari, onPress, expanded = false, onToggle, onLoadBalance, isLoadingBalance = false, showExpandIcon = true }: CariCardProps) {
  const { colors, isDark } = useTheme();
  const [animation] = useState(new Animated.Value(0));

  const styles = createStyles(colors, isDark);

  // Hesap koduna göre renk ve icon belirle
  const getAccountTypeInfo = (hesapKodu: string) => {
    if (hesapKodu.startsWith('120')) {
      return { color: '#3B82F6', icon: 'person-outline' }; // Müşteriler - Mavi
    } else if (hesapKodu.startsWith('320')) {
      return { color: '#8B5CF6', icon: 'business-outline' }; // Tedarikçiler - Mor
    } else if (hesapKodu.startsWith('100')) {
      return { color: '#10B981', icon: 'wallet-outline' }; // Kasalar - Yeşil
    } else if (hesapKodu.startsWith('102')) {
      return { color: '#F59E0B', icon: 'card-outline' }; // Bankalar - Turuncu
    } else if (hesapKodu.startsWith('335')) {
      return { color: '#EF4444', icon: 'people-outline' }; // Personeller - Kırmızı
    }
    return { color: colors.primary, icon: 'person-outline' }; // Varsayılan
  };

  const accountInfo = getAccountTypeInfo(cari.hesapKodu);

  const toggleExpanded = () => {
    if (onToggle) {
      onToggle();
    }
  };

  // Animation effect when expanded prop changes
  React.useEffect(() => {
    const toValue = expanded ? 1 : 0;
    Animated.timing(animation, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();

    // Load balance when expanded and not already loaded
    if (expanded && !cari.bakiyeler && onLoadBalance) {
      onLoadBalance();
    }
  }, [expanded]);

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={toggleExpanded}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: accountInfo.color + '15' }]}>
              <Icon name={accountInfo.icon} size={20} color={accountInfo.color} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.unvan, { color: colors.text }]} numberOfLines={1}>
                {cari.unvan}
              </Text>
              <Text style={[styles.hesapKodu, { color: colors.textSecondary }]}>
                {cari.hesapKodu} • {cari.sube}
              </Text>
            </View>
          </View>
          {showExpandIcon && (
            <View style={styles.headerRight}>
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
              </Animated.View>
            </View>
          )}
        </View>

        {/* Expanded Content */}
        {expanded && (
          <View style={[styles.details, { borderTopColor: colors.border }]}>
            {isLoadingBalance ? (
              <View style={styles.loadingContainer}>
                <LoadingSpinner size={20} color={accountInfo.color} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Bakiye yükleniyor...
                </Text>
              </View>
            ) : cari.bakiyeler && cari.bakiyeler.length > 0 ? (
              cari.bakiyeler.map((bakiye, index) => (
                <View key={index} style={styles.bakiyeRow}>
                  <View style={styles.bakiyeLeft}>
                    <View style={[
                      styles.dovizBadge,
                      { backgroundColor: accountInfo.color + '10' }
                    ]}>
                      <Text style={[styles.dovizText, { color: accountInfo.color }]}>
                        {bakiye.doviz}
                      </Text>
                    </View>
                    <Text style={[styles.bakiyeLabel, { color: colors.text }]}>
                      {bakiye.durum === 'AB' ? 'Alacak Bakiye' : 'Borç Bakiye'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.bakiyeAmount,
                    { color: bakiye.durum === 'AB' ? '#10B981' : '#EF4444' }
                  ]}>
                    {Math.abs(bakiye.bakiye).toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.noBakiye}>
                <Text style={[styles.noBakiyeText, { color: colors.textSecondary }]}>
                  Bakiye bulunamadı
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    card: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
    },
    unvan: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    hesapKodu: {
      fontSize: 13,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    bakiyeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    bakiyeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    details: {
      borderTopWidth: 1,
      padding: 16,
      gap: 12,
    },
    bakiyeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bakiyeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    dovizBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      minWidth: 40,
      alignItems: 'center',
    },
    dovizText: {
      fontSize: 12,
      fontWeight: '700',
    },
    bakiyeLabel: {
      fontSize: 14,
      fontWeight: '500',
    },
    bakiyeAmount: {
      fontSize: 16,
      fontWeight: '700',
    },
    noBakiye: {
      padding: 12,
      alignItems: 'center',
    },
    noBakiyeText: {
      fontSize: 14,
      fontStyle: 'italic',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 10,
    },
    loadingText: {
      fontSize: 13,
    },
  });
