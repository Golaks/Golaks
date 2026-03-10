import { API_ENDPOINTS } from '../constants/ApiConfig';

export type ReservationDurum = 0 | 1 | 2 | 3; // 0=beklenen, 1=içerde, 2=çıktı, 3=iptal

export interface ReservationItem {
  id: string;
  tarih: string;
  acenteId: string;
  acenteAdi: string;
  rehberId: string;
  rehberAdi: string;
  beklenenPax: number;
  beklenenCocukPax: number;
  beklenenSaat: string;
  milliyetId: number;
  milliyetAdi: string;
  girisSaati: string;
  kartNo: string;
  gelenPax: number;
  gelenCocukPax: number;
  girisNotu: string;
  cikisSaati: string;
  cikisNotu: string;
  iptalNotu: string;
  fisNo: number;
  infocu: string;
  durum: ReservationDurum;
}

export interface ReservationStats {
  totalBeklenen: number;
  totalIcerde: number;
  totalCikti: number;
  totalIptal: number;
  totalBeklenenPax: number;
  totalGelenPax: number;
}

export interface ReservationListResponse {
  success: boolean;
  data: {
    items: ReservationItem[];
    count: number;
    stats: ReservationStats;
  };
  message?: string;
}

export interface ReservationCreateData {
  tarih: string;
  subeId?: number;
  acenteId?: number;
  rehberId?: number;
  beklenenPax?: number;
  beklenenCocukPax?: number;
  beklenenSaat?: string;
  milliyetId?: number;
  girisNotu?: string;
  infocu?: string;
}

export interface ReservationUpdateData {
  rezervasyonId: string;
  tarih?: string;
  acenteId?: number;
  rehberId?: number;
  beklenenPax?: number;
  beklenenCocukPax?: number;
  beklenenSaat?: string;
  milliyetId?: number;
  girisSaati?: string;
  kartNo?: string;
  gelenPax?: number;
  gelenCocukPax?: number;
  girisNotu?: string;
  cikisSaati?: string;
  cikisNotu?: string;
  iptalNotu?: string;
  infocu?: string;
  durum?: ReservationDurum;
}

export interface LookupItem {
  id: string;
  unvan?: string;
  deger?: string;
  name?: string;
}

export interface LookupsResponse {
  success: boolean;
  data: {
    acenteler: LookupItem[];
    milliyetler: LookupItem[];
    subeler: LookupItem[];
    varsayilanSube: string;
  };
  message?: string;
}

class ReservationsService {
  private getAuthHeader(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async getList(
    token: string,
    dataName: string,
    params: {
      startDate?: string;
      endDate?: string;
      search?: string;
      durum?: number | null;
    } = {}
  ): Promise<ReservationListResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.RESERVATIONS_LIST, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          startDate: params.startDate || '',
          endDate: params.endDate || '',
          search: params.search || '',
          durum: params.durum ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Rezervasyon listesi alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Rezervasyon listesi alınamadı');
    }
  }

  async create(
    token: string,
    dataName: string,
    reservationData: ReservationCreateData
  ): Promise<{ success: boolean; data: { id: string; message: string } }> {
    try {
      const response = await fetch(API_ENDPOINTS.RESERVATIONS_CREATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          ...reservationData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Rezervasyon oluşturulamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Rezervasyon oluşturulamadı');
    }
  }

  async update(
    token: string,
    dataName: string,
    updateData: ReservationUpdateData
  ): Promise<{ success: boolean; data: { message: string } }> {
    try {
      const response = await fetch(API_ENDPOINTS.RESERVATIONS_UPDATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          ...updateData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Rezervasyon güncellenemedi');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Rezervasyon güncellenemedi');
    }
  }

  async getLookups(
    token: string,
    dataName: string
  ): Promise<LookupsResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.RESERVATIONS_LOOKUPS, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Lookup verileri alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Lookup verileri alınamadı');
    }
  }
}

export default new ReservationsService();
