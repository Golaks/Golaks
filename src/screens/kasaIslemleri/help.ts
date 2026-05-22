import type { PageHelp } from '../../lib/helpContext';

export const kasaIslemleriHelp: PageHelp = {
  id: 'kasa-islemleri',
  title: 'Kasa İşlemleri',
  description:
    'Şubelerinizdeki kasaları açıp kapatabilir, kasa giriş/çıkış hareketlerini ekleyip düzenleyebilirsiniz. Çoklu döviz ve cari hesap entegrasyonu desteklenir.',
  menuPath: 'Muhasebe → Kasa İşlemleri',
  icon: 'wallet',
  sections: [
    {
      type: 'intro',
      content:
        'Kasa İşlemleri ekranı; günlük kasa kayıtlarınızı tek bir yerden yönetmenizi sağlar. Açık kasalar, kapalı kasalar ve hareket detayları tek dokunuşla erişilebilir.',
      highlights: [
        { icon: 'cube', label: 'Çoklu Döviz' },
        { icon: 'user', label: 'Cari Bağlantısı' },
        { icon: 'arrowUp', label: 'Giriş / Çıkış' },
        { icon: 'document', label: 'Fiş Görseli' },
      ],
    },
    {
      title: 'Temel Özellikler',
      type: 'feature-grid',
      features: [
        {
          icon: 'plus',
          title: 'Yeni Kasa Aç',
          description: 'Üst sağdaki ekle butonuyla seçili şubeniz için yeni bir kasa fişi oluşturun.',
        },
        {
          icon: 'arrowDown',
          title: 'Kasa Girişi',
          description: 'Mevcut bir kasaya giriş hareketi ekleyin. Cari seçince açıklama otomatik dolar.',
        },
        {
          icon: 'arrowUp',
          title: 'Kasa Çıkışı',
          description: 'Aynı pencereden çıkış işlemi de yapabilirsiniz; tutar dövizli/muhasebe/cari olarak girilebilir.',
        },
        {
          icon: 'search',
          title: 'Cari Arama',
          description: 'Cari hesap alanı yazdıkça anlık olarak filtreleniyor; tüm cari kayıtlarınızda arayabilirsiniz.',
        },
      ],
    },
    {
      title: 'Yeni Bir Hareket Eklemek',
      type: 'steps',
      steps: [
        {
          title: 'Kasayı seç',
          description: 'Listeden ilgili kasaya dokun, kart açılınca alt kısımda hareketler görünür.',
        },
        {
          title: 'Giriş veya Çıkış',
          description: '"Kasa Giriş" veya "Kasa Çıkış" butonuna basarak form açılır.',
        },
        {
          title: 'Cari hesabı seç',
          description: 'Yazarak ara veya listeden seç. Cari ünvanı otomatik olarak açıklama alanına gelir.',
          tip: 'Cariyi temizlersen açıklama da otomatik temizlenir.',
        },
        {
          title: 'Tutar ve döviz',
          description: 'Dövizli, muhasebe ve cari karşılıklarını gir; kurlar fiş tarihine göre hesaplanır.',
        },
        {
          title: 'Kaydet',
          description: 'Fiş görseli isteğe bağlıdır. Kaydet butonuyla hareket kasaya işlenir.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Hızlı Arama',
      content:
        'Cari listesi büyükse stok kodu veya ünvanın bir kısmını yazarak hızlıca filtreleyebilirsin.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Kapalı Kasalarda Hareket',
      content:
        'Kapalı bir kasaya hareket eklemek için önce kasayı tekrar açmanız gerekir.',
    },
  ],
  faqs: [
    {
      question: 'Cari seçtikten sonra açıklamayı değiştirebilir miyim?',
      answer:
        'Evet, otomatik dolan açıklamanın üzerine yazabilirsin. Yine de cariyi değiştirirsen açıklama yeni cari adıyla güncellenir.',
    },
    {
      question: 'Hareket kayıt edildikten sonra düzenlenebilir mi?',
      answer:
        'Hareket satırına dokunarak düzenleme formuna ulaşırsın. Aynı alanlar formdaki düzenle modunda gelir.',
    },
    {
      question: 'Birden fazla dövizi nasıl yönetiyor?',
      answer:
        'Form içindeki "Dövizli", "Muhasebe" ve "Cari" satırlarıyla üç ayrı tutar/döviz/kur saklanır. Cari döviz değiştiğinde diğerleri de otomatik dönüştürülür.',
    },
  ],
};
