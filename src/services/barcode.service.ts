/**
 * Barcode Service
 * Barkod/Model sorgulama işlemleri
 */

import { API_ENDPOINTS } from '../constants/ApiConfig';

export interface ProductImage {
  id: string;
  url: string;
}

export type BarcodeType = 'tekil' | 'seri' | 'cogul';

export interface ProductInfo {
  barcode: string;
  barcodeType: BarcodeType;
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
  currency?: string;
}

export interface ProductDistribution {
  id: string;
  branch: string;
  warehouse: string;
  type: string;
  color: string;
  size: string;
  quantity: number;
  height?: string;
  outlet?: string;
}

export interface ProductionDistribution {
  id: string;
  branchWarehouse: string;
  type: string;
  color: string;
  size: string;
  quantity: number;
  status: 'stock' | 'process';
}

export interface BarcodeQueryResponse {
  success: boolean;
  data: {
    product: ProductInfo | null;
    images: ProductImage[];
    stokModul?: string;
    magazaDistribution: any[];
    konfeksiyonDistribution: any[];
    tabakhaneDistribution: any[];
    muhasebeDistribution: any[];
  };
  message?: string;
  error?: any;
}

class BarcodeService {
  private getAuthHeader(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async queryStock(
    token: string,
    dataName: string,
    queryType: 'barcode' | 'model',
    queryValue: string,
  ): Promise<BarcodeQueryResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.STOCK_BARCODE_QUERY, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          queryType,
          queryValue,
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Sunucu yanıtı işlenemedi. Lütfen tekrar deneyin.');
      }

      if (!response.ok) {
        const errorMessage = data.error?.message || data.message || 'Sorgu başarısız';
        throw new Error(errorMessage);
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Barkod sorgusu yapılamadı');
    }
  }
}

export default new BarcodeService();
