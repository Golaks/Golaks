import { API_ENDPOINTS } from '../constants/ApiConfig';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'bilgi' | 'genel' | 'duyuru' | 'guncelleme' | 'uyari' | 'acil';
  read: boolean;
  created_at: string;
  status?: string;
}

export interface NotificationListResponse {
  success: boolean;
  data: Notification[];
  unread_count: number;
  read_count: number;
}

export interface NotificationMarkReadResponse {
  success: boolean;
  message: string;
}

class NotificationService {
  private getAuthHeader(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getNotifications(token: string): Promise<NotificationListResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS, {
        method: 'GET',
        headers: this.getAuthHeader(token),
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      throw new Error('Bildirimler yüklenemedi');
    }
  }

  async getUnreadNotifications(token: string): Promise<NotificationListResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS_UNREAD, {
        method: 'GET',
        headers: this.getAuthHeader(token),
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      throw new Error('Okunmamış bildirimler yüklenemedi');
    }
  }

  async markAsRead(token: string, notificationId: string): Promise<NotificationMarkReadResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATION_MARK_READ(notificationId), {
        method: 'PUT',
        headers: this.getAuthHeader(token),
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      throw new Error('Bildirim okundu işaretlenemedi');
    }
  }

  async markAllAsRead(token: string): Promise<NotificationMarkReadResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ, {
        method: 'PUT',
        headers: this.getAuthHeader(token),
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      throw new Error('Bildirimler okundu işaretlenemedi');
    }
  }

  async sendNotification(
    token: string,
    data: {
      baslik: string;
      mesaj: string;
      hedef_tip: 'all' | 'role' | 'user';
      hedef_deger?: string | null;
      bildirim_tipi: 'bilgi' | 'genel' | 'duyuru' | 'guncelleme' | 'uyari' | 'acil';
    }
  ): Promise<{
    success: boolean;
    message?: string;
    data?: {
      bildirim_id?: number;
      baslik?: string;
      hedef_tip?: string;
      bildirim_tipi?: string;
      toplam_hedef?: number;
      basarili_gonderim?: number;
      basarisiz_gonderim?: number;
    };
  }> {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATION_SEND, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error?.message || responseData.message || 'Bildirim gönderilemedi');
      }

      return responseData;
    } catch (error: any) {
      throw new Error(error.message || 'Bildirim gönderilemedi');
    }
  }

  async deleteNotification(token: string, notificationId: string): Promise<NotificationMarkReadResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATION_DELETE(notificationId), {
        method: 'DELETE',
        headers: this.getAuthHeader(token),
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      throw new Error('Bildirim silinemedi');
    }
  }
}

export default new NotificationService();
