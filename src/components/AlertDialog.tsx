import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../contexts/ThemeContext';
import XButton from './XButton';
import Button from './Button';

const {width} = Dimensions.get('window');

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertDialogProps {
  id: string;
  type: AlertType;
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  const {colors, isDark} = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const getAlertConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          iconColor: '#10B981',
        };
      case 'error':
        return {
          icon: 'close-circle',
          iconColor: '#EF4444',
        };
      case 'warning':
        return {
          icon: 'warning',
          iconColor: '#F59E0B',
        };
      case 'info':
        return {
          icon: 'information-circle',
          iconColor: '#3B82F6',
        };
    }
  };

  const config = getAlertConfig();

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto close
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose(id);
    });
  };

  return (
    <Modal transparent visible animationType="none">
      <View style={styles.modalContainer}>
        {/* Dark overlay */}
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            },
          ]}
        />

        {/* Floating Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [{scale: scaleAnim}],
              opacity: opacityAnim,
            },
          ]}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.card : '#FFFFFF',
              },
            ]}>
            {/* Close button */}
            <XButton onPress={handleClose} style={styles.closeButton} />

            {/* Large Icon */}
            <View style={styles.iconContainer}>
              <Icon name={config.icon} size={56} color={config.iconColor} />
            </View>

            {/* Title */}
            {title && (
              <Text style={[styles.title, {color: colors.text}]}>
                {title}
              </Text>
            )}

            {/* Message */}
            <Text style={[styles.message, {color: colors.textSecondary}]}>
              {message}
            </Text>

            {/* Action Button */}
            <Button
              onPress={handleClose}
              text="Tamam"
              icon="checkmark"
              fullWidth={false}
              style={{
                ...styles.actionButton,
                backgroundColor: config.iconColor,
              }}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  cardContainer: {
    width: width - 60,
    maxWidth: 340,
  },
  card: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  actionButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
  },
});

export default AlertDialog;
