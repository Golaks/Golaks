import type { PageHelp } from '../../lib/helpContext';

export const fisIslemleriHelp: PageHelp = {
  id: 'fis-islemleri',
  title: 'Fiş İşlemleri',
  description:
    'Tahsil, Tediye ve Mahsup fişlerini görüntüleyebilir, yeni fiş oluşturabilir, açık fişleri kapatabilir ve hareketlerini düzenleyebilirsiniz.',
  menuPath: 'Muhasebe → İşlemler → Fiş İşlemleri',
  icon: 'fileText',
  sections: [
    {
      type: 'intro',
      content:
        'Fiş İşlemleri ekranı muhasebe hareketlerinizin gün bazlı kayıtlarını gösterir. Liste tarih aralığına göre filtrelenir; Açık fişlere yeni hareket ekleyebilir, kapalı (onaylanmış) fişleri yalnızca görüntüleyebilirsiniz.',
      highlights: [
        { icon: 'arrowDown', label: 'Tahsil' },
        { icon: 'arrowUp', label: 'Tediye' },
        { icon: 'swap', label: 'Mahsup' },
        { icon: 'check', label: 'Onaylama' },
      ],
    },
    {
      title: 'Fiş Tipleri',
      type: 'feature-grid',
      features: [
        {
          icon: 'arrowDown',
          title: 'Tahsil',
          description: 'Müşteriden veya başka bir cariden gelen tahsilatlar (para girişi).',
        },
        {
          icon: 'arrowUp',
          title: 'Tediye',
          description: 'Tedarikçi veya gidere yapılan ödemeler (para çıkışı).',
        },
        {
          icon: 'swap',
          title: 'Mahsup',
          description: 'Hareket karşılıklı olmayan, hesaplar arası aktarma veya virman fişleri.',
        },
      ],
    },
    {
      title: 'Liste ve Filtreler',
      type: 'feature-grid',
      features: [
        {
          icon: 'calendar',
          title: 'Tarih Aralığı',
          description: 'Üstteki tarih filtresi ile bugün, bu hafta, bu ay veya özel aralık seçebilirsin.',
        },
        {
          icon: 'search',
          title: 'Arama',
          description: 'Fiş no veya açıklamada anahtar kelime ile filtrele.',
        },
        {
          icon: 'filter',
          title: 'Durum Filtresi',
          description: 'Toplam / Açık / Kapalı sayaçlarına dokunarak listeyi daralt.',
        },
      ],
    },
    {
      title: 'Yeni Fiş Eklemek',
      type: 'steps',
      steps: [
        {
          title: 'Ekle butonuna bas',
          description: 'Sağ üstteki + simgesi yeni fiş formunu açar.',
        },
        {
          title: 'Fiş tipini seç',
          description: 'Tahsil, Tediye veya Mahsup seç. Buna göre form alanları açılır.',
        },
        {
          title: 'Cari ve tutarı gir',
          description: 'İlgili cari hesabı, tarihi, tutarı ve dövizi belirt. Açıklama isteğe bağlı.',
          tip: 'Cari hesap aramasında yazdıkça filtreleme aktif.',
        },
        {
          title: 'Kaydet',
          description: 'Fiş açık olarak kaydedilir. İhtiyaç olursa hareket ekleyip sonra onaylarsın.',
        },
      ],
    },
    {
      title: 'Fiş Onaylama (Kapatma)',
      type: 'steps',
      steps: [
        {
          title: 'Açık fişi aç',
          description: 'Listeden fişin üzerine dokun, hareketleri görmek için kart genişler.',
        },
        {
          title: 'Hareketleri kontrol et',
          description: 'Tutar ve karşı hesapların doğru olduğundan emin ol.',
        },
        {
          title: 'Onayla',
          description: 'Onayla butonuna basınca fiş kapanır ve artık değiştirilemez.',
          tip: 'Onaylanan fişler "Kapalı" sekmesinde görünür.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Açık ve Kapalı Fiş Farkı',
      content:
        'Açık fişler düzenlenebilir; hareket eklenebilir, satır silinebilir. Onaylandığında (Kapalı duruma geçince) içeriği kilitlenir ve sadece görüntülenebilir.',
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Onayı Geri Alma',
      content:
        'Bir fişi onayladıktan sonra mobilden geri açamazsın. Tekrar düzenlemek gerekirse yönetici yetkisiyle web panelinden açılması gerekir.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Doğru Fiş Tipi',
      content:
        'Para girişiyse Tahsil, para çıkışıysa Tediye seç. Hesaplar arası transfer (örn. kasadan bankaya) için Mahsup kullan.',
    },
  ],
  faqs: [
    {
      question: 'Aynı gün içinde birden fazla fiş açabilir miyim?',
      answer:
        'Evet, aynı tarihte istediğin kadar tahsil/tediye/mahsup fişi açabilirsin. Sistem fiş numarasını otomatik üretir.',
    },
    {
      question: 'Yanlış cariyi seçtim, düzeltebilir miyim?',
      answer:
        'Fiş açıkken kart üstüne basıp düzenleme moduna girebilirsin. Onaylandıktan sonra düzeltme yapılamaz.',
    },
    {
      question: 'Aynı fişe birden fazla cari hareket ekleyebilir miyim?',
      answer:
        'Evet. Mahsup fişlerinde birden çok satır olağandır; tahsil/tediye fişlerinde de aynı carinin birden çok ödemesi tek fişe yazılabilir.',
    },
    {
      question: 'Fiş eklerken neden fiş numarası gözükmüyor?',
      answer:
        'Fiş numarası kaydet butonuna bastığında sıradaki numara olarak otomatik atanır; tahsis öncesi gösterilmez.',
    },
    {
      question: 'Tarih filtresinde "bu ay" seçtiğim halde eski fiş görünüyor.',
      answer:
        'Bu, fişin tarihinin bu ay içinde olduğunu gösterir; ekleme tarihinden değil fiş tarihinden filtre yapılır.',
    },
  ],
};
