# MenuCard Komponenti

> **Dosya:** `src/components/MenuCard.tsx`
> **Tip:** Reusable UI Component
> **Son Güncelleme:** 25 Ocak 2026

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Props](#props)
- [Özellikler](#özellikler)
- [Kullanım Örnekleri](#kullanım-örnekleri)
- [Styling](#styling)
- [İlişkili Modüller](#ilişkili-modüller)

## Genel Bakış

MenuCard, kullanıcı etkileşimleri için tasarlanmış, modern görünümlü bir menü kartı bileşenidir. Icon, başlık, açıklama ve disabled state desteği sunar.

### Temel Özellikler
- ✅ Pressable interaction desteği
- ✅ Disabled state (kilit ikonu ile)
- ✅ Tema entegrasyonu
- ✅ Android ripple effect
- ✅ Press animasyonu (scale 0.98)
- ✅ Accessibility desteği

## Props

### Interface Definition

```typescript
interface MenuCardProps {
  name: string;           // Menü başlığı
  icon: string;           // Ionicons icon ismi
  color: string;          // Icon ve container rengi
  description: string;    // Alt açıklama metni
  onPress: () => void;    // Tıklama handler
  style?: ViewStyle;      // Opsiyonel ek stil
  disabled?: boolean;     // Disabled state (default: false)
}
```

### Props Detayları

| Prop | Tip | Zorunlu | Default | Açıklama |
|------|-----|---------|---------|----------|
| `name` | `string` | ✅ | - | Menü kartının başlık metni |
| `icon` | `string` | ✅ | - | Ionicons icon ismi (örn: "person-outline") |
| `color` | `string` | ✅ | - | Icon ve background rengi (hex veya colors.primary) |
| `description` | `string` | ✅ | - | Açıklama metni (1 satırda gösterilir) |
| `onPress` | `() => void` | ✅ | - | Tıklama event handler |
| `style` | `ViewStyle` | ❌ | undefined | Ek container stilleri |
| `disabled` | `boolean` | ❌ | `false` | Disabled durumu |

## Özellikler

### 1. Normal State (Aktif)

```tsx
<MenuCard
  name="Profil Bilgileri"
  icon="person-outline"
  color={colors.primary}
  description="Kişisel bilgilerinizi düzenleyin"
  onPress={() => console.log('Pressed')}
/>
```

**Görünüm:**
- Icon: 24px, primary renk
- Icon container: 48x48, primary renk %15 opacity
- Sağ ok ikonu: chevron-forward
- Press durumunda: Opacity 0.7, scale 0.98

### 2. Disabled State

```tsx
<MenuCard
  name="Kullanıcı Yönetimi"
  icon="people-outline"
  color={colors.primary}
  description="Kullanıcıları ve yetkileri yönet"
  onPress={() => {}}
  disabled={user?.role === 'user'}
/>
```

**Görünüm:**
- Icon: 24px, gri (textSecondary)
- Icon container: 48x48, border rengi
- Sağ kilit ikonu: lock-closed
- Opacity: 0.5
- Background: cardSecondary rengi
- onPress devre dışı
- Ripple effect yok

## Kullanım Örnekleri

### Örnek 1: Temel Kullanım (ProfileScreen'de)

```tsx
// src/screens/ProfileScreen.tsx (line 499-505)

<MenuCard
  name="Profil Bilgileri"
  icon="person-outline"
  color={colors.primary}
  description="Kişisel bilgilerinizi düzenleyin"
  onPress={() => setShowProfileModal(true)}
/>
```

### Örnek 2: Role-Based Access Control

```tsx
// src/screens/ProfileScreen.tsx (line 525-532)

<MenuCard
  name="Kullanıcı Yönetimi"
  icon="people-outline"
  color={colors.primary}
  description="Kullanıcıları ve yetkileri yönet"
  onPress={onUserManagement}
  disabled={user?.role === 'user'} // Sadece admin/superAdmin erişir
/>
```

### Örnek 3: Özel Stil ile Kullanım

```tsx
<MenuCard
  name="Özel Menü"
  icon="star-outline"
  color={colors.primary}
  description="Özel açıklama"
  onPress={handleCustomPress}
  style={{ marginVertical: 8 }}
/>
```

## Styling

### Style Sistemi

MenuCard, `createStyles` fonksiyonu ile dinamik stil oluşturur:

```typescript
const createStyles = (colors: any) => StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12,
  },
  // ... diğer stiller
});
```

### Responsive Durumlar

#### Pressed State
```typescript
cardPressed: {
  opacity: 0.7,
  backgroundColor: colors.border,
  transform: [{ scale: 0.98 }],
}
```

#### Disabled State
```typescript
cardDisabled: {
  opacity: 0.5,
  backgroundColor: colors.cardSecondary,
}
```

### Icon Container

```typescript
iconContainer: {
  width: 48,
  height: 48,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  // Background rengi dinamik:
  // Normal: `${color}15` (color + %15 opacity)
  // Disabled: colors.border
}
```

### Text Styling

#### Name (Başlık)
```typescript
name: {
  fontSize: 14,
  fontWeight: '700',
  color: colors.text,
  marginBottom: 2,
}
nameDisabled: {
  color: colors.textSecondary,
}
```

#### Description (Açıklama)
```typescript
description: {
  fontSize: 11,
  color: colors.textSecondary,
  lineHeight: 14,
}
descriptionDisabled: {
  opacity: 0.6,
}
```

## İlişkili Modüller

### Kullanıldığı Yerler

1. **ProfileScreen** (`src/screens/ProfileScreen.tsx`)
   - Hesap Bilgileri bölümü (3 MenuCard)
   - Sistem Ayarları bölümü (3 MenuCard)
   - Hakkında & Yasal bölümü (3 MenuCard)
   - Hesap İşlemleri bölümü (2 MenuCard)
   - **Toplam:** 11 MenuCard kullanımı

### Bağımlılıklar

```typescript
import { Pressable, View, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
```

### İlgili Dokümantasyon

- [ProfileScreen](../screens/ProfileScreen.md) - MenuCard'ın kullanıldığı ana ekran
- [Role-Based Access Control](../features/RoleBasedAccess.md) - Disabled state kullanımı
- [Theme Context](../contexts/ThemeContext.md) - Renk yönetimi (gelecekte eklenecek)

## 🎨 Tasarım Kararları

### 1. Neden Disabled State?
- **Sorun:** Bazı menü öğeleri sadece admin/superAdmin için erişilebilir olmalı
- **Çözüm:** Disabled state ile kullanıcılara özelliğin var olduğu ama erişemeyecekleri gösterilir
- **Alternatif:** Öğeyi tamamen gizlemek (reddedildi - kullanıcı farkındalığı için)

### 2. Neden Kilit İkonu?
- **Görsel Geri Bildirim:** Kullanıcı neden tıklayamadığını anlar
- **UX:** Chevron yerine kilit = "Bu özellik kilitli"
- **Tutarlılık:** Tüm disabled durumlar aynı pattern'i takip eder

### 3. Neden %15 Opacity?
- **Yeterli Kontrast:** Icon belirgin ama agresif değil
- **Material Design:** Google'ın önerdiği %12-16 aralığında
- **Tema Bağımsız:** Light/Dark temalarda iyi görünür

## 🐛 Bilinen Sınırlamalar

1. **Description Overflow:** Uzun metinler 1 satırda kesilir (`numberOfLines={1}`)
2. **Icon Library:** Sadece Ionicons desteklenir
3. **Ripple Effect:** Android'de çalışır, iOS'ta press animasyonu gösterilir

## ✅ Test Senaryoları

### Manuel Test Checklist

- [ ] Normal state'de tıklanabilir
- [ ] Disabled state'de tıklanamaz
- [ ] Press animasyonu çalışıyor (scale 0.98)
- [ ] Android ripple effect çalışıyor
- [ ] Icon renkleri doğru (normal: primary, disabled: textSecondary)
- [ ] Ok ikonu disabled'da kilit oluyor
- [ ] Tema değişikliğinde renkler güncelleniyor
- [ ] Description uzun metinde ellipsis gösteriliyor

### Edge Cases

```tsx
// Çok uzun description
<MenuCard
  description="Bu çok uzun bir açıklama metni olacak ve kesilecek..."
  // ...
/>

// Disabled + onPress handler
<MenuCard
  disabled={true}
  onPress={() => console.log('Bu çalışmaz')} // onPress devre dışı
  // ...
/>

// Custom color hex
<MenuCard
  color="#FF5733" // Hex renk desteklenir
  // ...
/>
```

## 📊 Performans

- **Render Count:** Minimal (memo kullanılabilir gelecekte)
- **Re-render Triggers:** Theme değişikliği, disabled prop değişikliği
- **Animation Performance:** Transform animasyonu native driver kullanır (smooth 60fps)

## 🔄 Gelecek Geliştirmeler

- [ ] React.memo ile optimizasyon
- [ ] Accessibility labels ekleme
- [ ] Haptic feedback desteği
- [ ] Özelleştirilebilir icon boyutu
- [ ] Badge desteği (bildirim sayısı için)
- [ ] Swipeable actions (iOS style)

## 📝 Changelog

### v1.0.0 (25 Ocak 2026)
- ✅ Disabled state eklendi
- ✅ Kilit ikonu desteği
- ✅ Role-based access control entegrasyonu
- ✅ Tüm renkler primary'e güncellendi
- ✅ Press animasyonu eklendi
- ✅ Android ripple effect eklendi
