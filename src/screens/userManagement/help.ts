import type { PageHelp } from '../../lib/helpContext';

export const userManagementHelp: PageHelp = {
  id: 'kullanici-yonetimi',
  title: 'Kullanıcı Yönetimi',
  description:
    'Firmanıza ait kullanıcıları listeleyebilir, yeni kullanıcı ekleyip mevcutları düzenleyebilir, modül ve şube yetkilerini tek tek atayabilirsiniz.',
  menuPath: 'Profil → Sistem Ayarları → Kullanıcı Yönetimi',
  icon: 'user',
  sections: [
    {
      type: 'intro',
      content:
        'Bu ekran üzerinden firmanın tüm kullanıcılarını yönetirsiniz: yeni kullanıcı oluşturma, mevcut kullanıcıyı düzenleme, modül erişimleri (muhasebe, mağaza, konfeksiyon, tabakhane), şube erişimleri ve detaylı program yetkileri.',
      highlights: [
        { icon: 'plus', label: 'Kullanıcı Ekle' },
        { icon: 'edit', label: 'Düzenle' },
        { icon: 'shield', label: 'Program Yetkileri' },
        { icon: 'building', label: 'Şube Erişimi' },
      ],
    },
    {
      title: 'Temel İşlemler',
      type: 'feature-grid',
      features: [
        {
          icon: 'plus',
          title: 'Yeni Kullanıcı',
          description: 'Üst sağdaki ekle butonu ile yeni hesap oluşturun. Ad, e-posta, şifre ve yetkileri atayın.',
        },
        {
          icon: 'edit',
          title: 'Kullanıcı Düzenle',
          description: 'Listede bir kullanıcıya dokunarak bilgilerini ve yetkilerini değiştirin.',
        },
        {
          icon: 'shield',
          title: 'Modül Yetkileri',
          description: 'Muhasebe / Mağaza / Konfeksiyon / Tabakhane modüllerine erişimi açıp kapatın.',
        },
        {
          icon: 'building',
          title: 'Şube Erişimi',
          description: 'Kullanıcının görebileceği şubeleri seçin; varsayılan şubesini belirleyin.',
        },
        {
          icon: 'eye',
          title: 'Program Yetkileri',
          description: 'Listeleme, ekleme, düzenleme, silme gibi sayfa bazlı detaylı yetkileri ayarlayın.',
        },
        {
          icon: 'trash',
          title: 'Kullanıcı Sil',
          description: 'Pasif veya artık kullanılmayan hesapları kalıcı olarak kaldırın.',
        },
      ],
    },
    {
      title: 'Yeni Kullanıcı Eklemek',
      type: 'steps',
      steps: [
        {
          title: 'Ekle butonuna bas',
          description: 'Sağ üstteki + simgesine dokunarak yeni kullanıcı formunu aç.',
        },
        {
          title: 'Temel bilgileri gir',
          description: 'Ad soyad, e-posta ve şifreyi yaz. E-posta benzersiz olmalı.',
        },
        {
          title: 'Modülleri seç',
          description: 'Hangi ana modüllere erişebileceğini işaretle (Muhasebe, Mağaza vb.).',
          tip: 'Hiç modül seçmezsen kullanıcı uygulamada hiçbir sayfa görmez.',
        },
        {
          title: 'Şubeleri ata',
          description: 'Erişebileceği şubeleri seç ve varsayılan şubeyi belirle.',
        },
        {
          title: 'Kaydet',
          description: 'Kayıt sonrası kullanıcı kendi şifresiyle giriş yapabilir; istediğin zaman yetki düzenleyebilirsin.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Yetki Devri',
      content:
        'Bir kullanıcıya tam admin yetkisi verirken dikkatli olun; bu kullanıcı tüm yetkileri değiştirebilir, başka kullanıcıları silebilir.',
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Program Yetkileri',
      content:
        'Modül yetkisi açıkken bile alt program yetkilerini kapatarak (örn. sadece görüntüleme) ince ayar yapabilirsiniz. Yetki paneli kullanıcı kartının "Yetkiler" butonundan açılır.',
    },
  ],
  faqs: [
    {
      question: 'Bir kullanıcının modülünü kapattığımda mevcut verilerine ne olur?',
      answer:
        'Veriler silinmez, sadece o kullanıcı ilgili modülü göremez. Yetkiyi tekrar açtığınızda hemen erişebilir.',
    },
    {
      question: 'Tek şubeli firmada şube ayarlarını yapmam gerekir mi?',
      answer:
        'Hayır. Tek şube varsa otomatik olarak seçili ve varsayılan gelir; ek bir işlem yapmanız gerekmez.',
    },
    {
      question: 'Kullanıcı şifresini ben mi belirlerim?',
      answer:
        'İlk şifreyi siz atarsınız. Kullanıcı giriş yaptıktan sonra kendi profilinden değiştirebilir.',
    },
    {
      question: 'Süper admin yetkisi nasıl verilir?',
      answer:
        'Süper admin sadece firma sahibinin atayabileceği bir yetkidir ve mobil uygulamadan değil yönetim panelinden verilir.',
    },
  ],
};
