import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import {Platform} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertDialogProps {
  id: string;
  type: AlertType;
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const TOAST_CONFIG: Record<AlertType, {icon: string; bg: string; iconBg: string}> = {
  success: {icon: 'checkmark-circle', bg: '#10B981', iconBg: 'rgba(255,255,255,0.25)'},
  error: {icon: 'close-circle', bg: '#EF4444', iconBg: 'rgba(255,255,255,0.25)'},
  warning: {icon: 'warning', bg: '#F59E0B', iconBg: 'rgba(255,255,255,0.25)'},
  info: {icon: 'information-circle', bg: '#3B82F6', iconBg: 'rgba(255,255,255,0.25)'},
};

const AlertDialog: React.FC<AlertDialogProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  const safeTop = Platform.OS === 'ios' ? 54 : 40;
  const translateY = useRef(new Animated.Value(-200)).current;

  const config = TOAST_CONFIG[type];

  useEffect(() => {
    translateY.setValue(-200);

    Animated.spring(translateY, {
      toValue: 0,
      damping: 18,
      stiffness: 140,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => handleClose(), duration);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onClose(id));
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          paddingTop: safeTop,
          transform: [{translateY}],
        },
      ]}>
      <Pressable onPress={handleClose} style={styles.content}>
        <View style={[styles.iconCircle, {backgroundColor: config.iconBg}]}>
          <Icon name={config.icon} size={22} color="#FFF" />
        </View>
        <View style={styles.textContainer}>
          {title && <Text style={styles.title}>{title}</Text>}
          <Text style={styles.message} numberOfLines={2}>{message}</Text>
        </View>
        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
          <Icon name="close" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    lineHeight: 21,
  },
  closeBtn: {
    padding: 4,
  },
});

export default AlertDialog;
