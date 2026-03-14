/**
 * Model Service
 * Model kart işlemleri
 */

import { API_ENDPOINTS } from '../constants/ApiConfig';

export interface ModelKart {
  id: number;
  modelAdi: string;
  barkodTipi: 'tekil' | 'seri' | 'cogul';
  anaModel: string;
  anaModelId: number;
  modelTipi: string;
  modelTipiId: number;
  cinsiyet: string;
  cinsiyetId: number;
  modelist: string;
  tasarimci: string;
  tarz: string;
  tarzId: number;
  sezon: string;
  sezonId: number;
  marka: string;
  boy: string;
  setParca: number;
  setIcerik: string;
  aciklama: string;
  bazBeden: string;
  bedenSetleriId: number;
  katsayi: number | null;
  kayitTarihi: string;
  resimler: { id: number; url: string; renkAdi?: string | null }[];
}

export interface ModelColor {
  id: number;
  name: string;
  code: string | null;
}

export interface ModelKartListResponse {
  success: boolean;
  data: {
    data: ModelKart[];
    count: number;
  };
  message?: string;
}

class ModelService {
  private getAuthHeader(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async getModelList(
    token: string,
    dataName: string,
    search: string = ''
  ): Promise<ModelKartListResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.MODEL_KART_LIST, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({
          dataName,
          search,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Model listesi alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Model listesi alınamadı');
    }
  }

  async getColors(
    token: string,
    dataName: string
  ): Promise<{ success: boolean; data: { data: ModelColor[]; count: number } }> {
    try {
      const response = await fetch(API_ENDPOINTS.MODEL_KART_COLORS, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Renkler alınamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Renkler alınamadı');
    }
  }

  async uploadModelImage(
    token: string,
    modelId: number,
    dataName: string,
    imageUri: string,
    fileName: string,
    fileType: string,
    renkId?: number
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('modelId', String(modelId));
      formData.append('dataName', dataName);
      if (renkId) {
        formData.append('renkId', String(renkId));
      }
      formData.append('image', {
        uri: imageUri,
        name: fileName,
        type: fileType,
      } as any);

      const response = await fetch(API_ENDPOINTS.MODEL_KART_UPLOAD_IMAGE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Resim yüklenemedi');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Resim yüklenemedi');
    }
  }
  async createModel(
    token: string,
    dataName: string,
    model: {
      modelAdi: string;
      barkodTipi: string;
      anaModelId: number;
      modelTipiId?: number;
      cinsiyetId?: number;
      sezonId?: number;
      tarzId?: number;
      marka?: string;
      modelist?: string;
      tasarimci?: string;
      boy?: string;
      bedenSetleriId?: number;
      bazBeden?: string;
      setParca?: number;
      setIcerik?: string;
      katsayi?: number | null;
      aciklama?: string;
    }
  ): Promise<{ success: boolean; data?: { id: number }; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.MODEL_KART_CREATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, ...model }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Model oluşturulamadı');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Model oluşturulamadı');
    }
  }

  async updateModel(
    token: string,
    dataName: string,
    model: {
      id: number;
      modelAdi: string;
      barkodTipi: string;
      anaModelId: number;
      modelTipiId?: number;
      cinsiyetId?: number;
      sezonId?: number;
      tarzId?: number;
      marka?: string;
      modelist?: string;
      tasarimci?: string;
      boy?: string;
      bedenSetleriId?: number;
      bazBeden?: string;
      setParca?: number;
      setIcerik?: string;
      aciklama?: string;
    }
  ): Promise<{ success: boolean; data?: { id: number }; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.MODEL_KART_UPDATE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, ...model }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Model güncellenemedi');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Model güncellenemedi');
    }
  }

  async deleteModelImage(
    token: string,
    dataName: string,
    imageId: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.MODEL_KART_DELETE_IMAGE, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, imageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Resim silinemedi');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Resim silinemedi');
    }
  }
}

export default new ModelService();
