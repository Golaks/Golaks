/**
 * Authentication Types
 */

export interface TenantInfo {
  subdomain: string; // app, test, client1, etc.
  databaseName: string;
  apiEndpoint: string;
  displayName: string;
}

export interface LoginRequest {
  email: string; // username olarak kullanılacak
  password: string;
  companyCode: string; // Zorunlu: "app", "test", "client1", vb.
  deviceId?: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    refreshToken: string;
    user: UserInfo;
    tenant: TenantInfo;
    permissions: UserPermissions;
  };
  error?: {
    message: string;
    code: string;
  };
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user' | 'manager';
}

export interface UserPermissions {
  modules: string[]; // ['muhasebe', 'stok', 'cari', etc.]
  features: Record<string, boolean>;
}

export interface StoredAuth {
  token: string;
  refreshToken: string;
  tenant: TenantInfo;
  user: UserInfo;
  expiresAt: number;
}
