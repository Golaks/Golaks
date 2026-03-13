import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  type: ToastType;
  text: string;
  duration?: number;
}

interface InModalToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; bg: string; iconBg: string }> = {
  success: { icon: 'checkmark-circle', bg: '#10B981', iconBg: 'rgba(255,255,255,0.25)' },
  error: { icon: 'close-circle', bg: '#EF4444', iconBg: 'rgba(255,255,255,0.25)' },
  warning: { icon: 'warning', bg: '#F59E0B', iconBg: 'rgba(255,255,255,0.25)' },
  info: { icon: 'information-circle', bg: '#3B82F6', iconBg: 'rgba(255,255,255,0.25)' },
};

export default function InModalToast({ toast, onDismiss }: InModalToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-200)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(translateY, { toValue: -200, duration: 300, useNativeDriver: true }).start(() => onDismiss());
  }, [translateY, onDismiss]);

  useEffect(() => {
    if (toast) {
      translateY.setValue(-200);

      Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 140, useNativeDriver: true }).start();

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(hide, toast.duration || 3500);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, translateY, hide]);

  if (!toast) return null;

  const config = TOAST_CONFIG[toast.type];

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.bg, paddingTop: insets.top, transform: [{ translateY }] },
      ]}>
      <Pressable onPress={hide} style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
          <Icon name={config.icon} size={22} color="#FFF" />
        </View>
        <Text style={styles.text} numberOfLines={2}>{toast.text}</Text>
        <Pressable onPress={hide} hitSlop={12} style={styles.closeBtn}>
          <Icon name="close" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
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
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    lineHeight: 21,
  },
  closeBtn: {
    padding: 4,
  },
});
