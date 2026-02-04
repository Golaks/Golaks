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

  // Select optimal format for barcode scanning (higher resolution for better recognition)
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1920, height: 1080 } },
    { fps: 30 },
  ]);

  // Focus function
  const triggerFocus = async () => {
    if (cameraRef.current && device?.supportsFocus && isCameraReady) {
      try {
        await cameraRef.current.focus({ x: 0.5, y: 0.5 });
      } catch (e) {
        // Focus failed, ignore
      }
    }
  };

  // Camera initialized callback
  const handleCameraInitialized = () => {
    setIsCameraReady(true);
    // Initial focus after camera is ready
    setTimeout(triggerFocus, 300);
  };

  // Auto focus interval - only when camera is ready
  useEffect(() => {
    let focusInterval: NodeJS.Timeout | null = null;

    if (isActive && isCameraReady && device?.supportsFocus) {
      // Periodic auto focus every 1.5 seconds for better responsiveness
      focusInterval = setInterval(triggerFocus, 1500);
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

  const checkCameraPermission = () => {
    try {
      const cameraPermission = Camera.getCameraPermissionStatus();

      if (cameraPermission === 'granted') {
        setHasPermission(true);
        setIsActive(true);
        setShowPermissionModal(false);
      } else if (cameraPermission === 'not-determined') {
        setHasPermission(false);
        setShowPermissionModal(true);
      } else {
        setHasPermission(false);
        setIsActive(false);
        setShowPermissionModal(true);
      }
    } catch (error) {
      setHasPermission(false);
      setShowPermissionModal(false);
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
    if (codes.length > 0 && codes[0].value) {
      setIsActive(false);
      onBarcodeScanned(codes[0].value);
      onClose();
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

  // Don't render anything if not visible
  if (!visible) return null;

  // If showing permission modal, only show that
  if (showPermissionModal) {
    return (
      <PermissionModal
        visible={showPermissionModal}
        permissions={['camera']}
        onRequestPermissions={handleRequestPermission}
        onCancel={handleCancelPermission}
        title="Kamera İzni Gerekli"
        subtitle="Barkod taramak için kamera erişimine ihtiyacımız var."
      />
    );
  }

  return (
    <Modal
      visible={visible}
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

          {/* Camera View */}
          <View style={styles.cameraContainer}>
            {/* Overlay with camera in the middle */}
            <View style={styles.overlay}>
                <View style={styles.overlayTop}>
                  {/* Logo above scan frame */}
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
                    {/* Scanning Frame with Camera inside */}
                    <Pressable style={styles.scanFrame} onPress={triggerFocus}>
                      {/* Camera only in scan frame */}
                      {hasPermission && device && (
                        <Camera
                          ref={cameraRef}
                          style={StyleSheet.absoluteFill}
                          device={device}
                          isActive={isActive}
                          codeScanner={codeScanner}
                          torch={torchOn ? 'on' : 'off'}
                          format={format}
                          onInitialized={handleCameraInitialized}
                          onError={() => {}}
                          enableZoomGesture={false}
                          exposure={0}
                          videoStabilizationMode="off"
                        />
                      )}

                      {/* Animated scan line */}
                      <Animated.View
                        style={[
                          styles.scanLine,
                          {
                            transform: [
                              {
                                translateY: scanLineAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, 290],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    </Pressable>
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
          </View>
        </View>
      </Modal>
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
      backgroundColor: '#000000',
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
      backgroundColor: '#000000',
    },
    overlayBottom: {
      flex: 1,
      backgroundColor: '#000000',
    },
    scanFrameContainer: {
      width: 340,
      height: 340,
      padding: 20,
    },
    scanFrame: {
      flex: 1,
      borderWidth: 3,
      borderColor: colors.primary,
      borderRadius: 32,
      overflow: 'hidden',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
    scanLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
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
