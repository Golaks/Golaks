import axios from 'axios';
import { BASE_API_URL } from '../constants/ApiConfig';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'bilgi' | 'genel' | 'duyuru' | 'guncelleme' | 'uyari' | 'acil';
  read: boolean;
  created_at: string;
  status?: string; // 'gonderildi' | 'okundu' | 'hata'
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
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Tüm bildirimleri getirir
   */
  async getNotifications(token: string): Promise<NotificationListResponse> {
    try {
      const response = await axios.get(
        `${BASE_API_URL}/notifications`,
        this.getAuthHeader(token)
      );
      return response.data;
    } catch (error: any) {
      console.error('Get notifications error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Bildirimler yüklenemedi');
    }
  }

  /**
   * Okunmamış bildirimleri getirir
   */
  async getUnreadNotifications(token: string): Promise<NotificationListResponse> {
    try {
      const response = await axios.get(
        `${BASE_API_URL}/notifications/unread`,
        this.getAuthHeader(token)
      );
      return response.data;
    } catch (error: any) {
      console.error('Get unread notifications error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Okunmamış bildirimler yüklenemedi');
    }
  }

  /**
   * Belirli bir bildirimi okundu olarak işaretler
   */
  async markAsRead(token: string, notificationId: string): Promise<NotificationMarkReadResponse> {
    try {
      const response = await axios.put(
        `${BASE_API_URL}/notifications/${notificationId}/read`,
        {},
        this.getAuthHeader(token)
      );
      return response.data;
    } catch (error: any) {
      console.error('Mark notification as read error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Bildirim okundu işaretlenemedi');
    }
  }

  /**
   * Tüm bildirimleri okundu olarak işaretler
   */
  async markAllAsRead(token: string): Promise<NotificationMarkReadResponse> {
    try {
      const response = await axios.put(
        `${BASE_API_URL}/notifications/mark-all-read`,
        {},
        this.getAuthHeader(token)
      );
      return response.data;
    } catch (error: any) {
      console.error('Mark all notifications as read error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Bildirimler okundu işaretlenemedi');
    }
  }

  /**
   * Bildirim gönderir (sadece superadmin için)
   */
  async sendNotification(
    token: string,
    data: {
      baslik: string;
      mesaj: string;
      hedef_tip: 'all' | 'role' | 'user';
      hedef_deger?: string | null; // rol ID veya kullanıcı ID listesi (JSON)
      bildirim_tipi: 'bilgi' | 'genel' | 'duyuru' | 'guncelleme' | 'uyari' | 'acil';
    }
  ): Promise<{
    success: boolean;
    message: string;
    bildirim_id?: number;
    baslik?: string;
    hedef_tip?: string;
    bildirim_tipi?: string;
    toplam_hedef?: number;
    basarili_gonderim?: number;
    basarisiz_gonderim?: number;
  }> {
    try {
      const response = await axios.post(
        `${BASE_API_URL}/notifications/send`,
        data,
        this.getAuthHeader(token)
      );
      return response.data;
    } catch (error: any) {
      console.error('Send notification error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Bildirim gönderilemedi');
    }
  }

  /**
   * Bildirimi siler
   */
  async deleteNotification(token: string, notificationId: string): Promise<NotificationMarkReadResponse> {
    try {
      const response = await axios.delete(
        `${BASE_API_URL}/notifications/${notificationId}`,
        this.getAuthHeader(token)
      );
      return response.data;
    } catch (error: any) {
      console.error('Delete notification error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Bildirim silinemedi');
    }
  }
}

export default new NotificationService();
