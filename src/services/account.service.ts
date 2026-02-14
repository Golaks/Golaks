/**
 * Account Service
 * Cari hesap işlemleri
 */

import { API_ENDPOINTS } from '../constants/ApiConfig';

export interface CariBalance {
  doviz: string;
  bakiye: number;
  durum: 'AB' | 'BB'; // AB: Alacak Bakiyesi, BB: Borç Bakiyesi
}

export interface CariAccount {
  id: number;
  hesapKodu: string;
  unvan: string;
  kisaUnvan: string;
  doviz: string;
  subeId: string;
  sube: string;
  bakiyeler?: CariBalance[]; // Optional, lazy loaded
}

export interface CariListResponse {
  success: boolean;
  data: {
    data: CariAccount[];
    count: number;
    filterType: string;
  };
  message?: string;
}

export interface CashBankItem {
  id?: number;
  hesapKodu?: string;
  unvan?: string;
  sube: string;
  doviz: string;
  bakiye: number;
}

export interface CashBankSummaryResponse {
  success: boolean;
  data: {
    kasa: CashBankItem[];
    banka: CashBankItem[];
    groupBy: 'all' | 'branch';
  };
  message?: string;
}

export interface CariTransaction {
  id: number;
  tarih: string;
  fisNo: string;
  aciklama: string;
  borc: number;
  alacak: number;
  bakiye: number;
  doviz: string;
  fisTuru: string;
}

export interface CariEkstreResponse {
  success: boolean;
  data: {
    cari: {
      id: number;
      hesapKodu: string;
      unvan: string;
      doviz: string;
    };
    transactions: CariTransaction[];
    summary: {
      toplamBorc: number;
      toplamAlacak: number;
      bakiye: number;
      count: number;
    };
  };
  message?: string;
}

export interface CreateCariRequest {
  dataName: string;
  subeId: string;
  hesapKodu: string;
  unvan: string;
  kisaUnvan?: string;
  doviz: string;
}

export interface CreateCariResponse {
  success: boolean;
  data: {
    cari: CariAccount;
    message: string;
  };
  message?: string;
}

class AccountService {
  private getAuthHeader(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Cari hesap listesini getirir
   */
  async getCariList(
    token: string,
    dataName: string,
    filterType: 'all' | 'customers' | 'suppliers' | 'safes' | 'banks' | 'personnel' = 'all',
    search: string = '',
    subeId: string = ''
  ): Promise<CariListResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CARI_LIST, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          filterType,
          search,
          subeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Cari listesi alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Cari listesi alınamadı');
    }
  }

  /**
   * Cari hesap bakiyesini getirir
   */
  async getCariBalance(
    token: string,
    dataName: string,
    cariId: number
  ): Promise<{ success: boolean; data: { bakiyeler: CariBalance[] }; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CARI_BALANCE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          cariId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Bakiye alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Bakiye alınamadı');
    }
  }

  /**
   * Kasa ve Banka özet raporunu getirir
   */
  async getCashBankSummary(
    token: string,
    dataName: string,
    groupBy: 'all' | 'branch' = 'all'
  ): Promise<CashBankSummaryResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CASH_BANK_SUMMARY, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          groupBy,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Kasa-Banka raporu alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Kasa-Banka raporu alınamadı');
    }
  }

  /**
   * Yeni cari hesap oluşturur
   */
  async createCari(
    token: string,
    data: CreateCariRequest
  ): Promise<CreateCariResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CARI_CREATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || result.message || 'Cari hesap oluşturulamadı');
      }

      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Cari hesap oluşturulamadı');
    }
  }

  /**
   * Cari hesap ekstre (işlem hareketleri) getirir
   */
  async getCariEkstre(
    token: string,
    dataName: string,
    cariId: number,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<CariEkstreResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CARI_EKSTRE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          cariId,
          startDate,
          endDate,
          limit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Ekstre alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Ekstre alınamadı');
    }
  }
}

export default new AccountService();
