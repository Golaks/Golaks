export type ProgramKey = 'muhasebe' | 'tabakhane' | 'konfeksiyon' | 'magaza';
export type CategoryKey = 'raporlar' | 'islemler';

export interface MenuItem {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export interface ProgramMenuDef {
  key: ProgramKey;
  label: string;
  icon: string;
  color: string;
  raporlar: MenuItem[];
  islemler: MenuItem[];
}

export const PROGRAM_MENUS: ProgramMenuDef[] = [
  {
    key: 'muhasebe',
    label: 'Muhasebe',
    icon: 'calculator-outline',
    color: '#3B82F6',
    raporlar: [
      { key: 'kasaBanka',            label: 'Kasa & Banka',          icon: 'wallet-outline',       color: '#3B82F6' },
      { key: 'cariOzet',             label: 'Cari Özet',             icon: 'people-outline',       color: '#8B5CF6' },
      { key: 'cariDetay',            label: 'Cari Detay',            icon: 'document-text-outline',color: '#10B981' },
      { key: 'cekSenet',             label: 'Çek & Senet',           icon: 'card-outline',         color: '#F59E0B' },
      { key: 'stoklar',              label: 'Stoklar',               icon: 'cube-outline',         color: '#EF4444' },
      { key: 'satislar',             label: 'Satışlar',              icon: 'cart-outline',         color: '#10B981' },
      { key: 'firmaModelPerformans', label: 'Firma Model Performans',icon: 'trending-up-outline',  color: '#8B5CF6' },
      { key: 'personelPerformans',   label: 'Personel Performans',   icon: 'people-outline',       color: '#EC4899' },
    ],
    islemler: [
      { key: 'bankaKomisyon', label: 'Banka Komisyon', icon: 'card-outline', color: '#3B82F6' },
    ],
  },
  {
    key: 'tabakhane',
    label: 'Tabakhane',
    icon: 'layers-outline',
    color: '#8B5CF6',
    raporlar: [],
    islemler: [],
  },
  {
    key: 'konfeksiyon',
    label: 'Konfeksiyon',
    icon: 'shirt-outline',
    color: '#F59E0B',
    raporlar: [
      { key: 'siparisler',           label: 'Siparişler',            icon: 'clipboard-outline',   color: '#F59E0B' },
      { key: 'satislar',             label: 'Satışlar',              icon: 'cart-outline',        color: '#10B981' },
      { key: 'firmaModelPerformans', label: 'Firma Model Performans',icon: 'trending-up-outline', color: '#8B5CF6' },
      { key: 'urunStoklar',          label: 'Ürün Stoklar',          icon: 'shirt-outline',       color: '#8B5CF6' },
      { key: 'hammaddeStoklar',      label: 'Hammadde Stoklar',      icon: 'cube-outline',        color: '#3B82F6' },
      { key: 'personelPerformans',   label: 'Personel Performans',   icon: 'people-outline',      color: '#EC4899' },
      { key: 'maliyetler',            label: 'Maliyetler',            icon: 'calculator-outline',  color: '#EF4444' },
    ],
    islemler: [
      { key: 'siparisIslemleri', label: 'Sipariş İşlemleri', icon: 'receipt-outline',    color: '#3B82F6' },
      { key: 'uretimIslemleri',  label: 'Üretim İşlemleri',  icon: 'construct-outline',  color: '#10B981' },
      { key: 'modelIslemleri',   label: 'Model İşlemleri',   icon: 'layers-outline',     color: '#F59E0B' },
    ],
  },
  {
    key: 'magaza',
    label: 'Mağaza',
    icon: 'storefront-outline',
    color: '#10B981',
    raporlar: [
      { key: 'satislar',             label: 'Satışlar',              icon: 'cart-outline',        color: '#10B981' },
      { key: 'stoklar',              label: 'Stoklar',               icon: 'cube-outline',        color: '#3B82F6' },
      { key: 'firmaModelPerformans', label: 'Firma Model Performans',icon: 'trending-up-outline', color: '#8B5CF6' },
      { key: 'personelPerformans',   label: 'Personel Performans',   icon: 'people-outline',      color: '#EC4899' },
      { key: 'acentaPerformans',     label: 'Acenta Performans',     icon: 'business-outline',    color: '#F59E0B' },
    ],
    islemler: [
      { key: 'rezervasyonlar', label: 'Rezervasyonlar', icon: 'calendar-outline', color: '#F59E0B' },
      { key: 'modelIslemleri', label: 'Model İşlemleri',icon: 'layers-outline',   color: '#F59E0B' },
    ],
  },
];
