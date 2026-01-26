import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import Button from '../components/Button';
import Input from '../components/Input';

const { width } = Dimensions.get('window');

type ScanMode = 'barcode' | 'model';

interface QRScanScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function QRScanScreen({ onTabChange, onLogout }: QRScanScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('qrScan');
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Animation values
  const modeSlideAnim = useRef(new Animated.Value(0)).current;

  const styles = createStyles(colors, isDark);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
    console.log('Active tab:', tab);
  };

  const handleModeChange = (mode: ScanMode) => {
    if (mode === scanMode) return;

    setScanMode(mode);
    setInputValue('');

    // Animate mode change
    Animated.spring(modeSlideAnim, {
      toValue: mode === 'barcode' ? 0 : 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleScanPress = () => {
    console.log('Open camera scanner');
    // TODO: Implement camera scanner
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
    console.log(`Query ${scanMode}:`, queryValue);
    // TODO: Implement query logic
  };

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const quickNumbers = ['7', '8', '9', '38'];

  const getScanModeInfo = () => {
    switch (scanMode) {
      case 'barcode':
        return {
          icon: 'qr-code-outline',
          title: 'Barkod & QR Tarama',
          subtitle: 'Barkod veya QR kod okutun, 12 haneli kod girin',
          placeholder: '12 haneli barkod',
          inputLabel: 'Barkod',
          color: '#3B82F6',
        };
      case 'model':
        return {
          icon: 'shirt-outline',
          title: 'Model Sorgulama',
          subtitle: 'Kamera tarama model için kullanılamaz',
          placeholder: 'Model kodu ara...',
          inputLabel: 'Model',
          color: '#10B981',
        };
    }
  };

  const modeInfo = getScanModeInfo();
  const isQueryDisabled = scanMode === 'barcode'
    ? inputValue.length !== 12
    : !inputValue.trim();

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {/* Header */}
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
          {/* Mode Selector Tabs */}
          <View style={styles.modeSelectorContainer}>
            <Pressable
              style={[
                styles.modeTab,
                scanMode === 'barcode' && [styles.modeTabActive, { backgroundColor: '#3B82F6' }],
              ]}
              onPress={() => handleModeChange('barcode')}
            >
              <Icon
                name="qr-code"
                size={18}
                color={scanMode === 'barcode' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text style={[
                styles.modeTabText,
                { color: scanMode === 'barcode' ? '#FFFFFF' : colors.textSecondary }
              ]}>
                Barkod
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modeTab,
                scanMode === 'model' && [styles.modeTabActive, { backgroundColor: '#10B981' }],
              ]}
              onPress={() => handleModeChange('model')}
            >
              <Icon
                name="shirt"
                size={18}
                color={scanMode === 'model' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text style={[
                styles.modeTabText,
                { color: scanMode === 'model' ? '#FFFFFF' : colors.textSecondary }
              ]}>
                Model
              </Text>
            </Pressable>
          </View>

          {/* Scan Area - Always visible */}
          <View style={[
            styles.scanAreaContainer,
            { backgroundColor: modeInfo.color + '15' },
            scanMode === 'model' && styles.scanAreaDisabled
          ]}>
            <Icon name={modeInfo.icon} size={48} color={modeInfo.color} style={scanMode === 'model' && { opacity: 0.5 }} />
            <Text style={[styles.scanAreaTitle, scanMode === 'model' && { opacity: 0.5 }]}>
              {modeInfo.title}
            </Text>
            <Text style={[styles.scanAreaSubtitle, { color: colors.textSecondary }, scanMode === 'model' && { opacity: 0.5 }]}>
              {modeInfo.subtitle}
            </Text>

            {/* Camera Scan Button */}
            <Button
              text="Kamerayı Aç"
              icon="camera"
              onPress={handleScanPress}
              fullWidth={false}
              disabled={scanMode === 'model'}
              style={{ backgroundColor: modeInfo.color }}
            />
          </View>

          {/* Input Section */}
          <View style={styles.inputContainer}>
            <Input
              label={modeInfo.inputLabel}
              icon={modeInfo.icon}
              value={inputValue}
              onChangeText={(text) => {
                if (scanMode === 'barcode') {
                  const numericOnly = text.replace(/[^0-9]/g, '');
                  setInputValue(numericOnly);
                } else {
                  setInputValue(text);
                  if (scanMode === 'model' && text.length >= 2) {
                    setShowSuggestions(true);
                  } else {
                    setShowSuggestions(false);
                  }
                }
              }}
              placeholder={modeInfo.placeholder}
              keyboardType={scanMode === 'barcode' ? 'number-pad' : 'default'}
              maxLength={scanMode === 'barcode' ? 12 : undefined}
              clearable
              onClear={() => setInputValue('')}
              containerStyle={{ marginBottom: 0 }}
            />

            {/* Character Counter for Barcode */}
            {scanMode === 'barcode' && (
              <View style={styles.characterCounter}>
                <Text style={[
                  styles.characterCounterText,
                  { color: inputValue.length === 12 ? '#10B981' : colors.textSecondary }
                ]}>
                  {inputValue.length} / 12 karakter
                </Text>
              </View>
            )}

            {/* Quick Numbers for Barcode */}
            {scanMode === 'barcode' && (
              <View style={styles.quickNumbersSection}>
                <View style={styles.quickNumbersRow}>
                  {quickNumbers.map((num) => (
                    <Button
                      key={num}
                      text={num}
                      onPress={() => handleQuickNumber(num)}
                      disabled={inputValue.trim().length === 0}
                      style={[
                        styles.quickNumberButton,
                        { backgroundColor: modeInfo.color }
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Query Button */}
            <Button
              text="Sorgula"
              icon="search"
              onPress={() => handleQuery()}
              disabled={isQueryDisabled}
              style={[
                !isQueryDisabled ? { backgroundColor: modeInfo.color } : undefined,
                scanMode === 'model' && { marginTop: 16 }
              ]}
            />
          </View>

        </ScrollView>

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
    // Mode Selector
    modeSelectorContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
      backgroundColor: colors.card,
      padding: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    modeTabActive: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    modeTabText: {
      fontSize: 13,
      fontWeight: '600',
    },
    // Scan Area
    scanAreaContainer: {
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
    },
    scanAreaDisabled: {
      opacity: 0.6,
    },
    scanAreaTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
      marginBottom: 4,
    },
    scanAreaSubtitle: {
      fontSize: 14,
      marginBottom: 20,
      textAlign: 'center',
    },
    // Input Section
    inputContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    characterCounter: {
      alignItems: 'flex-end',
      marginTop: 8,
    },
    characterCounterText: {
      fontSize: 12,
      fontWeight: '600',
    },
    // Quick Numbers
    quickNumbersSection: {
      marginTop: 16,
      marginBottom: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quickNumbersRow: {
      flexDirection: 'row',
      gap: 8,
    },
    quickNumberButton: {
      flex: 1,
    },
  });
