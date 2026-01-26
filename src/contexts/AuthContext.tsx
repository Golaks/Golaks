/**
 * Authentication Context
 * Global authentication state management
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { UserInfo } from '../types/auth.types';
import notificationService from '../services/notification.service';

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

  // Refresh notification count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshNotificationCount();
    }
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
      console.error('Auth check error:', error);
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
      console.error('Login error:', error);
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
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const storedUser = await authService.getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const refreshNotificationCount = async () => {
    try {
      const token = await authService.getToken();
      if (!token) {
        setNotificationCount(0);
        return;
      }

      const response = await notificationService.getNotifications(token);
      if (response.success) {
        setNotificationCount(response.unread_count);
      }
    } catch (error) {
      console.error('Refresh notification count error:', error);
      setNotificationCount(0);
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
