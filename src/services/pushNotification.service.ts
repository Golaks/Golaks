import { getMessaging, getToken, onTokenRefresh, onMessage, onNotificationOpenedApp, getInitialNotification, requestPermission, AuthorizationStatus, getAPNSToken } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
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
      console.log('[PushNotification] getToken error:', error);
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
      console.log('[PushNotification] Permission:', hasPermission);
      if (!hasPermission) return;

      // Log APNs token for debugging
      try {
        const apnsToken = await getAPNSToken(getMessaging(getApp()));
        console.log('[PushNotification] APNs Token:', apnsToken || 'null');
      } catch (e) {
        console.log('[PushNotification] APNs Token error:', e);
      }

      const fcmToken = await this.getFcmToken();
      console.log('[PushNotification] FCM Token:', fcmToken ? fcmToken.substring(0, 20) + '...' : 'null');
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

      const result = await response.json();
      console.log('[PushNotification] Register response:', response.status, result);
    } catch (error) {
      console.log('[PushNotification] Register error:', error);
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
        let channelId = 'default';
        if (Platform.OS === 'android') {
          channelId = await notifee.createChannel({
            id: 'default',
            name: 'Bildirimler',
            importance: AndroidImportance.HIGH,
            sound: 'default',
          });
        }

        await notifee.displayNotification({
          title: remoteMessage.notification?.title || 'Golaks',
          body: remoteMessage.notification?.body || '',
          android: {
            channelId,
            smallIcon: 'ic_notification',
            sound: 'default',
            pressAction: { id: 'default' },
          },
          ios: {
            sound: 'default',
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
}

export default new PushNotificationService();
