import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Text,
  Animated,
  StyleSheet,
  LayoutChangeEvent,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

export interface FilterBarOption<T extends string = string> {
  id: T;
  label: string;
  icon: string;
  color: string;
}

export interface AnimatedFilterBarProps<T extends string = string> {
  options: FilterBarOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  style?: ViewStyle;
  size?: 'default' | 'compact';
}

export default function AnimatedFilterBar<T extends string = string>({
  options,
  selectedId,
  onSelect,
  style,
  size = 'default',
}: AnimatedFilterBarProps<T>) {
  const { colors, isDark } = useTheme();
  const isCompact = size === 'compact';

  const scrollViewRef = useRef<ScrollView>(null);
  const [itemLayouts, setItemLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const [isReady, setIsReady] = useState(false);
  const measuredCount = useRef(0);

  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  const backgroundColor =
    options.length > 1
      ? colorAnim.interpolate({
          inputRange: options.map((_, i) => i),
          outputRange: options.map((o) => o.color),
        })
      : options[0]?.color ?? colors.primary;

  const styles = createStyles(colors, isDark, isCompact);

  const handleItemLayout = useCallback(
    (id: string, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setItemLayouts((prev) => {
        const next = { ...prev, [id]: { x, width } };
        const count = Object.keys(next).length;
        if (count >= options.length && !isReady) {
          const selectedLayout = next[selectedId as string];
          if (selectedLayout) {
            indicatorX.setValue(selectedLayout.x);
            indicatorWidth.setValue(selectedLayout.width);
            const idx = options.findIndex((o) => o.id === selectedId);
            colorAnim.setValue(idx >= 0 ? idx : 0);
          }
          setIsReady(true);
        }
        return next;
      });
    },
    [options.length, selectedId, isReady],
  );

  useEffect(() => {
    const layout = itemLayouts[selectedId as string];
    if (!layout || !isReady) return;

    const selectedIndex = options.findIndex((o) => o.id === selectedId);
    if (selectedIndex < 0) return;

    Animated.parallel([
      Animated.spring(indicatorX, {
        toValue: layout.x,
        tension: 170,
        friction: 15,
        useNativeDriver: false,
      }),
      Animated.spring(indicatorWidth, {
        toValue: layout.width,
        tension: 170,
        friction: 15,
        useNativeDriver: false,
      }),
      Animated.timing(colorAnim, {
        toValue: selectedIndex,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();

    scrollViewRef.current?.scrollTo({
      x: Math.max(0, layout.x - 40),
      animated: true,
    });
  }, [selectedId, itemLayouts, isReady]);

  return (
    <View style={[styles.track, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {isReady && (
          <Animated.View
            style={[
              styles.indicator,
              {
                left: indicatorX,
                width: indicatorWidth,
                backgroundColor: backgroundColor,
              },
            ]}
          />
        )}

        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <View key={option.id as string} onLayout={(e) => handleItemLayout(option.id as string, e)}>
              <Pressable style={styles.item} onPress={() => onSelect(option.id)}>
                <Icon
                  name={option.icon}
                  size={isCompact ? 14 : 16}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.itemText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, isCompact: boolean) =>
  StyleSheet.create({
    track: {
      backgroundColor: isDark ? colors.card : colors.cardSecondary,
      borderRadius: isCompact ? 20 : 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 3,
    },
    contentContainer: {
      gap: 2,
    },
    indicator: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      borderRadius: isCompact ? 16 : 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isCompact ? 12 : 16,
      paddingVertical: isCompact ? 7 : 10,
      gap: isCompact ? 5 : 6,
      zIndex: 1,
    },
    itemText: {
      fontSize: isCompact ? 12 : 14,
      fontWeight: isCompact ? '500' : '600',
    },
  });
