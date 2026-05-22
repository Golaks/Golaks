import type { PageHelp } from '../../lib/helpContext';

export const reservationsHelp: PageHelp = {
  id: 'rezervasyonlar',
  title: 'Rezervasyonlar',
  description:
    'Mağazaya gelecek acente / tur rezervasyonlarını yönetebilir; bekleyen müşterileri giriş-çıkış olarak işaretler, iptal edebilir ve satış formuna bağlayabilirsiniz.',
  menuPath: 'Mağaza → İşlemler → Rezervasyonlar',
  icon: 'calendar',
  sections: [
    {
      type: 'intro',
      content:
        'Rezervasyon kartı; mağazaya hangi acentenin, ne zaman ve kaç kişilik bir grup getireceğini izlemenizi sağlar. Beklenen müşteri geldiğinde tek dokunuşla "İçerde" durumuna alır, çıkışta "Çıktı" yaparsınız.',
      highlights: [
        { icon: 'clock', label: 'Beklenen' },
        { icon: 'arrowDown', label: 'İçerde' },
        { icon: 'arrowUp', label: 'Çıktı' },
        { icon: 'xCircle', label: 'İptal' },
      ],
    },
    {
      title: 'Durumlar',
      type: 'feature-grid',
      features: [
        {
          icon: 'clock',
          title: 'Beklenen',
          description: 'Acente tarafından bildirilen ama henüz mağazaya gelmemiş rezervasyon.',
        },
        {
          icon: 'arrowDown',
          title: 'İçerde',
          description: 'Müşteri grup mağazaya geldi; satış işlemleri için aktif konumda.',
        },
        {
          icon: 'arrowUp',
          title: 'Çıktı',
          description: 'Grup mağazadan ayrıldı; rezervasyon tamamlandı.',
        },
        {
          icon: 'xCircle',
          title: 'İptal',
          description: 'Gelmeyen veya vazgeçilen rezervasyon; iptal nedeni kayıtta tutulur.',
        },
      ],
    },
    {
      title: 'Tipik Akış',
      type: 'steps',
      steps: [
        {
          title: 'Rezervasyon oluştur',
          description: 'Acente bilgisi, beklenen saat, yetişkin/çocuk pax sayısı ve milliyetle yeni kayıt aç.',
          tip: 'Saat, pax ve milliyet zorunlu alanlardır.',
        },
        {
          title: 'Grup geldiğinde "Giriş"',
          description: 'Karttaki yeşil giriş butonu ile durumu İçerde\'ye al.',
        },
        {
          title: 'Satışı yap',
          description: 'Satış formunda bu rezervasyon listede çıkar; seçince acente ve rehber otomatik dolar.',
        },
        {
          title: 'Çıkışta kapat',
          description: 'Grup ayrılınca "Çıkış" butonu ile rezervasyonu tamamla.',
        },
      ],
    },
    {
      title: 'Filtreler ve Arama',
      type: 'feature-grid',
      features: [
        {
          icon: 'filter',
          title: 'Durum Filtresi',
          description: 'Tümü / Beklenen / İçerde / Çıktı / İptal başlıklarıyla listeyi daralt.',
        },
        {
          icon: 'calendar',
          title: 'Tarih Aralığı',
          description: 'Bugün, bu hafta, bu ay veya özel tarih aralığıyla listeyi süzgeçle.',
        },
        {
          icon: 'search',
          title: 'Arama',
          description: 'Acente, rehber veya rezervasyon notunda anahtar kelime arama.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Satışla Bağlantı',
      content:
        'Satış formundaki rezervasyon listesi yalnızca "Beklenen" durumundaki rezervasyonları gösterir. Bir satış için seçilen rezervasyonun durumu otomatik olarak İçerde\'ye geçer.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Çoklu Grup Yönetimi',
      content:
        'Aynı saatte birden çok grup geliyorsa her birine ayrı kart açın; satışta hangi grubun olduğunu seçmek hem performans hem rapor için önemli.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'İptal Sonrası',
      content:
        'İptal edilen rezervasyon listede kalır (raporlama için) ama satış formuna seçilemez. Yanlışlıkla iptal edersen yeni kayıt açman gerekir.',
    },
  ],
  faqs: [
    {
      question: 'Bir grup geldi ama satış yapmadı, ne yapmalıyım?',
      answer:
        'Yine de "Giriş" → "Çıkış" akışını uygulayabilirsin. Satışsız kapanan rezervasyonlar acente performans raporunda görünür.',
    },
    {
      question: 'Rezervasyon saatini sonradan değiştirebilir miyim?',
      answer:
        'Beklenen veya İçerde durumundaysa kartı açıp Düzenle butonu ile saat, pax ve diğer bilgileri güncelleyebilirsin. Çıktı ve İptal durumunda alanlar kilitlenir.',
    },
    {
      question: 'Acente rehberi yoksa boş bırakabilir miyim?',
      answer:
        'Evet, rehber zorunlu değildir. Rezervasyon satışta açıldığında rehberi sonradan ekleyebilirsin.',
    },
    {
      question: 'Aynı acentenin birden çok rezervasyonunu nasıl ayırırım?',
      answer:
        'Saat ve pax birlikte kart başlığında görünür; satış formundaki listede de "saat · acente · pax" formatındadır, bu bilgiyle hangi grubun olduğunu kolayca seçersin.',
    },
    {
      question: 'İptal etmeden silebilir miyim?',
      answer:
        'Hayır. Muhasebe/raporlama bütünlüğü için kayıtlar kalıcıdır; ihtiyacında iptal et, listede iptal etiketli görüneceği için karışmaz.',
    },
  ],
};
