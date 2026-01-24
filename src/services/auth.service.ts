/**
 * Authentication Service
 * Handles user authentication and tenant management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { apiService } from './api.service';
import {
  LoginRequest,
  LoginResponse,
  StoredAuth,
  TenantInfo,
} from '../types/auth.types';

const AUTH_STORAGE_KEY = '@golaks_auth';
const TENANT_STORAGE_KEY = '@golaks_tenant';

class AuthService {
  /**
   * Login with company ID, username, and password
   */
  async login(
    companyId: string,
    username: string,
    password: string
  ): Promise<LoginResponse> {
    try {
      const requestBody: LoginRequest = {
        email: username, // Backend'de email field'ı varsa uyumlu olsun
        password,
        companyCode: companyId,
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
        // Store authentication data
        await this.storeAuth(data.data);

        // Set API service credentials
        apiService.setAuth(
          data.data.token,
          data.data.refreshToken,
          data.data.tenant.subdomain
        );

        return data;
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
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
  private async storeAuth(authData: NonNullable<LoginResponse['data']>): Promise<void> {
    try {
      const storedAuth: StoredAuth = {
        token: authData.token,
        refreshToken: authData.refreshToken,
        tenant: authData.tenant,
        user: authData.user,
        expiresAt: Date.now() + 3600 * 1000, // 1 hour default
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedAuth));
      await AsyncStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(authData.tenant));
    } catch (error) {
      console.error('Error storing auth data:', error);
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
      console.error('Error getting stored auth:', error);
      return null;
    }
  }

  /**
   * Get stored tenant info
   */
  async getStoredTenant(): Promise<TenantInfo | null> {
    try {
      const storedTenant = await AsyncStorage.getItem(TENANT_STORAGE_KEY);
      if (storedTenant) {
        return JSON.parse(storedTenant);
      }
      return null;
    } catch (error) {
      console.error('Error getting stored tenant:', error);
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
        // Try to refresh
        return await apiService.refreshAccessToken();
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
    await apiService.logout();
  }

  /**
   * Switch tenant (if user has access to multiple tenants)
   */
  async switchTenant(tenantId: string): Promise<boolean> {
    try {
      const response = await apiService.post(API_ENDPOINTS.GET_TENANT_INFO, {
        tenantId,
      });

      if (response.success && response.data) {
        // Update stored tenant
        const auth = await this.getStoredAuth();
        if (auth) {
          auth.tenant = response.data as TenantInfo;
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
          await AsyncStorage.setItem(
            TENANT_STORAGE_KEY,
            JSON.stringify(response.data)
          );

          // Update API service
          apiService.setAuth(
            auth.token,
            auth.refreshToken,
            (response.data as TenantInfo).subdomain
          );

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error switching tenant:', error);
      return false;
    }
  }

  /**
   * Get list of tenants user has access to
   */
  async getUserTenants(): Promise<TenantInfo[]> {
    try {
      const response = await apiService.get<{ tenants: TenantInfo[] }>(
        API_ENDPOINTS.LIST_TENANTS
      );

      if (response.success && response.data) {
        return response.data.tenants;
      }

      return [];
    } catch (error) {
      console.error('Error getting user tenants:', error);
      return [];
    }
  }
}

export const authService = new AuthService();
