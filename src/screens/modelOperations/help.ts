import type { PageHelp } from '../../lib/helpContext';

export const modelOperationsHelp: PageHelp = {
  id: 'model-islemleri',
  title: 'Model İşlemleri',
  description:
    'Ürün modellerinizi (model kartlarını) yönetebilir, yeni model ekleyebilir, mevcut modellerin renk varyantlarını ve görsellerini düzenleyebilirsiniz.',
  menuPath: 'Mağaza → İşlemler → Model İşlemleri',
  icon: 'cube',
  sections: [
    {
      type: 'intro',
      content:
        'Model kartları; aynı ürünün farklı renk, beden ve fiyat varyantlarını tek çatı altında toplayan ana kayıtlardır. Bir modelin altında birden çok renk açılabilir, her renk için ayrı görsel yüklenebilir.',
      highlights: [
        { icon: 'cube', label: 'Model Kartı' },
        { icon: 'star', label: 'Renk Varyantları' },
        { icon: 'eye', label: 'Görseller' },
        { icon: 'package', label: 'Barkod Tipi' },
      ],
    },
    {
      title: 'Temel İşlemler',
      type: 'feature-grid',
      features: [
        {
          icon: 'plus',
          title: 'Yeni Model Ekle',
          description: 'Sağ üstteki + butonu yeni model kartı formunu açar.',
        },
        {
          icon: 'edit',
          title: 'Model Düzenle',
          description: 'Listede karta dokunup içeriği genişlettikten sonra "Düzenle" ile alanları güncelleyin.',
        },
        {
          icon: 'eye',
          title: 'Görsel Yükle',
          description: 'Kart üzerindeki fotoğraf butonu ile model ya da renk bazlı görsel ekleyin. Birden çok fotoğraf seçilebilir.',
        },
        {
          icon: 'search',
          title: 'Arama',
          description: 'Sağ üstteki büyüteç ile model adı veya kodunda hızlı arama yapın.',
        },
        {
          icon: 'package',
          title: 'Barkod Tipi',
          description: 'Tekil (her ürün ayrı barkod), Seri (bedene göre) veya Çoğul (tüm ürünler aynı barkod) seçeneklerinden birini belirleyin.',
        },
        {
          icon: 'list',
          title: 'Ana Model',
          description: 'Var olan bir modelin altına yeni renk/varyant olarak ekleme yapmak için "Ana Model" alanını kullanın.',
        },
      ],
    },
    {
      title: 'Yeni Model Eklemek',
      type: 'steps',
      steps: [
        {
          title: 'Ekle butonuna bas',
          description: 'Sağ üstteki + ile form açılır.',
        },
        {
          title: 'Ana model seç (opsiyonel)',
          description: 'Yeni bir model açıyorsan boş bırak; mevcut modelin altına varyant ekliyorsan ana modeli seç.',
          tip: 'Ana model seçildiğinde model adı otomatik gelir, sadece renk/varyant bilgisi eklersin.',
        },
        {
          title: 'Model adı ve tipi',
          description: 'Anlaşılır bir model adı (örn. "Erkek Polo Tişört") ve model tipi (kategori) seç.',
        },
        {
          title: 'Barkod tipi',
          description: 'Her ürün için ayrı barkod kullanıyorsan Tekil, bedene göre Seri, tek barkod paylaşılıyorsa Çoğul seç.',
        },
        {
          title: 'Modelist (opsiyonel)',
          description: 'Modeli hazırlayan modelisti yazarak izlenebilirlik sağla.',
        },
        {
          title: 'Kaydet',
          description: 'Model kaydedilir; ardından renk varyantları ekleyip görselleri yükleyebilirsin.',
        },
      ],
    },
    {
      title: 'Renk ve Görsel Yönetimi',
      type: 'steps',
      steps: [
        {
          title: 'Model kartını aç',
          description: 'Listeden modele dokun, alt detay paneli açılır.',
        },
        {
          title: 'Renk ekle / seç',
          description: 'Mevcut renkleri görür, yenisini ekleyebilirsin.',
        },
        {
          title: 'Fotoğraf yükle',
          description: 'Galeriden çoklu seçim veya kameradan tek tek çekim yaparak görsel ekle. Yüklemeden önce küçük önizlemeler gösterilir.',
          tip: 'Renk seçilmeden yüklenen görseller modelin geneline atanır; renk seçili yüklenenler o renge özel olur.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Barkod Tipini Sonradan Değiştirme',
      content:
        'Model kaydedildikten sonra hareket olduysa barkod tipini değiştirmek önerilmez; mevcut stok hareketleri yanlış varyanta yazılabilir.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Modeli Hızlı Kopyala',
      content:
        'Var olan bir modele benzer yeni model açacaksan "Ana Model" alanına eski modeli seçip sadece farklı alanları değiştirebilirsin; tüm formu sıfırdan doldurmana gerek kalmaz.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Görsel Boyutları',
      content:
        'Uygulama görselleri otomatik olarak 1200x1200\'a kadar küçültür. Daha büyük dosyalar yüklenirken sıkıştırılır; çok yüksek çözünürlüklü görseller veri kotanı tüketebilir.',
    },
  ],
  faqs: [
    {
      question: 'Model ile varyant arasındaki fark nedir?',
      answer:
        'Model bir ürünün ana tanımıdır (örn. "Polo Tişört"). Varyantlar ise rengi, bedeni veya başka özellikleri farklı olan alt kayıtlardır. Hareketler hep varyant üzerinden işlenir.',
    },
    {
      question: 'Bir modeli silebilir miyim?',
      answer:
        'Stok hareketi olmayan modeller silinebilir. Hareketi olan bir modeli pasifleştirmen önerilir; muhasebe geçmişi korunur.',
    },
    {
      question: 'Bir renge ait farklı görsel açılarını yükleyebilir miyim?',
      answer:
        'Evet, aynı rengin altına istediğin kadar fotoğraf ekleyebilirsin; mağaza vitrini ve satış ekranlarında bunlar slide olarak gösterilir.',
    },
    {
      question: 'Modelist alanı zorunlu mu?',
      answer:
        'Hayır, opsiyoneldir. Konfeksiyon firmaları için izlenebilirlik amacıyla kullanılır; mağaza modelleri boş bırakılabilir.',
    },
  ],
};
