import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  Pressable,
  Platform,
  Animated,
  Image,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => void;
  title?: string;
}

export default function BarcodeScanner({
  visible,
  onClose,
  onBarcodeScanned,
  title = 'Barkod Tara',
}: BarcodeScannerProps) {
  const { colors } = useTheme();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const { height: screenHeight } = Dimensions.get('window');
  const headerHeight = Platform.OS === 'ios' ? 90 : 56;
  const scanRowHeight = 280;
  const topSpace = Math.max(0, (screenHeight / 2) - (scanRowHeight / 2) - headerHeight);
  const bottomSpace = Math.max(0, screenHeight - headerHeight - scanRowHeight - topSpace);

  const styles = createStyles(colors, topSpace, bottomSpace);

  // Visibility effect - exactly like GolaksMobile
  useEffect(() => {
    if (visible) {
      setIsActive(true);
      setScanned(false);
      startScanAnimation();
    } else {
      setIsActive(false);
      setTorchOn(false);
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      scanLineAnim.setValue(0);
    }
  }, [visible]);

  const startScanAnimation = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    scanLineAnim.setValue(0);
    animationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    animationRef.current.start();
  };

  const handleClose = () => {
    setScanned(false);
    setTorchOn(false);
    setIsActive(false);
    onClose();
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      Linking.openSettings();
    }
  };

  // Code scanner - exactly like GolaksMobile
  const codeScanner = useCodeScanner({
    codeTypes: [
      'qr',
      'ean-13',
      'ean-8',
      'code-128',
      'code-39',
      'code-93',
      'codabar',
      'itf',
      'upc-a',
      'upc-e',
    ],
    onCodeScanned: useCallback((codes: any[]) => {
      if (scanned || codes.length === 0) return;

      const code = codes[0];
      if (code.value) {
        setScanned(true);
        onBarcodeScanned(code.value);
        setTimeout(() => setScanned(false), 2000);
      }
    }, [scanned, onBarcodeScanned]),
  });

  // No permission - show permission UI inside Modal (no separate PermissionModal)
  if (!hasPermission) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconWrap}>
            <Icon name="camera-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permissionMessage}>
            Barkod taramak için kamera erişimine ihtiyacımız var.
          </Text>
          <Pressable style={[styles.permissionButton, { backgroundColor: colors.primary }]} onPress={handleRequestPermission}>
            <Icon name="shield-checkmark-outline" size={20} color="#FFFFFF" />
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </Pressable>
          <Pressable style={styles.permissionCloseButton} onPress={handleClose}>
            <Icon name="close-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.permissionCloseText, { color: colors.textSecondary }]}>Kapat</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  // No device - show loading inside Modal
  if (!device) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.permissionMessage, { marginTop: 16 }]}>
            Kamera başlatılıyor...
          </Text>
        </View>
      </Modal>
    );
  }

  // Camera ready - show scanner
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Full screen camera - like GolaksMobile */}
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isActive && visible}
          codeScanner={codeScanner}
          torch={torchOn ? 'on' : 'off'}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => setTorchOn(!torchOn)} style={styles.torchButton}>
              <Icon
                name={torchOn ? "flash" : "flash-off"}
                size={24}
                color={torchOn ? colors.primary : "#FFFFFF"}
              />
            </Pressable>
          </View>

          <Text style={styles.headerTitle}>{title}</Text>

          <View style={styles.headerRight}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Overlay */}
        <View style={styles.scanArea}>
          {/* Dark overlay top */}
          <View style={styles.overlayTop}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/golaks-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Middle row: dark left - scan frame - dark right */}
          <View style={styles.scanRow}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrame}>
              {/* Corner brackets */}
              <View style={[styles.cornerBracket, { top: -6, left: -6, borderTopWidth: 6, borderLeftWidth: 6, borderTopLeftRadius: 12 }]} />
              <View style={[styles.cornerBracket, { top: -6, right: -6, borderTopWidth: 6, borderRightWidth: 6, borderTopRightRadius: 12 }]} />
              <View style={[styles.cornerBracket, { bottom: -6, left: -6, borderBottomWidth: 6, borderLeftWidth: 6, borderBottomLeftRadius: 12 }]} />
              <View style={[styles.cornerBracket, { bottom: -6, right: -6, borderBottomWidth: 6, borderRightWidth: 6, borderBottomRightRadius: 12 }]} />
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 268],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
            <View style={styles.overlaySide} />
          </View>

          {/* Dark overlay bottom + Instructions */}
          <View style={styles.overlayBottom}>
            <View style={styles.instructionsContainer}>
              <View style={styles.instructionsBadge}>
                <Icon name="scan-outline" size={20} color="#FFFFFF" />
                <Text style={styles.instructionsText}>
                  Barkodu kare içine yerleştirin
                </Text>
              </View>

              <View style={styles.formatsCard}>
                <Text style={styles.formatsTitle}>Desteklenen Formatlar</Text>
                <Text style={styles.supportedFormats}>
                  QR • EAN-13 • EAN-8 • Code-128 • Code-39 • UPC
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, topSpace: number, bottomSpace: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    // Permission screen
    permissionContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    permissionIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    permissionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    permissionMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 16,
    },
    permissionButton: {
      marginTop: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
      width: '100%',
    },
    permissionButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    permissionCloseButton: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
    permissionCloseText: {
      fontSize: 15,
      fontWeight: '600',
    },
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 50 : 16,
      paddingBottom: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      flex: 1,
      alignItems: 'flex-end',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      flex: 2,
      textAlign: 'center',
    },
    torchButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    closeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    // Scan area
    scanArea: {
      flex: 1,
    },
    overlayTop: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 24,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      height: topSpace,
    },
    scanRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    overlaySide: {
      flex: 1,
      height: 280,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    overlayBottom: {
      height: bottomSpace,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    logoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 160,
      height: 65,
      opacity: 0.85,
    },
    scanFrame: {
      width: 280,
      height: 280,
      position: 'relative',
      overflow: 'visible',
      zIndex: 10,
    },
    cornerBracket: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderColor: colors.primary,
    },
    scanLine: {
      position: 'absolute',
      left: 8,
      right: 8,
      height: 3,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 8,
    },
    instructionsContainer: {
      alignItems: 'center',
      marginTop: 40,
    },
    instructionsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    instructionsText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
      lineHeight: 22,
    },
    formatsCard: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      marginTop: 16,
      alignItems: 'center',
    },
    formatsTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: 8,
    },
    supportedFormats: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.6)',
      textAlign: 'center',
      lineHeight: 18,
    },
  });
