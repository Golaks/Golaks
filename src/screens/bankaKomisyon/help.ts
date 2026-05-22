import type { PageHelp } from '../../lib/helpContext';

export const bankaKomisyonHelp: PageHelp = {
  id: 'banka-komisyon',
  title: 'Banka Komisyon Tanımları',
  description:
    'POS ile yapılan kart tahsilatlarında bankaların kestiği komisyon oranlarını taksit bazında tanımlarsınız. Bu tanımlar satış formlarında otomatik kullanılır.',
  menuPath: 'Muhasebe → İşlemler → Banka Komisyon Tanımları',
  icon: 'card',
  sections: [
    {
      type: 'intro',
      content:
        'Her banka için tek çekim ve 2-12 ay arası taksit seçeneklerine ayrı oranlar girersiniz. Müşteri ödeme yaparken seçilen banka ve taksit kombinasyonuna göre uygulamadan otomatik kesinti hesaplanır.',
      highlights: [
        { icon: 'card', label: 'Banka Bazlı' },
        { icon: 'repeat', label: 'Taksit Oranları' },
        { icon: 'star', label: 'Yüzde (%)' },
        { icon: 'check', label: 'Otomatik Hesap' },
      ],
    },
    {
      title: 'Temel İşlemler',
      type: 'feature-grid',
      features: [
        {
          icon: 'plus',
          title: 'Yeni Tanım Ekle',
          description: 'Sağ üstteki + ile yeni banka için komisyon kartı açın.',
        },
        {
          icon: 'edit',
          title: 'Tanım Düzenle',
          description: 'Liste üzerindeki bir karta dokunarak mevcut oranları güncelleyin.',
        },
        {
          icon: 'repeat',
          title: 'Taksit Oranları',
          description: 'Tek çekim ve 2-12 ay arası her taksit için ayrı oran girilebilir.',
        },
        {
          icon: 'trash',
          title: 'Sil',
          description: 'Artık kullanmadığınız banka tanımlarını kaldırın.',
        },
      ],
    },
    {
      title: 'Yeni Komisyon Tanımı Eklemek',
      type: 'steps',
      steps: [
        {
          title: 'Ekle butonuna bas',
          description: 'Sağ üstteki + butonu yeni tanım formunu açar.',
        },
        {
          title: 'Bankayı seç',
          description: 'Listeden cari hesap planında 102 prefix\'li banka hesabını seç.',
          tip: 'Banka tanımlı değilse önce Cari Hesaplar ekranından açman gerekir.',
        },
        {
          title: 'Oranları gir',
          description: 'Tek çekim ve kullandığın taksit sayıları için ayrı ayrı oranları (% cinsinden) yaz.',
          tip: 'Kullanmayacağın taksitleri boş bırakabilirsin.',
        },
        {
          title: 'Kaydet',
          description: 'Tanım listeye eklenir; satış formundaki banka seçiminde otomatik kullanılır.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Komisyon Nasıl Uygulanır?',
      content:
        'Müşteri 1.000 ₺\'lik satışı 3 taksitle yaptığında, 3 ay için tanımladığın oran (örn. %2.5) → 25 ₺ komisyon olarak satıştan otomatik düşülür ve banka cari hesabınıza eklenir.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Standart Oranları Topla',
      content:
        'Bankaların POS sözleşmesindeki güncel oranları kullanmak, ay sonu mutabakatlarında fark çıkmasını engeller.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Oran Güncellemesi',
      content:
        'Banka komisyon oranlarını değiştirdiğinde, değişiklik o tarihten sonra yapılan satışlara uygulanır; geçmiş satışlar etkilenmez.',
    },
  ],
  faqs: [
    {
      question: 'Bir banka için sadece bazı taksitleri tanımlayabilir miyim?',
      answer:
        'Evet. Sadece kullandığın taksitlerin oranını gir, diğerlerini boş bırak. Boş taksitler satışta seçilemez.',
    },
    {
      question: 'Aynı bankaya iki ayrı tanım yapabilir miyim?',
      answer:
        'Hayır, her banka için tek bir komisyon tanım kartı vardır; oranları o kart üzerinde güncellersin.',
    },
    {
      question: 'Komisyon tutarı satışta nereye yazılır?',
      answer:
        'Şube Ayarları\'ndaki Sipariş İndirim (611) hesabına otomatik yazılır; banka hesabına net tutar (komisyon düşülmüş) işlenir.',
    },
    {
      question: 'Müşteri taksit oranını görür mü?',
      answer:
        'Müşteriye gösterilen satış tutarı vergi/komisyon dahil son rakamdır; komisyon detayı sadece muhasebe tarafında raporlanır.',
    },
    {
      question: 'Banka silindiğinde komisyon tanımı ne olur?',
      answer:
        'Cari hesap planından bankayı silersen bağlı komisyon tanımı da kaldırılır. Bankayı pasifleştirmen (silmemen) önerilir.',
    },
  ],
};
