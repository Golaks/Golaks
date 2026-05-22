import type { PageHelp } from '../../lib/helpContext';

export const subeAyarlariHelp: PageHelp = {
  id: 'sube-ayarlari',
  title: 'Şube Ayarları',
  description:
    'Her şube için varsayılan döviz tipini ve sık kullanılan hesap kodlarını tanımlarsınız. Bu ayarlar fiş, fatura ve satış formlarında otomatik olarak gelir.',
  menuPath: 'Profil → Sistem Ayarları → Şube Ayarları',
  icon: 'building',
  sections: [
    {
      type: 'intro',
      content:
        'Şube ayarları, ilgili şubedeki işlem ekranlarında varsayılan değerleri ön doldurmak için kullanılır. Şube seçici ile aralarında geçiş yapabilir, her şube için ayrı ayar tutabilirsiniz.',
      highlights: [
        { icon: 'coins', label: 'Varsayılan Döviz' },
        { icon: 'wallet', label: 'Varsayılan Kasa' },
        { icon: 'card', label: 'Varsayılan Banka' },
        { icon: 'user', label: 'Pasan Müşteri' },
      ],
    },
    {
      title: 'Tanımlayabileceğiniz Alanlar',
      type: 'feature-grid',
      features: [
        {
          icon: 'coins',
          title: 'Varsayılan Döviz',
          description: 'Yeni fiş/fatura açılırken seçili gelecek para birimi (TL, USD, EUR vb.).',
        },
        {
          icon: 'receipt',
          title: 'Sipariş Avansları (340)',
          description: 'Müşteriden alınan avansların yazılacağı 340 prefix’li hesap.',
        },
        {
          icon: 'star',
          title: 'Sipariş İndirim (611)',
          description: 'Satışlarda uygulanan indirimlerin kaydedileceği 611 prefix’li hesap.',
        },
        {
          icon: 'wallet',
          title: 'Varsayılan Kasa (100)',
          description: 'Kasa işlemlerinde ön doldurulacak kasa hesabı.',
        },
        {
          icon: 'card',
          title: 'Varsayılan Banka (102)',
          description: 'Banka işlemlerinde ön doldurulacak banka hesabı.',
        },
        {
          icon: 'user',
          title: 'Pasan Müşteri Hesabı (120)',
          description: 'Mağaza modülü aktifse — geçici/pasan müşteri satışlarında otomatik atanır.',
        },
      ],
    },
    {
      title: 'Ayar Yapmak',
      type: 'steps',
      steps: [
        {
          title: 'Şubeyi seç',
          description: 'Üstteki şube seçici ile düzenleyeceğiniz şubeyi seçin.',
          tip: 'Tek şubeniz varsa zaten seçili gelir.',
        },
        {
          title: 'Döviz ve hesapları seç',
          description: 'Her alandaki dropdown’dan ilgili hesabı seçin; aramak için yazmaya başlayın.',
        },
        {
          title: 'Yeni hesap ekle',
          description: 'Listede olmayan bir hesap için yandaki "+" butonu ile hızlı cari oluşturabilirsiniz.',
        },
        {
          title: 'Kaydet',
          description: 'Sayfanın altındaki Kaydet butonuyla ayarları onaylayın.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Modüle Özel Alanlar',
      content:
        '"Pasan Müşteri Hesabı" sadece firmanızda mağaza modülü aktifse görünür. Diğer alanlar tüm firmalar için ortak olarak kullanılır.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Hızlı Kullanım',
      content:
        'Bu ayarları doğru tanımladıktan sonra yeni satış, fiş veya fatura açtığınızda alanlar otomatik doluyor — her seferinde elle seçmenize gerek kalmıyor.',
    },
  ],
  faqs: [
    {
      question: 'Hesap kodları neden prefix’li yazıyor (340, 611, 100, 102, 120)?',
      answer:
        'Bu prefixler standart muhasebe hesap planından gelir: 340 müşteri avansları, 611 indirimler, 100 kasa, 102 banka, 120 alıcılar (müşteriler). İlgili alanda yalnızca o prefix’le başlayan hesaplar listelenir.',
    },
    {
      question: 'Her şube için ayrı ayar tutabilir miyim?',
      answer:
        'Evet. Şube seçiciden başka şubeyi açtığınızda o şubeye özgü ayarlar gelir; değişiklikleriniz sadece seçili şubeye uygulanır.',
    },
    {
      question: 'Pasan müşteri hesabı ne işe yarar?',
      answer:
        'Mağaza modülünde, kasiyer hızlıca satış kaydederken müşteriyi tek tek seçmek zorunda kalmasın diye varsayılan bir "geçici müşteri" hesabı tanımlanır. Yeni satışta otomatik atanır, daha sonra gerekirse değiştirilebilir.',
    },
    {
      question: 'Ayarları yanlış kaydettim, geri alabilir miyim?',
      answer:
        'Eski değeri biliyorsanız aynı alanı tekrar seçerek geri kaydedebilirsiniz. Otomatik geçmiş tutulmaz.',
    },
  ],
};
