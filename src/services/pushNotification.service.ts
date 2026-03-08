import { getMessaging, getToken, onTokenRefresh, onMessage, onNotificationOpenedApp, getInitialNotification, requestPermission, AuthorizationStatus } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { API_ENDPOINTS } from '../constants/ApiConfig';

class PushNotificationService {
  private getAuthHeader(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async requestPermission(): Promise<boolean> {
    // Android 13+ requires runtime POST_NOTIFICATIONS permission
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    }

    const authStatus = await requestPermission(getMessaging(getApp()));
    return (
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL
    );
  }

  async getFcmToken(): Promise<string | null> {
    try {
      const token = await getToken(getMessaging(getApp()));
      return token;
    } catch (error) {
      console.warn('[PushNotification] getToken error:', error);
      return null;
    }
  }

  private async getDeviceInfo() {
    return {
      model: DeviceInfo.getModel(),
      systemVersion: DeviceInfo.getSystemVersion(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      deviceId: await DeviceInfo.getUniqueId(),
    };
  }

  async registerToken(authToken: string): Promise<void> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return;

      const fcmToken = await this.getFcmToken();
      if (!fcmToken) return;

      const deviceInfo = await this.getDeviceInfo();

      const response = await fetch(API_ENDPOINTS.NOTIFICATION_REGISTER_TOKEN, {
        method: 'POST',
        headers: this.getAuthHeader(authToken),
        body: JSON.stringify({
          fcm_token: fcmToken,
          platform: Platform.OS,
          device_info: deviceInfo,
        }),
      });

      await response.json();
    } catch (error) {
      console.warn('[PushNotification] Register error:', error);
    }
  }

  onTokenRefresh(authToken: string): () => void {
    const messaging = getMessaging(getApp());
    return onTokenRefresh(messaging, async (fcmToken) => {
      try {
        await fetch(API_ENDPOINTS.NOTIFICATION_REGISTER_TOKEN, {
          method: 'POST',
          headers: this.getAuthHeader(authToken),
          body: JSON.stringify({
            fcm_token: fcmToken,
            platform: Platform.OS,
          }),
        });
      } catch {
        // Silent fail
      }
    });
  }

  onMessage(callback: (message: any) => void): () => void {
    return onMessage(getMessaging(getApp()), async (remoteMessage) => {
      // Show local notification when app is in foreground
      try {
        let channelId = 'golaks_notifications';
        if (Platform.OS === 'android') {
          channelId = await notifee.createChannel({
            id: 'golaks_notifications',
            name: 'Bildirimler',
            importance: AndroidImportance.HIGH,
            sound: 'golaks_mobile',
          });
        }

        await notifee.displayNotification({
          title: remoteMessage.notification?.title || 'Golaks',
          body: remoteMessage.notification?.body || '',
          android: {
            channelId,
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            sound: 'golaks_mobile',
            pressAction: { id: 'default' },
          },
          ios: {
            sound: 'golaks-mobile.mp3',
          },
        });
      } catch (e) {
        // Silent fail for display
      }

      // Call the original callback (refreshes notification count)
      callback(remoteMessage);
    });
  }

  onNotificationOpenedApp(callback: (message: any) => void): () => void {
    return onNotificationOpenedApp(getMessaging(getApp()), callback);
  }

  async getInitialNotification(): Promise<any> {
    return getInitialNotification(getMessaging(getApp()));
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await notifee.setBadgeCount(count);
    } catch {
      // Silent fail
    }
  }
}

export default new PushNotificationService();
