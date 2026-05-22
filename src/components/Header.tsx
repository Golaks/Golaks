import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import ConfirmDialog from './ConfirmDialog';
import { useHelp } from '../lib/helpContext';

const AppIcon = require('../assets/images/icon.png');
const GolaksLogo = require('../assets/images/golaks-logo.png');

interface MenuItem {
  icon: string;
  label: string;
  subtext?: string;
  onPress: () => void;
  color?: string;
  isDanger?: boolean;
}

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightIcon?: string;
  onRightIconPress?: () => void;
  showMenu?: boolean;
  onLogout?: () => void;
  onCheckUpdate?: () => void;
  showLogo?: boolean;
  leftButton?: React.ReactNode;
  rightButton?: React.ReactNode;
  customMenuItems?: MenuItem[];
}

export default function Header({
  title,
  showBackButton = false,
  onBackPress,
  rightIcon,
  onRightIconPress,
  showMenu = false,
  onLogout,
  onCheckUpdate,
  showLogo = true,
  leftButton,
  rightButton,
  customMenuItems,
}: HeaderProps) {
  const { colors, isDark, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeHelp, open: openHelp } = useHelp();
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showCustomMenu, setShowCustomMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const styles = createStyles(colors, insets.top);

  const handleMenuPress = () => {
    setShowMenuModal(true);
  };

  const handleRightIconPress = () => {
    if (onRightIconPress) {
      onRightIconPress();
    }
  };

  const handleLogoutPress = () => {
    setShowMenuModal(false);
    // Menu kapanma animasyonunu bekle
    setTimeout(() => {
      setShowLogoutConfirm(true);
    }, 300);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    if (onLogout) {
      onLogout();
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleThemeToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
    setShowMenuModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Left Side - Menu or Back Button */}
        <View style={styles.leftContainer}>
          {leftButton ? (
            leftButton
          ) : showBackButton && onBackPress ? (
            <Pressable onPress={onBackPress} style={styles.iconButton}>
              <Icon name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          ) : showMenu ? (
            <Pressable onPress={handleMenuPress} style={styles.iconButton}>
              <Icon name="menu-outline" size={24} color={colors.text} />
            </Pressable>
          ) : null}
        </View>

        {/* Center - Title or Logo */}
        <View style={styles.centerContainer}>
          {showLogo ? (
            <Image source={GolaksLogo} style={styles.logo} resizeMode="contain" />
          ) : (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        {/* Right Side - Action Button */}
        <View style={styles.rightContainer}>
          {!!activeHelp && (
            <Pressable onPress={openHelp} style={styles.helpButton} hitSlop={6}>
              <Icon name="help-circle-outline" size={20} color="#FFF" />
            </Pressable>
          )}
          {rightButton ? (
            rightButton
          ) : customMenuItems ? (
            <Pressable onPress={() => setShowCustomMenu(true)} style={styles.iconButton}>
              <Icon name="ellipsis-vertical" size={24} color={colors.text} />
            </Pressable>
          ) : rightIcon ? (
            <Pressable onPress={handleRightIconPress} style={styles.iconButton}>
              <Icon name={rightIcon} size={24} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Menu Modal */}
      {showMenu && (
        <Modal
          visible={showMenuModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenuModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowMenuModal(false)}
          >
            <Pressable
              style={styles.menuModalContent}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Theme Toggle Option */}
              <Pressable
                style={({ pressed }) => [
                  styles.menuOption,
                  pressed && styles.menuOptionPressed,
                ]}
                onPress={handleThemeToggle}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: isDark ? '#F59E0B20' : '#6366F120' }]}>
                  <Icon
                    name={isDark ? 'sunny' : 'moon'}
                    size={20}
                    color={isDark ? '#F59E0B' : '#6366F1'}
                  />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuOptionText}>
                    {isDark ? 'Aydınlık Mod' : 'Karanlık Mod'}
                  </Text>
                  <Text style={styles.menuOptionSubtext}>
                    Görünümü değiştir
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>

              {/* Divider */}
              <View style={styles.menuDivider} />

              {/* Update Check Option */}
              {onCheckUpdate && (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.menuOption,
                      pressed && styles.menuOptionPressed,
                    ]}
                    onPress={() => {
                      setShowMenuModal(false);
                      setTimeout(() => onCheckUpdate(), 300);
                    }}
                  >
                    <View style={[styles.menuIconContainer, { backgroundColor: '#3B82F620' }]}>
                      <Icon name="arrow-up-circle-outline" size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuOptionText}>
                        Güncelleme Kontrol
                      </Text>
                      <Text style={styles.menuOptionSubtext}>
                        Yeni sürüm olup olmadığını kontrol et
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
                  </Pressable>

                  <View style={styles.menuDivider} />
                </>
              )}

              {/* Logout Option */}
              <Pressable
                style={({ pressed }) => [
                  styles.menuOption,
                  pressed && styles.menuOptionPressed,
                ]}
                onPress={handleLogoutPress}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#EF444420' }]}>
                  <Icon name="log-out" size={20} color="#EF4444" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>
                    Güvenli Çıkış
                  </Text>
                  <Text style={styles.menuOptionSubtext}>
                    Hesaptan çık
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color="#EF444460" />
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Custom Menu Modal */}
      {customMenuItems && customMenuItems.length > 0 && (
        <Modal
          visible={showCustomMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCustomMenu(false)}
        >
          <Pressable
            style={styles.customMenuOverlay}
            onPress={() => setShowCustomMenu(false)}
          >
            <Pressable
              style={styles.customMenuContent}
              onPress={(e) => e.stopPropagation()}
            >
              {customMenuItems.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <View style={styles.menuDivider} />}
                  <Pressable
                    style={({ pressed }) => [
                      styles.menuOption,
                      pressed && styles.menuOptionPressed,
                    ]}
                    onPress={() => {
                      setShowCustomMenu(false);
                      item.onPress();
                    }}
                  >
                    <View
                      style={[
                        styles.menuIconContainer,
                        { backgroundColor: item.isDanger ? '#EF444420' : `${item.color || colors.primary}20` },
                      ]}
                    >
                      <Icon
                        name={item.icon}
                        size={20}
                        color={item.isDanger ? '#EF4444' : (item.color || colors.primary)}
                      />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text
                        style={[
                          styles.menuOptionText,
                          item.isDanger && { color: '#EF4444' },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.subtext && (
                        <Text style={styles.menuOptionSubtext}>
                          {item.subtext}
                        </Text>
                      )}
                    </View>
                    <Icon
                      name="chevron-forward"
                      size={18}
                      color={item.isDanger ? '#EF444460' : colors.textTertiary}
                    />
                  </Pressable>
                </React.Fragment>
              ))}
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Çıkış Yap"
        message="Uygulamadan çıkış yapmak istediğinize emin misiniz?"
        icon="log-out"
        iconColor="#EF4444"
        confirmText="Çıkış Yap"
        cancelText="İptal"
        confirmIcon="checkmark-outline"
        cancelIcon="close-outline"
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </View>
  );
}

const createStyles = (colors: any, topInset: number) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingTop: topInset,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      paddingHorizontal: 16,
    },
    leftContainer: {
      flex: 1,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    appIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appIcon: {
      width: 32,
      height: 32,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    rightContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    helpButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: '#3B82F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    logo: {
      height: 40,
      width: 120,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      paddingTop: topInset + 56,
      paddingLeft: 16,
    },
    menuModalContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 8,
      minWidth: 280,
      borderWidth: 1,
      borderColor: colors.border,
    },
    customMenuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: topInset + 56,
      paddingRight: 16,
    },
    customMenuContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 8,
      minWidth: 280,
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
      borderRadius: 12,
    },
    menuOptionPressed: {
      backgroundColor: colors.border + '80',
      transform: [{ scale: 0.98 }],
    },
    menuIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuTextContainer: {
      flex: 1,
    },
    menuOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    menuOptionSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
      opacity: 0.8,
    },
    menuDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
      marginHorizontal: 8,
    },
  });
