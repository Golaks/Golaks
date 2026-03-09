import { API_ENDPOINTS } from '../constants/ApiConfig';

export interface StockItem {
  id: string;
  stockCode: string;
  stockName: string;
  barcode: string;
  barcodeType: 'tekil' | 'seri' | 'cogul';
  module: string;
  subModule: string;
  currency: string;
  size: string;
  quantity1In: number;
  quantity1Out: number;
  quantity1Remaining: number;
  quantity2In: number;
  quantity2Out: number;
  quantity2Remaining: number;
  vatRate: number;
  description: string;
  type: string;
  subType: string;
  kind: string;
  origin: string;
  unit1: string;
  unit2: string;
  model: string;
  lastPrice: number;
  totalValue: number;
}

export interface StockSummaryItem {
  currency: string;
  totalItems: number;
  totalIn: number;
  totalOut: number;
  totalRemaining: number;
  totalValue: number;
  amountIn: number;
  amountOut: number;
  amountRemaining: number;
}

export interface StockListResponse {
  success: boolean;
  data: {
    data: StockItem[];
    count: number;
    summary: StockSummaryItem[];
  };
  message?: string;
}

export interface StockSubGroupItem {
  subGroupId: string;
  subGroupName: string;
  itemCount: number;
  totalIn: number;
  totalOut: number;
  totalRemaining: number;
}

export interface StockGroupItem {
  groupId: string;
  groupName: string;
  currency: string;
  itemCount: number;
  totalIn: number;
  totalOut: number;
  totalRemaining: number;
  totalValue: number;
  subGroups?: StockSubGroupItem[];
}

export interface StockGroupedResponse {
  success: boolean;
  data: {
    reportMode: string;
    groups: StockGroupItem[];
    count: number;
    summary: StockSummaryItem[];
  };
  message?: string;
}

export interface CreateStockData {
  stockCode: string;
  stockName: string;
  barcode?: string;
  barcodeType?: 'tekil' | 'seri' | 'cogul';
  module?: string;
  subModule?: string;
  currency?: string;
  size?: string;
  vatRate?: number;
  description?: string;
}

export interface CreateStockResponse {
  success: boolean;
  data?: {
    id: string;
    stockCode: string;
    stockName: string;
  };
  message?: string;
}

class StockService {
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
      stokModul?: string;
      stokAltModul?: string;
      search?: string;
    } = {}
  ): Promise<StockListResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.STOCK_LIST, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          stokModul: params.stokModul || '',
          stokAltModul: params.stokAltModul || '',
          search: params.search || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Stok listesi alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Stok listesi alınamadı');
    }
  }
  async createStock(
    token: string,
    dataName: string,
    stockData: CreateStockData,
  ): Promise<CreateStockResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.STOCK_CREATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, stockData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Stok kartı oluşturulamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Stok kartı oluşturulamadı');
    }
  }
}

export default new StockService();
