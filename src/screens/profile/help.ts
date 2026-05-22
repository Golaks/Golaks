import type { PageHelp } from '../../lib/helpContext';

export const profileHelp: PageHelp = {
  id: 'profile',
  title: 'Profil',
  description:
    'Hesap bilgilerinizi yönetebilir, görünüm ve bildirim ayarlarınızı kişiselleştirebilir, uygulama önbelleğini temizleyebilirsiniz.',
  menuPath: 'Profil',
  icon: 'user',
  sections: [
    {
      type: 'intro',
      content:
        'Profil ekranı hesabınızla ilgili her şeyi tek bir yerden yönetmenizi sağlar: kişisel bilgileriniz, güvenlik, bildirim tercihleri ve sistem yönetimi (sadece yetkili kullanıcılar için).',
      highlights: [
        { icon: 'user', label: 'Kişisel Bilgiler' },
        { icon: 'shield', label: 'Şifre' },
        { icon: 'alert', label: 'Bildirimler' },
        { icon: 'refresh', label: 'Önbellek' },
      ],
    },
    {
      title: 'Bölümler',
      type: 'feature-grid',
      features: [
        {
          icon: 'user',
          title: 'Hesap Bilgileri',
          description: 'İsim, e-posta, telefon ve profil fotoğrafınızı güncelleyebilirsiniz.',
        },
        {
          icon: 'shield',
          title: 'Şifre Değiştir',
          description: 'Hesap güvenliğiniz için şifrenizi düzenli olarak değiştirin.',
        },
        {
          icon: 'building',
          title: 'Sistem Ayarları',
          description: 'Kullanıcı yönetimi, şube ayarları, döviz tanımları (yetkili kullanıcılar).',
        },
        {
          icon: 'alert',
          title: 'Bildirim Ayarları',
          description: 'Push, e-posta ve SMS bildirim tercihlerinizi yönetin.',
        },
        {
          icon: 'refresh',
          title: 'Önbellek Temizle',
          description: 'Uygulama, oturum ve görsel önbelleğini temizleyerek alan kazanın.',
        },
        {
          icon: 'info',
          title: 'Hakkında & Yasal',
          description: 'Sürüm bilgisi, kullanım koşulları ve gizlilik politikası.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Süper Admin Bölümü',
      content:
        'Yalnızca süper admin yetkisine sahip kullanıcılar firma ayarları gibi gelişmiş seçenekleri görür.',
    },
    {
      type: 'callout',
      variant: 'tip',
      title: 'Önbellek Temizleme',
      content:
        'Uygulama yavaşladığında veya yer açmak istediğinizde önbelleği temizleyebilirsiniz. Oturum bilgilerini işaretlemediğiniz sürece çıkış yapmak zorunda kalmazsınız.',
    },
  ],
  faqs: [
    {
      question: 'Profil fotoğrafımı nasıl değiştiririm?',
      answer:
        'Üstteki fotoğrafa veya kullanıcı adına dokunduğunuzda fotoğraf seçim ekranı açılır; galeriden seçebilir veya kameradan çekebilirsiniz.',
    },
    {
      question: 'Şifremi unuttuysam ne yapmalıyım?',
      answer:
        'Çıkış yaptıktan sonra giriş ekranında "Şifremi Unuttum" bağlantısıyla yeni şifre talebinde bulunabilirsiniz.',
    },
    {
      question: 'Hesabı kapat seçeneği ne yapar?',
      answer:
        'Hesabınızın tüm verilerini ve oturumlarını siler. Bu işlem geri alınamaz, dikkatli olunuz.',
    },
  ],
};
