import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import ActionFormModal, { FormField } from '../components/ActionFormModal';
import ImagePickerModal from '../components/ImagePickerModal';
import Button from '../components/Button';
import IOSSwitch from '../components/IOSSwitch';
import ConfirmDialog from '../components/ConfirmDialog';
import BottomSheet from '../components/BottomSheet';
import LegalBottomSheet, { LegalType } from '../components/LegalBottomSheet';
import AboutBottomSheet from '../components/AboutBottomSheet';

interface ProfileScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  onUserManagement?: () => void;
  onNotificationSend?: () => void;
  onCompanyManagement?: () => void;
  onFiyatHesaplama?: () => void;
  onSubeAyarlari?: () => void;
}

export default function ProfileScreen({ onTabChange, onLogout, onUserManagement, onNotificationSend, onCompanyManagement, onFiyatHesaplama, onSubeAyarlari }: ProfileScreenProps) {
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
  const [legalType, setLegalType] = useState<LegalType | null>(null);
  const [showAboutSheet, setShowAboutSheet] = useState(false);
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

  const [profileFields, setProfileFields] = useState<FormField[]>([
    {
      key: 'fullName',
      label: 'Ad Soyad',
      icon: 'person-outline',
      placeholder: 'Adınızı ve soyadınızı girin',
      value: '',
    },
    {
      key: 'phone',
      label: 'Telefon',
      icon: 'call-outline',
      placeholder: 'Telefon numaranızı girin',
      keyboardType: 'phone-pad',
      value: '',
    },
  ]);

  const [passwordFields, setPasswordFields] = useState<FormField[]>([
    {
      key: 'currentPassword',
      label: 'Mevcut Şifre',
      icon: 'lock-closed-outline',
      placeholder: 'Mevcut şifrenizi girin',
      isPassword: true,
      value: '',
    },
    {
      key: 'newPassword',
      label: 'Yeni Şifre',
      icon: 'key-outline',
      placeholder: 'Yeni şifrenizi girin',
      isPassword: true,
      value: '',
    },
    {
      key: 'confirmPassword',
      label: 'Yeni Şifre (Tekrar)',
      icon: 'key-outline',
      placeholder: 'Yeni şifrenizi tekrar girin',
      isPassword: true,
      value: '',
    },
  ]);

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
      setProfileFields([
        {
          key: 'fullName',
          label: 'Ad Soyad',
          icon: 'person-outline',
          placeholder: 'Adınızı ve soyadınızı girin',
          value: user.name || '',
        },
        {
          key: 'phone',
          label: 'Telefon',
          icon: 'call-outline',
          placeholder: 'Telefon numaranızı girin',
          keyboardType: 'phone-pad',
          value: (user as any).phone || user.kullanici_telefon || user.telefon || '',
        },
      ]);
    }
  }, [user]);

  const styles = createStyles(colors, isDark);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleProfileFieldChange = (key: string, value: string) => {
    setProfileFields(fields =>
      fields.map(field => field.key === key ? { ...field, value, error: undefined } : field)
    );
  };

  const handleProfileSave = async () => {
    // Validation
    let hasError = false;
    const updatedFields = profileFields.map(field => {
      if (field.key === 'fullName' && !field.value) {
        hasError = true;
        return { ...field, error: 'Ad soyad gerekli' };
      }
      if (field.key === 'phone' && !field.value) {
        hasError = true;
        return { ...field, error: 'Telefon gerekli' };
      }
      return field;
    });

    if (hasError) {
      setProfileFields(updatedFields);
      return;
    }

    try {
      const name = profileFields.find(f => f.key === 'fullName')?.value || '';
      const phone = profileFields.find(f => f.key === 'phone')?.value || '';

      const result = await profileService.updateProfile(name, phone);

      if (result.success && result.user) {
        // Update user in storage
        if (user) {
          const updatedUser = {
            ...user,
            name: result.user.name,
            telefon: result.user.phone || result.user.telefon || phone,
            kullanici_telefon: result.user.phone || result.user.telefon || phone,
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

  const handlePasswordFieldChange = (key: string, value: string) => {
    setPasswordFields(fields =>
      fields.map(field => field.key === key ? { ...field, value, error: undefined } : field)
    );
  };

  const handlePasswordSave = async () => {
    // Validation
    const currentPassword = passwordFields.find(f => f.key === 'currentPassword')?.value || '';
    const newPassword = passwordFields.find(f => f.key === 'newPassword')?.value || '';
    const confirmPassword = passwordFields.find(f => f.key === 'confirmPassword')?.value || '';

    let hasError = false;
    const updatedFields = passwordFields.map(field => {
      if (field.key === 'currentPassword' && !field.value) {
        hasError = true;
        return { ...field, error: 'Mevcut şifre gerekli' };
      }
      if (field.key === 'newPassword' && !field.value) {
        hasError = true;
        return { ...field, error: 'Yeni şifre gerekli' };
      } else if (field.key === 'newPassword' && field.value.length < 6) {
        hasError = true;
        return { ...field, error: 'Şifre en az 6 karakter olmalı' };
      }
      if (field.key === 'confirmPassword' && !field.value) {
        hasError = true;
        return { ...field, error: 'Şifre tekrarı gerekli' };
      } else if (field.key === 'confirmPassword' && field.value !== newPassword) {
        hasError = true;
        return { ...field, error: 'Şifreler eşleşmiyor' };
      }
      return field;
    });

    if (hasError) {
      setPasswordFields(updatedFields);
      return;
    }

    try {
      const result = await profileService.changePassword(currentPassword, newPassword);

      if (result.success) {
        showSuccess('Şifreniz başarıyla değiştirildi');

        // Reset and close
        setPasswordFields(fields => fields.map(f => ({ ...f, value: '', error: undefined })));
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
              name="Önbellek Temizle"
              icon="trash-outline"
              color={colors.primary}
              description="Uygulama önbelleğini temizle"
              onPress={() => setShowClearCacheModal(true)}
            />
            <MenuCard
              name="Fiyat Hesaplama Algoritması"
              icon="calculator-outline"
              color={colors.primary}
              description="Fiyat hesaplama kurallarını yönet"
              onPress={onFiyatHesaplama || (() => {})}
              disabled={user?.role === 'user' || user?.kullanici_rol === 0}
            />
            <MenuCard
              name="Şube Ayarları"
              icon="business-outline"
              color={colors.primary}
              description="Şube bilgilerini ve ayarlarını yönet"
              onPress={onSubeAyarlari || (() => {})}
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
              onPress={() => setLegalType('terms')}
            />
            <MenuCard
              name="Gizlilik Politikası"
              icon="shield-checkmark-outline"
              color={colors.primary}
              description="Gizlilik koşullarını inceleyin"
              onPress={() => setLegalType('privacy')}
            />
            <MenuCard
              name="Çerez Politikası"
              icon="finger-print-outline"
              color={colors.primary}
              description="Çerez kullanım politikamız"
              onPress={() => setLegalType('cookies')}
            />
            <MenuCard
              name="Uygulama Hakkında"
              icon="information-circle-outline"
              color={colors.primary}
              description={versionString}
              onPress={() => setShowAboutSheet(true)}
            />
          </View>

          {/* Account Actions Section */}
          <View style={styles.section}>
            <SectionTitle title="Hesap İşlemleri" />
            <MenuCard
              name="Güvenli Çıkış"
              icon="log-out-outline"
              color="#EF4444"
              description="Hesaptan güvenli çıkış yap"
              onPress={handleLogoutPress}
            />
            <MenuCard
              name="Hesabımı Kapat"
              icon="close-circle-outline"
              color="#EF4444"
              description="Hesabınızı kalıcı olarak silin"
              onPress={() => setShowDeleteAccountConfirm(true)}
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

        <ActionFormModal
          visible={showProfileModal}
          title="Profil Bilgileri"
          icon="person-outline"
          iconColor={colors.primary}
          fields={profileFields}
          onClose={() => setShowProfileModal(false)}
          onSave={handleProfileSave}
          onFieldChange={handleProfileFieldChange}
          saveButtonText="Kaydet"
        />

        <ActionFormModal
          visible={showPasswordModal}
          title="Şifre Değiştir"
          icon="lock-closed-outline"
          iconColor={colors.primary}
          fields={passwordFields}
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordFields(fields => fields.map(f => ({ ...f, value: '', error: undefined })));
          }}
          onSave={handlePasswordSave}
          onFieldChange={handlePasswordFieldChange}
          saveButtonText="Kaydet"
        />

        {/* Clear Cache Bottom Sheet */}
        <BottomSheet
          visible={showClearCacheModal}
          onClose={() => setShowClearCacheModal(false)}
          title="Önbellek Temizle"
          icon="trash-outline"
          iconColor={colors.primary}
          footer={
            <>
              <Button
                text="İptal"
                variant="secondary"
                onPress={() => setShowClearCacheModal(false)}
                icon="close-outline"
                style={{ flex: 1 }}
              />
              <Button
                text="Temizle"
                variant="primary"
                onPress={handleClearCache}
                icon="trash-outline"
                loading={isClearingCache}
                style={{ flex: 1 }}
              />
            </>
          }>
          {isCalculatingSize ? (
            <View style={styles.calculatingSizeContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.calculatingSizeText}>Önbellek boyutu hesaplanıyor...</Text>
            </View>
          ) : (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Icon name="document-outline" size={20} color={colors.primary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Geçici Dosyalar</Text>
                    <Text style={styles.settingSubtitle}>
                      {cacheSizes.tempFiles > 0 ? `${cacheSizes.tempFiles} MB` : 'Temiz'}
                    </Text>
                  </View>
                </View>
                <IOSSwitch
                  value={cacheSettings.tempFiles}
                  onValueChange={(value) =>
                    setCacheSettings({ ...cacheSettings, tempFiles: value })
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Icon name="image-outline" size={20} color={colors.primary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Görsel Önbelleği</Text>
                    <Text style={styles.settingSubtitle}>
                      {cacheSizes.imageCache > 0 ? `${cacheSizes.imageCache} MB` : 'Temiz'}
                    </Text>
                  </View>
                </View>
                <IOSSwitch
                  value={cacheSettings.imageCache}
                  onValueChange={(value) =>
                    setCacheSettings({ ...cacheSettings, imageCache: value })
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Icon name="cloud-outline" size={20} color={colors.primary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>API Yanıtları</Text>
                    <Text style={styles.settingSubtitle}>
                      {cacheSizes.apiCache > 0 ? `${cacheSizes.apiCache} MB` : 'Temiz'}
                    </Text>
                  </View>
                </View>
                <IOSSwitch
                  value={cacheSettings.apiCache}
                  onValueChange={(value) =>
                    setCacheSettings({ ...cacheSettings, apiCache: value })
                  }
                />
              </View>

              <View style={styles.settingDivider} />

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Icon name="warning-outline" size={20} color="#F59E0B" />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Uygulama Verileri</Text>
                    <Text style={[styles.settingSubtitle, { color: cacheSizes.appData > 0 ? '#F59E0B' : colors.textSecondary }]}>
                      {cacheSizes.appData > 0
                        ? `Dikkat! Oturum açık kalır (${cacheSizes.appData} MB)`
                        : 'Temiz - Oturum açık kalır'
                      }
                    </Text>
                  </View>
                </View>
                <IOSSwitch
                  value={cacheSettings.appData}
                  onValueChange={(value) =>
                    setCacheSettings({ ...cacheSettings, appData: value })
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Icon name="exit-outline" size={20} color="#EF4444" />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Oturum Bilgileri</Text>
                    <Text style={[styles.settingSubtitle, { color: cacheSizes.sessionData > 0 ? '#EF4444' : colors.textSecondary }]}>
                      {cacheSizes.sessionData > 0
                        ? `Dikkat! Çıkış yapılacak (${cacheSizes.sessionData} MB)`
                        : 'Temiz - Çıkış yapılır'
                      }
                    </Text>
                  </View>
                </View>
                <IOSSwitch
                  value={cacheSettings.sessionData}
                  onValueChange={(value) =>
                    setCacheSettings({ ...cacheSettings, sessionData: value })
                  }
                />
              </View>

              {/* Info Box */}
              <View style={[styles.settingItem, {
                backgroundColor: cacheSettings.sessionData ? '#EF444408' : colors.primary + '08',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: cacheSettings.sessionData ? '#EF444420' : colors.primary + '20',
                marginTop: 12,
                padding: 16,
                flexDirection: 'column',
                alignItems: 'flex-start',
              }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Icon
                    name={cacheSettings.sessionData ? "alert-circle-outline" : "information-circle-outline"}
                    size={22}
                    color={cacheSettings.sessionData ? '#EF4444' : colors.primary}
                  />
                  <Text style={[styles.settingTitle, {
                    color: cacheSettings.sessionData ? '#EF4444' : colors.primary,
                  }]}>
                    Bilgi
                  </Text>
                </View>
                <Text style={[styles.settingSubtitle, {
                  color: colors.text,
                  lineHeight: 20,
                  textAlign: 'justify',
                  width: '100%',
                }]}>
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
          onClose={() => setShowNotificationModal(false)}
          title="Bildirim Ayarları"
          icon="notifications-outline"
          iconColor={colors.primary}
          footer={
            <>
              <Button
                text="İptal"
                variant="secondary"
                onPress={() => setShowNotificationModal(false)}
                icon="close-outline"
                style={{ flex: 1 }}
              />
              <Button
                text="Kaydet"
                variant="primary"
                onPress={handleNotificationSettingSave}
                icon="checkmark-outline"
                style={{ flex: 1 }}
              />
            </>
          }>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="phone-portrait" size={20} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Anlık Bildirimler</Text>
                <Text style={styles.settingSubtitle}>Uygulama bildirimleri</Text>
              </View>
            </View>
            <IOSSwitch
              value={notificationSettings.pushNotifications}
              onValueChange={(value) =>
                setNotificationSettings({ ...notificationSettings, pushNotifications: value })
              }
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="mail" size={20} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>E-posta Bildirimleri</Text>
                <Text style={styles.settingSubtitle}>E-posta ile bildirim al</Text>
              </View>
            </View>
            <IOSSwitch
              value={notificationSettings.emailNotifications}
              onValueChange={(value) =>
                setNotificationSettings({ ...notificationSettings, emailNotifications: value })
              }
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="chatbubble" size={20} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>SMS Bildirimleri</Text>
                <Text style={styles.settingSubtitle}>SMS ile bildirim al</Text>
              </View>
            </View>
            <IOSSwitch
              value={notificationSettings.smsNotifications}
              onValueChange={(value) =>
                setNotificationSettings({ ...notificationSettings, smsNotifications: value })
              }
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="pricetag" size={20} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Kampanyalar</Text>
                <Text style={styles.settingSubtitle}>Özel teklifler ve indirimler</Text>
              </View>
            </View>
            <IOSSwitch
              value={notificationSettings.promotions}
              onValueChange={(value) =>
                setNotificationSettings({ ...notificationSettings, promotions: value })
              }
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="alert-circle" size={20} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Sistem Uyarıları</Text>
                <Text style={styles.settingSubtitle}>Önemli sistem bildirimleri</Text>
              </View>
            </View>
            <IOSSwitch
              value={notificationSettings.systemAlerts}
              onValueChange={(value) =>
                setNotificationSettings({ ...notificationSettings, systemAlerts: value })
              }
            />
          </View>
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

        {/* Legal Bottom Sheet (Terms / Privacy) */}
        <LegalBottomSheet
          visible={legalType !== null}
          type={legalType || 'terms'}
          onClose={() => setLegalType(null)}
        />

        {/* About Bottom Sheet */}
        <AboutBottomSheet
          visible={showAboutSheet}
          onClose={() => setShowAboutSheet(false)}
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
      marginBottom: 8,
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
      fontSize: 16,
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
  });
