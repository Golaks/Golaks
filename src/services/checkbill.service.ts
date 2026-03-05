import { API_ENDPOINTS } from '../constants/ApiConfig';

export interface CheckBillMovement {
  id: string;
  date: string;
  location: string;
  customer?: string;
  description?: string;
  amount: number;
  currency: string;
  type: 'in' | 'out';
}

export interface CheckBillItem {
  id: string;
  documentNo: string;
  documentType: 'check' | 'bill';
  documentLocation: string;
  customerName: string;
  customerCode: string;
  lastCustomerName: string;
  documentDate: string;
  dueDate: string;
  paymentDate?: string;
  bank?: string;
  bankBranch?: string;
  bankAccount?: string;
  owner?: string;
  currency: string;
  amount: number;
  paid: number;
  remaining: number;
  dueMonth: string;
  movements?: CheckBillMovement[];
}

export interface CheckBillListResponse {
  success: boolean;
  data: {
    data: CheckBillItem[];
    count: number;
  };
  message?: string;
}

class CheckBillService {
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
      documentType?: string;
      documentLocation?: string;
      search?: string;
    } = {}
  ): Promise<CheckBillListResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CHECK_BILL_LIST, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          startDate: params.startDate || '',
          endDate: params.endDate || '',
          documentType: params.documentType || '%',
          documentLocation: params.documentLocation || '%',
          search: params.search || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Çek/Senet listesi alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Çek/Senet listesi alınamadı');
    }
  }
}

export default new CheckBillService();
