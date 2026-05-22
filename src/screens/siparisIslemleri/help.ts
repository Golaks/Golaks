import type { PageHelp } from '../../lib/helpContext';

export const siparisIslemleriHelp: PageHelp = {
  id: 'siparis-islemleri',
  title: 'Sipariş İşlemleri',
  description:
    'Konfeksiyon satış ve satınalma siparişlerinizi oluşturabilir, üretim aşamalarını takip edebilir, durum değişikliklerini ve iptal işlemlerini yönetebilirsiniz.',
  menuPath: 'Konfeksiyon → İşlemler → Sipariş İşlemleri',
  icon: 'workflow',
  sections: [
    {
      type: 'intro',
      content:
        'Sipariş kartı; müşteriden gelen satış ya da tedarikçiye verilen satınalma siparişlerini izlemenizi sağlar. Beklemedeki bir sipariş üretime alındığında durumu otomatik değişir, tamamlandığında kapanır.',
      highlights: [
        { icon: 'arrowUp', label: 'Satış' },
        { icon: 'arrowDown', label: 'Satınalma' },
        { icon: 'clock', label: 'Bekleme' },
        { icon: 'workflow', label: 'Üretim' },
      ],
    },
    {
      title: 'Sipariş Tipleri',
      type: 'feature-grid',
      features: [
        {
          icon: 'arrowUp',
          title: 'Satış Siparişi',
          description: 'Müşteriden gelen ürün talebi. Üretimi başlatmak için ana giriş noktasıdır.',
        },
        {
          icon: 'arrowDown',
          title: 'Satınalma Siparişi',
          description: 'Tedarikçiden alınacak hammadde veya hizmet siparişi.',
        },
      ],
    },
    {
      title: 'Durumlar',
      type: 'feature-grid',
      features: [
        {
          icon: 'clock',
          title: 'Bekleme',
          description: 'Yeni oluşturulmuş, henüz üretime alınmamış siparişler.',
        },
        {
          icon: 'workflow',
          title: 'Üretim',
          description: 'Atölyeye iletilmiş, üretimi devam eden siparişler.',
        },
        {
          icon: 'check',
          title: 'Kapalı',
          description: 'Üretimi tamamlanan, kapatılmış siparişler.',
        },
        {
          icon: 'xCircle',
          title: 'İptal',
          description: 'Vazgeçilen ya da iptal edilen siparişler. Üretimde olan siparişler iptal edilemez.',
        },
      ],
    },
    {
      title: 'Tipik Akış',
      type: 'steps',
      steps: [
        {
          title: 'Yeni sipariş oluştur',
          description:
            'Üst sağdaki + ile sipariş formunu aç. Müşteri/tedarikçi, sipariş tipi ve teslim tarihi gibi alanları doldur.',
          tip: 'Satınalma siparişi için "Tip" alanında satınalma seçilmelidir.',
        },
        {
          title: 'Detay kalemleri ekle',
          description:
            'Sipariş kartından detay formuna geçip model, beden, renk ve miktar bilgileriyle satırları gir.',
          tip: 'Detay olmadan sipariş PDF\'i veya üretim aktarımı yapılamaz.',
        },
        {
          title: 'Üretime al',
          description:
            'Hazır olan sipariş "Üretime Al" aksiyonu ile atölyeye yansıtılır; durum Üretim olur.',
        },
        {
          title: 'Üretim sonrası',
          description:
            'Üretim tamamlanınca sipariş kapatılır; iade veya değişiklik gerekiyorsa muhasebe tarafında işlenir.',
        },
      ],
    },
    {
      title: 'Diğer İşlemler',
      type: 'feature-grid',
      features: [
        {
          icon: 'fileText',
          title: 'PDF Sipariş Belgesi',
          description: 'Kart üzerindeki PDF butonu ile siparişin yazdırılabilir/paylaşılabilir belgesini al.',
        },
        {
          icon: 'xCircle',
          title: 'İptal',
          description: 'Beklemedeki siparişi iptal edebilirsin. Üretime alınan siparişler iptal edilemez.',
        },
        {
          icon: 'search',
          title: 'Arama & Filtre',
          description: 'Sipariş kodu / cari adı ile arama; tarih aralığı ve durum sayaçlarıyla filtreleme.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Üretim Aşaması Etkisi',
      content:
        'Bir sipariş üretime alındıktan sonra detay kalemleri kilitlenir; değişiklik gerekirse üretimi iptal etmek ve yeni sipariş açmak gerekir.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Detay Önce Hazırla',
      content:
        'Üretime alma butonu, sipariş kartında en az bir detay satırı olmadan çalışmaz. Detayları eksiksiz hazırla, sonra üretime al.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'İptal Geri Alınamaz',
      content:
        'İptal edilen siparişler liste içinde kalır ama tekrar açılamaz; aynı içerikle yeni bir sipariş oluşturman gerekir.',
    },
  ],
  faqs: [
    {
      question: 'Satış ve satınalma siparişlerini ayrı ekranlarda mı görüyorum?',
      answer:
        'İkisi de aynı listede yer alır; renk ve etiketle ayrılır. Filtreden tipi seçerek hızlıca süzgeçleyebilirsin.',
    },
    {
      question: 'Detay olmadan sipariş kaydedebilir miyim?',
      answer:
        'Evet, sipariş kartı detaysız da kaydedilir. Ancak PDF alma ve üretime gönderme detay gerektirir.',
    },
    {
      question: 'Bir siparişin teslim tarihini sonradan değiştirebilir miyim?',
      answer:
        'Bekleme durumunda evet, sipariş formundan güncelleyebilirsin. Üretime alındıktan sonra teslim tarihi sabitlenir.',
    },
    {
      question: 'Üretime aldıktan sonra geri alabilir miyim?',
      answer:
        'Mobilden geri alma yoktur; gerekirse yönetici web panelden siparişi tekrar Bekleme durumuna çekebilir.',
    },
    {
      question: 'Aynı müşteriye birden fazla sipariş aynı anda açılabilir mi?',
      answer:
        'Evet, kısıt yok. Her sipariş ayrı bir koda sahip olur ve bağımsız izlenir.',
    },
    {
      question: 'Sipariş kodu nereden geliyor?',
      answer:
        'Sistem otomatik olarak benzersiz bir sipariş kodu üretir; manuel düzenlenmez.',
    },
  ],
};
