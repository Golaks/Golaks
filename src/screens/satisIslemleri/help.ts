import type { PageHelp } from '../../lib/helpContext';

export const satisIslemleriHelp: PageHelp = {
  id: 'satis-islemleri',
  title: 'Satış İşlemleri',
  description:
    'Mağaza satışlarınızı oluşturabilir, açık satışlara satır ekleyip düzenleyebilir ve satışı onaylayarak kapatabilirsiniz.',
  menuPath: 'Mağaza → Satış İşlemleri',
  icon: 'cart',
  sections: [
    {
      type: 'intro',
      content:
        'Mağaza modülünün ana operasyon ekranıdır. Müşteri seçilir, ürünler eklenir, ödeme yöntemi belirlenir ve satış kaydedilir. Açık satışlara sonradan ürün veya ödeme eklenebilir; onaylanan satışlar (kapalı) sadece görüntülenir.',
      highlights: [
        { icon: 'plus', label: 'Yeni Satış' },
        { icon: 'edit', label: 'Açık Düzenleme' },
        { icon: 'check', label: 'Onayla' },
        { icon: 'card', label: 'Tahsilat' },
      ],
    },
    {
      title: 'Durum Sayaçları',
      type: 'feature-grid',
      features: [
        {
          icon: 'list',
          title: 'Toplam',
          description: 'Seçili tarih aralığındaki tüm satışlar (açık + kapalı).',
        },
        {
          icon: 'check',
          title: 'Açık',
          description: 'Henüz onaylanmamış, üzerinde değişiklik yapılabilen satışlar.',
        },
        {
          icon: 'lightbulb',
          title: 'Kapalı',
          description: 'Onaylanmış (kapatılmış) satışlar. Değiştirilemez.',
        },
        {
          icon: 'xCircle',
          title: 'Silinen',
          description: 'Pasifleştirilmiş satışlar; rapor amacıyla görünür.',
        },
      ],
    },
    {
      title: 'Yeni Satış Akışı',
      type: 'steps',
      steps: [
        {
          title: 'Ekle butonuna bas',
          description: 'Sağ üstteki + ile yeni satış formu açılır.',
        },
        {
          title: 'Müşteri seç',
          description:
            'Cari hesap listesinden seç veya yeni cari oluştur. Pasan müşteri varsayılı tanımlıysa otomatik gelir.',
          tip: 'Rezervasyon listesinden seçim yaparsan müşteri, acente ve rehber otomatik dolar.',
        },
        {
          title: 'Ürünleri ekle',
          description:
            'Barkod okutarak, stok kodu/adı yazarak veya kamera ile arayarak ekle. Miktar üzerindeki +/- butonlarıyla ayarla.',
          tip: 'Aynı ürün tekrar eklenirse miktar artar.',
        },
        {
          title: 'İndirim / fiyat ayarı (opsiyonel)',
          description:
            'Satır bazında indirim uygulayabilir, gerekirse manuel fiyat girebilirsin.',
        },
        {
          title: 'Tahsilatı seç',
          description:
            'Nakit, kart (taksitli/peşin) veya açık hesap olarak ödemeyi belirle. Bankayla kart taksitlerinde komisyon otomatik düşülür.',
        },
        {
          title: 'Kaydet',
          description:
            'Satış açık olarak kaydedilir; istersen sonradan ekleme yapıp en sonunda onaylarsın.',
        },
      ],
    },
    {
      title: 'Onaylama ve İptal',
      type: 'steps',
      steps: [
        {
          title: 'Açık satışı incele',
          description: 'Listeden satışın üzerine dokun, detay paneli açılır.',
        },
        {
          title: 'Onayla',
          description:
            'Tüm satırlar ve ödeme doğruysa onaylama butonuna bas; satış kapanır ve değiştirilemez.',
        },
        {
          title: 'Silme',
          description:
            'Yanlış oluşturulmuş açık satışı silebilirsin (durum: Silinen). Onaylanmış satışlar silinemez.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Rezervasyondan Satış',
      content:
        'Rezervasyon listesinde "Beklenen" durumunda olan kayıtlar satış formunda görünür. Rezervasyon seçildiğinde acente, rehber ve müşteri bilgileri otomatik atanır; rezervasyonun durumu da "İçerde" olur.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Barkod Tarayıcı',
      content:
        'Tek input alanı hem stok kodu/adı araması hem de kamera barkod okuyucu olarak çalışır. Hızlı kasiyer akışı için ideal.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Onay Sonrası Düzeltme',
      content:
        'Onaylanan satışın içeriğini mobilden değiştiremezsin. Düzeltme gerekiyorsa yönetici yetkisiyle web panelden açılması gerekir.',
    },
  ],
  faqs: [
    {
      question: 'Açık satışı kaydedip sonra ödeme ekleyebilir miyim?',
      answer:
        'Evet. Satışı açık kaydet, daha sonra listeden kartı aç ve ödeme ekleyebilirsin. Onaylama anına kadar değişiklik serbesttir.',
    },
    {
      question: 'Müşteriyi sonradan değiştirebilir miyim?',
      answer:
        'Açık satışta müşteriyi değiştirmek mümkündür; onaylandıktan sonra cari değişmez.',
    },
    {
      question: 'Bir ürünü yanlış miktarla ekledim, ne yapayım?',
      answer:
        'Satır üzerindeki - butonuyla azalt veya miktar alanına dokunup elle yaz. Tamamen silmek için satır sil butonunu kullan.',
    },
    {
      question: 'Kart taksitlerinde komisyon nereye yazılır?',
      answer:
        'Banka komisyon tanımlarındaki orana göre hesaplanır ve Şube Ayarları\'ndaki "Sipariş İndirim" hesabına otomatik kaydedilir.',
    },
    {
      question: 'Onayladıktan sonra "Silinen" durumuna alabilir miyim?',
      answer:
        'Mobilden onaylanmış bir satışı silemezsin. Sadece açık satışlar silinebilir. Yönetici web panelden iptal yapabilir.',
    },
    {
      question: 'Birden çok şube varsa satışı nasıl açıyorum?',
      answer:
        'Profil ekranındaki varsayılan şuben aktif olur. Diğer bir şubede satış yapmak için kullanıcının o şube yetkisinin açık ve varsayılan şubesinin değiştirilmiş olması gerekir.',
    },
  ],
};
