import React, { useRef } from 'react';
import { View, StyleSheet, Pressable, Text, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export type TabName = 'dashboard' | 'aiChat' | 'qrScan' | 'profile' | 'notifications' | 'userManagement' | 'notificationSend' | 'companyManagement';

interface TabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  notificationCount?: number;
}

interface TabItemProps {
  name: TabName;
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
  badge?: number;
}

function TabItem({ icon, label, isActive, onPress, badge }: TabItemProps) {
  const { colors } = useTheme();
  // Aktif olan iconların dolu versiyonunu kullan
  const iconName = isActive ? icon.replace('-outline', '') : icon;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.2,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.35,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
          gap: 4,
        }}
      >
        <View style={styles.iconContainer}>
          <Icon
            name={iconName}
            size={22}
            color={isActive ? colors.primary : colors.textSecondary}
          />
          {badge !== undefined && badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badge > 99 ? '99+' : badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={[
          styles.tabLabel,
          { color: isActive ? colors.primary : colors.textSecondary }
        ]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CenterTabItem({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.15,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.25,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.centerTabContainer}>
      <View style={styles.centerButtonWrapper}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }]
            }}
          >
            <View
              style={[
                styles.centerButtonOuter,
                { backgroundColor: colors.card }
              ]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.centerButton}
              >
                <Icon name="qr-code" size={30} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

export default function TabBar({ activeTab, onTabPress, notificationCount }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Android için minimum 15, iOS için minimum 28, safe area varsa onu kullan
  const bottomPadding = Math.max(
    Platform.OS === 'ios' ? 28 : 15,
    insets.bottom
  );
  const tabBarHeight = 65 + bottomPadding;

  const dynamicStyles = createDynamicStyles(colors, tabBarHeight, bottomPadding);

  return (
    <View style={styles.container}>
      <View style={dynamicStyles.tabBarBackground} />
      <View style={dynamicStyles.tabBar}>
        <TabItem
          name="dashboard"
          icon="grid-outline"
          label="Uygulamalar"
          isActive={activeTab === 'dashboard'}
          onPress={() => onTabPress('dashboard')}
        />
        <TabItem
          name="aiChat"
          icon="chatbubbles-outline"
          label="AI Asistan"
          isActive={activeTab === 'aiChat'}
          onPress={() => onTabPress('aiChat')}
        />
        <CenterTabItem onPress={() => onTabPress('qrScan')} />
        <TabItem
          name="profile"
          icon="person-outline"
          label="Profil"
          isActive={activeTab === 'profile'}
          onPress={() => onTabPress('profile')}
        />
        <TabItem
          name="notifications"
          icon="notifications-outline"
          label="Bildirimler"
          isActive={activeTab === 'notifications'}
          onPress={() => onTabPress('notifications')}
          badge={notificationCount}
        />
      </View>
    </View>
  );
}

const createDynamicStyles = (colors: any, tabBarHeight: number, bottomPadding: number) => ({
  tabBarBackground: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: tabBarHeight,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'flex-end' as const,
    height: tabBarHeight,
    paddingBottom: bottomPadding,
    paddingTop: 8,
    paddingHorizontal: 10,
    overflow: 'visible' as const,
  },
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'visible',
    zIndex: 100,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  centerTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
    zIndex: 10,
  },
  centerButtonWrapper: {
    position: 'absolute',
    top: -90,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  centerButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2B7FFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(43, 127, 255, 0.15)',
  },
  centerButton: {
    width: 62,
    height: 62,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
