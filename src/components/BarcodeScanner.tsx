import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  Pressable,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner, useCameraFormat } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import PermissionModal from './PermissionModal';

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
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const hasScanned = useRef(false);
  const openedAt = useRef(0);
  const onBarcodeScannedRef = useRef(onBarcodeScanned);
  const onCloseRef = useRef(onClose);
  onBarcodeScannedRef.current = onBarcodeScanned;
  onCloseRef.current = onClose;

  // Select optimal format for barcode scanning (Android only - iOS uses default)
  const format = useCameraFormat(
    Platform.OS === 'android' ? device : null,
    [
      { videoResolution: { width: 1920, height: 1080 } },
      { fps: 30 },
    ]
  );

  // Focus function - dokunulan noktaya veya merkeze odaklan
  const triggerFocus = async (point?: { x: number; y: number }) => {
    if (cameraRef.current && device?.supportsFocus && isCameraReady) {
      try {
        await cameraRef.current.focus(point || { x: 0.5, y: 0.5 });
      } catch (e) {
        // Focus failed, ignore
      }
    }
  };

  // Tap to focus - dokunulan noktaya odaklan
  const handleTapToFocus = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const { width, height } = event.nativeEvent.target ? event.nativeEvent : { width: 1, height: 1 };
    if (width > 0 && height > 0) {
      triggerFocus({ x: locationX / width, y: locationY / height });
    } else {
      triggerFocus();
    }
  };

  // Camera initialized callback
  const handleCameraInitialized = () => {
    setIsCameraReady(true);
    // İlk focus hemen, sonra 500ms sonra tekrar
    setTimeout(() => triggerFocus(), 200);
    setTimeout(() => triggerFocus(), 700);
  };

  // Auto focus interval - daha sık odaklanma
  useEffect(() => {
    let focusInterval: NodeJS.Timeout | null = null;

    if (isActive && isCameraReady && device?.supportsFocus) {
      focusInterval = setInterval(() => triggerFocus(), 1000);
    }

    return () => {
      if (focusInterval) {
        clearInterval(focusInterval);
      }
    };
  }, [isActive, isCameraReady, device]);

  // Reset camera ready state when modal closes
  useEffect(() => {
    if (!visible) {
      setIsCameraReady(false);
    }
  }, [visible]);

  const styles = createStyles(colors);

  useEffect(() => {
    if (visible) {
      hasScanned.current = false;
      openedAt.current = Date.now();
      checkCameraPermission();
      startScanAnimation();
    } else {
      // Stop animation and reset states
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      setIsActive(false);
      setShowPermissionModal(false);
      setTorchOn(false);
      setHasPermission(false);
      hasScanned.current = false;
      scanLineAnim.setValue(0);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [visible, scanLineAnim]);

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

  const checkCameraPermission = async () => {
    try {
      const cameraPermission = Camera.getCameraPermissionStatus();

      if (cameraPermission === 'granted') {
        setHasPermission(true);
        setIsActive(true);
        setShowPermissionModal(false);
      } else if (cameraPermission === 'not-determined') {
        // Durumu belirlenemedi, doğrudan izin iste
        const newPermission = await Camera.requestCameraPermission();
        setHasPermission(newPermission === 'granted');
        setIsActive(newPermission === 'granted');
        if (newPermission !== 'granted') {
          setShowPermissionModal(true);
        }
      } else {
        // denied veya restricted
        setHasPermission(false);
        setIsActive(false);
        setShowPermissionModal(true);
      }
    } catch (error) {
      // getCameraPermissionStatus hata fırlatırsa doğrudan izin iste
      try {
        const newPermission = await Camera.requestCameraPermission();
        setHasPermission(newPermission === 'granted');
        setIsActive(newPermission === 'granted');
        if (newPermission !== 'granted') {
          setShowPermissionModal(true);
        }
      } catch {
        setHasPermission(false);
        setShowPermissionModal(true);
      }
    }
  };

  const handleRequestPermission = async () => {
    setShowPermissionModal(false);
    const newPermission = await Camera.requestCameraPermission();
    setHasPermission(newPermission === 'granted');
    setIsActive(newPermission === 'granted');

    if (newPermission !== 'granted') {
      setShowPermissionModal(true);
    }
  };

  const handleCancelPermission = () => {
    setShowPermissionModal(false);
    onClose();
  };

  const toggleTorch = () => {
    setTorchOn(prev => !prev);
  };

  const handleCodeScanned = useRef((codes: any[]) => {
    // İlk 2 saniye taramayı yoksay (kamera stabilize olsun)
    if (Date.now() - openedAt.current < 2000) return;
    if (hasScanned.current) return;
    if (codes.length > 0 && codes[0].value) {
      hasScanned.current = true;
      const scannedValue = codes[0].value;
      // Önce kamerayı deaktive et, sonra callback ve close çağır
      setIsActive(false);
      setTimeout(() => {
        onBarcodeScannedRef.current(scannedValue);
        onCloseRef.current();
      }, 400);
    }
  }).current;

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
    onCodeScanned: handleCodeScanned,
  });

  return (
    <>
      <PermissionModal
        visible={visible && showPermissionModal}
        permissions={['camera']}
        onRequestPermissions={handleRequestPermission}
        onCancel={handleCancelPermission}
        title="Kamera İzni Gerekli"
        subtitle="Barkod taramak için kamera erişimine ihtiyacımız var."
      />

      <Modal
        visible={visible && !showPermissionModal}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable onPress={toggleTorch} style={styles.torchButton}>
                <Icon
                  name={torchOn ? "flash" : "flash-off"}
                  size={24}
                  color={torchOn ? colors.primary : "#FFFFFF"}
                />
              </Pressable>
            </View>

            <Text style={styles.headerTitle}>{title}</Text>

            <View style={styles.headerRight}>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Camera View - Full screen */}
          <Pressable style={styles.cameraContainer} onPress={handleTapToFocus}>
            {/* Full screen camera */}
            {hasPermission && device && (
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                codeScanner={codeScanner}
                torch={torchOn ? 'on' : 'off'}
                zoom={device.minZoom}
                {...(Platform.OS === 'android' ? { format, exposure: 0, videoStabilizationMode: 'off' as const } : {})}
                onInitialized={handleCameraInitialized}
                onError={(_e) => {}}
                enableZoomGesture={true}
              />
            )}

            {/* Overlay with scan frame cutout */}
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.overlayTop}>
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../assets/images/golaks-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                <View style={styles.scanFrameContainer}>
                  <View style={styles.scanFrame}>
                    {/* Corner brackets */}
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                    {/* Animated scan line */}
                    <Animated.View
                      style={[
                        styles.scanLine,
                        {
                          transform: [
                            {
                              translateY: scanLineAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 298],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.overlaySide} />
              </View>
              <View style={styles.overlayBottom} />
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <View style={styles.instructionsBadge}>
                <Icon name="scan-outline" size={20} color="#FFFFFF" />
                <Text style={styles.instructionsText}>
                  Barkodu kare içine yerleştirin{'\n'}Odaklamak için dokunun
                </Text>
              </View>

              <View style={styles.formatsCard}>
                <Text style={styles.formatsTitle}>Desteklenen Formatlar</Text>
                <Text style={styles.supportedFormats}>
                  QR • EAN-13 • EAN-8 • Code-128 • Code-39 • UPC
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 50 : 16,
      paddingBottom: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    closeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    cameraContainer: {
      flex: 1,
      backgroundColor: '#000000',
    },
    mockCameraInFrame: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#1a1a1a',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    mockCameraTextSmall: {
      fontSize: 14,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.5)',
      marginTop: 8,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
    overlayTop: {
      flex: 0.35,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: 40,
    },
    logoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 180,
      height: 75,
      opacity: 0.9,
    },
    overlayMiddle: {
      flexDirection: 'row',
    },
    overlaySide: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    overlayBottom: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scanFrameContainer: {
      width: 340,
      height: 340,
      padding: 20,
    },
    scanFrame: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: 'transparent',
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderColor: colors.primary,
    },
    cornerTL: {
      top: -1,
      left: -1,
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderTopLeftRadius: 24,
    },
    cornerTR: {
      top: -1,
      right: -1,
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderTopRightRadius: 24,
    },
    cornerBL: {
      bottom: -1,
      left: -1,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 24,
    },
    cornerBR: {
      bottom: -1,
      right: -1,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderBottomRightRadius: 24,
    },
    scanLine: {
      position: 'absolute',
      left: 10,
      right: 10,
      height: 2,
      backgroundColor: colors.primary,
      borderRadius: 1,
      zIndex: 2,
    },
    scanLineGlow: {
      position: 'absolute',
      left: -10,
      right: -10,
      height: 30,
      backgroundColor: colors.primary,
      opacity: 0.2,
      borderRadius: 15,
      zIndex: 1,
    },
    instructionsContainer: {
      position: 'absolute',
      bottom: 80,
      left: 0,
      right: 0,
      alignItems: 'center',
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
