import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import Tab, { TabOption } from '../components/Tab';
import Input from '../components/Input';
import BarcodeScanner from '../components/BarcodeScanner';

type ScanMode = 'barcode' | 'model';

const SCAN_TABS: TabOption<ScanMode>[] = [
  { id: 'barcode', label: 'Barkod', icon: 'barcode-outline' },
  { id: 'model', label: 'Model', icon: 'shirt-outline' },
];

interface QRScanScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  onBarcodeQuery?: (barcode: string, queryType: 'barcode' | 'model') => void;
}

export default function QRScanScreen({ onTabChange, onLogout, onBarcodeQuery }: QRScanScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('qrScan');
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Pulse animation for scan icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (scanMode === 'barcode') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [scanMode]);

  const styles = createStyles(colors, isDark);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleModeChange = (mode: ScanMode) => {
    if (mode === scanMode) return;
    setScanMode(mode);
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleScanPress = () => {
    setScannerVisible(true);
  };

  const handleBarcodeScanned = (barcode: string) => {
    setInputValue(barcode);
    setScannerVisible(false);
    // Modal kapanmasını bekle, sonra navigasyon yap
    setTimeout(() => {
      handleQuery(barcode);
    }, 400);
  };

  const handleQuickNumber = (prefix: string) => {
    if (inputValue.trim().length === 0) return;

    const totalLength = 12;
    const zerosNeeded = totalLength - prefix.length - inputValue.length;

    if (zerosNeeded >= 0) {
      const completedBarcode = prefix + '0'.repeat(zerosNeeded) + inputValue;
      setInputValue(completedBarcode);
      handleQuery(completedBarcode);
    }
  };

  const handleQuery = (value?: string) => {
    const queryValue = value || inputValue;
    if (!queryValue.trim()) return;
    if (onBarcodeQuery) {
      onBarcodeQuery(queryValue, scanMode);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
    }
  };

  const quickNumbers = ['7', '8', '9', '38'];

  const modeColor = scanMode === 'barcode' ? '#3B82F6' : '#10B981';
  const isQueryDisabled = scanMode === 'barcode'
    ? inputValue.length !== 12
    : !inputValue.trim();
  const barcodeProgress = scanMode === 'barcode' ? inputValue.length / 12 : 0;

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Tarama & Sorgulama"
          showMenu={true}
          onLogout={handleLogout}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Page Title */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: modeColor + '15' }]}>
                <Icon name="scan" size={18} color={modeColor} />
              </View>
              <Text style={styles.pageTitle}>Tarama</Text>
            </View>
          </View>

          {/* Mode Selector */}
          <Tab
            options={SCAN_TABS}
            activeTab={scanMode}
            onTabChange={handleModeChange}
          />

          {/* Scan Hero Card */}
          <View style={[styles.heroCard, { borderColor: modeColor + '25' }]}>
            {/* Scan Icon with Pulse */}
            <Animated.View style={[
              styles.heroIconOuter,
              { backgroundColor: modeColor + '08', transform: [{ scale: pulseAnim }] },
            ]}>
              <View style={[styles.heroIconInner, { backgroundColor: modeColor + '15' }]}>
                <Icon
                  name={scanMode === 'barcode' ? 'scan-outline' : 'shirt-outline'}
                  size={32}
                  color={modeColor}
                />
              </View>
            </Animated.View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {scanMode === 'barcode' ? 'Barkod & QR Tarama' : 'Model Sorgulama'}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              {scanMode === 'barcode'
                ? 'Kamera ile tarayın veya manuel olarak girin'
                : 'Model adını girerek sorgulayın'}
            </Text>

            {/* Camera Button */}
            <Pressable
              style={({ pressed }) => [
                styles.cameraButton,
                { backgroundColor: modeColor },
                scanMode === 'model' && styles.cameraButtonDisabled,
                pressed && scanMode !== 'model' && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleScanPress}
              disabled={scanMode === 'model'}
            >
              <View style={styles.cameraButtonIconWrap}>
                <Icon name="camera" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.cameraButtonText}>Kamerayı Aç</Text>
              <Icon name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>

            {/* Supported Formats */}
            {scanMode === 'barcode' && (
              <View style={styles.formatsRow}>
                {['QR', 'EAN-13', 'Code-128', 'UPC'].map((fmt) => (
                  <View key={fmt} style={[styles.formatChip, { backgroundColor: modeColor + '10' }]}>
                    <Text style={[styles.formatChipText, { color: modeColor }]}>{fmt}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Manual Input Section */}
          <View style={styles.inputCard}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: modeColor + '15' }]}>
                <Icon name={scanMode === 'barcode' ? 'keypad-outline' : 'search-outline'} size={16} color={modeColor} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {scanMode === 'barcode' ? 'Barkod Giriş' : 'Model Ara'}
              </Text>
            </View>

            <Input
              label={scanMode === 'barcode' ? 'Barkod' : 'Model Adı'}
              icon={scanMode === 'barcode' ? 'barcode-outline' : 'shirt-outline'}
              value={inputValue}
              onChangeText={(text) => {
                if (scanMode === 'barcode') {
                  const numericOnly = text.replace(/[^0-9]/g, '');
                  setInputValue(numericOnly);
                  if (numericOnly.length === 12) {
                    handleQuery(numericOnly);
                  }
                } else {
                  setInputValue(text);
                  if (scanMode === 'model' && text.length >= 2) {
                    setShowSuggestions(true);
                  } else {
                    setShowSuggestions(false);
                  }
                }
              }}
              placeholder={scanMode === 'barcode' ? '12 haneli barkod girin' : 'Model adı ara...'}
              keyboardType={scanMode === 'barcode' ? 'number-pad' : 'default'}
              maxLength={scanMode === 'barcode' ? 12 : undefined}
              clearable
              onClear={() => setInputValue('')}
              containerStyle={{ marginBottom: 0 }}
            />

            {/* Progress Bar for Barcode */}
            {scanMode === 'barcode' && (
              <View style={styles.progressSection}>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${barcodeProgress * 100}%`,
                      backgroundColor: inputValue.length === 12 ? '#10B981' : modeColor,
                    },
                  ]} />
                </View>
                <Text style={[
                  styles.progressText,
                  { color: inputValue.length === 12 ? '#10B981' : colors.textSecondary },
                ]}>
                  {inputValue.length === 12 ? (
                    'Hazır'
                  ) : (
                    `${inputValue.length}/12`
                  )}
                </Text>
              </View>
            )}

            {/* Quick Number Chips for Barcode */}
            {scanMode === 'barcode' && (
              <View style={styles.quickSection}>
                <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>Hızlı Tamamla</Text>
                <View style={styles.quickChipsRow}>
                  {quickNumbers.map((num) => {
                    const disabled = inputValue.trim().length === 0;
                    return (
                      <Pressable
                        key={num}
                        style={({ pressed }) => [
                          styles.quickChip,
                          {
                            backgroundColor: disabled ? colors.border + '60' : modeColor + '12',
                            borderColor: disabled ? colors.border : modeColor + '30',
                          },
                          pressed && !disabled && { backgroundColor: modeColor + '25' },
                        ]}
                        onPress={() => handleQuickNumber(num)}
                        disabled={disabled}
                      >
                        <Text style={[
                          styles.quickChipText,
                          { color: disabled ? colors.textSecondary : modeColor },
                        ]}>
                          {num}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Query Button */}
            <Pressable
              style={({ pressed }) => [
                styles.queryButton,
                {
                  backgroundColor: isQueryDisabled ? colors.border : modeColor,
                  opacity: isQueryDisabled ? 0.5 : pressed ? 0.85 : 1,
                },
                pressed && !isQueryDisabled && { transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => handleQuery()}
              disabled={isQueryDisabled}
            >
              <Icon name="search" size={20} color="#FFFFFF" />
              <Text style={styles.queryButtonText}>Sorgula</Text>
            </Pressable>
          </View>

          {/* Tips Card */}
          <View style={[styles.tipsCard, { borderColor: colors.border }]}>
            <View style={styles.tipsHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#F59E0B15' }]}>
                <Icon name="bulb-outline" size={16} color="#F59E0B" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>İpuçları</Text>
            </View>
            <View style={styles.tipsContent}>
              {(scanMode === 'barcode' ? [
                { icon: 'sunny-outline', text: 'İyi aydınlatılmış ortamda tarayın' },
                { icon: 'hand-left-outline', text: 'Barkodu sabit tutun, odaklansın' },
                { icon: 'keypad-outline', text: 'Hızlı tamamla ile prefix ekleyin' },
              ] : [
                { icon: 'search-outline', text: 'Model adının bir kısmını yazarak arayın' },
                { icon: 'text-outline', text: 'Büyük/küçük harf duyarlı değildir' },
                { icon: 'pricetag-outline', text: 'Sonuçlarda fiyat ve stok bilgisi görüntülenir' },
              ]).map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Icon name={tip.icon} size={14} color={colors.textSecondary} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Barcode Scanner Modal */}
        <BarcodeScanner
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onBarcodeScanned={handleBarcodeScanned}
          title="Barkod Tara"
        />

        {/* Bottom TabBar */}
        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />
      </View>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 120,
    },

    // Page Header
    pageHeader: {
      marginBottom: 16,
    },
    pageTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    pageTitleIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.6,
    },

    // Hero Card
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      padding: 24,
      alignItems: 'center',
      marginBottom: 16,
    },
    heroIconOuter: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    heroIconInner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
    },
    heroSubtitle: {
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 18,
    },

    // Camera Button
    cameraButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
      gap: 10,
      width: '100%',
    },
    cameraButtonDisabled: {
      opacity: 0.35,
    },
    cameraButtonIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraButtonText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Format Chips
    formatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 16,
      justifyContent: 'center',
    },
    formatChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    formatChipText: {
      fontSize: 11,
      fontWeight: '600',
    },

    // Input Card
    inputCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 16,
    },

    // Section Header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    sectionIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
    },

    // Progress Bar
    progressSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 10,
    },
    progressTrack: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
    progressText: {
      fontSize: 12,
      fontWeight: '700',
      minWidth: 32,
      textAlign: 'right',
    },

    // Quick Numbers
    quickSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quickLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 10,
    },
    quickChipsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    quickChip: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    quickChipText: {
      fontSize: 16,
      fontWeight: '800',
    },

    // Query Button
    queryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: 16,
    },
    queryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Tips Card
    tipsCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      padding: 18,
      marginBottom: 16,
    },
    tipsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    tipsContent: {
      gap: 10,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    tipText: {
      fontSize: 13,
      flex: 1,
    },
  });
