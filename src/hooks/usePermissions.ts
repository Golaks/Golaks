/**
 * Permissions Hook
 * Kamera, galeri ve bildirim izinlerini yönetir
 *
 * Not: Bu hook çalışması için şu paketler gerekli:
 * - npm install react-native-permissions
 * - npm install react-native-image-picker
 *
 * iOS için Info.plist'e eklenecekler:
 * - NSCameraUsageDescription
 * - NSPhotoLibraryUsageDescription
 * - NSPhotoLibraryAddUsageDescription
 *
 * Android için AndroidManifest.xml'e eklenecekler:
 * - <uses-permission android:name="android.permission.CAMERA"/>
 * - <uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
 */

import { useState } from 'react';
import { Platform, Linking, Alert } from 'react-native';

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited';

interface PermissionState {
  camera: PermissionStatus;
  gallery: PermissionStatus;
  notifications: PermissionStatus;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionState>({
    camera: 'unavailable',
    gallery: 'unavailable',
    notifications: 'unavailable',
  });

  /**
   * Kamera iznini kontrol et
   */
  const checkCameraPermission = async (): Promise<PermissionStatus> => {
    try {
      // TODO: react-native-permissions kurulunca implement edilecek
      // const result = await check(PERMISSIONS.IOS.CAMERA);
      // setPermissions(prev => ({ ...prev, camera: result }));
      // return result;

      // Şimdilik mock
      return 'unavailable';
    } catch (error) {
      console.error('Camera permission check error:', error);
      return 'unavailable';
    }
  };

  /**
   * Kamera izni iste
   */
  const requestCameraPermission = async (): Promise<PermissionStatus> => {
    try {
      // TODO: react-native-permissions kurulunca implement edilecek
      // const result = await request(PERMISSIONS.IOS.CAMERA);
      // setPermissions(prev => ({ ...prev, camera: result }));
      // return result;

      // Şimdilik mock
      Alert.alert(
        'İzin Gerekli',
        'Kamera izni için lütfen react-native-permissions paketini kurun.',
        [{ text: 'Tamam' }]
      );
      return 'unavailable';
    } catch (error) {
      console.error('Camera permission request error:', error);
      return 'denied';
    }
  };

  /**
   * Galeri iznini kontrol et
   */
  const checkGalleryPermission = async (): Promise<PermissionStatus> => {
    try {
      // TODO: react-native-permissions kurulunca implement edilecek
      // const permission = Platform.select({
      //   ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
      //   android: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
      // });
      // const result = await check(permission!);
      // setPermissions(prev => ({ ...prev, gallery: result }));
      // return result;

      return 'unavailable';
    } catch (error) {
      console.error('Gallery permission check error:', error);
      return 'unavailable';
    }
  };

  /**
   * Galeri izni iste
   */
  const requestGalleryPermission = async (): Promise<PermissionStatus> => {
    try {
      // TODO: react-native-permissions kurulunca implement edilecek
      // const permission = Platform.select({
      //   ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
      //   android: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
      // });
      // const result = await request(permission!);
      // setPermissions(prev => ({ ...prev, gallery: result }));
      // return result;

      Alert.alert(
        'İzin Gerekli',
        'Galeri izni için lütfen react-native-permissions paketini kurun.',
        [{ text: 'Tamam' }]
      );
      return 'unavailable';
    } catch (error) {
      console.error('Gallery permission request error:', error);
      return 'denied';
    }
  };

  /**
   * Bildirim iznini kontrol et
   */
  const checkNotificationPermission = async (): Promise<PermissionStatus> => {
    try {
      // TODO: react-native-permissions kurulunca implement edilecek
      // const result = await check(PERMISSIONS.IOS.NOTIFICATIONS);
      // setPermissions(prev => ({ ...prev, notifications: result }));
      // return result;

      return 'unavailable';
    } catch (error) {
      console.error('Notification permission check error:', error);
      return 'unavailable';
    }
  };

  /**
   * Bildirim izni iste
   */
  const requestNotificationPermission = async (): Promise<PermissionStatus> => {
    try {
      // TODO: react-native-permissions kurulunca implement edilecek
      // const result = await request(PERMISSIONS.IOS.NOTIFICATIONS);
      // setPermissions(prev => ({ ...prev, notifications: result }));
      // return result;

      Alert.alert(
        'İzin Gerekli',
        'Bildirim izni için lütfen react-native-permissions paketini kurun.',
        [{ text: 'Tamam' }]
      );
      return 'unavailable';
    } catch (error) {
      console.error('Notification permission request error:', error);
      return 'denied';
    }
  };

  /**
   * Birden fazla izin iste
   */
  const requestMultiplePermissions = async (
    permissionTypes: Array<'camera' | 'gallery' | 'notifications'>
  ): Promise<Record<string, PermissionStatus>> => {
    const results: Record<string, PermissionStatus> = {};

    for (const type of permissionTypes) {
      switch (type) {
        case 'camera':
          results.camera = await requestCameraPermission();
          break;
        case 'gallery':
          results.gallery = await requestGalleryPermission();
          break;
        case 'notifications':
          results.notifications = await requestNotificationPermission();
          break;
      }
    }

    return results;
  };

  /**
   * Uygulama ayarlarını aç (engellenmiş izinler için)
   */
  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Open settings error:', error);
      Alert.alert('Hata', 'Ayarlar açılamadı');
    }
  };

  /**
   * İzin durumunu kontrol et ve gerekirse iste
   */
  const ensurePermission = async (
    type: 'camera' | 'gallery' | 'notifications'
  ): Promise<boolean> => {
    let status: PermissionStatus;

    // Önce mevcut durumu kontrol et
    switch (type) {
      case 'camera':
        status = await checkCameraPermission();
        break;
      case 'gallery':
        status = await checkGalleryPermission();
        break;
      case 'notifications':
        status = await checkNotificationPermission();
        break;
    }

    // Eğer izin verilmişse true döndür
    if (status === 'granted') {
      return true;
    }

    // Eğer engellenmiş ise ayarlara yönlendir
    if (status === 'blocked') {
      Alert.alert(
        'İzin Engellendi',
        'Bu özellik için izin engellenmiş. Lütfen uygulama ayarlarından izni aktif edin.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Ayarlara Git', onPress: openSettings },
        ]
      );
      return false;
    }

    // İzin iste
    switch (type) {
      case 'camera':
        status = await requestCameraPermission();
        break;
      case 'gallery':
        status = await requestGalleryPermission();
        break;
      case 'notifications':
        status = await requestNotificationPermission();
        break;
    }

    return status === 'granted';
  };

  return {
    permissions,
    checkCameraPermission,
    requestCameraPermission,
    checkGalleryPermission,
    requestGalleryPermission,
    checkNotificationPermission,
    requestNotificationPermission,
    requestMultiplePermissions,
    openSettings,
    ensurePermission,
  };
};
