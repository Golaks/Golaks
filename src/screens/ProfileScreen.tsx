import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Modal, Image, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
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
import XButton from '../components/XButton';
import Button from '../components/Button';
import IOSSwitch from '../components/IOSSwitch';
import ConfirmDialog from '../components/ConfirmDialog';

interface ProfileScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  onUserManagement?: () => void;
  onNotificationSend?: () => void;
  onCompanyManagement?: () => void;
}

export default function ProfileScreen({ onTabChange, onLogout, onUserManagement, onNotificationSend, onCompanyManagement }: ProfileScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, user, refreshUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('profile');
  const [notificationCount] = useState(3);
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
      console.error('Logout error:', error);
    }
  };

  const handleDirectLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
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
      console.error('Camera error:', error);
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
      console.error('Gallery error:', error);
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
      console.error('Upload error:', error);
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
  // Debug: Log user role
  useEffect(() => {
    if (user) {
      console.log('ProfileScreen - User Role:', user.role);
      console.log('ProfileScreen - User kullanici_rol:', user.kullanici_rol);
      console.log('ProfileScreen - Full User:', JSON.stringify(user, null, 2));
    }
  }, [user]);

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
          value: user.telefon || '',
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
    console.log('Active tab:', tab);
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
      console.error('Profile save error:', error);
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
      console.error('Password change error:', error);
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
      console.error('Notification settings save error:', error);
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // TODO: Implement delete account API call
      console.log('Hesap siliniyor...');
      showSuccess('Hesabınız başarıyla silindi');
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Delete account error:', error);
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
          console.error(`Error reading key ${key}:`, error);
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
      console.error('Calculate cache sizes error:', error);
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

      console.log('Önbellek temizleniyor:', itemsToClean);

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
        console.log(`Temizlenen key sayısı: ${uniqueKeysToRemove.length}`);
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
      console.error('Clear cache error:', error);
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
            console.log('Super Admin Check:', {
              role: user?.role,
              kullanici_rol: user?.kullanici_rol,
              isSuperAdmin,
            });
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
              name="Genel Ayarlar"
              icon="options-outline"
              color={colors.primary}
              description="Genel uygulama ayarları"
              onPress={() => console.log('General settings pressed')}
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
              name="Uygulama Hakkında"
              icon="information-circle-outline"
              color={colors.primary}
              description="Versiyon 1.0.0"
              onPress={() => setShowAboutModal(true)}
            />
          </View>

          {/* Account Actions Section */}
          <View style={styles.section}>
            <SectionTitle title="Hesap İşlemleri" />
            <MenuCard
              name="Güvenli Çıkış"
              icon="log-out-outline"
              color={colors.primary}
              description="Hesaptan güvenli çıkış yap"
              onPress={handleLogoutPress}
            />
            <MenuCard
              name="Hesabımı Kapat"
              icon="close-circle-outline"
              color={colors.primary}
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
          saveButtonText="Şifreyi Güncelle"
        />

        {/* Clear Cache Modal */}
        <Modal
          visible={showClearCacheModal}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setShowClearCacheModal(false)}
        >
          <SafeAreaView style={[styles.legalModalContainer, { backgroundColor: colors.card }]} edges={['top', 'bottom']}>
              {/* Header */}
              <View style={styles.notificationHeader}>
                <View style={styles.notificationHeaderLeft}>
                  <View style={[styles.notificationHeaderIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Icon name="trash-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.notificationTitle}>Önbellek Temizle</Text>
                </View>
                <XButton onPress={() => setShowClearCacheModal(false)} size={36} iconSize={20} />
              </View>

              {/* Cache Types List */}
              <ScrollView
                style={styles.notificationScrollView}
                showsVerticalScrollIndicator={false}
              >
                {isCalculatingSize ? (
                  <View style={styles.calculatingSizeContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.calculatingSizeText}>Önbellek boyutu hesaplanıyor...</Text>
                  </View>
                ) : (
                  <>
                    {/* Temp Files */}
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

                    {/* Image Cache */}
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

                    {/* API Cache */}
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

                    {/* App Data (Dangerous) */}
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

                    {/* Session Data (Very Dangerous - Logout) */}
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
              </ScrollView>

              {/* Footer Buttons */}
              <View style={styles.notificationFooter}>
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
              </View>
          </SafeAreaView>
        </Modal>

        {/* Notification Settings Modal */}
        <Modal
          visible={showNotificationModal}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setShowNotificationModal(false)}
        >
          <SafeAreaView style={[styles.legalModalContainer, { backgroundColor: colors.card }]} edges={['top', 'bottom']}>
              {/* Header */}
              <View style={styles.notificationHeader}>
                <View style={styles.notificationHeaderLeft}>
                  <View style={[styles.notificationHeaderIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Icon name="notifications-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.notificationTitle}>Bildirim Ayarları</Text>
                </View>
                <XButton onPress={() => setShowNotificationModal(false)} size={36} iconSize={20} />
              </View>

              {/* Settings List */}
              <ScrollView
                style={styles.notificationScrollView}
                showsVerticalScrollIndicator={false}
              >
                {/* Push Notifications */}
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

                {/* Email Notifications */}
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

                {/* SMS Notifications */}
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

                {/* Promotions */}
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

                {/* System Alerts */}
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
              </ScrollView>

              {/* Footer Buttons */}
              <View style={styles.notificationFooter}>
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
              </View>
          </SafeAreaView>
        </Modal>

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

        {/* Terms of Service Modal */}
        <Modal
          visible={showTermsModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowTermsModal(false)}
        >
          <SafeAreaView style={[styles.legalModalContainer, { backgroundColor: colors.card }]} edges={['top', 'bottom']}>
              {/* Header */}
              <View style={styles.notificationHeader}>
                <View style={styles.notificationHeaderLeft}>
                  <View style={[styles.notificationHeaderIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Icon name="document-text-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.notificationTitle}>Kullanım Sözleşmesi</Text>
                </View>
                <XButton onPress={() => setShowTermsModal(false)} size={36} iconSize={20} />
              </View>

              {/* Content */}
              <ScrollView
                style={styles.notificationScrollView}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.legalContent}>
{`KULLANIM KOŞULLARI
Golaks Yazılım Hizmetleri

1. GENEL HÜKÜMLER VE KAPSAM
Bu Kullanım Koşulları ("Sözleşme"), Golaks Yazılım Hizmetleri ("Golaks", "biz", "bizim") tarafından sunulan mobil uygulama ve ilgili hizmetlerin kullanımına ilişkin şartları düzenlemektedir. Uygulamayı indirerek, kurarak veya kullanarak bu koşulları kabul etmiş sayılırsınız.

Bu Sözleşme, 6098 sayılı Türk Borçlar Kanunu ve ilgili mevzuat çerçevesinde hazırlanmıştır.

2. HİZMET TANIMI
Golaks, işletmelere aşağıdaki alanlarda hizmet veren bulut tabanlı bir yazılım platformudur:
• Deri sektörü için özelleştirilmiş ERP çözümleri
• Muhasebe ve finans yönetimi
• Stok ve envanter takibi
• Sipariş ve üretim yönetimi
• Raporlama ve iş analitiği
• Fatura ve belge yönetimi

Hizmetlerimiz, abonelik modeli çerçevesinde sunulmakta olup, farklı paketler ve özellikler içerebilir.

3. HESAP OLUŞTURMA VE GÜVENLİK
Hesap Oluşturma:
• Hizmetlerimizi kullanmak için geçerli bir hesap oluşturmanız gerekmektedir
• Kayıt sırasında doğru ve güncel bilgiler sağlamakla yükümlüsünüz
• Her kullanıcı yalnızca bir hesap oluşturabilir

Hesap Güvenliği:
• Hesap bilgilerinizin ve şifrenizin gizliliğinden tamamen siz sorumlusunuz
• Güçlü bir şifre kullanmanız ve düzenli olarak değiştirmeniz önerilir
• Hesabınızda şüpheli bir aktivite fark ederseniz derhal destek@golaks.com adresine bildirin
• Hesabınız üzerinden gerçekleştirilen tüm işlemlerden siz sorumlusunuz

4. KULLANIM KURALLARI
Kabul Edilebilir Kullanım:
• Uygulama yalnızca yasal ve meşru iş amaçlarıyla kullanılabilir
• Türkiye Cumhuriyeti yasalarına ve uluslararası hukuka uygun hareket etmelisiniz
• Diğer kullanıcıların haklarına saygı göstermelisiniz

Yasak Faaliyetler:
• Uygulamaya yetkisiz erişim girişimleri
• Kötü amaçlı yazılım veya virüs yayma
• Hizmetin normal işleyişini engelleyen eylemler
• Tersine mühendislik, kaynak kod çözümleme
• Uygulamanın veya verilerinin izinsiz kopyalanması
• Sahte veya yanıltıcı bilgi girişi
• Spam veya istenmeyen toplu mesaj gönderimi

5. FİKRİ MÜLKİYET HAKLARI
Golaks'a Ait Haklar:
• Golaks markası, logoları, tasarımları ve yazılımı Golaks'ın münhasır mülkiyetindedir
• Uygulama ve içeriği 5846 sayılı Fikir ve Sanat Eserleri Kanunu ile korunmaktadır
• Yazılımın kaynak kodu ticari sır niteliğindedir

Lisans:
• Size, bu Sözleşme şartlarına uygun olarak uygulamayı kullanmak için kişisel, devredilemez, münhasır olmayan bir lisans verilmektedir
• Bu lisans, aboneliğiniz veya hesabınız aktif olduğu sürece geçerlidir

6. ÖDEME VE ABONELİK
Ücretlendirme:
• Hizmet ücretleri, seçtiğiniz abonelik planına göre belirlenir
• Fiyatlar, KDV dahil veya hariç olarak belirtilebilir
• Ödeme koşulları, fatura döngüsü ve yenileme şartları ayrıca bildirilir

İptal ve İade:
• Abonelik iptali, cari dönem sonunda geçerli olur
• İade politikası, yasal düzenlemeler çerçevesinde uygulanır
• Ücretsiz deneme döneminde iptal halinde ücret alınmaz

7. VERİ VE GİZLİLİK
• Kişisel verilerinizin işlenmesi, Gizlilik Politikamız kapsamında gerçekleştirilir
• İş verileriniz şifreli olarak saklanır ve korunur
• Verilerinizi dışa aktarma hakkınız saklıdır
• Hesap kapatma durumunda verileriniz yasal saklama süreleri sonunda silinir

8. HİZMET SEVİYESİ VE DESTEK
Hizmet Sürekliliği:
• Yüksek erişilebilirlik hedeflenmekte olup, planlı bakımlar önceden duyurulur
• Beklenmedik kesintilerde en kısa sürede müdahale edilir

Müşteri Desteği:
• Teknik destek, çalışma saatleri içinde sağlanmaktadır
• Destek kanalları: E-posta, telefon ve uygulama içi destek
• Acil durumlar için öncelikli destek mevcuttur

9. SORUMLULUK SINIRLAMALARI
Garanti Reddi:
• Hizmet "olduğu gibi" ve "mevcut haliyle" sunulmaktadır
• Golaks, hizmetin kesintisiz veya hatasız olacağını garanti etmez
• Üçüncü taraf entegrasyonlardan kaynaklanan sorunlardan sorumlu değiliz

Sorumluluk Sınırı:
• Golaks'ın sorumluluğu, son 12 ayda ödediğiniz toplam ücretle sınırlıdır
• Dolaylı, arızi veya cezai zararlardan sorumluluk kabul edilmez
• Bu sınırlamalar, yasaların izin verdiği ölçüde geçerlidir

10. SÖZLEŞME DEĞİŞİKLİKLERİ
• Bu koşullar önceden bildirimle güncellenebilir
• Önemli değişiklikler en az 30 gün önceden duyurulur
• Değişiklikleri kabul etmemeniz halinde hesabınızı kapatabilirsiniz
• Değişiklik sonrası hizmeti kullanmaya devam etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir

11. FESİH
Kullanıcı Tarafından:
• Hesabınızı istediğiniz zaman kapatabilirsiniz
• Aktif abonelik döneminin sonuna kadar hizmet devam eder

Golaks Tarafından:
• Kullanım koşullarının ihlali halinde hesabınız askıya alınabilir veya kapatılabilir
• Ağır ihlallerde önceden bildirim yapılmaksızın fesih hakkı saklıdır

12. UYUŞMAZLIK ÇÖZÜMÜ
• Bu Sözleşme, Türkiye Cumhuriyeti yasalarına tabidir
• Uyuşmazlıklarda Tekirdağ Mahkemeleri ve İcra Daireleri yetkilidir
• Taraflar, uyuşmazlıkları öncelikle sulh yoluyla çözmeye çalışacaktır

13. İLETİŞİM
Kullanım koşulları hakkındaki sorularınız için:
E-posta: destek@golaks.com
Telefon: +90 850 466 4 664
Web: www.golaks.com

Golaks Yazılım Hizmetleri
Tekirdağ, Türkiye

© 1995-${new Date().getFullYear()} Golaks. Tüm Hakları Saklıdır.
Son Güncelleme: Aralık 2025`}
                </Text>
              </ScrollView>

              {/* Footer */}
              <View style={styles.notificationFooter}>
                <Button
                  text="Kapat"
                  onPress={() => setShowTermsModal(false)}
                  style={{ flex: 1 }}
                />
              </View>
          </SafeAreaView>
        </Modal>

        {/* Privacy Policy Modal */}
        <Modal
          visible={showPrivacyModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowPrivacyModal(false)}
        >
          <SafeAreaView style={[styles.legalModalContainer, { backgroundColor: colors.card }]} edges={['top', 'bottom']}>
              {/* Header */}
              <View style={styles.notificationHeader}>
                <View style={styles.notificationHeaderLeft}>
                  <View style={[styles.notificationHeaderIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Icon name="shield-checkmark-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.notificationTitle}>Gizlilik Politikası</Text>
                </View>
                <XButton onPress={() => setShowPrivacyModal(false)} size={36} iconSize={20} />
              </View>

              {/* Content */}
              <ScrollView
                style={styles.notificationScrollView}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.legalContent}>
{`GİZLİLİK POLİTİKASI
Golaks Yazılım Hizmetleri

1. GİRİŞ
Bu Gizlilik Politikası, Golaks Yazılım Hizmetleri ("Golaks", "biz", "bizim") tarafından sunulan mobil uygulama ve hizmetler aracılığıyla kişisel verilerinizin nasıl toplandığını, işlendiğini, saklandığını ve korunduğunu açıklamaktadır. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu sıfatıyla hareket etmekteyiz.

2. TOPLANAN KİŞİSEL VERİLER
Hizmetlerimizi kullanırken aşağıdaki kişisel verilerinizi toplayabiliriz:

Kimlik Bilgileri:
• Ad, soyad ve kullanıcı adı
• T.C. kimlik numarası (gerekli hallerde)
• Şirket/işletme bilgileri

İletişim Bilgileri:
• E-posta adresi
• Telefon numarası
• Adres bilgileri

Hesap ve İşlem Verileri:
• Kullanıcı hesabı bilgileri
• Şifre (şifrelenmiş olarak)
• İşlem geçmişi ve kayıtları
• Fatura ve ödeme bilgileri

Teknik Veriler:
• IP adresi ve konum bilgileri
• Cihaz türü, modeli ve işletim sistemi
• Uygulama kullanım istatistikleri
• Oturum bilgileri ve çerezler

3. VERİ TOPLAMA YÖNTEMLERİ
Kişisel verilerinizi aşağıdaki yöntemlerle toplamaktayız:
• Uygulama üzerinden doğrudan sizin tarafınızdan sağlanan bilgiler
• Otomatik toplama (çerezler, analitik araçlar)
• Üçüncü taraf entegrasyonları (ödeme sistemleri vb.)

4. VERİLERİN İŞLENME AMAÇLARI
Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
• Hizmetlerimizin sunulması ve yönetilmesi
• Kullanıcı hesaplarının oluşturulması ve yönetimi
• Müşteri desteği ve iletişim
• Faturalama ve ödeme işlemleri
• Yasal yükümlülüklerin yerine getirilmesi
• Hizmet kalitesinin iyileştirilmesi
• Güvenlik ve dolandırıcılık önleme
• İstatistiksel analizler ve raporlama

5. VERİ GÜVENLİĞİ
Verilerinizin güvenliğini sağlamak için aşağıdaki önlemleri almaktayız:
• SSL/TLS şifreleme ile veri iletimi
• AES-256 şifreleme ile veri depolama
• Düzenli güvenlik denetimleri ve penetrasyon testleri
• Erişim kontrolü ve yetkilendirme sistemleri
• Güvenlik duvarları ve saldırı tespit sistemleri
• İstanbul'daki Tier-3 sertifikalı veri merkezinde barındırma
• Düzenli yedekleme ve felaket kurtarma planları

6. VERİ SAKLAMA SÜRESİ
Kişisel verileriniz, işleme amaçlarının gerektirdiği süre boyunca ve yasal saklama sürelerine uygun olarak muhafaza edilir:
• Hesap bilgileri: Hesap aktif olduğu sürece
• İşlem kayıtları: 10 yıl (yasal zorunluluk)
• Teknik loglar: 2 yıl
• Pazarlama verileri: Onay geri çekilene kadar

7. ÜÇÜNCÜ TARAF PAYLAŞIMI
Kişisel verileriniz aşağıdaki durumlar dışında üçüncü taraflarla paylaşılmaz:
• Yasal zorunluluklar (mahkeme kararı, resmi kurum talepleri)
• Ödeme işlemleri için banka ve ödeme kuruluşları
• Hizmet sağlayıcılarımız (gizlilik sözleşmesi kapsamında)
• Açık rızanızın bulunduğu durumlar

Verileriniz hiçbir koşulda satılmaz veya pazarlama amacıyla üçüncü taraflara aktarılmaz.

8. ÇEREZLER VE İZLEME TEKNOLOJİLERİ
Uygulamamız aşağıdaki amaçlarla çerezler kullanabilir:
• Oturum yönetimi ve kimlik doğrulama
• Kullanıcı tercihlerinin hatırlanması
• Performans analizi ve iyileştirme
• Güvenlik amaçlı izleme

Çerez tercihlerinizi uygulama ayarlarından yönetebilirsiniz.

9. KVKK KAPSAMINDAKİ HAKLARINIZ
6698 sayılı KVKK'nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:
• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• İşlenmişse buna ilişkin bilgi talep etme
• İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme
• Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme
• Eksik veya yanlış işlenmişse düzeltilmesini isteme
• KVKK'nın 7. maddesindeki şartlar çerçevesinde silinmesini isteme
• Düzeltme/silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme
• İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme
• Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme

10. ÇOCUKLARIN GİZLİLİĞİ
Hizmetlerimiz 18 yaş altındaki kullanıcılara yönelik değildir. Bilerek 18 yaş altındaki kişilerden kişisel veri toplamıyoruz.

11. POLİTİKA DEĞİŞİKLİKLERİ
Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler uygulama içi bildirim veya e-posta yoluyla duyurulacaktır. Güncel politikayı düzenli olarak kontrol etmenizi öneririz.

12. İLETİŞİM
Gizlilik politikamız veya kişisel verilerinizle ilgili sorularınız için:
E-posta: destek@golaks.com
Telefon: +90 850 466 4 664

Veri Sorumlusu: Golaks Yazılım Hizmetleri
www.golaks.com

© 1995-${new Date().getFullYear()} Golaks. Tüm Hakları Saklıdır.
Son Güncelleme: Aralık 2025`}
                </Text>
              </ScrollView>

              {/* Footer */}
              <View style={styles.notificationFooter}>
                <Button
                  text="Kapat"
                  onPress={() => setShowPrivacyModal(false)}
                  style={{ flex: 1 }}
                />
              </View>
          </SafeAreaView>
        </Modal>

        {/* About Modal */}
        <Modal
          visible={showAboutModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowAboutModal(false)}
        >
          <SafeAreaView style={[styles.legalModalContainer, { backgroundColor: colors.card }]} edges={['top', 'bottom']}>
              {/* Header */}
              <View style={styles.notificationHeader}>
                <View style={styles.notificationHeaderLeft}>
                  <View style={[styles.notificationHeaderIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Icon name="information-circle-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.notificationTitle}>Uygulama Hakkında</Text>
                </View>
                <XButton onPress={() => setShowAboutModal(false)} size={36} iconSize={20} />
              </View>

              {/* Content */}
              <ScrollView
                style={styles.notificationScrollView}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.legalContent}>
{`GOLAKS
1995'ten Bu Yana Üst Düzey Yazılım Çözümleri

HAKKIMIZDA
1995 yılında kurulan Golaks, Türkiye'nin deri yazılımları alanında hizmet veren ilk firması olma unvanına sahiptir. Bugün 300'ü aşkın firmaya hizmet vermenin gururunu yaşıyor, Türkiye'nin en büyük deri yazılım markası olarak sektöre yön veriyoruz.

Tekirdağ merkezli ofisimiz ve İstanbul'daki dünya standartlarındaki veri merkezimizde, 10'dan fazla uzman personelimizle 1995'ten bu yana kazandığımız tecrübeyi müşterilerimizle paylaşıyoruz.

UZMANLIK ALANLARIMIZ
• Deri Yazılımları
• Entegre Yönetim Sistemleri
• Özel Yazılım Projeleri
• Elektronik Tasarım ve Programlama

HİZMETLERİMİZ
• Yazılım Lisanslama ve Kurulum
• Sunucu Kiralama ve Barındırma
• Güvenlik Çözümleri
• Müşteri Destek Servisleri

MÜŞTERİ MEMNUNİYETİ
Müşteri memnuniyeti önceliğimizdir. Ülkemizdeki diğer firmalardan farklı olarak, ilk iletişiminizde çözüme ulaşmanızı hedefliyoruz. Her müşterimize özel atanan destek uzmanlarımız, ilk temasta çözüm üretebilmeleri için özenle seçilmiş ve yetiştirilmiştir.

VİZYONUMUZ
Yenilenme ve teknolojiyi takip etme felsefesiyle yolumuza devam ediyoruz. Her geçen gün portföyümüze yeni ürünler ekliyor, mevcut çözümlerimizi teknolojiye uyumlu olarak geliştiriyoruz.

"Siz işinize odaklanın, operasyon ve finansınızı yazılımlarımız yönetsin."

İLETİŞİM
Merkez: Tekirdağ • Veri Merkezi: İstanbul
www.golaks.com • info@golaks.com

Versiyon 1.0.0
© 1995-${new Date().getFullYear()} Golaks • Tüm Hakları Saklıdır`}
                </Text>
              </ScrollView>

              {/* Footer */}
              <View style={styles.notificationFooter}>
                <Button
                  text="Kapat"
                  onPress={() => setShowAboutModal(false)}
                  style={{ flex: 1 }}
                />
              </View>
          </SafeAreaView>
        </Modal>

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
