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
  sube: string;
  bakiyeler?: CariBalance[]; // Optional, lazy loaded
}

export interface CariCreateData {
  hesapKodu: string;
  unvan: string;
  kisaUnvan?: string;
  doviz?: string;
  kurTipi?: string;
  subeId: number;
  ozelKod1?: string;
  ozelKod2?: string;
  ozelKod3?: string;
  ozelKod4?: string;
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

export interface BankaKomisyonTaksitOran {
  taksit: string; // 'tek', '2', '3', ..., '12'
  oran: number;
}

export interface BankaKomisyonOranResponse {
  success: boolean;
  data: {
    cariId: number;
    bankaAdi: string;
    komisyonOranlar: BankaKomisyonTaksitOran[];
  };
  message?: string;
}

export interface BankaKomisyonItem {
  id: number;
  tarih: string;
  fisNo: string;
  bankaAdi: string;
  aciklama: string;
  tutar: number;
  doviz: string;
  islemTuru: string;
}

export interface BankaKomisyonResponse {
  success: boolean;
  data: {
    items: BankaKomisyonItem[];
    summary: {
      toplamTutar: number;
      count: number;
    };
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
    filterType: 'all' | 'customers' | 'suppliers' | 'safes' | 'banks' | 'personnel' | 'stocks' = 'all',
    search: string = '',
    subeId?: number
  ): Promise<CariListResponse> {
    try {
      const body: any = { dataName, filterType, search };
      if (subeId) {
        body.subeId = subeId;
      }
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CARI_LIST, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify(body),
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
   * Yeni cari hesap oluşturur
   */
  async createCari(
    token: string,
    dataName: string,
    cariData: CariCreateData
  ): Promise<{ success: boolean; data: { id: string; message: string } }> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CARI_CREATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          ...cariData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Cari hesap oluşturulamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Cari hesap oluşturulamadı');
    }
  }

  /**
   * Cari hesap günceller
   */
  async updateCari(
    token: string,
    dataName: string,
    cariId: number,
    updateData: { hesapKodu?: string; unvan: string; kisaUnvan?: string; doviz?: string }
  ): Promise<{ success: boolean; data: { message: string } }> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CARI_UPDATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          cariId,
          ...updateData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Cari hesap güncellenemedi');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Cari hesap güncellenemedi');
    }
  }

  /**
   * Sıradaki hesap kodunu getirir
   */
  async getNextHesapKodu(
    token: string,
    dataName: string,
    filterType: string,
    subeId: number
  ): Promise<{ success: boolean; data: { hesapKodu: string; prefix: string; subeKodu: string } }> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CARI_NEXT_KOD, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, filterType, subeId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Hesap kodu alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Hesap kodu alınamadı');
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
  /**
   * Banka komisyon oranlarını getirir
   */
  async getBankaKomisyonOran(
    token: string,
    dataName: string,
    cariId: number
  ): Promise<BankaKomisyonOranResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_BANKA_KOMISYON_ORAN_GET, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, cariId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Komisyon oranları alınamadı');
      }
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Komisyon oranları alınamadı');
    }
  }

  /**
   * Banka komisyon oranlarını günceller
   */
  async updateBankaKomisyonOran(
    token: string,
    dataName: string,
    cariId: number,
    komisyonOranlar: BankaKomisyonTaksitOran[]
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_BANKA_KOMISYON_ORAN_UPDATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, cariId, komisyonOranlar }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Komisyon oranları güncellenemedi');
      }
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Komisyon oranları güncellenemedi');
    }
  }

  /**
   * Banka komisyon listesini getirir
   */
  async getBankaKomisyonList(
    token: string,
    dataName: string,
    startDate?: string,
    endDate?: string,
    search?: string
  ): Promise<BankaKomisyonResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_BANKA_KOMISYON_LIST, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, startDate, endDate, search }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Banka komisyon listesi alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Banka komisyon listesi alınamadı');
    }
  }
}

export default new AccountService();
