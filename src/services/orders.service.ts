import { API_ENDPOINTS } from '../constants/ApiConfig';

export type OrderDurum = 'beklemede' | 'uretimde' | 'tamamlandi';

export interface OrderItem {
  id: string;
  siparisKodu: string;
  musteriSiparisKodu: string;
  siparisTipi: number; // 1=satış, 2=satınalma
  tarih: string;
  teslimTarihi: string;
  doviz: string;
  tutar: number;
  miktar: number;
  cariAdi: string;
  subeAdi: string;
  musteriSube: string;
  aciklama: string;
  uretim: number;
  durum: OrderDurum;
  detaySayisi: number;
  uretimdeCount: number;
  beklemedeSayisi: number;
  indirimTipi: number;
  indirimDeger: number;
  avansTutar: number;
  avansDoviz: string;
}

export interface OrderSummaryItem {
  currency: string;
  totalCount: number;
  totalAmount: number;
  totalQuantity: number;
}

export interface OrderStats {
  totalSatis: number;
  totalSatinalma: number;
  totalUretimde: number;
  totalBeklemede: number;
}

export interface OrderListResponse {
  success: boolean;
  data: {
    items: OrderItem[];
    count: number;
    summary: OrderSummaryItem[];
    stats: OrderStats;
  };
  message?: string;
}

export interface OrderDetailBeden {
  beden: string;
  miktar: number;
}

export interface OrderDetailItem {
  id: string;
  modelAdi: string;
  modelKodu: string;
  stokAdi: string;
  stokKodu: string;
  hammaddeGrubu: string;
  fiyat: number;
  doviz: string;
  miktar: number;
  kdvOran: number;
  siparisDurum: number;
  durumLabel: string;
  uretimTipi: number;
  uretimTipiLabel: string;
  bedenSetAdi: string;
  bedenler: OrderDetailBeden[];
  aciklama: string;
}

export interface OrderDetailResponse {
  success: boolean;
  data: {
    details: OrderDetailItem[];
    count: number;
  };
  message?: string;
}

class OrdersService {
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
      siparisTipi?: number;
    } = {}
  ): Promise<OrderListResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_LIST, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          modul: params.modul || '',
          startDate: params.startDate || '',
          endDate: params.endDate || '',
          search: params.search || '',
          siparisTipi: params.siparisTipi || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Sipariş listesi alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Sipariş listesi alınamadı');
    }
  }

  async getDetail(
    token: string,
    dataName: string,
    siparisId: string
  ): Promise<OrderDetailResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_DETAIL, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          siparisId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Sipariş detayı alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Sipariş detayı alınamadı');
    }
  }
}

export default new OrdersService();
