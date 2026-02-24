/**
 * Barcode Service
 * Barkod ve model sorgu işlemleri (konfeksiyon stok)
 */

import { API_ENDPOINTS } from '../constants/ApiConfig';

// ─── Types ──────────────────────────────────────────────

export type BarcodeType = 'tekil' | 'seri' | 'cogul';

export interface BarcodeStockItem {
  barkod_tipi: BarcodeType;
  beden: string;
  model: string;
  renk: string;
  tip: string;
  alttip: string;
  cins: string;
  adet: number;
}

export interface BarcodeProductInfo {
  barcode: string;
  model: string;
  size: string;
  color: string;
  branch: string;
  warehouse: string;
  manufacturer: string;
  year: string;
  info: string;
  entryPrice: string;
  costPrice: string;
  labelPrice: string;
  entryCostCurrency?: string;
  labelCurrency?: string;
}

export interface BarcodeProductImage {
  id: string;
  url: string;
}

export interface BarcodeQueryResponse {
  success: boolean;
  data: {
    items: BarcodeStockItem[];
    productInfo?: BarcodeProductInfo;
    images?: BarcodeProductImage[];
    count: number;
  };
  message?: string;
}

// ─── Service ──────────────────────────────────────────────

class BarcodeService {
  private getAuthHeader(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Barkod veya model adıyla stok sorgulama
   */
  async queryStock(
    token: string,
    dataName: string,
    queryType: 'barcode' | 'model',
    queryValue: string
  ): Promise<BarcodeQueryResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.CONFECTION_BARCODE_QUERY, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          queryType,
          queryValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Barkod sorgusu başarısız');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Barkod sorgusu başarısız');
    }
  }
}

export default new BarcodeService();
