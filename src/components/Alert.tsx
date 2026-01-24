import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../contexts/ThemeContext';

const {width} = Dimensions.get('window');

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps {
  id: string;
  type: AlertType;
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Alert: React.FC<AlertProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  const {colors} = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const getAlertConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: '#10B981',
          backgroundColor: '#D1FAE5',
          borderColor: '#34D399',
        };
      case 'error':
        return {
          icon: 'close-circle',
          color: '#EF4444',
          backgroundColor: '#FEE2E2',
          borderColor: '#F87171',
        };
      case 'warning':
        return {
          icon: 'warning',
          color: '#F59E0B',
          backgroundColor: '#FEF3C7',
          borderColor: '#FBBF24',
        };
      case 'info':
        return {
          icon: 'information-circle',
          color: '#3B82F6',
          backgroundColor: '#DBEAFE',
          borderColor: '#60A5FA',
        };
    }
  };

  const config = getAlertConfig();

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
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
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose(id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderLeftColor: config.borderColor,
          transform: [{translateY: slideAnim}],
          opacity: opacityAnim,
        },
      ]}>
      <View style={styles.content}>
        <Icon name={config.icon} size={24} color={config.color} />

        <View style={styles.textContainer}>
          {title && (
            <Text
              style={[
                styles.title,
                {color: colors.text, fontWeight: '600'},
              ]}>
              {title}
            </Text>
          )}
          <Text style={[styles.message, {color: colors.text}]}>
            {message}
          </Text>
        </View>

        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
});

export default Alert;
