/**
 * API Service
 * Centralized API request handler with tenant support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, getHeaders } from '../constants/ApiConfig';
import { StoredAuth } from '../types/auth.types';

const AUTH_STORAGE_KEY = '@golaks_auth';

class ApiService {
  private token: string | null = null;
  private tenantId: string | null = null;
  private refreshToken: string | null = null;

  /**
   * Initialize service with stored credentials
   */
  async initialize(): Promise<boolean> {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const auth: StoredAuth = JSON.parse(storedAuth);

        // Check if token is expired
        if (auth.expiresAt && auth.expiresAt > Date.now()) {
          this.token = auth.token;
          this.refreshToken = auth.refreshToken;
          this.tenantId = auth.tenant.subdomain;
          return true;
        } else {
          // Token expired, try to refresh
          return await this.refreshAccessToken();
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set authentication credentials
   */
  setAuth(token: string, refreshToken: string, tenantId: string) {
    this.token = token;
    this.refreshToken = refreshToken;
    this.tenantId = tenantId;
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.token = null;
    this.refreshToken = null;
    this.tenantId = null;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.refreshToken) {
        return false;
      }

      const response = await fetch(API_ENDPOINTS.REFRESH_TOKEN, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.data?.token) {
        this.token = data.data.token;

        // Update stored auth
        const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (storedAuth) {
          const auth: StoredAuth = JSON.parse(storedAuth);
          auth.token = data.data.token;
          auth.expiresAt = Date.now() + (data.data.expiresIn || 3600) * 1000;
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
        }

        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Make API request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: any }> {
    try {
      const headers = getHeaders(this.token || undefined, this.tenantId || undefined);

      const response = await fetch(endpoint, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry request with new token
          return this.request<T>(endpoint, options);
        } else {
          // Refresh failed, logout user
          await this.logout();
          return {
            success: false,
            error: { message: 'Session expired', code: 'SESSION_EXPIRED' },
          };
        }
      }

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data };
      }
    } catch (error) {
      return {
        success: false,
        error: { message: 'Network error', code: 'NETWORK_ERROR' },
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<{ success: boolean; data?: T; error?: any }> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body: any
  ): Promise<{ success: boolean; data?: T; error?: any }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body: any
  ): Promise<{ success: boolean; data?: T; error?: any }> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<{ success: boolean; data?: T; error?: any }> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint
      await this.post(API_ENDPOINTS.LOGOUT, {});
    } catch (error) {
    } finally {
      // Clear local data
      this.clearAuth();
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  /**
   * Get current tenant ID
   */
  getTenantId(): string | null {
    return this.tenantId;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }
}

export const apiService = new ApiService();
