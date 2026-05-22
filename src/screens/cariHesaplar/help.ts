import type { PageHelp } from '../../lib/helpContext';

export const cariHesaplarHelp: PageHelp = {
  id: 'cari-hesaplar',
  title: 'Cari Hesaplar',
  description:
    'Firmanızın tüm cari hesaplarını (müşteri, tedarikçi, kasa, banka, personel, stok) yönetebilir; her bir cariye ait hareketleri ve ekstreyi tek bir yerden görüntüleyebilirsiniz.',
  menuPath: 'Muhasebe → İşlemler → Cari Hesaplar',
  icon: 'user',
  sections: [
    {
      type: 'intro',
      content:
        'Cari Hesaplar ekranı, hesap planınızdaki kayıtları tipine göre listeler. Bir cariye dokunarak ekstresini, geçmiş hareketlerini ve bakiyesini açabilirsiniz; yeni cari ekleme ve düzenleme de aynı ekrandan yapılır.',
      highlights: [
        { icon: 'filter', label: '7 Filtre' },
        { icon: 'plus', label: 'Yeni Cari' },
        { icon: 'fileText', label: 'Ekstre' },
        { icon: 'building', label: 'Şube Bazlı' },
      ],
    },
    {
      title: 'Filtreler',
      description:
        'Üstteki filtreler ile listeyi cari tipine göre daraltabilirsiniz. Hesap kodu prefix\'leri parantez içinde.',
      type: 'feature-grid',
      features: [
        {
          icon: 'list',
          title: 'Tüm Cariler',
          description: 'Herhangi bir tipte tüm aktif carileri listeler.',
        },
        {
          icon: 'user',
          title: 'Müşteriler (120)',
          description: 'Mal/hizmet satışı yapılan müşteri hesapları.',
        },
        {
          icon: 'building',
          title: 'Tedarikçiler (320)',
          description: 'Mal/hizmet aldığınız tedarikçi hesapları.',
        },
        {
          icon: 'wallet',
          title: 'Kasalar (100)',
          description: 'Şubelerinizdeki nakit kasa hesapları.',
        },
        {
          icon: 'card',
          title: 'Bankalar (102)',
          description: 'Banka hesaplarınız ve mevduatlar.',
        },
        {
          icon: 'handshake',
          title: 'Personeller (335)',
          description: 'Çalışan hesapları (avans, maaş takibi).',
        },
        {
          icon: 'cube',
          title: 'Stoklar (150)',
          description: 'Stok kalemleri için açılmış cari hesaplar.',
        },
      ],
    },
    {
      title: 'Cari Ekstresine Bakmak',
      type: 'steps',
      steps: [
        {
          title: 'Listeyi filtrele',
          description: 'Hangi tipi göreceğine karar ver — müşteri, tedarikçi vb.',
        },
        {
          title: 'Carini seç',
          description: 'Listede ilgili karta dokun. Üst başlık "Cari Ekstre" olur ve hareketler yüklenir.',
        },
        {
          title: 'Aşağı kaydırarak daha çok hareket gör',
          description: 'Liste, sayfa sayfa otomatik yüklenir; tüm hareketlere erişilebilir.',
          tip: 'Sağ üstteki arama simgesi ile hareketler içinde de filtreleme yapabilirsin.',
        },
        {
          title: 'PDF Ekstre',
          description: 'İstersen üstteki PDF butonuyla seçili cariye ait ekstreyi belge olarak alabilirsin.',
        },
      ],
    },
    {
      title: 'Yeni Cari Eklemek',
      type: 'steps',
      steps: [
        {
          title: 'Şubeyi seç',
          description: 'Birden fazla şube varsa cariyi açacağın şubeyi belirle.',
        },
        {
          title: 'Ekle',
          description: 'Üst sağdaki ekle butonu ile form açılır; hesap kodu otomatik üretilir.',
        },
        {
          title: 'Bilgileri gir',
          description: 'Ünvan, kısa ünvan, döviz tipi gibi alanları doldur.',
        },
        {
          title: 'Kaydet',
          description: 'Cari eklenir ve listeye düşer. Hemen sonra hareket girişine başlayabilirsin.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Hesap Kodu Mantığı',
      content:
        'Filtreler hesap kodunun ilk üç hanesine göre çalışır. Standart muhasebe planından gelir: 120 müşteriler, 320 satıcılar, 100 kasalar, 102 bankalar, 335 personel, 150 stoklar.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Hızlı Arama',
      content:
        'Sağ üstteki arama simgesini açıp ünvan ya da hesap kodunun bir kısmını yazarak büyük listelerde hızlıca cari bulabilirsin.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Cari Silme',
      content:
        'Hareketi olan bir cari direkt silinmez; muhasebe bütünlüğünü korumak için aktiflik durumu kapatılır. Tamamen silmek için yönetim panelinden onay gerekir.',
    },
  ],
  faqs: [
    {
      question: 'Cari hesabımı buldum ama bakiyesi yanlış görünüyor, neden?',
      answer:
        'Bakiye sayfa sayfa yüklenen tüm hareketlerin toplamından hesaplanır. Aşağı kaydırarak tüm hareketler yüklenince doğru bakiyeye ulaşırsın. Hâlâ farklıysa muhasebe hareketlerini kontrol et.',
    },
    {
      question: 'Bir cariyi iki şubede birden tanımlayabilir miyim?',
      answer:
        'Her cari tek bir şubeye bağlıdır. Aynı müşteri farklı şubede çalışıyorsa iki ayrı cari kart açılması gerekir.',
    },
    {
      question: 'Ekstrede tarih aralığı filtreleyebilir miyim?',
      answer:
        'Şu an mobilde tarih filtresi yoktur; tüm hareketler kronolojik gelir. Web panelden tarih aralığıyla rapor alabilirsin.',
    },
    {
      question: 'Cari döviz tipini sonradan değiştirebilir miyim?',
      answer:
        'Cari hareketi olmuş bir hesabın döviz tipi muhasebe tutarlılığı açısından değiştirilemez. Yeni döviz için ayrı cari açılması önerilir.',
    },
  ],
};
