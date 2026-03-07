import messaging from '@react-native-firebase/messaging';
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
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch {
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

      const fcmToken = await this.getToken();
      if (!fcmToken) return;

      const deviceInfo = await this.getDeviceInfo();

      await fetch(API_ENDPOINTS.NOTIFICATION_REGISTER_TOKEN, {
        method: 'POST',
        headers: this.getAuthHeader(authToken),
        body: JSON.stringify({
          fcm_token: fcmToken,
          platform: Platform.OS,
          device_info: deviceInfo,
        }),
      });
    } catch {
      // Silent fail - token registration is not critical
    }
  }

  onTokenRefresh(authToken: string): () => void {
    return messaging().onTokenRefresh(async (fcmToken) => {
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
    return messaging().onMessage(callback);
  }

  onNotificationOpenedApp(callback: (message: any) => void): () => void {
    return messaging().onNotificationOpenedApp(callback);
  }

  async getInitialNotification(): Promise<any> {
    return messaging().getInitialNotification();
  }
}

export default new PushNotificationService();
