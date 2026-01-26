# Legal Documents (Yasal Dökümanlar)

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Modal Yapıları](#modal-yapıları)
3. [Döküman İçerikleri](#döküman-içerikleri)
4. [Kullanım](#kullanım)
5. [KVKK Uyumluluğu](#kvkk-uyumluluğu)
6. [İlgili Dosyalar](#ilgili-dosyalar)

---

## Genel Bakış

Golaks uygulaması, kullanıcılara yasal yükümlülükler kapsamında gerekli dökümanları sunmak için tam ekran modal'lar kullanır. Bu dökümanlar Türk hukuku ve KVKK gerekliliklerine uygun olarak hazırlanmıştır.

### Sunulan Dökümanlar

1. **Kullanım Sözleşmesi** - Uygulama kullanım şartları
2. **Gizlilik Politikası** - Kişisel veri işleme politikası (KVKK)
3. **Uygulama Hakkında** - Teknik ve yasal bilgiler

### Erişim

- **Konum**: [ProfileScreen](../screens/ProfileScreen.md) → "Hakkında & Yasal" bölümü
- **Yetki**: Tüm kullanıcılar (user, admin, superAdmin)
- **Platform**: iOS ve Android

---

## Modal Yapıları

### Full-Screen Modal Pattern

Tüm yasal dökümanlar tam ekran modal ile gösterilir:

```typescript
<Modal
  visible={showTermsModal}
  animationType="slide"
  transparent={false}
  onRequestClose={() => setShowTermsModal(false)}
>
  <SafeAreaView
    style={[styles.legalModalContainer, { backgroundColor: colors.card }]}
    edges={['top', 'bottom']}
  >
    {/* Header */}
    <View style={styles.notificationHeader}>
      <View style={styles.notificationHeaderLeft}>
        <View style={[styles.notificationHeaderIcon, { backgroundColor: colors.primary + '15' }]}>
          <Icon name="document-text-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.notificationTitle}>Kullanım Sözleşmesi</Text>
      </View>
      <XButton onPress={() => setShowTermsModal(false)} size={36} iconSize={20} />
    </View>

    {/* Scrollable Content */}
    <ScrollView style={styles.notificationScrollView}>
      <Text style={styles.legalContent}>
        {/* Döküman içeriği */}
      </Text>
    </ScrollView>

    {/* Footer */}
    <View style={styles.notificationFooter}>
      <Button text="Kapat" onPress={() => setShowTermsModal(false)} />
    </View>
  </SafeAreaView>
</Modal>
```

### Modal Özellikleri

#### Header
- **Icon**: Mavi background (colors.primary + '15')
- **Icon Color**: colors.primary
- **Title**: Modal başlığı
- **Close Button**: XButton bileşeni

#### Content
- **ScrollView**: Uzun içerik için kaydırılabilir
- **Typography**: Okunabilir font ve satır aralıkları
- **Padding**: notificationScrollView stilinden

#### Footer
- **Button**: "Kapat" butonu
- **Action**: Modal'ı kapatır

### SafeAreaView Kullanımı

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView edges={['top', 'bottom']}>
  {/* Modal içeriği */}
</SafeAreaView>
```

**Neden edges={['top', 'bottom']}?**
- iPhone notch/Dynamic Island için üst boşluk
- Home indicator için alt boşluk
- Yan taraflar için boşluk gerekmez (tam genişlik)

---

## Döküman İçerikleri

### 1. Kullanım Sözleşmesi

**Dosya**: ProfileScreen.tsx (lines 960-1057)
**Modal State**: `showTermsModal`
**Icon**: `document-text-outline`

#### İçerik Bölümleri

1. **Giriş**
   - Sözleşmenin kapsamı
   - Kabul koşulları
   - Son güncelleme tarihi

2. **Tanımlar**
   - Uygulama: Golaks Yönetim Sistemi
   - Kullanıcı: Kayıtlı kişi/kurum
   - Hizmet: Sunulan özellikler
   - İçerik: Uygulama içi veriler

3. **Kullanım Koşulları**
   - Hesap oluşturma
   - Kullanıcı sorumlulukları
   - Yasaklanan aktiviteler
   - Hizmet kullanımı

4. **Kullanıcı Hesapları**
   - Hesap güvenliği
   - Şifre yönetimi
   - Hesap askıya alma/sonlandırma

5. **Fikri Mülkiyet Hakları**
   - Telif hakları
   - Ticari markalar
   - Lisans koşulları

6. **Gizlilik**
   - Kişisel veri toplama
   - KVKK uyumluluk
   - Veri güvenliği

7. **Hizmet Değişiklikleri**
   - Güncelleme hakkı
   - Bildirim prosedürü

8. **Sorumluluk Sınırlaması**
   - Hizmet kesintileri
   - Veri kaybı
   - Üçüncü taraf hizmetler

9. **Fesih**
   - Hesap kapatma
   - Otomatik fesih koşulları

10. **Genel Hükümler**
    - Uygulanacak hukuk
    - Uyuşmazlık çözümü
    - İletişim bilgileri

#### Örnek Kod

```typescript
const termsContent = `KULLANIM SÖZLEŞMESİ

Son Güncelleme: 15 Ocak 2024

1. GİRİŞ
Bu Kullanım Sözleşmesi ("Sözleşme"), Golaks Yönetim Sistemi mobil uygulamasını...

2. TANIMLAR
2.1. "Uygulama" Golaks Yönetim Sistemi mobil uygulamasını ifade eder.
2.2. "Kullanıcı" Uygulamayı kullanan gerçek veya tüzel kişiyi ifade eder.
...`;

<Text style={styles.legalContent}>{termsContent}</Text>
```

### 2. Gizlilik Politikası

**Dosya**: ProfileScreen.tsx (lines 1059-1173)
**Modal State**: `showPrivacyModal`
**Icon**: `shield-checkmark-outline`

#### KVKK Uyumlu İçerik

1. **Veri Sorumlusu**
   - Şirket bilgileri
   - İletişim adresi
   - Sicil numarası

2. **Toplanan Veriler**
   - Kişisel bilgiler (ad, e-posta, telefon)
   - Kullanım verileri (log, IP, cihaz)
   - Şirket bilgileri

3. **Veri Toplama Yöntemleri**
   - Kayıt formu
   - Otomatik toplama (cookies, analytics)
   - Üçüncü taraf entegrasyonlar

4. **Veri Kullanım Amaçları**
   - Hizmet sunumu
   - İletişim
   - Güvenlik
   - Geliştirme ve iyileştirme
   - Yasal yükümlülükler

5. **Veri Paylaşımı**
   - Üçüncü taraf servis sağlayıcılar
   - Yasal yükümlülükler
   - İş transferleri

6. **Veri Güvenliği**
   - Şifreleme
   - Erişim kontrolü
   - Güvenlik testleri
   - Yedekleme

7. **Kullanıcı Hakları (KVKK m.11)**
   - Bilgi talep etme
   - Düzeltme
   - Silme (unutulma hakkı)
   - İtiraz
   - Veri taşınabilirliği

8. **Çerezler (Cookies)**
   - Zorunlu çerezler
   - Analitik çerezler
   - Pazarlama çerezleri

9. **Değişiklikler**
   - Güncelleme bildirimi
   - Yürürlük tarihi

10. **İletişim**
    - Veri sorumlusu iletişim
    - KVKK başvuru prosedürü

#### KVKK Madde 11 Hakları

```typescript
const kvkkRights = `
KVKK Madde 11 Kapsamında Haklarınız:

a) Kişisel veri işlenip işlenmediğini öğrenme,
b) Kişisel verileri işlenmişse buna ilişkin bilgi talep etme,
c) Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,
d) Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,
e) Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme,
f) KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerin silinmesini veya yok edilmesini isteme,
g) (d) ve (e) bentleri uyarınca yapılan işlemlerin, kişisel verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,
h) İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle kişinin kendisi aleyhine bir sonucun ortaya çıkmasına itiraz etme,
i) Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğraması hâlinde zararın giderilmesini talep etme.
`;
```

### 3. Uygulama Hakkında

**Dosya**: ProfileScreen.tsx (lines 1175-1236)
**Modal State**: `showAboutModal`
**Icon**: `information-circle-outline`

#### İçerik

1. **Uygulama Bilgileri**
   - Uygulama adı: Golaks Yönetim Sistemi
   - Versiyon: 1.0.0
   - Platform: React Native

2. **Geliştirici Bilgileri**
   - Şirket/Geliştirici adı
   - Web sitesi
   - İletişim e-posta

3. **Özellikler**
   - Multi-tenant mimari
   - Role-based access control
   - Offline desteği
   - Dark/Light tema

4. **Teknoloji Stack**
   - React Native 0.83.1
   - TypeScript
   - React Navigation
   - AsyncStorage

5. **Yasal Bilgiler**
   - Telif hakları
   - Lisans bilgisi
   - Üçüncü taraf kütüphaneler

6. **Destek**
   - E-posta desteği
   - SSS linki
   - Döküman linki

---

## Kullanım

### ProfileScreen'de Entegrasyon

```typescript
// State yönetimi
const [showTermsModal, setShowTermsModal] = useState(false);
const [showPrivacyModal, setShowPrivacyModal] = useState(false);
const [showAboutModal, setShowAboutModal] = useState(false);

// MenuCard'lar
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Hakkında & Yasal</Text>
  </View>

  <MenuCard
    name="Kullanım Sözleşmesi"
    icon="document-text-outline"
    color={colors.primary}
    description="Uygulama kullanım şartları"
    onPress={() => setShowTermsModal(true)}
  />

  <MenuCard
    name="Gizlilik Politikası"
    icon="shield-checkmark-outline"
    color={colors.primary}
    description="Kişisel verilerin korunması politikası"
    onPress={() => setShowPrivacyModal(true)}
  />

  <MenuCard
    name="Uygulama Hakkında"
    icon="information-circle-outline"
    color={colors.primary}
    description="Versiyon ve geliştirici bilgileri"
    onPress={() => setShowAboutModal(true)}
  />
</View>
```

### Modal State Yönetimi

```typescript
// Modal açma
const openTermsModal = () => {
  setShowTermsModal(true);
};

// Modal kapatma
const closeTermsModal = () => {
  setShowTermsModal(false);
};

// Android back button handling
const handleBackPress = () => {
  if (showTermsModal) {
    setShowTermsModal(false);
    return true; // Event handled
  }
  return false; // Let default handler work
};

useEffect(() => {
  BackHandler.addEventListener('hardwareBackPress', handleBackPress);
  return () => {
    BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
  };
}, [showTermsModal, showPrivacyModal, showAboutModal]);
```

---

## KVKK Uyumluluğu

### Kişisel Verilerin Korunması Kanunu

Türkiye'de 6698 sayılı KVKK uyarınca:

#### Bilgilendirme Yükümlülüğü

✅ **Karşılanan Gereklilikler:**
- Veri sorumlusu kimliği belirtildi
- Veri işleme amaçları açıklandı
- Veri aktarımı hakkında bilgi verildi
- Veri toplama yöntemi belirtildi
- Kullanıcı hakları listelendi (KVKK m.11)
- İletişim bilgileri sağlandı

#### Kullanıcı Hakları

Gizlilik Politikası'nda KVKK m.11 hakları:

```typescript
const kvkkRights = [
  'Kişisel veri işlenip işlenmediğini öğrenme',
  'İşlenmişse bilgi talep etme',
  'İşlenme amacını öğrenme',
  'Veri aktarılan 3. kişileri bilme',
  'Düzeltme talep etme',
  'Silme/yok etme talep etme (unutulma hakkı)',
  'Düzeltme/silmenin 3. kişilere bildirilmesini isteme',
  'Otomatik analize itiraz etme',
  'Zarar durumunda tazminat talep etme',
];
```

#### Açık Rıza

Hassas veri işleme için açık rıza mekanizması:

```typescript
// Kayıt ekranında (örnek)
<Checkbox
  label="Kullanım Sözleşmesi'ni ve Gizlilik Politikası'nı okudum, kabul ediyorum."
  checked={agreedToTerms}
  onPress={() => setAgreedToTerms(!agreedToTerms)}
/>

<Button
  text="Kayıt Ol"
  disabled={!agreedToTerms}
  onPress={handleRegister}
/>
```

#### Veri Saklama

```typescript
// Veri saklama süreleri
const dataRetentionPeriods = {
  userProfile: '5 yıl', // Ticari kayıt
  activityLogs: '1 yıl', // Güvenlik
  analyticsData: '6 ay', // Anonim
  deletedAccounts: '30 gün', // Soft delete
};
```

### Veri Güvenliği Önlemleri

#### 1. Şifreleme
```typescript
// AsyncStorage encryption
import EncryptedStorage from 'react-native-encrypted-storage';

const saveSecureData = async (key: string, value: string) => {
  await EncryptedStorage.setItem(key, value);
};
```

#### 2. HTTPS
```typescript
// ApiConfig.ts
export const BASE_URL = 'https://api.golaks.com'; // HTTPS zorunlu
```

#### 3. Token Güvenliği
```typescript
// Token rotation
const refreshToken = async () => {
  const response = await fetch(API_ENDPOINTS.REFRESH_TOKEN, {
    method: 'POST',
    headers: getHeaders(oldToken),
  });
  const { token } = await response.json();
  await saveToken(token);
};
```

---

## Styling

### Legal Modal Styles

```typescript
const styles = StyleSheet.create({
  legalModalContainer: {
    flex: 1,
  },

  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  notificationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  notificationHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },

  notificationScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  legalContent: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
    marginBottom: 20,
  },

  notificationFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
```

### Typography

```typescript
const legalTextStyles = {
  heading: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 16,
  },
};
```

---

## İlgili Dosyalar

### Ekranlar
- [ProfileScreen](../screens/ProfileScreen.md) - Ana implementasyon

### Bileşenler
- [MenuCard](../components/MenuCard.md) - Yasal döküman erişim noktaları
- [Button](../../src/components/Button.tsx) - Modal kapatma butonu
- [XButton](../../src/components/XButton.tsx) - Header close butonu

### Özellikler
- [Role-Based Access Control](./RoleBasedAccess.md) - Erişim kontrolü (tüm kullanıcılara açık)

### Referans Dosyalar
- [GolaksMobile LegalModal](../../GolaksMobile/src/components/LegalModal.tsx) - Orijinal içerik kaynağı

### Yasal Gereklilikler
- KVKK (6698 sayılı kanun)
- Elektronik Ticaret Kanunu
- Tüketiciyi Koruma Kanunu

---

## Test Senaryoları

### 1. Modal Açma/Kapama
```typescript
describe('Legal Modals', () => {
  it('should open and close terms modal', () => {
    const { getByText } = render(<ProfileScreen />);

    // Modal kapalı
    expect(queryByText('KULLANIM SÖZLEŞMESİ')).toBeNull();

    // MenuCard'a tıkla
    fireEvent.press(getByText('Kullanım Sözleşmesi'));

    // Modal açık
    expect(getByText('KULLANIM SÖZLEŞMESİ')).toBeTruthy();

    // Kapat butonu
    fireEvent.press(getByText('Kapat'));

    // Modal kapalı
    expect(queryByText('KULLANIM SÖZLEŞMESİ')).toBeNull();
  });
});
```

### 2. SafeArea Kontrolü
```typescript
it('should render with SafeAreaView', () => {
  const { getByTestId } = render(<TermsModal visible={true} />);

  const safeArea = getByTestId('legal-modal-safe-area');
  expect(safeArea.props.edges).toEqual(['top', 'bottom']);
});
```

### 3. Scroll Functionality
```typescript
it('should be scrollable', () => {
  const { getByTestId } = render(<TermsModal visible={true} />);

  const scrollView = getByTestId('legal-scroll-view');
  expect(scrollView.props.scrollEnabled).toBe(true);
});
```

### 4. Android Back Button
```typescript
it('should close on Android back button', () => {
  const { getByText } = render(<ProfileScreen />);

  fireEvent.press(getByText('Kullanım Sözleşmesi'));
  expect(getByText('KULLANIM SÖZLEŞMESİ')).toBeTruthy();

  // Android back button
  fireEvent(BackHandler, 'hardwareBackPress');

  expect(queryByText('KULLANIM SÖZLEŞMESİ')).toBeNull();
});
```

---

## Versiyon Geçmişi

### v1.0.0 (2024-01-25)
- ✅ Kullanım Sözleşmesi eklendi
- ✅ Gizlilik Politikası eklendi (KVKK uyumlu)
- ✅ Uygulama Hakkında eklendi
- ✅ Full-screen modal implementasyonu
- ✅ SafeAreaView desteği
- ✅ Mavi icon standardizasyonu

### Planlanan İyileştirmeler
- 🔄 Çoklu dil desteği (İngilizce)
- 🔄 GDPR compliance (Avrupa)
- 🔄 PDF export özelliği
- 🔄 Versiyon tracking (döküman güncellemelerini göster)
- 🔄 Okundu bilgisi (analytics)
- 🔄 İlk açılışta onay ekranı

---

**Son Güncelleme**: 2024-01-25
**Versiyon**: 1.0.0
**KVKK Uyumlu**: ✅
**Yazar**: Golaks Development Team
