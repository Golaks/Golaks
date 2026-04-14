import { useState, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { useAuth } from '../contexts/AuthContext';
import dovizService, { KurItem } from '../services/doviz.service';

/**
 * Döviz kur yönetimi hook'u
 * Kurları tarih bazlı çeker ve dönüşüm fonksiyonları sağlar.
 *
 * Kullanım:
 *   const { kurlar, loadKurlar, getKur, convert, formatKur } = useDovizKur();
 *
 *   // Kurları çek
 *   await loadKurlar(new Date('2026-04-09'));
 *
 *   // Kur al
 *   const usdKur = getKur('USD'); // 44.4527
 *
 *   // Dönüştür
 *   const tlTutar = convert(100, 'USD', 'TL'); // 4445.27
 */

export default function useDovizKur() {
  const { user } = useAuth();
  const [kurlar, setKurlar] = useState<Record<string, KurItem>>({});
  const [kurTarihi, setKurTarihi] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Belirtilen tarihteki kurları çeker
   * @param tarih Date objesi veya undefined (bugün)
   * @returns Kurlar objesi
   */
  const loadKurlar = useCallback(async (tarih?: Date): Promise<Record<string, KurItem>> => {
    setIsLoading(true);
    try {
      const token = await authService.getToken();
      if (!token) return {};
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      const tarihStr = tarih
        ? `${tarih.getFullYear()}-${String(tarih.getMonth() + 1).padStart(2, '0')}-${String(tarih.getDate()).padStart(2, '0')}`
        : undefined;
      const response = await dovizService.getKurlar(token, dataName, tarihStr);
      if (response.success && response.data?.kurlar) {
        setKurlar(response.data.kurlar);
        setKurTarihi(response.data.tarih || tarihStr || '');
        return response.data.kurlar;
      }
    } catch {} finally {
      setIsLoading(false);
    }
    return {};
  }, [user]);

  /**
   * Belirtilen dövizin kurunu döner
   * @param doviz Döviz kodu (USD, EUR vb.)
   * @param tip Kur tipi (default: dovizAlis)
   * @returns Kur değeri (TL ise 1)
   */
  const getKur = useCallback((
    doviz: string,
    tip: 'dovizAlis' | 'dovizSatis' | 'efektifAlis' | 'efektifSatis' | 'ozelKur' = 'dovizAlis'
  ): number => {
    if (!doviz || doviz === 'TL') return 1;
    const kur = kurlar[doviz];
    if (!kur) return 1;
    return kur[tip] || 1;
  }, [kurlar]);

  /**
   * Belirtilen dövizin kur string'ini döner
   */
  const getKurStr = useCallback((
    doviz: string,
    tip: 'dovizAlis' | 'dovizSatis' | 'efektifAlis' | 'efektifSatis' | 'ozelKur' = 'dovizAlis'
  ): string => {
    return String(getKur(doviz, tip));
  }, [getKur]);

  /**
   * Tutarı bir dövizden diğerine çevirir
   * @param tutar Kaynak tutar
   * @param kaynakDoviz Kaynak döviz (USD, EUR, TL vb.)
   * @param hedefDoviz Hedef döviz
   * @param tip Kur tipi
   * @returns Çevrilmiş tutar
   */
  const convert = useCallback((
    tutar: number,
    kaynakDoviz: string,
    hedefDoviz: string,
    tip: 'dovizAlis' | 'dovizSatis' | 'efektifAlis' | 'efektifSatis' | 'ozelKur' = 'dovizAlis'
  ): number => {
    return dovizService.convert(tutar, kaynakDoviz, hedefDoviz, kurlar, tip);
  }, [kurlar]);

  /**
   * Tutarı çevirip string olarak döner (2 decimal)
   */
  const convertStr = useCallback((
    tutar: number,
    kaynakDoviz: string,
    hedefDoviz: string,
    tip: 'dovizAlis' | 'dovizSatis' | 'efektifAlis' | 'efektifSatis' | 'ozelKur' = 'dovizAlis'
  ): string => {
    const sonuc = convert(tutar, kaynakDoviz, hedefDoviz, tip);
    return sonuc ? sonuc.toFixed(2) : '';
  }, [convert]);

  /**
   * 3 ayaklı döviz hesabı yapar (dövizli → muhasebe + cari)
   * @param tutar Dövizli tutar
   * @param dovizliDoviz İşlem dövizi
   * @param muhasebeDoviz Muhasebe dövizi (genelde şubenin varsayılan dövizi)
   * @param cariDoviz Carinin dövizi
   * @returns { muhasebeTutar, muhasebeKur, cariTutar, cariKur }
   */
  const calculate3Ayak = useCallback((
    tutar: number,
    dovizliDoviz: string,
    muhasebeDoviz: string,
    cariDoviz: string,
    tip: 'dovizAlis' | 'dovizSatis' | 'efektifAlis' | 'efektifSatis' | 'ozelKur' = 'dovizAlis'
  ) => {
    return {
      dovizliKur: getKurStr(dovizliDoviz, tip),
      muhasebeTutar: convertStr(tutar, dovizliDoviz, muhasebeDoviz, tip),
      muhasebeKur: getKurStr(muhasebeDoviz, tip),
      cariTutar: convertStr(tutar, dovizliDoviz, cariDoviz, tip),
      cariKur: getKurStr(cariDoviz, tip),
    };
  }, [getKurStr, convertStr]);

  return {
    kurlar,
    kurTarihi,
    isLoading,
    loadKurlar,
    getKur,
    getKurStr,
    convert,
    convertStr,
    calculate3Ayak,
  };
}
