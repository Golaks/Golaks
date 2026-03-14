import { API_ENDPOINTS } from '../constants/ApiConfig';

export interface KurItem {
  dovizTipi: string;
  dovizAlis: number;
  dovizSatis: number;
  efektifAlis: number;
  efektifSatis: number;
  ozelKur: number;
}

export interface KurlarResponse {
  success: boolean;
  data?: {
    tarih: string;
    kurAnahtar: string;
    kaynak: string;
    kurlar: Record<string, KurItem>;
  };
}

export type KurTipiKey = 'dovizAlis' | 'dovizSatis' | 'efektifAlis' | 'efektifSatis' | 'ozelKur';

const kurTipiMap: Record<string, KurTipiKey> = {
  doviz_alis: 'dovizAlis',
  doviz_satis: 'dovizSatis',
  efektif_alis: 'efektifAlis',
  efektif_satis: 'efektifSatis',
  ozel_kur: 'ozelKur',
};

/**
 * DB'deki kur_tipi (doviz_alis) → JS key (dovizAlis) dönüşümü
 */
export function mapKurTipi(dbKurTipi?: string): KurTipiKey {
  return kurTipiMap[dbKurTipi || ''] || 'dovizAlis';
}

class DovizService {
  private getAuthHeader(token: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Belirli tarih için döviz kurlarını getir
   */
  async getKurlar(
    token: string,
    dataName: string,
    tarih?: string,
    kurAnahtar = 'tr',
  ): Promise<KurlarResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.DOVIZ_KURLAR, {
        method: 'POST',
        headers: this.getAuthHeader(token),
        body: JSON.stringify({ dataName, tarih, kurAnahtar }),
      });
      return await response.json();
    } catch {
      return { success: false };
    }
  }

  /**
   * Döviz çevirme fonksiyonu
   * tutar: çevrilecek miktar
   * fromDoviz: kaynak döviz (ör: "USD")
   * toDoviz: hedef döviz (ör: "EUR")
   * kurlar: API'den gelen kur listesi
   * kurTipi: hangi kur kullanılacak (default: dovizSatis)
   */
  convert(
    tutar: number,
    fromDoviz: string,
    toDoviz: string,
    kurlar: Record<string, KurItem>,
    kurTipi: 'dovizAlis' | 'dovizSatis' | 'efektifAlis' | 'efektifSatis' | 'ozelKur' = 'dovizAlis',
  ): number {
    if (!tutar || fromDoviz === toDoviz) return tutar;

    // TL base currency - kurlar TL cinsinden
    const baseCurrency = 'TL';

    // fromDoviz → TL → toDoviz
    let tutarTL = tutar;

    if (fromDoviz !== baseCurrency) {
      const fromKur = kurlar[fromDoviz];
      if (!fromKur) return 0;
      const fromRate = fromKur[kurTipi] || fromKur.dovizSatis;
      tutarTL = tutar * fromRate;
    }

    if (toDoviz === baseCurrency) return tutarTL;

    const toKur = kurlar[toDoviz];
    if (!toKur) return 0;
    const toRate = toKur[kurTipi] || toKur.dovizSatis;
    if (toRate === 0) return 0;

    return tutarTL / toRate;
  }
}

export const dovizService = new DovizService();
export default dovizService;
