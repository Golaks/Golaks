/**
 * API Configuration
 * Multi-tenant API endpoint management
 *
 * Login Flow: Company ID + Username + Password
 * - Company ID: Firma tanımlayıcı (app, test, client1, vb.)
 * - Username: Kullanıcı adı
 * - Password: Kullanıcı şifresi
 */

// Base API URL
export const BASE_API_URL = 'https://api.golaks.com';

// Alternatif: Development için
// export const BASE_API_URL = __DEV__ ? 'http://localhost:3000' : 'https://api.golaks.com';

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: `${BASE_API_URL}/auth/login`,
  LOGOUT: `${BASE_API_URL}/auth/logout`,
  REFRESH_TOKEN: `${BASE_API_URL}/auth/refresh`,
  FORGOT_PASSWORD: `${BASE_API_URL}/auth/forgot-password`,
  RESET_PASSWORD: `${BASE_API_URL}/auth/reset-password`,

  // Tenant Management
  GET_TENANT_INFO: `${BASE_API_URL}/tenant/info`,
  LIST_TENANTS: `${BASE_API_URL}/tenant/list`, // Kullanıcının erişebildiği tenant'lar

  // User
  GET_USER_PROFILE: `${BASE_API_URL}/user/profile`,
  UPDATE_USER_PROFILE: `${BASE_API_URL}/user/profile`,

  // Data endpoints (tenant-specific)
  // Bu endpoint'ler her istekte tenant bilgisi ile birlikte kullanılacak
  DASHBOARD: `${BASE_API_URL}/data/dashboard`,
  PRODUCTS: `${BASE_API_URL}/data/products`,
  CUSTOMERS: `${BASE_API_URL}/data/customers`,
  INVOICES: `${BASE_API_URL}/data/invoices`,
  REPORTS: `${BASE_API_URL}/data/reports`,
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
