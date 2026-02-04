/**
 * Authentication Service
 * Handles user authentication - GolaksMobile uyumlu
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import {
  LoginRequest,
  LoginResponse,
  StoredAuth,
  UserInfo,
  UserRole,
} from '../types/auth.types';

const AUTH_STORAGE_KEY = '@golaks_auth';
const USER_STORAGE_KEY = '@golaks_user';

/**
 * Map kullanici_rol to UserRole
 * 0: User, 1: Admin, 2: Super Admin
 */
const mapKullaniciRolToRole = (kullanici_rol: number): UserRole => {
  switch (kullanici_rol) {
    case 2:
      return 'superAdmin';
    case 1:
      return 'admin';
    case 0:
    default:
      return 'user';
  }
};

class AuthService {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const requestBody: LoginRequest = {
        email,
        password,
      };

      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: LoginResponse = await response.json();

      if (data.success && data.data) {
        // Map role from kullanici_rol
        const userWithRole = {
          ...data.data.user,
          role: mapKullaniciRolToRole(data.data.user.kullanici_rol),
        };

        // Store authentication data
        await this.storeAuth(data.data.token, userWithRole);
        return {
          ...data,
          data: {
            ...data.data,
            user: userWithRole,
          },
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          message: 'Bağlantı hatası. Lütfen tekrar deneyin.',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  /**
   * Store authentication data
   */
  private async storeAuth(token: string, user: UserInfo): Promise<void> {
    try {
      const storedAuth: StoredAuth = {
        token,
        user,
        expiresAt: Date.now() + 15552000 * 1000, // JWT_EXPIRATION from .env
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedAuth));
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
    }
  }

  /**
   * Get stored authentication data
   */
  async getStoredAuth(): Promise<StoredAuth | null> {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        return JSON.parse(storedAuth);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get stored user info
   */
  async getStoredUser(): Promise<UserInfo | null> {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        // Ensure role is set
        if (!user.role && user.kullanici_rol) {
          user.role = mapKullaniciRolToRole(user.kullanici_rol);
        }
        return user;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get authentication token
   */
  async getToken(): Promise<string | null> {
    try {
      const auth = await this.getStoredAuth();
      return auth?.token || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const auth = await this.getStoredAuth();
      if (!auth) {
        return false;
      }

      // Check if token is expired
      if (auth.expiresAt < Date.now()) {
        await this.logout();
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Clear stored data
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);

      // TODO: Call logout endpoint if needed
      // const token = await this.getToken();
      // if (token) {
      //   await fetch(API_ENDPOINTS.LOGOUT, {
      //     method: 'POST',
      //     headers: {
      //       'Authorization': `Bearer ${token}`,
      //       'Content-Type': 'application/json',
      //     },
      //   });
      // }
    } catch (error) {
    }
  }

  /**
   * Update stored user info
   */
  async updateUser(user: UserInfo): Promise<void> {
    try {
      const auth = await this.getStoredAuth();
      if (auth) {
        auth.user = user;
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }
    } catch (error) {
    }
  }
}

export const authService = new AuthService();
