import { API_ENDPOINTS } from '../constants/ApiConfig';

export type OrderDurum = 'beklemede' | 'uretimde' | 'kapali' | 'iptal';

export interface AvansItem {
  tutar: number;
  doviz: string;
  dovizliTutar: number;
  aciklama: string;
  cariIslendi: boolean;
}

export interface MasterAvansIndirim {
  avans: AvansItem[];
  indirim: { tip: number; deger: number; doviz: string; cariIslendi: boolean };
}

export interface DurumBilgi {
  uretimOnay?: boolean;
  uretimOnayTarihi?: string;
  uretimOnayKullaniciId?: number;
  iptalNotu?: string;
  iptalTarihi?: string;
  iptalKullaniciId?: number;
}

export interface OrderItem {
  id: string;
  siparisKodu: string;
  musteriSiparisKodu: string;
  siparisTipi: number; // 1=satış, 2=satınalma
  siparisModul: string; // muhasebe, tabakhane, konfeksiyon, magaza
  tarih: string;
  teslimTarihi: string;
  doviz: string;
  tutar: number;
  miktar: number;
  cariAdi: string;
  subeAdi: string;
  musteriSube: string;
  aciklama: string;
  aktif: number; // -2=iptal, -1=silindi, 0=pasif, 1=aktif
  uretim: number;
  durum: OrderDurum;
  durumBilgi: DurumBilgi | null;
  detaySayisi: number;
  uretimdeCount: number;
  beklemedeSayisi: number;
  masterAvansIndirim: MasterAvansIndirim | null;
  carilerId: number;
  teslimSekliId: number;
  paketlemeId: number;
  kayitTarihi: string;
  deriGrubu?: string;
  teslimSekliAdi?: string;
  paketlemeAdi?: string;
  kayitKullaniciId?: number;
  // Hesaplanmış alanlar (backend tarafından)
  avansTutar?: number;
  avansDoviz?: string;
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
  totalKapali: number;
  totalIptal: number;
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
  varyantAdi: string;
  varyantKodu: string;
  varyantBarkod: string;
  stokGrupKodu: string;
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
  indirim: number;
  indirimTip: number;
  dovizliFiyat: number;
  satisFiyat: number;
  maliyetFiyat: number;
  resimUrl: string;
}

export interface ReceteItem {
  id: string;
  siparisDetayId: string;
  kalemTipi: string;
  kalemTipiLabel: string;
  malzemeTipi: string;
  islemAdi: string;
  varyantAdi: string;
  varyantKodu: string;
  stokAdi: string;
  stokKodu: string;
  stokGrupKodu: string;
  miktar: number;
  birimAdi: string;
  birimFiyat: number;
  doviz: string;
  toplamTutar: number;
  aciklama: string;
  siraNo: number;
}

export interface ReceteSummary {
  doviz: string;
  toplam: number;
}

export interface ReceteResponse {
  success: boolean;
  data: {
    items: ReceteItem[];
    count: number;
    summary: ReceteSummary[];
  };
  message?: string;
}

export interface DovizTipi {
  id: number;
  dovizTipi: string;
  dovizAdi: string;
  dovizBirimi: number;
}

export interface LookupItem {
  id: number;
  adi: string;
}

export interface CariLookupItem {
  id: number;
  unvan: string;
  hesapKodu: string;
  kurTipi: string;
}

// Detail form lookup types
export interface DetailBedenSetItem {
  id: number;
  setTipi: string;
  bedenler: string[];
}

export interface DetailModelKartItem {
  id: number;
  modelKodu: string;
  modelAdi: string;
  bedenSetId: number;
}

export interface DetailVaryantItem {
  id: number;
  varyantAdi: string;
  varyantKodu: string;
  stokGrupKodu: string;
  barkod: string;
}

export interface DetailLookupsData {
  bedenSetleri: DetailBedenSetItem[];
  modelKartlar: DetailModelKartItem[];
}

export interface OrderLookupsResponse {
  success: boolean;
  data: {
    dovizTipleri: DovizTipi[];
    teslimSekilleri: LookupItem[];
    paketlemeler: LookupItem[];
    nextSiparisKodu: string;
    cariler: CariLookupItem[];
  };
}

export interface OrderCreateData {
  siparisKodu: string;
  musteriSiparisKodu?: string;
  siparisTipi: number;
  siparisModul: string;
  carilerId: number;
  teslimSekliId?: number;
  paketlemeId?: number;
  tarih: string;
  teslimTarihi: string;
  doviz: string;
  aciklama?: string;
  masterAvansIndirim?: MasterAvansIndirim;
  musteriSube?: string;
  deriGrubu?: string;
  siparisGrubuId?: number;
  siparisTipiId?: number;
  siparisiAlan?: string;
  siparisGrubuId?: number;
  siparisTipiId?: number;
  siparisGrubuAdi?: string;
  siparisTipiAdi?: string;
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
  async getRecete(
    token: string,
    dataName: string,
    siparisId: string
  ): Promise<ReceteResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_RECETE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, siparisId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Reçete alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Reçete alınamadı');
    }
  }

  async getLookups(
    token: string,
    dataName: string
  ): Promise<OrderLookupsResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_LOOKUPS, {
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

  async createOrder(
    token: string,
    dataName: string,
    orderData: OrderCreateData
  ): Promise<{ success: boolean; data?: { message: string; id: number; siparisKodu: string }; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_CREATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, ...orderData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Sipariş oluşturulamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Sipariş oluşturulamadı');
    }
  }

  async updateOrder(
    token: string,
    dataName: string,
    siparisId: string,
    updateData: Partial<OrderCreateData>
  ): Promise<{ success: boolean; data?: { message: string }; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_UPDATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, siparisId, ...updateData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Sipariş güncellenemedi');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Sipariş güncellenemedi');
    }
  }

  async uretimeAl(
    token: string,
    dataName: string,
    siparisId: string
  ): Promise<{ success: boolean; data?: { message: string; siparisKodu: string }; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_URETIME_AL, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, siparisId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Üretime alma başarısız');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Üretime alma başarısız');
    }
  }

  async getDetailLookups(
    token: string,
    dataName: string
  ): Promise<{ success: boolean; data?: DetailLookupsData; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_DETAIL_LOOKUPS, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Detay lookup alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Detay lookup alınamadı');
    }
  }

  async getDetailVaryantlar(
    token: string,
    dataName: string,
    modelId: string
  ): Promise<{ success: boolean; data?: { varyantlar: DetailVaryantItem[] }; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_DETAIL_VARYANTLAR, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, modelId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Varyantlar alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Varyantlar alınamadı');
    }
  }

  async addDetail(
    token: string,
    dataName: string,
    siparisMasterId: string,
    detayData: Record<string, any>
  ): Promise<{ success: boolean; data?: { message: string; detayId: number }; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_ADD_DETAIL, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, siparisMasterId, ...detayData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Detay eklenemedi');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Detay eklenemedi');
    }
  }
  async cancelOrder(
    token: string,
    dataName: string,
    siparisMasterId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS_CANCEL, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, siparisMasterId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Sipariş iptal edilemedi');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Sipariş iptal edilemedi');
    }
  }
}

export default new OrdersService();
