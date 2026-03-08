/**
 * Authentication Context
 * Global authentication state management
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { authService } from '../services/auth.service';
import { UserInfo } from '../types/auth.types';
import notificationService from '../services/notification.service';
import pushNotificationService from '../services/pushNotification.service';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  notificationCount: number;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshNotificationCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Refresh badge count when app comes to foreground
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        refreshNotificationCount();
      }
      appState.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated]);

  // Register FCM token and listen for push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    refreshNotificationCount();

    let unsubscribeTokenRefresh: (() => void) | undefined;
    let unsubscribeMessage: (() => void) | undefined;

    const setupPush = async () => {
      const token = await authService.getToken();
      if (!token) return;

      await pushNotificationService.registerToken(token);
      unsubscribeTokenRefresh = pushNotificationService.onTokenRefresh(token);

      unsubscribeMessage = pushNotificationService.onMessage(async () => {
        await refreshNotificationCount();
      });
    };

    setupPush();

    return () => {
      unsubscribeTokenRefresh?.();
      unsubscribeMessage?.();
    };
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const authenticated = await authService.isAuthenticated();

      if (authenticated) {
        const storedUser = await authService.getStoredUser();
        setUser(storedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);

      if (response.success && response.data) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return {
          success: true,
          message: response.message || 'Giriş başarılı'
        };
      }

      return {
        success: false,
        message: response.error?.message || 'Giriş başarısız'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Bağlantı hatası. Lütfen tekrar deneyin.'
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      await pushNotificationService.setBadgeCount(0);
    } catch (error) {
    }
  };

  const refreshUser = async () => {
    try {
      const storedUser = await authService.getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }
    } catch (error) {
    }
  };

  const refreshNotificationCount = async () => {
    try {
      const token = await authService.getToken();
      if (!token) {
        setNotificationCount(0);
        await pushNotificationService.setBadgeCount(0);
        return;
      }

      const response = await notificationService.getNotifications(token);
      if (response.success) {
        setNotificationCount(response.unread_count);
        await pushNotificationService.setBadgeCount(response.unread_count);
      }
    } catch (error) {
      setNotificationCount(0);
      await pushNotificationService.setBadgeCount(0);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        notificationCount,
        login,
        logout,
        refreshUser,
        refreshNotificationCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
