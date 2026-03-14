import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import XButton from './XButton';
import BarcodeScanner from './BarcodeScanner';

export interface VaryantData {
  id: number;
  barkod: string;
  varyantKodu: string;
  varyantAdi: string;
  stokGrupKodu: string;
  renkAdi: string;
  beden: string;
  stokKodu: string;
  stokAdi: string;
  birim: string;
  miktar1Kalan: number;
  satisFiyat: number;
  satisDoviz: string;
}

interface VaryantSelectInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  displayValue?: string;
  onSelect: (varyantId: string, varyant: VaryantData | null) => void;
  stokGrupKodu?: string;
  containerStyle?: any;
  error?: boolean;
}

export default function VaryantSelectInput({
  label = 'Varyant',
  placeholder = 'Varyant seçiniz...',
  value,
  displayValue,
  onSelect,
  stokGrupKodu,
  containerStyle,
  error = false,
}: VaryantSelectInputProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors, isDark);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<VaryantData[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerVisibleModal, setScannerVisibleModal] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVaryantlar = useCallback(
    async (searchText: string) => {
      try {
        const token = await authService.getToken();
        if (!token) return [];
        const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
        if (!dataName) return [];

        setLoading(true);
        const res = await fetch(API_ENDPOINTS.STOCK_VARYANT_SEARCH, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            dataName,
            search: searchText,
            stokGrupKodu: stokGrupKodu || undefined,
          }),
        });
        const data = await res.json();
        setLoading(false);

        if (res.ok && data.data) {
          const items: VaryantData[] = Array.isArray(data.data)
            ? data.data
            : data.data.varyantlar || [];
          setResults(items);
          return items;
        }
        setResults([]);
        return [];
      } catch {
        setLoading(false);
        setResults([]);
        return [];
      }
    },
    [user, stokGrupKodu],
  );

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchVaryantlar(text);
    }, 300);
  };

  const handleSelect = (item: VaryantData) => {
    onSelect(String(item.id), item);
    setOpen(false);
    setSearch('');
    setResults([]);
  };

  const handleClear = () => {
    onSelect('', null);
  };

  const handleOpen = () => {
    setOpen(true);
    setSearch('');
    setResults([]);
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
    setResults([]);
  };

  // Barcode scan from input row
  const handleBarcodeFromInput = async (barcode: string) => {
    setScannerVisible(false);
    // Open modal with barcode as search
    setOpen(true);
    setSearch(barcode);
    const items = await fetchVaryantlar(barcode);
    if (items.length === 1) {
      handleSelect(items[0]);
    }
  };

  // Barcode scan from modal search row
  const handleBarcodeFromModal = async (barcode: string) => {
    setScannerVisibleModal(false);
    setSearch(barcode);
    const items = await fetchVaryantlar(barcode);
    if (items.length === 1) {
      handleSelect(items[0]);
    }
  };

  const hasValue = !!value;

  return (
    <>
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={styles.label}>{label}</Text>
        )}
        <View style={styles.inputRow}>
          {/* Input field */}
          <Pressable
            style={[styles.inputWrapper, error && { borderColor: colors.danger }]}
            onPress={handleOpen}
          >
            <Icon name="cube-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <Text
              style={[styles.inputText, !hasValue && styles.placeholderText]}
              numberOfLines={1}
            >
              {hasValue ? (displayValue || value) : placeholder}
            </Text>
            {hasValue && (
              <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
                <Icon name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
            <Icon name="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>

          {/* Camera button */}
          <Pressable
            style={[
              styles.scanBtn,
              {
                backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setScannerVisible(true)}
          >
            <View style={[styles.scanIconCircle, { backgroundColor: colors.primary }]}>
              <Icon name="camera-outline" size={22} color="#fff" />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Barcode scanner from input row */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onBarcodeScanned={handleBarcodeFromInput}
        title="Barkod Tara"
      />

      {/* Barcode scanner from modal */}
      <BarcodeScanner
        visible={scannerVisibleModal}
        onClose={() => setScannerVisibleModal(false)}
        onBarcodeScanned={handleBarcodeFromModal}
        title="Barkod Tara"
      />

      {/* Selection Modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleClose} />
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconWrapper}>
                  <Icon name="cube-outline" size={16} color={colors.primary} />
                </View>
                <Text style={styles.modalTitle}>Varyant Seç</Text>
              </View>
              <XButton onPress={handleClose} size={36} iconSize={20} />
            </View>

            {/* Search Row */}
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrapper}>
                <Icon name="search-outline" size={15} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={handleSearchChange}
                  placeholder="Varyant, barkod veya stok ara..."
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                {search.length > 0 && (
                  <Pressable onPress={() => handleSearchChange('')} hitSlop={8}>
                    <Icon name="close-circle" size={15} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
              <Pressable
                style={[
                  styles.modalScanBtn,
                  { backgroundColor: colors.primary + '14' },
                ]}
                onPress={() => setScannerVisibleModal(true)}
              >
                <Icon name="barcode-outline" size={18} color={colors.primary} />
              </Pressable>
            </View>

            {/* Loading */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}

            {/* Results List */}
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {!loading && results.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon
                    name="file-tray-outline"
                    size={32}
                    color={colors.textSecondary + '60'}
                  />
                  <Text style={styles.emptyText}>
                    {search.trim()
                      ? 'Sonuç bulunamadı'
                      : 'Arama yaparak varyant bulun'}
                  </Text>
                </View>
              ) : (
                results.map((item) => {
                  const isSelected = String(item.id) === value;
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.card, isSelected && styles.cardSelected]}
                      onPress={() => handleSelect(item)}
                    >
                      <View style={styles.cardLeft}>
                        {/* Line 1: varyantAdi */}
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.varyantAdi}
                        </Text>

                        {/* Line 2: stokKodu + stokAdi */}
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {item.stokKodu}
                          {item.stokAdi ? ` \u00B7 ${item.stokAdi}` : ''}
                        </Text>

                        {/* Line 3: barkod, beden badge, renkAdi badge */}
                        <View style={styles.cardBadgeRow}>
                          {!!item.barkod && (
                            <Text style={styles.cardBarcode} numberOfLines={1}>
                              {item.barkod}
                            </Text>
                          )}
                          {!!item.beden && (
                            <View
                              style={[
                                styles.badge,
                                { backgroundColor: colors.primary + '18' },
                              ]}
                            >
                              <Text
                                style={[styles.badgeText, { color: colors.primary }]}
                              >
                                {item.beden}
                              </Text>
                            </View>
                          )}
                          {!!item.renkAdi && (
                            <View
                              style={[
                                styles.badge,
                                { backgroundColor: colors.purple + '18' },
                              ]}
                            >
                              <Text
                                style={[styles.badgeText, { color: colors.purple }]}
                              >
                                {item.renkAdi}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Right side: miktar + fiyat */}
                      <View style={styles.cardRight}>
                        <Text style={styles.cardQuantity}>
                          {item.miktar1Kalan}{' '}
                          <Text style={styles.cardUnit}>{item.birim}</Text>
                        </Text>
                        <Text style={styles.cardPrice}>
                          {item.satisFiyat?.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          {item.satisDoviz}
                        </Text>
                        {isSelected && (
                          <Icon
                            name="checkmark-circle"
                            size={18}
                            color={colors.primary}
                            style={{ marginTop: 4 }}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.inputLabel,
      marginBottom: 4,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
    },
    icon: {
      marginRight: 10,
    },
    inputText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    placeholderText: {
      color: colors.placeholder,
    },
    clearBtn: {
      padding: 4,
      marginRight: 4,
    },
    // Camera button (same as BarcodeScanInput)
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
    // ─── Modal ───────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
      width: '92%',
      maxWidth: 420,
      maxHeight: '75%',
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? colors.border : 'transparent',
    },
    // Header
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    modalIconWrapper: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    // Search
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 8,
    },
    searchInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.background : '#F1F5F9',
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 38,
      gap: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      paddingVertical: 0,
    },
    modalScanBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Loading
    loadingContainer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    // ─── List ────────────────────────────────────────────────
    list: {
      maxHeight: 400,
    },
    // ─── Card ────────────────────────────────────────────────
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    cardSelected: {
      backgroundColor: isDark ? colors.primary + '15' : '#EFF6FF',
    },
    cardLeft: {
      flex: 1,
      marginRight: 12,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    cardBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    cardBarcode: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: colors.textTertiary,
    },
    badge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    cardRight: {
      alignItems: 'flex-end',
    },
    cardQuantity: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    cardUnit: {
      fontSize: 11,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    cardPrice: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.success,
      marginTop: 2,
    },
    // ─── Empty ───────────────────────────────────────────────
    emptyContainer: {
      paddingVertical: 32,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
  });
