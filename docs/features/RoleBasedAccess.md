# Role-Based Access Control (RBAC)

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Rol Tipleri](#rol-tipleri)
3. [Yetkilendirme Sistemi](#yetkilendirme-sistemi)
4. [Kullanım Örnekleri](#kullanım-örnekleri)
5. [UI Durumları](#ui-durumları)
6. [Güvenlik](#güvenlik)
7. [İlgili Dosyalar](#ilgili-dosyalar)

---

## Genel Bakış

Golaks uygulaması, kullanıcı rollerine göre özelliklere erişimi kontrol eden bir yetkilendirme sistemi kullanır. Bu sistem, kullanıcıların sadece yetkili oldukları özelliklere erişmesini sağlar.

### Ana Prensipler

- **Rol Tabanlı Erişim**: Her kullanıcının bir rolü vardır (user, admin, superAdmin)
- **UI-Level Kontrolü**: Yetkisiz özellikler görünür ancak devre dışı bırakılır
- **Görsel Geri Bildirim**: Kullanıcılar hangi özelliklere erişemediğini açıkça görür
- **Güvenlik Katmanları**: Hem frontend hem backend kontrolü

### Neden UI-Level Disable?

Yetkisiz özellikleri tamamen gizlemek yerine, devre dışı bırakarak gösterme yaklaşımı kullanılır:

✅ **Avantajlar:**
- Kullanıcılar sistemin tüm özelliklerini görür
- Yetki yükseltmeleri için motivasyon sağlar
- UX açısından daha şeffaf
- Özellik keşfedilebilirliği artar

❌ **Dezavantajlar:**
- Bazı kullanıcılar erişemedikleri özellikleri görmekten rahatsız olabilir
- Daha fazla render edilen bileşen

---

## Rol Tipleri

### User Rol Hiyerarşisi

```typescript
type UserRole = 'user' | 'admin' | 'superAdmin';

interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  companyId: string;
  // ... diğer alanlar
}
```

### Rol Tanımları

#### 1. User (Standart Kullanıcı)
- **Yetki Seviyesi**: Temel
- **Erişim**: Sadece kendi profili ve temel özellikler
- **Kısıtlamalar**: Sistem ayarlarına erişemez

**Erişebileceği Özellikler:**
- ✅ Profil bilgilerini görüntüleme
- ✅ Şifre değiştirme
- ✅ Bildirim ayarları
- ✅ Tema değiştirme
- ✅ Dil seçimi
- ✅ Önbellek yönetimi (kendi verisi)
- ✅ Yasal dökümanları görüntüleme
- ✅ Uygulama hakkında bilgi

**Erişemediği Özellikler:**
- ❌ Kullanıcı yönetimi
- ❌ Genel sistem ayarları
- ❌ Tenant yönetimi
- ❌ Rol atama

#### 2. Admin (Yönetici)
- **Yetki Seviyesi**: Orta
- **Erişim**: Kendi tenant'ındaki tüm özellikler
- **Kısıtlamalar**: Sadece kendi tenant'ında yetkili

**Ek Yetkiler (User'a ek olarak):**
- ✅ Kullanıcı yönetimi (kendi tenant'ında)
- ✅ Genel sistem ayarları
- ✅ Raporlama ve analytics
- ✅ Kullanıcı rolü atama (superAdmin hariç)
- ✅ Şirket ayarları

#### 3. SuperAdmin (Süper Yönetici)
- **Yetki Seviyesi**: Maksimum
- **Erişim**: Tüm tenant'lar ve sistem geneli
- **Kısıtlamalar**: Yok

**Ek Yetkiler (Admin'e ek olarak):**
- ✅ Tüm tenant'lara erişim
- ✅ Tenant oluşturma/silme
- ✅ Sistem geneli ayarlar
- ✅ Tüm kullanıcı yönetimi
- ✅ SuperAdmin rolü atama
- ✅ Sistem bakım modu

---

## Yetkilendirme Sistemi

### Frontend Kontrolü

#### MenuCard ile Kullanım

[MenuCard bileşeni](../components/MenuCard.md) `disabled` prop'u ile yetki kontrolü yapar:

```typescript
<MenuCard
  name="Kullanıcı Yönetimi"
  icon="people-outline"
  color={colors.primary}
  description="Kullanıcıları ve yetkileri yönet"
  onPress={onUserManagement}
  disabled={user?.role === 'user'}  // User rolü için devre dışı
/>
```

#### Görsel Feedback

Devre dışı bırakılmış MenuCard:
- **Opacity**: 0.5 (soluk görünüm)
- **Background**: colors.cardSecondary (gri arkaplan)
- **Icon**: Chevron yerine lock-closed
- **Tıklama**: Devre dışı (onPress çalışmaz)
- **Ripple**: Yok

```typescript
// MenuCard.tsx içinde
cardDisabled: {
  opacity: 0.5,
  backgroundColor: colors.cardSecondary,
}

// Icon değişimi
<Icon
  name={disabled ? "lock-closed" : "chevron-forward"}
  size={20}
  color={disabled ? colors.textSecondary : colors.textSecondary}
/>
```

### Backend Kontrolü

Her API isteğinde sunucu tarafında yetki kontrolü yapılır:

```typescript
// API Headers
const getHeaders = (token?: string, tenantId?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }

  return headers;
};
```

Backend middleware örneği (pseudo-code):
```typescript
function requireRole(allowedRoles: UserRole[]) {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

// Kullanım
app.get('/api/user-management',
  requireRole(['admin', 'superAdmin']),
  getUserManagement
);
```

---

## Kullanım Örnekleri

### Profil Ekranında Kullanım

[ProfileScreen](../screens/ProfileScreen.md) içinde role-based access control:

```typescript
// ProfileScreen.tsx
const ProfileScreen = () => {
  const { user } = useAuth();

  return (
    <>
      {/* Sistem Ayarları Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sistem Ayarları</Text>
        </View>

        {/* Kullanıcı Yönetimi - Sadece Admin/SuperAdmin */}
        <MenuCard
          name="Kullanıcı Yönetimi"
          icon="people-outline"
          color={colors.primary}
          description="Kullanıcıları ve yetkileri yönet"
          onPress={onUserManagement}
          disabled={user?.role === 'user'}
        />

        {/* Genel Ayarlar - Sadece Admin/SuperAdmin */}
        <MenuCard
          name="Genel Ayarlar"
          icon="settings-outline"
          color={colors.primary}
          description="Uygulama genelindeki ayarlar"
          onPress={onGeneralSettings}
          disabled={user?.role === 'user'}
        />
      </View>
    </>
  );
};
```

### Özel Yetki Kontrolü

Daha karmaşık senaryolar için:

```typescript
// Yardımcı fonksiyon
const hasPermission = (user: User, feature: string): boolean => {
  const permissions = {
    'user-management': ['admin', 'superAdmin'],
    'tenant-management': ['superAdmin'],
    'general-settings': ['admin', 'superAdmin'],
    'reports': ['admin', 'superAdmin'],
    // ...
  };

  return permissions[feature]?.includes(user.role) ?? false;
};

// Kullanım
const canManageUsers = hasPermission(user, 'user-management');

<MenuCard
  name="Kullanıcı Yönetimi"
  icon="people-outline"
  color={colors.primary}
  description="Kullanıcıları ve yetkileri yönet"
  onPress={onUserManagement}
  disabled={!canManageUsers}
/>
```

### Çoklu Rol Kontrolü

```typescript
// Birden fazla role göre kontrol
const isPrivilegedUser = user?.role === 'admin' || user?.role === 'superAdmin';

<MenuCard
  disabled={!isPrivilegedUser}
  // ... diğer props
/>

// Sadece SuperAdmin
const isSuperAdmin = user?.role === 'superAdmin';

<MenuCard
  disabled={!isSuperAdmin}
  // ... diğer props
/>
```

---

## UI Durumları

### Aktif Durum (Yetkili Kullanıcı)

```
┌─────────────────────────────────────┐
│  👥  Kullanıcı Yönetimi        →   │
│      Kullanıcıları ve yetkileri... │
└─────────────────────────────────────┘
```
- Normal opacity
- Mavi background highlight on press
- Tıklanabilir
- Chevron ikonu

### Pasif Durum (Yetkisiz Kullanıcı)

```
┌─────────────────────────────────────┐
│  👥  Kullanıcı Yönetimi        🔒   │
│      Kullanıcıları ve yetkileri... │
└─────────────────────────────────────┘
```
- %50 opacity (soluk)
- Gri background
- Tıklanamaz
- Lock ikonu

### Durum Geçişleri

Kullanıcı rolü değiştiğinde otomatik güncelleme:

```typescript
useEffect(() => {
  // Rol değiştiğinde UI güncellenir
  // MenuCard'lar otomatik olarak disabled prop'una göre render edilir
}, [user?.role]);
```

---

## Güvenlik

### Frontend Güvenliği

#### 1. Token Doğrulama
```typescript
// authService.ts
const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.PROFILE}`, {
      headers: getHeaders(token),
    });
    return response.ok;
  } catch {
    return false;
  }
};
```

#### 2. Rol Kontrolü
```typescript
// Her kritik işlemde rol kontrolü
const onUserManagement = async () => {
  if (user?.role === 'user') {
    Alert.alert(
      'Yetkisiz Erişim',
      'Bu özelliğe erişim yetkiniz bulunmamaktadır.'
    );
    return;
  }

  // İşleme devam et
  navigation.navigate('UserManagement');
};
```

#### 3. UI-Level Protection
```typescript
// Hem disabled prop hem de onPress içinde kontrol
<MenuCard
  disabled={user?.role === 'user'}
  onPress={() => {
    // Ekstra güvenlik katmanı
    if (user?.role === 'user') return;
    onUserManagement();
  }}
/>
```

### Backend Güvenliği

#### 1. Middleware Kontrolü
Backend'de her endpoint için rol kontrolü:
```typescript
// Pseudo-code
router.use('/user-management', requireRole(['admin', 'superAdmin']));
router.use('/tenant-management', requireRole(['superAdmin']));
```

#### 2. Token Doğrulama
```typescript
// Her istekte token doğrulama
middleware.verifyToken()
middleware.checkRole(['admin', 'superAdmin'])
```

#### 3. Tenant İzolasyonu
```typescript
// Admin sadece kendi tenant'ına erişebilir
const checkTenantAccess = (user: User, tenantId: string) => {
  if (user.role === 'superAdmin') return true;
  return user.companyId === tenantId;
};
```

### Güvenlik En İyi Uygulamaları

✅ **Yapılması Gerekenler:**
- Her API isteğinde token doğrulama
- Backend'de rol kontrolü (frontend kontrolü yeterli değil)
- Tenant izolasyonu
- Rate limiting
- Audit logging (özellikle yetki değişiklikleri)

❌ **Yapılmaması Gerekenler:**
- Sadece frontend kontrolüne güvenme
- Token'ı localStorage'da saklamak (AsyncStorage kullan)
- Rolleri client-side değiştirmeye izin verme
- Hassas verileri frontend'de tutma

---

## İlgili Dosyalar

### Bileşenler
- [MenuCard](../components/MenuCard.md) - RBAC için disabled state desteği

### Ekranlar
- [ProfileScreen](../screens/ProfileScreen.md) - RBAC kullanım örnekleri

### Özellikler
- [Legal Documents](./LegalDocuments.md) - Tüm kullanıcılara açık
- [Cache Management](./CacheManagement.md) - Kullanıcıya özel cache kontrolü

### API
- [ApiConfig.ts](../../src/constants/ApiConfig.ts) - API endpoints ve header yönetimi
- [authService.ts](../../src/services/authService.ts) - Authentication ve authorization
- [profileService.ts](../../src/services/profileService.ts) - Profil ve kullanıcı yönetimi

### Context
- [AuthContext](../../src/contexts/AuthContext.tsx) - Kullanıcı rolü yönetimi

---

## Test Senaryoları

### 1. User Rolü Testi
```typescript
// Test: User rolü ile admin özelliklerine erişim engellenmeli
describe('RBAC - User Role', () => {
  it('should disable user management for user role', () => {
    const user = { role: 'user' };
    const { getByText } = render(<ProfileScreen />, { user });

    const userManagement = getByText('Kullanıcı Yönetimi').parent;
    expect(userManagement).toHaveStyle({ opacity: 0.5 });
    expect(userManagement).toBeDisabled();
  });
});
```

### 2. Admin Rolü Testi
```typescript
// Test: Admin rolü ile user management'e erişebilmeli
describe('RBAC - Admin Role', () => {
  it('should enable user management for admin role', () => {
    const user = { role: 'admin' };
    const { getByText } = render(<ProfileScreen />, { user });

    const userManagement = getByText('Kullanıcı Yönetimi').parent;
    expect(userManagement).not.toBeDisabled();
  });
});
```

### 3. Rol Değişikliği Testi
```typescript
// Test: Rol değiştiğinde UI güncellenmeli
describe('RBAC - Role Change', () => {
  it('should update UI when role changes', async () => {
    const { rerender, getByText } = render(<ProfileScreen />, {
      user: { role: 'user' }
    });

    // User rolünde disabled olmalı
    expect(getByText('Kullanıcı Yönetimi').parent).toBeDisabled();

    // Admin rolüne yükselt
    rerender(<ProfileScreen />, { user: { role: 'admin' } });

    // Artık enabled olmalı
    expect(getByText('Kullanıcı Yönetimi').parent).not.toBeDisabled();
  });
});
```

---

## Versiyon Geçmişi

### v1.0.0 (2024-01-25)
- ✅ İlk RBAC implementasyonu
- ✅ User, Admin, SuperAdmin rolleri
- ✅ MenuCard disabled state desteği
- ✅ ProfileScreen'de yetki kontrolü
- ✅ UI-level disable stratejisi

### Planlanan İyileştirmeler
- 🔄 Özelleştirilmiş rol tanımlama
- 🔄 Granular permissions (feature-level)
- 🔄 Geçici yetki atama (time-based)
- 🔄 Audit log görüntüleme
- 🔄 Role-based dashboard'lar

---

**Son Güncelleme**: 2024-01-25
**Versiyon**: 1.0.0
**Yazar**: Golaks Development Team
