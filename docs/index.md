# Golaks Mobile - Dokümantasyon İndeksi

> **Proje:** Golaks Mobile App
> **Platform:** React Native 0.83.1
> **Son Güncelleme:** 25 Ocak 2026

## 📋 İçindekiler

### 1. Bileşenler (Components)
- [MenuCard](./components/MenuCard.md) - Menü kartı bileşeni, disabled state desteği ile

### 2. Ekranlar (Screens)
- [ProfileScreen](./screens/ProfileScreen.md) - Kullanıcı profil ve ayarlar ekranı

### 3. Özellikler (Features)
- [Role-Based Access Control](./features/RoleBasedAccess.md) - Rol tabanlı erişim kontrolü
- [Legal Documents](./features/LegalDocuments.md) - Yasal doküman yönetimi
- [Cache Management](./features/CacheManagement.md) - Önbellek yönetim sistemi

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

### Servisler
- `profileService` - Profil işlemleri için
- `authService` - Kimlik doğrulama için

### Context'ler
- `useAuth()` - Kullanıcı bilgileri ve yetkilendirme
- `useTheme()` - Tema ve renk yönetimi
- `useAlert()` - Bildirim ve uyarı mesajları

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

### Performans
- Modals lazy loading ile yüklenir
- Cache hesaplama asenkron çalışır
- Form validasyonları client-side yapılır

## 📖 Daha Fazla Bilgi

Her modül için detaylı dokümantasyon ilgili klasörlerde bulunabilir:
- `./components/` - Bileşen dokümantasyonları
- `./screens/` - Ekran dokümantasyonları
- `./features/` - Özellik dokümantasyonları
