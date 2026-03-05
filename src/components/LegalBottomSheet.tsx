import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import BottomSheet from './BottomSheet';

export type LegalType = 'terms' | 'privacy' | 'cookies';

interface LegalBottomSheetProps {
  visible: boolean;
  type: LegalType;
  onClose: () => void;
}

const LEGAL_META: Record<LegalType, { title: string; icon: string; color: string }> = {
  terms: {
    title: 'Kullanım Sözleşmesi',
    icon: 'document-text-outline',
    color: '#3B82F6',
  },
  privacy: {
    title: 'Gizlilik Politikası',
    icon: 'shield-checkmark-outline',
    color: '#10B981',
  },
  cookies: {
    title: 'Çerez Politikası',
    icon: 'finger-print-outline',
    color: '#F59E0B',
  },
};

const TERMS_SECTIONS = [
  {
    number: '1',
    title: 'Genel Hükümler ve Kapsam',
    paragraphs: [
      'Bu Kullanım Koşulları ("Sözleşme"), Golaks Yazılım Hizmetleri ("Golaks", "biz", "bizim") tarafından sunulan mobil uygulama ve ilgili hizmetlerin kullanımına ilişkin şartları düzenlemektedir.',
      'Uygulamayı indirerek, kurarak veya kullanarak bu koşulları kabul etmiş sayılırsınız. Bu Sözleşme, 6098 sayılı Türk Borçlar Kanunu ve ilgili mevzuat çerçevesinde hazırlanmıştır.',
    ],
  },
  {
    number: '2',
    title: 'Hizmet Tanımı',
    paragraphs: [
      'Golaks, işletmelere bulut tabanlı yazılım platformu olarak hizmet vermektedir:',
      '• Deri sektörü için özelleştirilmiş ERP çözümleri\n• Muhasebe ve finans yönetimi\n• Stok ve envanter takibi\n• Sipariş ve üretim yönetimi\n• Raporlama ve iş analitiği\n• Fatura ve belge yönetimi',
    ],
  },
  {
    number: '3',
    title: 'Hesap Oluşturma ve Güvenlik',
    paragraphs: [
      'Hizmetlerimizi kullanmak için geçerli bir hesap oluşturmanız gerekmektedir. Kayıt sırasında doğru ve güncel bilgiler sağlamakla yükümlüsünüz.',
      'Hesap bilgilerinizin ve şifrenizin gizliliğinden tamamen siz sorumlusunuz. Şüpheli aktivite fark ederseniz derhal destek@golaks.com adresine bildirin.',
    ],
  },
  {
    number: '4',
    title: 'Kullanım Kuralları',
    paragraphs: [
      'Uygulama yalnızca yasal ve meşru iş amaçlarıyla kullanılabilir. Türkiye Cumhuriyeti yasalarına ve uluslararası hukuka uygun hareket etmelisiniz.',
      'Yasak faaliyetler: Yetkisiz erişim girişimleri, kötü amaçlı yazılım yayma, tersine mühendislik, izinsiz kopyalama, sahte bilgi girişi.',
    ],
  },
  {
    number: '5',
    title: 'Fikri Mülkiyet Hakları',
    paragraphs: [
      'Golaks markası, logoları, tasarımları ve yazılımı Golaks\'ın münhasır mülkiyetindedir. Uygulama ve içeriği 5846 sayılı Fikir ve Sanat Eserleri Kanunu ile korunmaktadır.',
      'Size, bu Sözleşme şartlarına uygun olarak uygulamayı kullanmak için kişisel, devredilemez, münhasır olmayan bir lisans verilmektedir.',
    ],
  },
  {
    number: '6',
    title: 'Ödeme ve Abonelik',
    paragraphs: [
      'Hizmet ücretleri, seçtiğiniz abonelik planına göre belirlenir. Abonelik iptali, cari dönem sonunda geçerli olur.',
      'İade politikası yasal düzenlemeler çerçevesinde uygulanır. Ücretsiz deneme döneminde iptal halinde ücret alınmaz.',
    ],
  },
  {
    number: '7',
    title: 'Veri ve Gizlilik',
    paragraphs: [
      'Kişisel verilerinizin işlenmesi, Gizlilik Politikamız kapsamında gerçekleştirilir. İş verileriniz şifreli olarak saklanır ve korunur.',
      'Verilerinizi dışa aktarma hakkınız saklıdır. Hesap kapatma durumunda verileriniz yasal saklama süreleri sonunda silinir.',
    ],
  },
  {
    number: '8',
    title: 'Sorumluluk Sınırlamaları',
    paragraphs: [
      'Hizmet "olduğu gibi" sunulmaktadır. Golaks\'ın sorumluluğu, son 12 ayda ödediğiniz toplam ücretle sınırlıdır.',
      'Dolaylı, arızi veya cezai zararlardan sorumluluk kabul edilmez. Bu sınırlamalar, yasaların izin verdiği ölçüde geçerlidir.',
    ],
  },
  {
    number: '9',
    title: 'Uyuşmazlık Çözümü',
    paragraphs: [
      'Bu Sözleşme, Türkiye Cumhuriyeti yasalarına tabidir. Uyuşmazlıklarda Tekirdağ Mahkemeleri ve İcra Daireleri yetkilidir.',
    ],
  },
];

const PRIVACY_SECTIONS = [
  {
    number: '1',
    title: 'Giriş',
    paragraphs: [
      'Bu Gizlilik Politikası, Golaks Yazılım Hizmetleri tarafından sunulan mobil uygulama ve hizmetler aracılığıyla kişisel verilerinizin nasıl toplandığını, işlendiğini, saklandığını ve korunduğunu açıklamaktadır.',
      '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu sıfatıyla hareket etmekteyiz.',
    ],
  },
  {
    number: '2',
    title: 'Toplanan Kişisel Veriler',
    paragraphs: [
      '• Kimlik bilgileri: Ad, soyad, kullanıcı adı\n• İletişim bilgileri: E-posta, telefon, adres\n• Hesap ve işlem verileri: Kullanıcı hesabı, işlem geçmişi\n• Teknik veriler: IP adresi, cihaz bilgileri, uygulama istatistikleri',
    ],
  },
  {
    number: '3',
    title: 'Verilerin İşlenme Amaçları',
    paragraphs: [
      '• Hizmetlerimizin sunulması ve yönetilmesi\n• Kullanıcı hesaplarının oluşturulması ve yönetimi\n• Müşteri desteği ve iletişim\n• Faturalama ve ödeme işlemleri\n• Yasal yükümlülüklerin yerine getirilmesi\n• Güvenlik ve dolandırıcılık önleme',
    ],
  },
  {
    number: '4',
    title: 'Veri Güvenliği',
    paragraphs: [
      'SSL/TLS şifreleme ile veri iletimi, AES-256 şifreleme ile veri depolama, düzenli güvenlik denetimleri ve penetrasyon testleri uygulanmaktadır.',
      'Verileriniz İstanbul\'daki Tier-3 sertifikalı veri merkezinde barındırılmaktadır.',
    ],
  },
  {
    number: '5',
    title: 'Veri Saklama Süresi',
    paragraphs: [
      '• Hesap bilgileri: Hesap aktif olduğu sürece\n• İşlem kayıtları: 10 yıl (yasal zorunluluk)\n• Teknik loglar: 2 yıl\n• Pazarlama verileri: Onay geri çekilene kadar',
    ],
  },
  {
    number: '6',
    title: 'Üçüncü Taraf Paylaşımı',
    paragraphs: [
      'Kişisel verileriniz yalnızca yasal zorunluluklar, ödeme işlemleri ve gizlilik sözleşmesi kapsamındaki hizmet sağlayıcılarımız ile paylaşılır.',
      'Verileriniz hiçbir koşulda satılmaz veya pazarlama amacıyla üçüncü taraflara aktarılmaz.',
    ],
  },
  {
    number: '7',
    title: 'KVKK Kapsamındaki Haklarınız',
    paragraphs: [
      '6698 sayılı KVKK\'nın 11. maddesi kapsamında kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz.',
    ],
  },
  {
    number: '8',
    title: 'Politika Değişiklikleri',
    paragraphs: [
      'Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler uygulama içi bildirim veya e-posta yoluyla duyurulacaktır.',
    ],
  },
];

const COOKIES_SECTIONS = [
  {
    number: '1',
    title: 'Çerez Nedir?',
    paragraphs: [
      'Çerezler, web siteleri ve uygulamalar tarafından cihazınıza yerleştirilen küçük metin dosyalarıdır. Oturum bilgilerinizi hatırlamak, tercihlerinizi saklamak ve kullanıcı deneyimini iyileştirmek amacıyla kullanılmaktadır.',
    ],
  },
  {
    number: '2',
    title: 'Kullanılan Çerez Türleri',
    paragraphs: [
      '• Zorunlu Çerezler: Uygulamanın temel işlevleri için gereklidir. Oturum yönetimi ve güvenlik doğrulaması bu çerezlerle sağlanır.\n• Performans Çerezleri: Uygulama performansını ölçmek ve iyileştirmek için anonim istatistik verileri toplar.\n• İşlevsellik Çerezleri: Dil, tema ve bildirim tercihlerinizi hatırlayarak kişiselleştirilmiş deneyim sunar.\n• Analitik Çerezler: Kullanım alışkanlıklarını analiz ederek hizmet kalitesini artırmamıza yardımcı olur.',
    ],
  },
  {
    number: '3',
    title: 'Çerezlerin Kullanım Amaçları',
    paragraphs: [
      '• Oturum açma ve kimlik doğrulama işlemlerinin yönetimi\n• Kullanıcı tercihlerinin (dil, tema, bildirim) saklanması\n• Uygulama performansının izlenmesi ve iyileştirilmesi\n• Güvenlik önlemlerinin uygulanması ve yetkisiz erişimin engellenmesi\n• Hizmet kalitesinin artırılması için anonim kullanım analizleri',
    ],
  },
  {
    number: '4',
    title: 'Üçüncü Taraf Çerezleri',
    paragraphs: [
      'Hizmet kalitemizi artırmak amacıyla sınırlı sayıda üçüncü taraf hizmet sağlayıcılarının çerezlerini kullanmaktayız. Bu çerezler yalnızca performans ölçümü ve güvenlik doğrulaması için kullanılmakta olup, kişisel verileriniz reklam amacıyla paylaşılmamaktadır.',
    ],
  },
  {
    number: '5',
    title: 'Çerez Saklama Süreleri',
    paragraphs: [
      '• Oturum çerezleri: Uygulama kapatıldığında silinir\n• Tercih çerezleri: 1 yıl\n• Güvenlik çerezleri: 30 gün\n• Analitik çerezler: 2 yıl',
    ],
  },
  {
    number: '6',
    title: 'Çerez Yönetimi',
    paragraphs: [
      'Cihaz ayarlarınızdan çerezleri kontrol edebilir, silebilir veya engelleyebilirsiniz. Zorunlu çerezlerin devre dışı bırakılması durumunda uygulamanın bazı temel işlevleri çalışmayabilir.',
      'Uygulama içi "Önbellek Temizle" seçeneği ile saklanan çerez ve önbellek verilerini istediğiniz zaman temizleyebilirsiniz.',
    ],
  },
  {
    number: '7',
    title: 'Yasal Dayanak',
    paragraphs: [
      'Çerez kullanımımız, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve 5809 sayılı Elektronik Haberleşme Kanunu çerçevesinde gerçekleştirilmektedir.',
    ],
  },
];

export default function LegalBottomSheet({ visible, type, onClose }: LegalBottomSheetProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const meta = LEGAL_META[type];
  const sectionMap = { terms: TERMS_SECTIONS, privacy: PRIVACY_SECTIONS, cookies: COOKIES_SECTIONS };
  const sections = sectionMap[type];
  const year = new Date().getFullYear();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={meta.title}
      icon={meta.icon}
      iconColor={meta.color}>

      {/* Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: meta.color + '08', borderColor: meta.color + '20' }]}>
        <View style={[styles.heroIcon, { backgroundColor: meta.color + '20' }]}>
          <Icon name={meta.icon} size={30} color={meta.color} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{meta.title}</Text>
        <View style={styles.heroPills}>
          <View style={[styles.pill, { backgroundColor: meta.color + '18' }]}>
            <Icon name="pricetag-outline" size={11} color={meta.color} />
            <Text style={[styles.pillText, { color: meta.color }]}>v1.0</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: meta.color + '18' }]}>
            <Icon name="calendar-outline" size={11} color={meta.color} />
            <Text style={[styles.pillText, { color: meta.color }]}>Aralık 2025</Text>
          </View>
        </View>
      </View>

      {/* Sections */}
      {sections.map((section, idx) => (
        <View
          key={idx}
          style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: meta.color }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.numberBadge, { backgroundColor: meta.color + '15' }]}>
              <Text style={[styles.numberText, { color: meta.color }]}>{section.number}</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
          </View>
          {section.paragraphs.map((p, pIdx) => (
            <Text
              key={pIdx}
              style={[styles.paragraph, { color: colors.textSecondary }, pIdx > 0 && { marginTop: 10 }]}>
              {p}
            </Text>
          ))}
        </View>
      ))}

      {/* Contact */}
      <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Icon name="mail-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.contactText, { color: colors.textSecondary }]}>
          destek@golaks.com  •  (850)466-4664
        </Text>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Icon name="shield-checkmark-outline" size={13} color={colors.textSecondary} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          © 1995-{year} Golaks. Tüm Hakları Saklıdır.
        </Text>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    heroCard: {
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      paddingVertical: 22,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    heroTitle: {
      fontSize: 17,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 12,
    },
    heroPills: {
      flexDirection: 'row',
      gap: 8,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    pillText: {
      fontSize: 11,
      fontWeight: '600',
    },
    sectionCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderLeftWidth: 3,
      padding: 14,
      marginBottom: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    numberBadge: {
      width: 26,
      height: 26,
      borderRadius: 7,
      justifyContent: 'center',
      alignItems: 'center',
    },
    numberText: {
      fontSize: 12,
      fontWeight: '800',
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
      lineHeight: 20,
    },
    paragraph: {
      fontSize: 13,
      lineHeight: 22,
      textAlign: 'justify',
    },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      marginBottom: 10,
      marginTop: 6,
    },
    contactText: {
      fontSize: 13,
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 10,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    footerText: {
      fontSize: 11,
    },
  });
