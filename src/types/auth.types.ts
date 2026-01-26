/**
 * Authentication Types
 * Backend: GolaksMobile uyumlu yapı
 */

export interface LoginRequest {
  email: string;
  password: string;
  device_id?: string;
}

export interface ProgramYetkileri {
  muhasebe: boolean;
  tabakhane: boolean;
  magaza: boolean;
  konfeksiyon: boolean;
}

export interface BarcodePermissions {
  manufacturer: boolean;
  year: boolean;
  info: boolean;
  entryPrice: boolean;
  costPrice: boolean;
  labelPrice: boolean;
}

export type UserRole = 'user' | 'admin' | 'superAdmin';

export interface UserInfo {
  id: string;
  firma_id: string;
  firma_unvani: string;
  name: string;
  email: string;
  telefon?: string;
  avatar?: string;
  bildirimler: number;
  yetkiler: Record<string, any>;
  programYetkileri: ProgramYetkileri;
  barcodePermissions: BarcodePermissions;
  kullanici_rol: number; // 0: User, 1: Admin, 2: Super Admin
  role: UserRole; // Mapped from kullanici_rol
  mobilDataVersiyon: string;
  mobilResim: string;
  resimDomain: string;
  firmaAyarlar: Record<string, any>;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user: UserInfo;
  };
  error?: {
    message: string;
    code: string;
  };
}

export interface StoredAuth {
  token: string;
  user: UserInfo;
  expiresAt: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}
