import { API_ENDPOINTS } from '../constants/ApiConfig';

export type SalesModul = 'muhasebe' | 'magaza' | 'konfeksiyon';

export interface SalesItem {
  id: string;
  seriNo: string;
  tarih: string;
  vadeTarih: string;
  cariAdi: string;
  subeAdi: string;
  tipiAciklama: string;
  gc: number;
  doviz: string;
  toplamMiktar: number;
  toplamTutar: number;
  toplamIndirim: number;
  toplamKdv: number;
  odemeDurum: number;
  modulKodu: string;
  aciklama: string;
}

export interface SalesSummaryItem {
  currency: string;
  totalCount: number;
  totalAmount: number;
  totalDiscount: number;
  totalVat: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}

export interface SalesListResponse {
  success: boolean;
  data: {
    items: SalesItem[];
    count: number;
    summary: SalesSummaryItem[];
  };
  message?: string;
}

class SalesService {
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
      modul?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    } = {}
  ): Promise<SalesListResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.SALES_LIST, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          modul: params.modul || '',
          startDate: params.startDate || '',
          endDate: params.endDate || '',
          search: params.search || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Satış listesi alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Satış listesi alınamadı');
    }
  }
}

export default new SalesService();
