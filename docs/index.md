# Golaks Mobile - Dokümantasyon İndeksi

> **Proje:** Golaks Mobile App
> **Platform:** React Native 0.83.1
> **Son Güncelleme:** 28 Ocak 2026

## 📋 İçindekiler

### 1. Bileşenler (Components)
- [MenuCard](./components/MenuCard.md) - Menü kartı bileşeni, disabled state desteği ile
- [BarcodeScanner](./components/BarcodeScanner.md) - Barkod/QR kod tarama bileşeni, otomatik odaklama ile

### 2. Ekranlar (Screens)
- [ProfileScreen](./screens/ProfileScreen.md) - Kullanıcı profil ve ayarlar ekranı

### 3. Özellikler (Features)
- [AI Chat (GolaksIQ)](./features/AIChat.md) - Yapay zeka asistanı, load balancing ve çoklu AI sunucu desteği
- [Role-Based Access Control](./features/RoleBasedAccess.md) - Rol tabanlı erişim kontrolü
- [Legal Documents](./features/LegalDocuments.md) - Yasal doküman yönetimi
- [Cache Management](./features/CacheManagement.md) - Önbellek yönetim sistemi

### 4. Backend & API
- [API Architecture](./api-architecture.md) - Backend API mimarisi, endpoint'ler, controller'lar ve geliştirme rehberi
- [API Setup](./api-setup.md) - Kurulum, deployment, güvenlik ve production rehberi

## 🎨 Tema ve Stil Standartları

### Renk Kullanımı
Tüm uygulama boyunca tutarlılık için `colors.primary` kullanılır:
- MenuCard iconları
- Modal başlık iconları
- Form elemanları
- Aktif durumlar

### Modal Tasarımı
Tüm modals:
- `transparent={false}` - Tam ekran
- `animationType="slide"` - Slide animasyonu
- `SafeAreaView` ile sarılmış - Safe area desteği
- `edges={['top', 'bottom']}` - Üst ve alt kenarlar korumalı

### Icon Boyutları
- MenuCard iconları: 24px
- Modal header iconları: 20px
- Page title iconları: 18px

## 🔗 Modüller Arası Bağlantılar

### MenuCard → ProfileScreen
MenuCard komponenti ProfileScreen'de kullanılır:
- Hesap Bilgileri bölümü
- Sistem Ayarları bölümü
- Hakkında & Yasal bölümü
- Hesap İşlemleri bölümü

### RoleBasedAccess → MenuCard
Role-based access control MenuCard'ın `disabled` prop'u üzerinden çalışır:
- `user` rolü: Kullanıcı Yönetimi ve Genel Ayarlar disabled
- `admin` ve `superAdmin` rolleri: Tüm özelliklere erişim

### LegalDocuments → ProfileScreen
Legal documents ProfileScreen'de tam ekran modals olarak gösterilir:
- Kullanım Sözleşmesi
- Gizlilik Politikası
- Uygulama Hakkında

### CacheManagement → ProfileScreen
Cache management ProfileScreen'de tam ekran modal olarak gösterilir:
- AsyncStorage bazlı önbellek yönetimi
- Boyut hesaplama
- Seçici temizleme

## 📚 API Referansları

### Frontend Servisler
- `aiService` - AI Chat (GolaksIQ) işlemleri için
- `profileService` - Profil işlemleri için
- `authService` - Kimlik doğrulama için
- `accountService` - Cari hesap işlemleri için
- `notificationService` - Bildirim işlemleri için

### Context'ler
- `useAuth()` - Kullanıcı bilgileri ve yetkilendirme
- `useTheme()` - Tema ve renk yönetimi
- `useAlert()` - Bildirim ve uyarı mesajları

### Backend API
- **Mimari ve Geliştirme:** [API Architecture](./api-architecture.md)
- **Kurulum ve Deployment:** [API Setup](./api-setup.md)

**Temel Endpoint Grupları:**
- `/ai/*` - AI Chat Operations (GolaksIQ)
- `/auth/*` - Authentication (Login, Logout, Password Reset)
- `/user/*` - User Management & Profile
- `/company/*` - Company Management (SuperAdmin)
- `/account/*` - Account/Cari Operations
- `/notifications/*` - Notification Management
- `/tenant/*` - Multi-tenant Operations
- `/apps/*` - App-specific endpoints (account, tannery, confection, shop)

## 🚀 Hızlı Başlangıç

### Yeni Bir Modal Eklemek
1. `ProfileScreen.tsx` içinde state ekleyin: `const [showNewModal, setShowNewModal] = useState(false);`
2. MenuCard ile trigger ekleyin
3. SafeAreaView ile tam ekran modal oluşturun
4. `colors.primary` kullanarak header icon ekleyin

### Yeni Bir MenuCard Eklemek
1. İlgili bölümde (section) yeni MenuCard komponenti ekleyin
2. `color={colors.primary}` kullanın
3. Gerekirse `disabled` prop ile role-based access ekleyin

### Role-Based Access Eklemek
```tsx
<MenuCard
  name="Yeni Özellik"
  icon="icon-name"
  color={colors.primary}
  description="Açıklama"
  onPress={handlePress}
  disabled={user?.role === 'user'} // Sadece admin/superAdmin erişebilir
/>
```

## 📝 Versiyon Geçmişi

### v1.1.4 (22 Mart 2026)
- ✅ **Barkod Ekran Ayarları:** Stok dağılım tablo kolonları (Şube, Depo, Tip, Renk, Beden, Adet) kullanıcı tarafından göster/gizle yapılabilir
- ✅ **Ürün Görseli Ayarı:** Barkod sonuç ekranında ürün görseli göster/gizle toggle eklendi
- ✅ **Filtreleme Ayarı:** Filtreleme bölümü göster/gizle toggle eklendi
- ✅ **Ayar Modalı:** Header'a settings ikonu ve ekran ayarları modalı eklendi (Switch toggle'lar)
- ✅ **Backend Entegrasyonu:** Ekran ayarları `kullanici_yetkiler.ekran_ayarlari` alanına kaydediliyor
- ✅ **AuthContext:** `updateUserYetkiler` metodu eklendi, yetkiler hem lokale hem backend'e yazılıyor
- ✅ **UserController:** `updateProfile` endpoint'i yetkiler güncellemesini destekliyor

### v1.2.0 (28 Ocak 2026)
- ✅ **AI Chat (GolaksIQ):** Yapay zeka asistanı sistemi eklendi
- ✅ **AI Load Balancer:** Çoklu AI sunucu desteği (OpenAI, Claude, Groq, Ollama)
- ✅ **System Prompts:** Çok dilli (TR/EN) ve kapsam kısıtlamalı AI asistanı
- ✅ **Barcode Scanner:** Geliştirilmiş barkod tarayıcı (340x340 çerçeve)
- ✅ **Auto-Focus:** Otomatik ve dokunarak odaklama özelliği
- ✅ **Camera Format:** Yüksek çözünürlük kamera desteği (1920x1080)
- ✅ **JWT Expiry:** Token süresi 6 aya uzatıldı (15552000 saniye)
- ✅ **UI Standardization:** Tüm kaydet butonları "Kaydet" olarak standardize edildi
- ✅ **Dokümantasyon:** AIChat ve BarcodeScanner dokümantasyonları eklendi

### v1.1.0 (27 Ocak 2026)
- ✅ **Backend API:** Tamamen modern controller/router mimarisine geçiş
- ✅ **Backend API:** Legacy endpoint sistemi kaldırıldı
- ✅ **Backend API:** UserController profil yönetimi metodları eklendi
- ✅ **Backend API:** CompanyController firma yönetimi eklendi
- ✅ **Backend API:** AccountController multi-database cari sistemi
- ✅ **Dokümantasyon:** Kapsamlı API Architecture dokümantasyonu eklendi
- ✅ **Frontend:** AccountSummaryScreen ve cari filtreleme sistemi eklendi

### v1.0.0 (25 Ocak 2026)
- ✅ MenuCard disabled state desteği
- ✅ Role-based access control sistemi
- ✅ Legal documents tam ekran modals
- ✅ Cache management sistemi
- ✅ Tüm iconlar primary color'a güncellendi
- ✅ Tüm modals tam ekran + SafeAreaView

## 🔧 Teknik Detaylar

### Kullanılan Kütüphaneler
- `react-native-safe-area-context` - Safe area yönetimi
- `react-native-vector-icons` - Icon setleri
- `@react-native-async-storage/async-storage` - Yerel depolama
- `react-native-vision-camera` - Kamera ve barkod tarama

### Performans
- Modals lazy loading ile yüklenir
- Cache hesaplama asenkron çalışır
- Form validasyonları client-side yapılır

## 📖 Daha Fazla Bilgi

Her modül için detaylı dokümantasyon ilgili klasörlerde bulunabilir:
- `./components/` - Bileşen dokümantasyonları
- `./screens/` - Ekran dokümantasyonları
- `./features/` - Özellik dokümantasyonları
- `./api-architecture.md` - Backend API mimarisi ve geliştirme rehberi
- `./api-setup.md` - Backend kurulum ve deployment rehberi
