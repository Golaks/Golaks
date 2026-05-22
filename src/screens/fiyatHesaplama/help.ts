import type { PageHelp } from '../../lib/helpContext';

export const fiyatHesaplamaHelp: PageHelp = {
  id: 'fiyat-hesaplama',
  title: 'Fiyat Hesaplama Algoritması',
  description:
    'Alış fiyatından başlayarak Giriş, Maliyet ve Etiket fiyatlarını otomatik üreten zincirleme bir hesaplama tanımlarsınız. Her aşamada eklenecek değer yüzde (%) veya sabit tutar olarak ayarlanır.',
  menuPath: 'Profil → Sistem Ayarları → Fiyat Hesaplama',
  icon: 'trendingUp',
  sections: [
    {
      type: 'intro',
      content:
        'Bu ekran üç ardışık kart üzerinden zincirleme bir fiyat hesaplamasıdır. Alış fiyatına eklediğiniz değer ile Giriş; Giriş üzerine eklenenle Maliyet; Maliyet üzerine eklenenle de Etiket (satış) fiyatı oluşur.',
      highlights: [
        { icon: 'arrowDown', label: 'Giriş' },
        { icon: 'layers', label: 'Maliyet' },
        { icon: 'trendingUp', label: 'Etiket' },
        { icon: 'swap', label: 'Yüzde / Değer' },
      ],
    },
    {
      title: 'Akış: Alış → Giriş → Maliyet → Etiket',
      type: 'steps',
      steps: [
        {
          title: 'Giriş Fiyatı',
          description:
            'Alış fiyatına eklenen yük (vergi, gümrük, navlun vb.). Yüzde seçtiysen alış × (1 + %); değer seçtiysen alış + tutar olarak hesaplanır.',
          tip: 'Genelde stoklama maliyetini buraya eklenir.',
        },
        {
          title: 'Maliyet Fiyatı',
          description:
            'Giriş fiyatının üstüne eklenen iç maliyetler (paketleme, işçilik, dağıtım). Aynı şekilde yüzde veya değer olabilir.',
        },
        {
          title: 'Etiket Fiyatı',
          description:
            'Maliyet üzerine eklenen kâr marjı; satışta görünen son fiyat budur.',
          tip: 'Kar oranını burada belirlersin; etiket = maliyet × (1 + kar%).',
        },
      ],
    },
    {
      title: 'Yüzde mi, Değer mi?',
      type: 'feature-grid',
      features: [
        {
          icon: 'star',
          title: 'Yüzde (%)',
          description:
            'Önceki fiyat üzerine oransal artış. Örnek: %20 girilirse, 100 ₺ → 120 ₺.',
        },
        {
          icon: 'coins',
          title: 'Değer (₺)',
          description:
            'Önceki fiyatın üzerine sabit tutar eklenir. Örnek: 15 girilirse, 100 ₺ → 115 ₺.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Örnek Hesaplama',
      content:
        'Alış 100 ₺, Giriş %10, Maliyet %5, Etiket %30 olduğunda: Giriş 110, Maliyet 115.50, Etiket 150.15 ₺ olur.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Tutarlı Marj',
      content:
        'Tüm ürünlere benzer bir kâr marjı uygulamak istiyorsan Etiket aşamasını yüzde tutmak en pratik yoldur; ürünün maliyeti değişse bile marj aynı oranda korunur.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Kaydetmeden Çıkma',
      content:
        'Değişiklikleriniz Kaydet butonuna basana kadar uygulanmaz; geri çıkarsanız önceki ayarlar geçerli kalır.',
    },
  ],
  faqs: [
    {
      question: 'Bir kartı kullanmak istemiyorum, sıfır mı bırakayım?',
      answer:
        'Evet, ilgili kartın değerini 0 yaparsan o aşamada herhangi bir ekleme yapılmaz; önceki fiyat aynen sonraki aşamaya geçer.',
    },
    {
      question: 'Aynı anda hem yüzde hem değer ekleyebilir miyim?',
      answer:
        'Her kart için tek bir tip seçilir: ya yüzde ya değer. Ama üç aşamayı farklı tiplerde birleştirebilirsin (örn. Giriş yüzde, Maliyet değer, Etiket yüzde).',
    },
    {
      question: 'KDV nereye giriyor?',
      answer:
        'Bu ekran fiyat algoritmasını yönetir; KDV stok kartı veya fatura tarafında ayrı yönetilir. Vergi dahil mantığını burada uygulamak istersen ilgili aşamaya yüzde olarak ekleyebilirsin.',
    },
    {
      question: 'Mağaza ve konfeksiyon için ayrı algoritma tanımlanabilir mi?',
      answer:
        'Şu an tek bir global ayar yapısı vardır. Modül bazlı farklı hesaplama gerekiyorsa stok kartı bazında manuel düzenleme yapılabilir.',
    },
  ],
};
