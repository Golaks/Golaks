/**
 * API Configuration
 * Multi-tenant API endpoint management
 *
 * Login Flow: Company ID + Username + Password
 * - Company ID: Firma tanımlayıcı (app, test, client1, vb.)
 * - Username: Kullanıcı adı
 * - Password: Kullanıcı şifresi
 */

import { BASE_URL } from '../config/env';

// Export for use in components
export const BASE_API_URL = BASE_URL;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Authentication (GolaksMobile uyumlu endpoint'ler)
  LOGIN: `${BASE_API_URL}/login`,
  LOGOUT: `${BASE_API_URL}/logout`,
  REFRESH_TOKEN: `${BASE_API_URL}/refresh`,
  PASSWORD_RESET: `${BASE_API_URL}/password-reset`,
  PROFILE: `${BASE_API_URL}/profile`,

  // Tenant Management
  GET_TENANT_INFO: `${BASE_API_URL}/tenant/info`,
  LIST_TENANTS: `${BASE_API_URL}/tenant/list`, // Kullanıcının erişebildiği tenant'lar

  // User
  GET_USER_PROFILE: `${BASE_API_URL}/user/profile`,
  USER_SETTINGS: `${BASE_API_URL}/user-settings`,
  USER_MANAGEMENT: `${BASE_API_URL}/user-management`,

  // Company Management (Super Admin) - GET: list, POST: create, PUT: update, DELETE: delete
  COMPANY_MANAGEMENT: `${BASE_API_URL}/company-management`,

  // Notifications
  NOTIFICATIONS: `${BASE_API_URL}/notifications`,
  NOTIFICATIONS_UNREAD: `${BASE_API_URL}/notifications/unread`,
  NOTIFICATIONS_MARK_ALL_READ: `${BASE_API_URL}/notifications/mark-all-read`,
  NOTIFICATION_MARK_READ: (id: string) => `${BASE_API_URL}/notifications/${id}/read`,
  NOTIFICATION_DELETE: (id: string) => `${BASE_API_URL}/notifications/${id}`,
  NOTIFICATION_SEND: `${BASE_API_URL}/notifications/send`,

  // Data endpoints (tenant-specific)
  // Bu endpoint'ler her istekte tenant bilgisi ile birlikte kullanılacak
  DASHBOARD: `${BASE_API_URL}/data/dashboard`,
  PRODUCTS: `${BASE_API_URL}/data/products`,
  CUSTOMERS: `${BASE_API_URL}/data/customers`,
  INVOICES: `${BASE_API_URL}/data/invoices`,
  REPORTS: `${BASE_API_URL}/data/reports`,

  // Account App (Muhasebe)
  ACCOUNT_REPORTS: `${BASE_API_URL}/apps/account/reports`,
  ACCOUNT_REPORT_DETAIL: (id: string) => `${BASE_API_URL}/apps/account/reports/${id}`,
  ACCOUNT_TRANSACTIONS: `${BASE_API_URL}/apps/account/transactions`,
  ACCOUNT_TRANSACTION_DETAIL: (id: string) => `${BASE_API_URL}/apps/account/transactions/${id}`,

  // Tannery App (Tabakhane)
  TANNERY_REPORTS: `${BASE_API_URL}/apps/tannery/reports`,
  TANNERY_REPORT_DETAIL: (id: string) => `${BASE_API_URL}/apps/tannery/reports/${id}`,
  TANNERY_TRANSACTIONS: `${BASE_API_URL}/apps/tannery/transactions`,
  TANNERY_TRANSACTION_DETAIL: (id: string) => `${BASE_API_URL}/apps/tannery/transactions/${id}`,

  // Confection App (Konfeksiyon)
  CONFECTION_REPORTS: `${BASE_API_URL}/apps/confection/reports`,
  CONFECTION_REPORT_DETAIL: (id: string) => `${BASE_API_URL}/apps/confection/reports/${id}`,
  CONFECTION_TRANSACTIONS: `${BASE_API_URL}/apps/confection/transactions`,
  CONFECTION_TRANSACTION_DETAIL: (id: string) => `${BASE_API_URL}/apps/confection/transactions/${id}`,

  // Shop App (Mağaza)
  SHOP_REPORTS: `${BASE_API_URL}/apps/shop/reports`,
  SHOP_REPORT_DETAIL: (id: string) => `${BASE_API_URL}/apps/shop/reports/${id}`,
  SHOP_TRANSACTIONS: `${BASE_API_URL}/apps/shop/transactions`,
  SHOP_TRANSACTION_DETAIL: (id: string) => `${BASE_API_URL}/apps/shop/transactions/${id}`,
};

/**
 * Request Headers
 */
export const getHeaders = (token?: string, tenantId?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
    // Alternatif olarak subdomain kullanılabilir:
    // headers['X-Tenant-Subdomain'] = subdomain;
  }

  return headers;
};

/**
 * Predefined Tenants (Opsiyonel)
 * Eğer tenant listesi sabit ise kullanılabilir
 */
export const PREDEFINED_TENANTS = [
  {
    id: 'app',
    subdomain: 'app',
    displayName: 'Golaks Ana Sistem',
    apiEndpoint: BASE_API_URL,
  },
  {
    id: 'test',
    subdomain: 'test',
    displayName: 'Test Ortamı',
    apiEndpoint: BASE_API_URL,
  },
  // Dinamik tenant'lar için backend'den çekilebilir
];
