/**
 * Profile Service
 * Kullanıcı profil işlemleri
 */

import { API_ENDPOINTS } from '../constants/ApiConfig';
import { authService } from './auth.service';

class ProfileService {
  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(photoUri: string): Promise<{success: boolean; photoUrl?: string; relativePath?: string; error?: string}> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          error: 'Token bulunamadı',
        };
      }

      // FormData oluştur
      const formData = new FormData();

      // Dosya bilgilerini hazırla
      const filename = photoUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('photo', {
        uri: photoUri,
        name: filename,
        type: type,
      } as any);

      const response = await fetch(API_ENDPOINTS.UPLOAD_PHOTO, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Content-Type otomatik olarak multipart/form-data olacak
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data) {
        return {
          success: true,
          photoUrl: data.data.fullUrl,
          relativePath: data.data.photoUrl,
        };
      }

      return {
        success: false,
        error: data.error?.message || 'Fotoğraf yüklenemedi',
      };
    } catch (error) {
      console.error('Upload profile photo error:', error);
      return {
        success: false,
        error: 'Bağlantı hatası. Lütfen tekrar deneyin.',
      };
    }
  }

  /**
   * Update profile information
   */
  async updateProfile(name: string, phone: string): Promise<{success: boolean; user?: any; error?: string}> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          error: 'Token bulunamadı',
        };
      }

      const response = await fetch(API_ENDPOINTS.UPDATE_USER_PROFILE, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          phone,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        return {
          success: true,
          user: data.data.user,
        };
      }

      return {
        success: false,
        error: data.error?.message || 'Profil güncellenemedi',
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: 'Bağlantı hatası. Lütfen tekrar deneyin.',
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{success: boolean; error?: string}> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          error: 'Token bulunamadı',
        };
      }

      const response = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
        };
      }

      return {
        success: false,
        error: data.error?.message || 'Şifre değiştirilemedi',
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Bağlantı hatası. Lütfen tekrar deneyin.',
      };
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings: any): Promise<{success: boolean; error?: string}> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          error: 'Token bulunamadı',
        };
      }

      const response = await fetch(API_ENDPOINTS.UPDATE_NOTIFICATIONS, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
        };
      }

      return {
        success: false,
        error: data.error?.message || 'Bildirim ayarları güncellenemedi',
      };
    } catch (error) {
      console.error('Update notification settings error:', error);
      return {
        success: false,
        error: 'Bağlantı hatası. Lütfen tekrar deneyin.',
      };
    }
  }
}

export const profileService = new ProfileService();
