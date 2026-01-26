/**
 * Profile Photo Screen Example
 * Profil fotoğrafı yükleme ekranı örneği
 * Bu dosya örnek amaçlıdır, gerektiğinde kopyalayıp kullanabilirsiniz
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import PermissionModal from '../components/PermissionModal';
import { usePermissions } from '../hooks/usePermissions';
import { profileService } from '../services/profile.service';
import { IMAGE_BASE_URL } from '../constants/ApiConfig';

// TODO: Paketler kurulduktan sonra import edin
// import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export default function ProfilePhotoScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { ensurePermission } = usePermissions();

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    user?.avatar ? `${IMAGE_BASE_URL}/${user.avatar}` : undefined
  );

  const styles = createStyles(colors, isDark);

  /**
   * Fotoğraf seçme seçeneklerini göster
   */
  const showPhotoOptions = () => {
    Alert.alert(
      'Profil Fotoğrafı',
      'Nasıl yüklemek istersiniz?',
      [
        {
          text: 'Kamera',
          onPress: handleTakePhoto,
        },
        {
          text: 'Galeri',
          onPress: handlePickPhoto,
        },
        {
          text: 'İptal',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  /**
   * Kamera ile fotoğraf çek
   */
  const handleTakePhoto = async () => {
    const hasPermission = await ensurePermission('camera');
    if (!hasPermission) {
      setShowPermissionModal(true);
      return;
    }

    // TODO: react-native-image-picker kurulunca implement edin
    /*
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        cameraType: 'front',
      });

      if (result.assets && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri!);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Hata', 'Kamera açılamadı');
    }
    */

    Alert.alert(
      'Paket Gerekli',
      'Kamera özelliği için react-native-image-picker paketini kurun.',
      [{ text: 'Tamam' }]
    );
  };

  /**
   * Galeriden fotoğraf seç
   */
  const handlePickPhoto = async () => {
    const hasPermission = await ensurePermission('gallery');
    if (!hasPermission) {
      setShowPermissionModal(true);
      return;
    }

    // TODO: react-native-image-picker kurulunca implement edin
    /*
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        selectionLimit: 1,
      });

      if (result.assets && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri!);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Hata', 'Galeri açılamadı');
    }
    */

    Alert.alert(
      'Paket Gerekli',
      'Galeri özelliği için react-native-image-picker paketini kurun.',
      [{ text: 'Tamam' }]
    );
  };

  /**
   * Fotoğrafı sunucuya yükle
   */
  const uploadPhoto = async (uri: string) => {
    setIsUploading(true);

    try {
      const result = await profileService.uploadProfilePhoto(uri);

      if (result.success && result.photoUrl) {
        setPhotoUrl(result.photoUrl);
        Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi');
      } else {
        Alert.alert('Hata', result.error || 'Fotoğraf yüklenemedi');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * İzinleri iste
   */
  const handleRequestPermissions = async () => {
    const hasCamera = await ensurePermission('camera');
    const hasGallery = await ensurePermission('gallery');

    setShowPermissionModal(false);

    if (hasCamera || hasGallery) {
      Alert.alert('Başarılı', 'İzinler verildi. Tekrar deneyin.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Profile Photo */}
      <View style={styles.photoContainer}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Icon name="person" size={60} color={colors.textSecondary} />
          </View>
        )}

        {isUploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Change Photo Button */}
        <Pressable
          style={({ pressed }) => [
            styles.changeButton,
            pressed && styles.changeButtonPressed,
          ]}
          onPress={showPhotoOptions}
          disabled={isUploading}
        >
          <Icon name="camera" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Info Text */}
      <Text style={styles.infoText}>
        Profil fotoğrafınızı değiştirmek için dokunun
      </Text>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Permission Modal */}
      <PermissionModal
        visible={showPermissionModal}
        permissions={['camera', 'gallery']}
        onRequestPermissions={handleRequestPermissions}
        onCancel={() => setShowPermissionModal(false)}
        title="Fotoğraf İzinleri"
        subtitle="Profil fotoğrafı yüklemek için aşağıdaki izinlere ihtiyaç var:"
      />
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 60,
      backgroundColor: colors.background,
    },
    photoContainer: {
      position: 'relative',
      marginBottom: 24,
    },
    photo: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.border,
    },
    photoPlaceholder: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: isDark ? colors.border : '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 70,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    changeButton: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.background,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    changeButtonPressed: {
      opacity: 0.8,
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 32,
    },
    userInfo: {
      alignItems: 'center',
    },
    userName: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 15,
      color: colors.textSecondary,
    },
  });
