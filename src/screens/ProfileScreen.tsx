import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Modal, Image, ActivityIndicator, Linking, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DeviceInfo from 'react-native-device-info';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { profileService } from '../services/profile.service';
import { authService } from '../services/auth.service';
import { BASE_API_URL } from '../constants/ApiConfig';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import MenuCard from '../components/MenuCard';
import SectionTitle from '../components/SectionTitle';
import BottomSheet from '../components/BottomSheet';
import Input from '../components/Input';
import ImagePickerModal from '../components/ImagePickerModal';
import XButton from '../components/XButton';
import Button from '../components/Button';
import IOSSwitch from '../components/IOSSwitch';
import ConfirmDialog from '../components/ConfirmDialog';
import PriceSettingsSheet from './SystemSettingsScreen';

interface ProfileScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  onUserManagement?: () => void;
  onNotificationSend?: () => void;
  onCompanyManagement?: () => void;
}

export default function ProfileScreen({ onTabChange, onLogout, onUserManagement, onNotificationSend, onCompanyManagement }: ProfileScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, user, refreshUser, notificationCount } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPriceSettings, setShowPriceSettings] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    user?.avatar ? `${BASE_API_URL}/${user.avatar}` : undefined
  );

  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    promotions: false,
    systemAlerts: true,
  });

  const [cacheSettings, setCacheSettings] = useState({
    tempFiles: true,
    imageCache: true,
    apiCache: true,
    appData: false,
    sessionData: false,
  });

  const [cacheSizes, setCacheSizes] = useState({
    tempFiles: 0,
    imageCache: 0,
    apiCache: 0,
    appData: 0,
    sessionData: 0,
  });
  const [isCalculatingSize, setIsCalculatingSize] = useState(false);

  // App version info
  const appVersion = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();
  const versionString = `Versiyon ${appVersion} (${buildNumber})`;

  const handleLogoutPress = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      setShowLogoutConfirm(false);
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
    }
  };

  const handleDirectLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
    }
  };

  // Profil Fotoğrafı Yükleme
  const handleTakePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        cameraType: 'front',
      });

      if (result.assets && result.assets[0] && result.assets[0].uri) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      showError('Kamera açılamadı');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        selectionLimit: 1,
      });

      if (result.assets && result.assets[0] && result.assets[0].uri) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      showError('Galeri açılamadı');
    }
  };

  const uploadPhoto = async (uri: string) => {
    setIsUploadingPhoto(true);

    try {
      const result = await profileService.uploadProfilePhoto(uri);

      if (result.success && result.photoUrl) {
        // Update local state with full URL for immediate display
        setPhotoUrl(result.photoUrl);

        // Update user object in storage with relative path
        if (user && result.relativePath) {
          const updatedUser = {
            ...user,
            avatar: result.relativePath,
          };
          await authService.updateUser(updatedUser);
          await refreshUser();
        }

        showSuccess('Profil fotoğrafınız güncellendi');
      } else {
        showError(result.error || 'Fotoğraf yüklenemedi');
      }
    } catch (error) {
      showError('Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Profile form fields
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileNameError, setProfileNameError] = useState('');
  const [profilePhoneError, setProfilePhoneError] = useState('');

  // Password form fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Update photo URL when user avatar changes

  useEffect(() => {
    if (user?.avatar) {
      const newPhotoUrl = `${BASE_API_URL}/${user.avatar}`;
      setPhotoUrl(newPhotoUrl);
    }
  }, [user?.avatar]);

  // Calculate cache sizes when modal opens
  useEffect(() => {
    if (showClearCacheModal) {
      calculateCacheSizes();
    }
  }, [showClearCacheModal]);

  // Kullanıcı bilgilerini form alanlarına doldur
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.telefon || '');
    }
  }, [user]);

  const styles = createStyles(colors, isDark);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleProfileSave = async () => {
    // Validation
    let hasError = false;
    setProfileNameError('');
    setProfilePhoneError('');

    if (!profileName) {
      setProfileNameError('Ad soyad gerekli');
      hasError = true;
    }
    if (!profilePhone) {
      setProfilePhoneError('Telefon gerekli');
      hasError = true;
    }

    if (hasError) return;

    try {
      const result = await profileService.updateProfile(profileName, profilePhone);

      if (result.success && result.user) {
        if (user) {
          const updatedUser = {
            ...user,
            name: result.user.name,
            telefon: result.user.telefon,
          };
          await authService.updateUser(updatedUser);
          await refreshUser();
        }

        showSuccess('Profil bilgileriniz güncellendi');
        setShowProfileModal(false);
      } else {
        showError(result.error || 'Profil güncellenemedi');
      }
    } catch (error) {
      showError('Profil güncellenirken bir hata oluştu');
    }
  };

  const handlePasswordSave = async () => {
    // Validation
    let hasError = false;
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    if (!currentPassword) {
      setCurrentPasswordError('Mevcut şifre gerekli');
      hasError = true;
    }
    if (!newPassword) {
      setNewPasswordError('Yeni şifre gerekli');
      hasError = true;
    } else if (newPassword.length < 6) {
      setNewPasswordError('Şifre en az 6 karakter olmalı');
      hasError = true;
    }
    if (!confirmPassword) {
      setConfirmPasswordError('Şifre tekrarı gerekli');
      hasError = true;
    } else if (confirmPassword !== newPassword) {
      setConfirmPasswordError('Şifreler eşleşmiyor');
      hasError = true;
    }

    if (hasError) return;

    try {
      const result = await profileService.changePassword(currentPassword, newPassword);

      if (result.success) {
        showSuccess('Şifreniz başarıyla değiştirildi');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordModal(false);
      } else {
        showError(result.error || 'Şifre değiştirilemedi');
      }
    } catch (error) {
      showError('Şifre değiştirilirken bir hata oluştu');
    }
  };

  const handleNotificationSettingSave = async () => {
    try {
      const result = await profileService.updateNotificationSettings(notificationSettings);

      if (result.success) {
        showSuccess('Bildirim ayarlarınız güncellendi');
        setShowNotificationModal(false);
      } else {
        showError(result.error || 'Bildirim ayarları güncellenemedi');
      }
    } catch (error) {
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // TODO: Implement delete account API call
      showSuccess('Hesabınız başarıyla silindi');
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      showError('Hesap silinirken bir hata oluştu');
    } finally {
      setShowDeleteAccountConfirm(false);
    }
  };

  const calculateCacheSizes = async () => {
    setIsCalculatingSize(true);
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const allKeys = await AsyncStorage.getAllKeys();

      let tempSize = 0;
      let imageSize = 0;
      let apiSize = 0;
      let appDataSize = 0;
      let sessionSize = 0;

      // Calculate sizes for each key
      for (const key of allKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            // Calculate size in bytes (UTF-16 encoding, 2 bytes per character)
            const sizeInBytes = (key.length + value.length) * 2;
            const sizeInMB = sizeInBytes / (1024 * 1024);

            // Categorize by key pattern
            if (key.startsWith('temp_') || key.startsWith('cache_') || key.includes('_temp')) {
              tempSize += sizeInMB;
            } else if (key.startsWith('image_') || key.includes('_image_') || key.includes('photo_')) {
              imageSize += sizeInMB;
            } else if (key.startsWith('api_cache_') || key.includes('_response_')) {
              apiSize += sizeInMB;
            } else if (key.includes('token') || key.includes('user') || key.includes('auth') || key.startsWith('@')) {
              sessionSize += sizeInMB;
            } else {
              appDataSize += sizeInMB;
            }
          }
        } catch (error) {
        }
      }

      setCacheSizes({
        tempFiles: Math.round(tempSize * 100) / 100,
        imageCache: Math.round(imageSize * 100) / 100,
        apiCache: Math.round(apiSize * 100) / 100,
        appData: Math.round(appDataSize * 100) / 100,
        sessionData: Math.round(sessionSize * 100) / 100,
      });
    } catch (error) {
    } finally {
      setIsCalculatingSize(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);

    try {
      const itemsToClean = [];
      if (cacheSettings.tempFiles) itemsToClean.push('Geçici Dosyalar');
      if (cacheSettings.imageCache) itemsToClean.push('Görsel Önbelleği');
      if (cacheSettings.apiCache) itemsToClean.push('API Yanıtları');
      if (cacheSettings.appData) itemsToClean.push('Uygulama Verileri');
      if (cacheSettings.sessionData) itemsToClean.push('Oturum Bilgileri');

      if (itemsToClean.length === 0) {
        showError('Lütfen en az bir önbellek türü seçin');
        setIsClearingCache(false);
        return;
      }

      // Actual cache clearing implementation
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

      // Get all keys
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove: string[] = [];

      // Temp Files - Clear temporary data
      if (cacheSettings.tempFiles) {
        const tempKeys = allKeys.filter(key =>
          key.startsWith('temp_') ||
          key.startsWith('cache_') ||
          key.includes('_temp')
        );
        keysToRemove.push(...tempKeys);
      }

      // Image Cache - Clear image cache keys
      if (cacheSettings.imageCache) {
        const imageKeys = allKeys.filter(key =>
          key.startsWith('image_') ||
          key.includes('_image_') ||
          key.includes('photo_')
        );
        keysToRemove.push(...imageKeys);
      }

      // API Cache - Clear API response cache
      if (cacheSettings.apiCache) {
        const apiKeys = allKeys.filter(key =>
          key.startsWith('api_cache_') ||
          key.includes('_response_')
        );
        keysToRemove.push(...apiKeys);
      }

      // App Data - Clear app data (excluding auth tokens and user data)
      if (cacheSettings.appData) {
        const appDataKeys = allKeys.filter(key =>
          !key.includes('token') &&
          !key.includes('user') &&
          !key.includes('auth') &&
          !key.startsWith('@')
        );
        keysToRemove.push(...appDataKeys);
      }

      // Session Data - Clear auth tokens and user data (will logout)
      if (cacheSettings.sessionData) {
        const sessionKeys = allKeys.filter(key =>
          key.includes('token') ||
          key.includes('user') ||
          key.includes('auth') ||
          key.startsWith('@')
        );
        keysToRemove.push(...sessionKeys);
      }

      // Remove duplicates
      const uniqueKeysToRemove = [...new Set(keysToRemove)];

      if (uniqueKeysToRemove.length > 0) {
        await AsyncStorage.multiRemove(uniqueKeysToRemove);
      }

      // Simulated delay for better UX
      await new Promise(resolve => setTimeout(() => resolve(undefined), 800));

      // Recalculate cache sizes after clearing
      await calculateCacheSizes();

      showSuccess(`${itemsToClean.length} önbellek türü başarıyla temizlendi`);
      setShowClearCacheModal(false);

      // Reset selections
      setCacheSettings({
        tempFiles: true,
        imageCache: true,
        apiCache: true,
        appData: false,
        sessionData: false,
      });

      // If session data was cleared, logout user
      if (cacheSettings.sessionData) {
        await logout();
        if (onLogout) {
          onLogout();
        }
      }
    } catch (error) {
      showError('Önbellek temizlenirken bir hata oluştu');
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Profil"
          showMenu={true}
          onLogout={handleDirectLogout}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page Title */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="person" size={18} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Profil & Ayarlar</Text>
            </View>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <Pressable
              style={styles.avatarContainer}
              onPress={() => setShowImagePicker(true)}
              disabled={isUploadingPhoto}
            >
              <View style={styles.avatar}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Icon name="person" size={40} color={colors.primary} />
                )}
              </View>
              <View style={styles.avatarEditBadge}>
                <Icon name="camera" size={16} color="#FFFFFF" />
              </View>
              {isUploadingPhoto && (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
            </Pressable>
            <Text style={styles.userName}>{user?.name || 'Kullanıcı'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'email@golaks.com'}</Text>
            <Text style={styles.userCompany}>{user?.firma_unvani || 'Golaks'}</Text>
            {user?.firmaAyarlar?.lisans?.paketBitisTarihi && (
              <View style={styles.packageBadge}>
                <Icon name="calendar-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.packageText}>
                  Paket Bitiş: {(() => {
                    const d = new Date(user.firmaAyarlar.lisans.paketBitisTarihi);
                    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
                  })()}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.roleBadge,
                (user?.role === 'superAdmin' || user?.kullanici_rol === 2)
                  ? styles.superAdminBadge
                  : (user?.role === 'admin' || user?.kullanici_rol === 1)
                  ? styles.adminBadge
                  : styles.userBadge,
              ]}
            >
              <Icon
                name={
                  (user?.role === 'superAdmin' || user?.kullanici_rol === 2) ? 'star' :
                  (user?.role === 'admin' || user?.kullanici_rol === 1) ? 'shield-checkmark' :
                  'person'
                }
                size={12}
                color={
                  (user?.role === 'superAdmin' || user?.kullanici_rol === 2) ? '#14B8A6' :
                  (user?.role === 'admin' || user?.kullanici_rol === 1) ? colors.primary :
                  '#818CF8'
                }
                style={{ opacity: 0.7 }}
              />
              <Text
                style={[
                  styles.roleText,
                  (user?.role === 'superAdmin' || user?.kullanici_rol === 2)
                    ? styles.superAdminText
                    : (user?.role === 'admin' || user?.kullanici_rol === 1)
                    ? styles.adminText
                    : styles.userText,
                ]}
              >
                {(user?.role === 'superAdmin' || user?.kullanici_rol === 2)
                  ? 'Süper Admin'
                  : (user?.role === 'admin' || user?.kullanici_rol === 1)
                  ? 'Admin'
                  : 'Kullanıcı'}
              </Text>
            </View>
          </View>

          {/* Super Admin Section */}
          {(() => {
            const isSuperAdmin = user?.role === 'superAdmin' || user?.kullanici_rol === 2;
            return isSuperAdmin;
          })() && (
            <View style={styles.section}>
              <SectionTitle title="Süper Admin" />
              <MenuCard
                name="Firma Yönetimi"
                icon="business-outline"
                color={colors.primary}
                description="Firma ayarlarını yönet"
                onPress={onCompanyManagement || (() => {})}
              />
              <MenuCard
                name="Bildirim İşlemleri"
                icon="mail-outline"
                color={colors.primary}
                description="Toplu bildirim gönder"
                onPress={onNotificationSend || (() => {})}
              />
            </View>
          )}

          {/* Account Section */}
          <View style={styles.section}>
            <SectionTitle title="Hesap Bilgileri" />
            <MenuCard
              name="Profil Bilgileri"
              icon="person-outline"
              color={colors.primary}
              description="Kişisel bilgilerinizi düzenleyin"
              onPress={() => setShowProfileModal(true)}
            />
            <MenuCard
              name="Şifre Değiştir"
              icon="lock-closed-outline"
              color={colors.primary}
              description="Şifrenizi güncelleyin"
              onPress={() => setShowPasswordModal(true)}
            />
            <MenuCard
              name="Bildirim Ayarları"
              icon="notifications-outline"
              color={colors.primary}
              description="Bildirim tercihlerinizi yönetin"
              onPress={() => setShowNotificationModal(true)}
            />
            <MenuCard
              name="Önbellek Temizle"
              icon="trash-outline"
              color={colors.primary}
              description="Uygulama önbelleğini temizle"
              onPress={() => setShowClearCacheModal(true)}
            />
          </View>

          {/* System Settings Section */}
          <View style={styles.section}>
            <SectionTitle title="Sistem Ayarları" />
            <MenuCard
              name="Kullanıcı Yönetimi"
              icon="people-outline"
              color={colors.primary}
              description="Kullanıcıları ve yetkileri yönet"
              onPress={onUserManagement || (() => {})}
              disabled={user?.role === 'user' || user?.kullanici_rol === 0}
            />
            <MenuCard
              name="Fiyat Hesaplama Algoritması"
              icon="calculator-outline"
              color={colors.primary}
              description="Fiyat hesaplama yöntemlerini yapılandır"
              onPress={() => setShowPriceSettings(true)}
              disabled={user?.role === 'user' || user?.kullanici_rol === 0}
            />
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <SectionTitle title="Hakkında & Yasal" />
            <MenuCard
              name="Kullanım Sözleşmesi"
              icon="document-text-outline"
              color={colors.primary}
              description="Kullanım koşullarını inceleyin"
              onPress={() => setShowTermsModal(true)}
            />
            <MenuCard
              name="Gizlilik Politikası"
              icon="shield-checkmark-outline"
              color={colors.primary}
              description="Gizlilik koşullarını inceleyin"
              onPress={() => setShowPrivacyModal(true)}
            />
            <MenuCard
              name="Hakkımızda"
              icon="information-circle-outline"
              color={colors.primary}
              description={versionString}
              onPress={() => setShowAboutModal(true)}
            />
          </View>

          {/* Account Actions Section */}
          <View style={styles.section}>
            <SectionTitle title="Hesap İşlemleri" />
            <MenuCard
              name="Güvenli Çıkış"
              icon="log-out-outline"
              color={colors.danger}
              description="Hesaptan güvenli çıkış yap"
              onPress={handleLogoutPress}
              style={{ backgroundColor: colors.dangerBackground + '40', borderColor: colors.danger + '30' }}
            />
            <MenuCard
              name="Hesabımı Kapat"
              icon="close-circle-outline"
              color={colors.danger}
              description="Hesabınızı kalıcı olarak silin"
              onPress={() => setShowDeleteAccountConfirm(true)}
              style={{ backgroundColor: colors.dangerBackground + '40', borderColor: colors.danger + '30' }}
            />
          </View>
        </ScrollView>

        <ImagePickerModal
          visible={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onCamera={handleTakePhoto}
          onGallery={handlePickPhoto}
          title="Profil Fotoğrafı Seç"
        />

        <BottomSheet
          visible={showProfileModal}
          title="Profil Bilgileri"
          icon="person-outline"
          iconColor={colors.primary}
          height={SCREEN_HEIGHT * 0.45}
          onClose={() => setShowProfileModal(false)}
          onSave={handleProfileSave}
          saveText="Kaydet"
        >
          <Input
            label="Ad Soyad"
            icon="person-outline"
            value={profileName}
            onChangeText={(text) => { setProfileName(text); setProfileNameError(''); }}
            placeholder="Adınızı ve soyadınızı girin"
            error={profileNameError}
            shake={!!profileNameError}
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="Telefon"
            icon="call-outline"
            value={profilePhone}
            onChangeText={(text) => { setProfilePhone(text); setProfilePhoneError(''); }}
            placeholder="Telefon numaranızı girin"
            keyboardType="phone-pad"
            error={profilePhoneError}
            shake={!!profilePhoneError}
          />
        </BottomSheet>

        <BottomSheet
          visible={showPasswordModal}
          title="Şifre Değiştir"
          icon="lock-closed-outline"
          iconColor={colors.primary}
          height={SCREEN_HEIGHT * 0.55}
          onClose={() => {
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setCurrentPasswordError('');
            setNewPasswordError('');
            setConfirmPasswordError('');
          }}
          onSave={handlePasswordSave}
          saveText="Kaydet"
        >
          <Input
            label="Mevcut Şifre"
            icon="lock-closed-outline"
            value={currentPassword}
            onChangeText={(text) => { setCurrentPassword(text); setCurrentPasswordError(''); }}
            placeholder="Mevcut şifrenizi girin"
            isPassword
            error={currentPasswordError}
            shake={!!currentPasswordError}
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="Yeni Şifre"
            icon="key-outline"
            value={newPassword}
            onChangeText={(text) => { setNewPassword(text); setNewPasswordError(''); }}
            placeholder="Yeni şifrenizi girin"
            isPassword
            error={newPasswordError}
            shake={!!newPasswordError}
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="Yeni Şifre (Tekrar)"
            icon="key-outline"
            value={confirmPassword}
            onChangeText={(text) => { setConfirmPassword(text); setConfirmPasswordError(''); }}
            placeholder="Yeni şifrenizi tekrar girin"
            isPassword
            error={confirmPasswordError}
            shake={!!confirmPasswordError}
          />
        </BottomSheet>

        {/* Clear Cache Bottom Sheet */}
        <BottomSheet
          visible={showClearCacheModal}
          title="Önbellek Temizle"
          icon="trash-outline"
          iconColor="#EF4444"
          onClose={() => setShowClearCacheModal(false)}
          onSave={handleClearCache}
          saveText="Temizle"
          cancelText="İptal"
          saveDisabled={isClearingCache}
          height={SCREEN_HEIGHT * 0.78}
        >
          {isCalculatingSize ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 12 }}>
                Önbellek boyutu hesaplanıyor...
              </Text>
            </View>
          ) : (
            <>
              {/* Önbellek Türleri Section */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Icon name="folder-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
                  Önbellek Türleri
                </Text>
              </View>

              {/* Geçici Dosyalar */}
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#3B82F615', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Icon name="document-outline" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>Geçici Dosyalar</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {cacheSizes.tempFiles > 0 ? `${cacheSizes.tempFiles} MB` : 'Temiz'}
                  </Text>
                </View>
                <IOSSwitch
                  value={cacheSettings.tempFiles}
                  onValueChange={(value) => setCacheSettings({ ...cacheSettings, tempFiles: value })}
                />
              </View>

              {/* Görsel Önbelleği */}
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#10B98115', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Icon name="image-outline" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>Görsel Önbelleği</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {cacheSizes.imageCache > 0 ? `${cacheSizes.imageCache} MB` : 'Temiz'}
                  </Text>
                </View>
                <IOSSwitch
                  value={cacheSettings.imageCache}
                  onValueChange={(value) => setCacheSettings({ ...cacheSettings, imageCache: value })}
                />
              </View>

              {/* API Yanıtları */}
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#8B5CF615', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Icon name="cloud-outline" size={18} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>API Yanıtları</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {cacheSizes.apiCache > 0 ? `${cacheSizes.apiCache} MB` : 'Temiz'}
                  </Text>
                </View>
                <IOSSwitch
                  value={cacheSettings.apiCache}
                  onValueChange={(value) => setCacheSettings({ ...cacheSettings, apiCache: value })}
                />
              </View>

              {/* Dikkatli Seçenekler Section */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Icon name="warning-outline" size={16} color="#F59E0B" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
                  Dikkatli Seçenekler
                </Text>
              </View>

              {/* Uygulama Verileri */}
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: cacheSettings.appData ? '#F59E0B30' : colors.border,
                padding: 14,
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F59E0B15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Icon name="warning-outline" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>Uygulama Verileri</Text>
                  <Text style={{ fontSize: 12, color: cacheSettings.appData ? '#F59E0B' : colors.textSecondary }}>
                    {cacheSizes.appData > 0
                      ? `Oturum açık kalır (${cacheSizes.appData} MB)`
                      : 'Temiz - Oturum açık kalır'
                    }
                  </Text>
                </View>
                <IOSSwitch
                  value={cacheSettings.appData}
                  onValueChange={(value) => setCacheSettings({ ...cacheSettings, appData: value })}
                />
              </View>

              {/* Oturum Bilgileri */}
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: cacheSettings.sessionData ? '#EF444430' : colors.border,
                padding: 14,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Icon name="exit-outline" size={18} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>Oturum Bilgileri</Text>
                  <Text style={{ fontSize: 12, color: cacheSettings.sessionData ? '#EF4444' : colors.textSecondary }}>
                    {cacheSizes.sessionData > 0
                      ? `Çıkış yapılacak (${cacheSizes.sessionData} MB)`
                      : 'Temiz - Çıkış yapılır'
                    }
                  </Text>
                </View>
                <IOSSwitch
                  value={cacheSettings.sessionData}
                  onValueChange={(value) => setCacheSettings({ ...cacheSettings, sessionData: value })}
                />
              </View>

              {/* Info Box */}
              <View style={{
                backgroundColor: cacheSettings.sessionData ? '#EF444408' : colors.primary + '08',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: cacheSettings.sessionData ? '#EF444420' : colors.primary + '20',
                padding: 14,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon
                    name={cacheSettings.sessionData ? "alert-circle-outline" : "information-circle-outline"}
                    size={18}
                    color={cacheSettings.sessionData ? '#EF4444' : colors.primary}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: cacheSettings.sessionData ? '#EF4444' : colors.primary }}>
                    Bilgi
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.text, lineHeight: 18, textAlign: 'justify' }}>
                  {cacheSettings.sessionData
                    ? 'Seçtiğiniz önbellek türleri kalıcı olarak silinecektir. Oturum Bilgileri seçeneği işaretlendiği için otomatik çıkış yapılacak ve tekrar giriş yapmanız gerekecektir.'
                    : 'Seçtiğiniz önbellek türleri kalıcı olarak silinecektir. Oturum Bilgileri seçeneğini işaretlemediğiniz sürece oturumunuz açık kalacak ve kullanıcı bilgileriniz korunacaktır.'
                  }
                </Text>
              </View>
            </>
          )}
        </BottomSheet>

        {/* Notification Settings Bottom Sheet */}
        <BottomSheet
          visible={showNotificationModal}
          title="Bildirim Ayarları"
          icon="notifications-outline"
          iconColor="#F59E0B"
          onClose={() => setShowNotificationModal(false)}
          onSave={handleNotificationSettingSave}
          saveText="Kaydet"
          cancelText="İptal"
        >
          {/* Bildirim Kanalları */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Icon name="send-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Bildirim Kanalları</Text>
          </View>

          {[
            { key: 'pushNotifications', icon: 'phone-portrait', color: '#654BE9', title: 'Anlık Bildirimler', desc: 'Uygulama bildirimleri' },
            { key: 'emailNotifications', icon: 'mail', color: '#3B82F6', title: 'E-posta Bildirimleri', desc: 'E-posta ile bildirim al' },
            { key: 'smsNotifications', icon: 'chatbubble', color: '#10B981', title: 'SMS Bildirimleri', desc: 'SMS ile bildirim al' },
          ].map((item) => (
            <View
              key={item.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>{item.title}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.desc}</Text>
                </View>
              </View>
              <IOSSwitch
                value={notificationSettings[item.key as keyof typeof notificationSettings]}
                onValueChange={(value) =>
                  setNotificationSettings({ ...notificationSettings, [item.key]: value })
                }
              />
            </View>
          ))}

          {/* Diğer Ayarlar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 16 }}>
            <Icon name="options-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Diğer Ayarlar</Text>
          </View>

          {[
            { key: 'promotions', icon: 'pricetag', color: '#EC4899', title: 'Kampanyalar', desc: 'Özel teklifler ve indirimler' },
            { key: 'systemAlerts', icon: 'alert-circle', color: '#F59E0B', title: 'Sistem Uyarıları', desc: 'Önemli sistem bildirimleri' },
          ].map((item) => (
            <View
              key={item.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>{item.title}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.desc}</Text>
                </View>
              </View>
              <IOSSwitch
                value={notificationSettings[item.key as keyof typeof notificationSettings]}
                onValueChange={(value) =>
                  setNotificationSettings({ ...notificationSettings, [item.key]: value })
                }
              />
            </View>
          ))}
        </BottomSheet>

        {/* Logout Confirmation Dialog */}
        <ConfirmDialog
          visible={showLogoutConfirm}
          title="Çıkış Yap"
          message="Uygulamadan çıkış yapmak istediğinize emin misiniz?"
          icon="log-out"
          iconColor="#F59E0B"
          confirmText="Çıkış Yap"
          cancelText="İptal"
          confirmIcon="checkmark-outline"
          cancelIcon="close-outline"
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutConfirm(false)}
        />

        {/* Delete Account Confirmation Dialog */}
        <ConfirmDialog
          visible={showDeleteAccountConfirm}
          title="Hesabı Kapat"
          message="Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir."
          icon="warning"
          iconColor="#EF4444"
          confirmText="Kapat"
          cancelText="İptal"
          confirmIcon="checkmark-outline"
          cancelIcon="close-outline"
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteAccountConfirm(false)}
        />

        {/* Terms of Service Bottom Sheet */}
        <BottomSheet
          visible={showTermsModal}
          title="Kullanım Sözleşmesi"
          icon="document-text-outline"
          iconColor="#3B82F6"
          onClose={() => setShowTermsModal(false)}
          showFooter={false}
          height={SCREEN_HEIGHT * 0.85}
        >
          {/* Header Card */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#3B82F615', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="document-text" size={28} color="#3B82F6" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Kullanım Sözleşmesi</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Polaris Dış Ticaret Ltd. Şti.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.primary + '10', gap: 4 }}>
              <Icon name="calendar-outline" size={12} color={colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Son Güncelleme: Aralık 2025</Text>
            </View>
          </View>

          {/* Legal Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: '#3B82F610', borderWidth: 1, borderColor: '#3B82F620', marginBottom: 20, gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F615', justifyContent: 'center', alignItems: 'center' }}>
              <Icon name="briefcase-outline" size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }}>6098 Sayılı Kanun</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Türk Borçlar Kanunu ve ilgili mevzuat çerçevesinde hazırlanmıştır</Text>
            </View>
          </View>

          {/* Sections */}
          {[
            {
              icon: 'layers-outline',
              color: '#654BE9',
              title: '1. Hizmet Tanımı',
              items: ['Deri sektörüne özel ERP çözümleri', 'Muhasebe, stok ve envanter takibi', 'Sipariş ve üretim yönetimi', 'Raporlama ve iş analitiği'],
            },
            {
              icon: 'person-outline',
              color: '#10B981',
              title: '2. Hesap ve Güvenlik',
              items: ['Geçerli hesap oluşturma zorunluluğu', 'Doğru ve güncel bilgi sağlama yükümlülüğü', 'Şifre gizliliğinden kullanıcı sorumludur', 'Şüpheli aktiviteleri bildirme yükümlülüğü'],
            },
            {
              icon: 'checkmark-done-outline',
              color: '#3B82F6',
              title: '3. Kullanım Kuralları',
              items: ['Yalnızca yasal iş amaçlarıyla kullanım', 'Yetkisiz erişim ve tersine mühendislik yasaktır', 'Kötü amaçlı yazılım yayma yasaktır', 'Sahte bilgi girişi yasaktır'],
            },
            {
              icon: 'ribbon-outline',
              color: '#F59E0B',
              title: '4. Fikri Mülkiyet',
              items: ['Marka, logo ve yazılım Golaks mülkiyetindedir', '5846 sayılı Kanun ile korunmaktadır', 'Kişisel, devredilemez kullanım lisansı', 'Kaynak kodu ticari sır niteliğindedir'],
            },
            {
              icon: 'card-outline',
              color: '#EC4899',
              title: '5. Ödeme ve Abonelik',
              items: ['Abonelik planına göre ücretlendirme', 'İptal cari dönem sonunda geçerli olur', 'İade yasal düzenlemeler çerçevesindedir', 'Deneme döneminde iptal ücretsizdir'],
            },
            {
              icon: 'shield-checkmark-outline',
              color: '#10B981',
              title: '6. Veri ve Gizlilik',
              items: ['Gizlilik Politikası kapsamında işlenir', 'İş verileri şifreli olarak saklanır', 'Verilerinizi dışa aktarma hakkınız saklıdır', 'Hesap kapatmada yasal süre sonrası silinir'],
            },
            {
              icon: 'headset-outline',
              color: '#654BE9',
              title: '7. Destek ve Hizmet',
              items: ['Planlı bakımlar önceden duyurulur', 'E-posta, telefon ve uygulama içi destek', 'Acil durumlar için öncelikli destek', 'Kesintilerde en kısa sürede müdahale'],
            },
            {
              icon: 'alert-circle-outline',
              color: '#F59E0B',
              title: '8. Sorumluluk Sınırları',
              items: ['Hizmet "olduğu gibi" sunulmaktadır', 'Sorumluluk son 12 ay ücreti ile sınırlıdır', 'Dolaylı zararlardan sorumluluk kabul edilmez', 'Koşullar 30 gün önceden güncellenir'],
            },
          ].map((section, index) => (
            <View
              key={index}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: colors.card,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: section.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name={section.icon} size={18} color={section.color} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{section.title}</Text>
              </View>
              <View style={{ gap: 8, paddingLeft: 4 }}>
                {section.items.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: section.color }} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Termination & Disputes */}
          <View style={{ borderRadius: 12, borderWidth: 1, backgroundColor: '#EC489910', borderColor: '#EC489920', padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EC489915', justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="flag-outline" size={18} color="#EC4899" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Fesih ve Uyuşmazlık</Text>
            </View>
            <View style={{ gap: 8, paddingLeft: 4 }}>
              {[
                'Hesabınızı istediğiniz zaman kapatabilirsiniz',
                'İhlal halinde hesap askıya alınabilir',
                'Türkiye Cumhuriyeti yasaları geçerlidir',
                'Tekirdağ Mahkemeleri yetkilidir',
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="checkmark-circle" size={16} color="#EC4899" />
                  <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Contact */}
          <View style={{ borderRadius: 12, borderWidth: 1, backgroundColor: colors.card, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="mail-outline" size={18} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>İletişim</Text>
            </View>
            <View style={{ gap: 10 }}>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('mailto:destek@golaks.com')}>
                <Icon name="mail-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>destek@golaks.com</Text>
              </Pressable>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('tel:+908504664664')}>
                <Icon name="call-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>+90 850 466 4 664</Text>
              </Pressable>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('https://www.golaks.com')}>
                <Icon name="globe-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>www.golaks.com</Text>
              </Pressable>
            </View>
          </View>

          {/* Copyright */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>Polaris Dış Ticaret Ltd. Şti. - Tekirdağ, Türkiye</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>
              © 1995-{new Date().getFullYear()} Golaks. Tüm Hakları Saklıdır.
            </Text>
          </View>
        </BottomSheet>

        {/* Privacy Policy Bottom Sheet */}
        <BottomSheet
          visible={showPrivacyModal}
          title="Gizlilik Politikası"
          icon="shield-checkmark-outline"
          iconColor="#10B981"
          onClose={() => setShowPrivacyModal(false)}
          showFooter={false}
          height={SCREEN_HEIGHT * 0.85}
        >
          {/* Header Card */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#10B98115', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="shield-checkmark" size={28} color="#10B981" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Gizlilik Politikası</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Polaris Dış Ticaret Ltd. Şti.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.primary + '10', gap: 4 }}>
              <Icon name="calendar-outline" size={12} color={colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Son Güncelleme: Aralık 2025</Text>
            </View>
          </View>

          {/* KVKK Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: '#3B82F610', borderWidth: 1, borderColor: '#3B82F620', marginBottom: 20, gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F615', justifyContent: 'center', alignItems: 'center' }}>
              <Icon name="ribbon-outline" size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }}>KVKK Uyumlu</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>6698 sayılı Kanun kapsamında veri sorumlusu sıfatıyla hareket etmekteyiz</Text>
            </View>
          </View>

          {/* Sections */}
          {[
            {
              icon: 'finger-print-outline',
              color: '#654BE9',
              title: '1. Toplanan Veriler',
              items: ['Ad, soyad, kullanıcı adı', 'E-posta ve telefon', 'Hesap ve işlem verileri', 'IP adresi ve cihaz bilgileri'],
            },
            {
              icon: 'analytics-outline',
              color: '#F59E0B',
              title: '2. İşleme Amaçları',
              items: ['Hizmet sunumu ve yönetimi', 'Hesap oluşturma ve yönetimi', 'Müşteri desteği ve iletişim', 'Güvenlik ve dolandırıcılık önleme'],
            },
            {
              icon: 'lock-closed-outline',
              color: '#10B981',
              title: '3. Veri Güvenliği',
              items: ['SSL/TLS ve AES-256 şifreleme', 'Tier-3 veri merkezi barındırma', 'Düzenli güvenlik denetimleri', 'Erişim kontrolü ve yetkilendirme'],
            },
            {
              icon: 'time-outline',
              color: '#3B82F6',
              title: '4. Saklama Süresi',
              items: ['Hesap bilgileri: Aktif olduğu sürece', 'İşlem kayıtları: 10 yıl', 'Teknik loglar: 2 yıl', 'Pazarlama verileri: Onay geçerliyken'],
            },
            {
              icon: 'people-outline',
              color: '#EC4899',
              title: '5. Üçüncü Taraf Paylaşımı',
              items: ['Yasal zorunluluklar dışında paylaşılmaz', 'Veriler hiçbir koşulda satılmaz', 'Hizmet sağlayıcılarıyla gizlilik sözleşmesi', 'Açık rızanız olmadan aktarılmaz'],
            },
          ].map((section, index) => (
            <View
              key={index}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: colors.card,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: section.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name={section.icon} size={18} color={section.color} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{section.title}</Text>
              </View>
              <View style={{ gap: 8, paddingLeft: 4 }}>
                {section.items.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: section.color }} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* KVKK Rights */}
          <View style={{ borderRadius: 12, borderWidth: 1, backgroundColor: '#654BE910', borderColor: '#654BE920', padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#654BE915', justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="document-text-outline" size={18} color="#654BE9" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>KVKK Haklarınız</Text>
            </View>
            <View style={{ gap: 8, paddingLeft: 4 }}>
              {[
                'Verilerinizin işlenip işlenmediğini öğrenme',
                'İşleme amacını ve uygunluğunu sorgulama',
                'Eksik/yanlış verilerin düzeltilmesini isteme',
                'Verilerin silinmesini talep etme',
                'Otomatik analiz sonuçlarına itiraz etme',
              ].map((right, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="checkmark-circle" size={16} color="#654BE9" />
                  <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{right}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Contact */}
          <View style={{ borderRadius: 12, borderWidth: 1, backgroundColor: colors.card, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="mail-outline" size={18} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>İletişim</Text>
            </View>
            <View style={{ gap: 10 }}>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('mailto:destek@golaks.com')}>
                <Icon name="mail-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>destek@golaks.com</Text>
              </Pressable>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('tel:+908504664664')}>
                <Icon name="call-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>+90 850 466 4 664</Text>
              </Pressable>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('https://www.golaks.com')}>
                <Icon name="globe-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>www.golaks.com</Text>
              </Pressable>
            </View>
          </View>

          {/* Copyright */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>Veri Sorumlusu: Polaris Dış Ticaret Ltd. Şti.</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>
              © 1995-{new Date().getFullYear()} Golaks. Tüm Hakları Saklıdır.
            </Text>
          </View>
        </BottomSheet>

        {/* About Bottom Sheet */}
        <BottomSheet
          visible={showAboutModal}
          title="Hakkımızda"
          icon="information-circle-outline"
          iconColor={colors.primary}
          onClose={() => setShowAboutModal(false)}
          showFooter={false}
        >
          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.primary + '10', borderRadius: 12, paddingVertical: 14 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary }}>{new Date().getFullYear() - 1995}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>Yıl Tecrübe</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#10B98110', borderRadius: 12, paddingVertical: 14 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#10B981' }}>300+</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>Aktif Firma</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#F59E0B10', borderRadius: 12, paddingVertical: 14 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#F59E0B' }}>7/24</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>Destek</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={{ fontSize: 14, lineHeight: 22, color: colors.textSecondary, textAlign: 'justify', marginBottom: 20 }}>
            1995 yılında kurulan Golaks, Türkiye'nin deri sektörüne özel yazılım geliştiren ilk ve en büyük markasıdır. 30 yılı aşkın tecrübemizle 300'den fazla firmaya hizmet veriyor, sektöre yön vermeye devam ediyoruz.
          </Text>

          {/* Milestones */}
          <View style={{ gap: 10, marginBottom: 20 }}>
            {[
              { icon: 'diamond-outline', color: '#654BE9', title: 'Sektörün Öncüsü', desc: 'Türkiye\'nin deri yazılımlarında ilk ve lider markası' },
              { icon: 'layers-outline', color: '#10B981', title: 'Entegre Çözümler', desc: 'ERP, muhasebe, stok, üretim ve sipariş yönetimi' },
              { icon: 'shield-checkmark-outline', color: '#3B82F6', title: 'Güvenli Altyapı', desc: 'İstanbul Tier-3 veri merkezi, SSL/AES-256 şifreleme' },
              { icon: 'headset-outline', color: '#EC4899', title: 'Öncelikli Destek', desc: 'İlk temasta çözüm odaklı, uzman destek ekibi' },
            ].map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  gap: 12,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: item.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }}>{item.title}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Contact Section Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="globe-outline" size={18} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>İletişim</Text>
          </View>

          {/* Turkey Office Card - Merkez */}
          <View style={{ borderRadius: 12, borderWidth: 1, padding: 16, backgroundColor: colors.card, borderColor: colors.border, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 28 }}>{'\u{1F1F9}\u{1F1F7}'}</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Türkiye (Merkez)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#10B98115', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981' }}>Aktif</Text>
                </View>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Icon name="location-outline" size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 18 }}>
                  Alipaşa Mah. Sülün Cad.{'\n'}Ballıoğlu İş Merkezi, Çorlu/Tekirdağ
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>09:00 - 18:00 (GMT+3)</Text>
              </View>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('tel:+908504664664')}>
                <Icon name="call-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>+90 850 466 4 664</Text>
              </Pressable>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('mailto:info@golaks.com')}>
                <Icon name="mail-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>info@golaks.com</Text>
              </Pressable>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('https://www.golaks.com')}>
                <Icon name="globe-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>www.golaks.com</Text>
              </Pressable>
            </View>
          </View>

          {/* Canada Office Card */}
          <View style={{ borderRadius: 12, borderWidth: 1, padding: 16, backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 28 }}>{'\u{1F1E8}\u{1F1E6}'}</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Kanada</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#10B98115', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981' }}>Aktif</Text>
                </View>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Icon name="location-outline" size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 18 }}>
                  3300 Capilano Road, V7R 4H8{'\n'}North Vancouver, BC, Canada
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>09:00 - 18:00 (GMT-8 PST)</Text>
              </View>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('mailto:info@golaks.com')}>
                <Icon name="mail-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>info@golaks.com</Text>
              </Pressable>
            </View>
          </View>

          {/* Version & Copyright */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>{versionString}</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>Polaris Dış Ticaret Ltd. Şti.</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>
              © 1995-{new Date().getFullYear()} Golaks. Tüm Hakları Saklıdır.
            </Text>
          </View>
        </BottomSheet>

        <PriceSettingsSheet
          visible={showPriceSettings}
          onClose={() => setShowPriceSettings(false)}
        />

        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />
      </View>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 120,
    },
    pageHeader: {
      marginBottom: 16,
    },
    pageTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    pageTitleIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.6,
    },
    profileCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarContainer: {
      marginBottom: 16,
      position: 'relative',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? colors.primaryBackground : colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.primary + '40',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 40,
    },
    avatarLoading: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 40,
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.card,
    },
    userName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    userCompany: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 6,
    },
    packageBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 8,
    },
    packageText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    userRole: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 4,
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: colors.primary + '15',
      borderRadius: 12,
      overflow: 'hidden',
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 4,
    },
    superAdminBadge: {
      backgroundColor: isDark ? 'rgba(20, 184, 166, 0.2)' : '#F0FDFA',
    },
    adminBadge: {
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
    },
    userBadge: {
      backgroundColor: isDark ? 'rgba(129, 140, 248, 0.2)' : '#E0E7FF',
    },
    roleText: {
      fontSize: 11,
      fontWeight: '600',
      opacity: 0.7,
    },
    superAdminText: {
      color: '#14B8A6',
    },
    adminText: {
      color: colors.primary,
    },
    userText: {
      color: '#818CF8',
    },
    section: {
      marginBottom: 24,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
    },
    notificationModalContent: {
      backgroundColor: colors.card,
      paddingBottom: 40,
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    notificationHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    notificationHeaderIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    notificationScrollView: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    settingTextContainer: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    settingDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    notificationFooter: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    calculatingSizeContainer: {
      paddingVertical: 40,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    calculatingSizeText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    notificationModalContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    notificationModalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    legalContent: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
      textAlign: 'justify',
      paddingBottom: 20,
    },
    legalModalContainer: {
      flex: 1,
    },
  });
