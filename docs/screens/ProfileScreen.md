# ProfileScreen

> **Dosya:** `src/screens/ProfileScreen.tsx`
> **Tip:** Main Screen Component
> **Son Güncelleme:** 25 Ocak 2026

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Yapı ve Bölümler](#yapı-ve-bölümler)
- [State Yönetimi](#state-yönetimi)
- [Modals](#modals)
- [Özellikler](#özellikler)
- [API Entegrasyonları](#api-entegrasyonları)
- [İlişkili Modüller](#ilişkili-modüller)

## Genel Bakış

ProfileScreen, kullanıcının profil bilgilerini, ayarlarını ve hesap işlemlerini yönettiği ana ekrandır. Role-based access control, cache management, legal documents gibi özellikleri içerir.

### Ekran Görünümü

```
┌─────────────────────────┐
│   Header (Profil)       │
├─────────────────────────┤
│  Page Title & Icon      │
│  Profile Card           │
│    - Avatar             │
│    - Name, Email        │
│    - Company            │
├─────────────────────────┤
│  Hesap Bilgileri        │
│    - Profil Bilgileri   │
│    - Şifre Değiştir     │
│    - Bildirim Ayarları  │
├─────────────────────────┤
│  Sistem Ayarları        │
│    - Kullanıcı Yön. 🔒  │
│    - Önbellek Temizle   │
│    - Genel Ayarlar 🔒   │
├─────────────────────────┤
│  Hakkında & Yasal       │
│    - Kullanım Sözleş.   │
│    - Gizlilik Pol.      │
│    - Uygulama Hakkında  │
├─────────────────────────┤
│  Hesap İşlemleri        │
│    - Güvenli Çıkış      │
│    - Hesabımı Kapat     │
├─────────────────────────┤
│      Footer             │
└─────────────────────────┘
```

🔒 = Sadece admin/superAdmin

## Yapı ve Bölümler

### 1. Page Header
```tsx
// Line 459-466
<View style={styles.pageHeader}>
  <View style={styles.pageTitleContainer}>
    <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
      <Icon name="person" size={18} color={colors.primary} />
    </View>
    <Text style={styles.pageTitle}>Profil & Ayarlar</Text>
  </View>
</View>
```

### 2. Profile Card
```tsx
// Line 469-494
<View style={styles.profileCard}>
  <Pressable onPress={() => setShowImagePicker(true)}>
    <View style={styles.avatar}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} />
      ) : (
        <Icon name="person" size={40} />
      )}
    </View>
  </Pressable>
  <Text style={styles.userName}>{user?.name}</Text>
  <Text style={styles.userEmail}>{user?.email}</Text>
  <Text style={styles.userCompany}>{user?.firma_unvani}</Text>
</View>
```

### 3. Hesap Bilgileri (3 MenuCard)
- **Profil Bilgileri:** ActionFormModal açar
- **Şifre Değiştir:** ActionFormModal açar
- **Bildirim Ayarları:** Notification Settings Modal açar

### 4. Sistem Ayarları (3 MenuCard)
- **Kullanıcı Yönetimi:** 🔒 Admin/SuperAdmin only
- **Önbellek Temizle:** Cache Management Modal açar
- **Genel Ayarlar:** 🔒 Admin/SuperAdmin only

### 5. Hakkında & Yasal (3 MenuCard)
- **Kullanım Sözleşmesi:** Legal Modal (Terms)
- **Gizlilik Politikası:** Legal Modal (Privacy)
- **Uygulama Hakkında:** Legal Modal (About)

### 6. Hesap İşlemleri (2 MenuCard)
- **Güvenli Çıkış:** Logout Confirmation Dialog
- **Hesabımı Kapat:** Delete Account Confirmation Dialog

## State Yönetimi

### Component State

```typescript
// Modal States
const [showProfileModal, setShowProfileModal] = useState(false);
const [showPasswordModal, setShowPasswordModal] = useState(false);
const [showNotificationModal, setShowNotificationModal] = useState(false);
const [showClearCacheModal, setShowClearCacheModal] = useState(false);
const [showTermsModal, setShowTermsModal] = useState(false);
const [showPrivacyModal, setShowPrivacyModal] = useState(false);
const [showAboutModal, setShowAboutModal] = useState(false);
const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
const [showImagePicker, setShowImagePicker] = useState(false);

// Upload State
const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
const [isClearingCache, setIsClearingCache] = useState(false);
const [isCalculatingSize, setIsCalculatingSize] = useState(false);

// Photo State
const [photoUrl, setPhotoUrl] = useState<string | undefined>(
  user?.avatar ? `${BASE_API_URL}/${user.avatar}` : undefined
);

// Settings States
const [notificationSettings, setNotificationSettings] = useState({
  pushNotifications: true,
  emailNotifications: true,
  smsNotifications: false,
  promotions: false,
  systemAlerts: true,
});

const [cacheSettings, setCacheSettings] = useState({
  tempFiles: true,
  imageCache: true,
  apiCache: true,
  appData: false,
  sessionData: false,
});

const [cacheSizes, setCacheSizes] = useState({
  tempFiles: 0,
  imageCache: 0,
  apiCache: 0,
  appData: 0,
  sessionData: 0,
});
```

### Context Hooks

```typescript
const { colors, isDark } = useTheme();
const { user, logout } = useAuth();
const { showSuccess, showError } = useAlert();
```

### Props

```typescript
interface ProfileScreenProps {
  onUserManagement: () => void;  // User Management ekranına git
  onLogout?: () => void;         // Logout callback
}
```

## Modals

### 1. ActionFormModal (2 adet)

#### Profile Information Modal
```tsx
<ActionFormModal
  visible={showProfileModal}
  title="Profil Bilgileri"
  icon="person-outline"
  iconColor={colors.primary}
  fields={profileFields}
  onClose={() => setShowProfileModal(false)}
  onSave={handleProfileSave}
  onFieldChange={handleProfileFieldChange}
  saveButtonText="Kaydet"
/>
```

**Fields:**
- Full Name (person-outline)
- Phone (call-outline)
- Email (mail-outline)

#### Password Change Modal
```tsx
<ActionFormModal
  visible={showPasswordModal}
  title="Şifre Değiştir"
  icon="lock-closed-outline"
  iconColor={colors.primary}
  fields={passwordFields}
  onClose={() => {
    setShowPasswordModal(false);
    setPasswordFields(fields => fields.map(f => ({ ...f, value: '', error: undefined })));
  }}
  onSave={handlePasswordSave}
  onFieldChange={handlePasswordFieldChange}
  saveButtonText="Şifreyi Güncelle"
/>
```

**Fields:**
- Current Password
- New Password
- Confirm New Password

### 2. Full Screen Modals (5 adet)

Tüm full screen modals aynı yapıyı takip eder:

```tsx
<Modal
  visible={showModal}
  animationType="slide"
  transparent={false}
  onRequestClose={() => setShowModal(false)}
>
  <SafeAreaView style={[styles.legalModalContainer, { backgroundColor: colors.card }]} edges={['top', 'bottom']}>
    {/* Header */}
    <View style={styles.notificationHeader}>
      <View style={styles.notificationHeaderLeft}>
        <View style={[styles.notificationHeaderIcon, { backgroundColor: colors.primary + '15' }]}>
          <Icon name="icon-name" size={20} color={colors.primary} />
        </View>
        <Text style={styles.notificationTitle}>Title</Text>
      </View>
      <XButton onPress={() => setShowModal(false)} size={36} iconSize={20} />
    </View>

    {/* Content */}
    <ScrollView style={styles.notificationScrollView}>
      {/* Content here */}
    </ScrollView>

    {/* Footer */}
    <View style={styles.notificationFooter}>
      <Button text="Action" onPress={handleAction} />
    </View>
  </SafeAreaView>
</Modal>
```

#### Cache Management Modal
- **Icon:** trash-outline
- **Content:** Cache type selection with sizes
- **Actions:** İptal, Temizle

**Referans:** [Cache Management](../features/CacheManagement.md)

#### Notification Settings Modal
- **Icon:** notifications-outline
- **Content:** Notification toggles
- **Actions:** İptal, Kaydet

#### Terms of Service Modal
- **Icon:** document-text-outline
- **Content:** Turkish legal terms text
- **Actions:** Kapat

**Referans:** [Legal Documents](../features/LegalDocuments.md)

#### Privacy Policy Modal
- **Icon:** shield-checkmark-outline
- **Content:** Turkish privacy policy text (KVKK compliant)
- **Actions:** Kapat

**Referans:** [Legal Documents](../features/LegalDocuments.md)

#### About Modal
- **Icon:** information-circle-outline
- **Content:** Company info, history since 1995
- **Actions:** Kapat

**Referans:** [Legal Documents](../features/LegalDocuments.md)

### 3. Confirmation Dialogs (2 adet)

```tsx
// Logout Confirmation
<ConfirmDialog
  visible={showLogoutConfirm}
  title="Çıkış Yap"
  message="Uygulamadan çıkış yapmak istediğinize emin misiniz?"
  icon="log-out"
  iconColor="#F59E0B"
  confirmText="Çıkış Yap"
  cancelText="İptal"
  confirmIcon="checkmark-outline"
  cancelIcon="close-outline"
  onConfirm={handleLogoutConfirm}
  onCancel={() => setShowLogoutConfirm(false)}
/>

// Delete Account Confirmation
<ConfirmDialog
  visible={showDeleteAccountConfirm}
  title="Hesabı Kapat"
  message="Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir."
  icon="warning"
  iconColor="#EF4444"
  confirmText="Kapat"
  cancelText="İptal"
  confirmIcon="checkmark-outline"
  cancelIcon="close-outline"
  onConfirm={handleDeleteAccount}
  onCancel={() => setShowDeleteAccountConfirm(false)}
/>
```

## Özellikler

### 1. Profile Photo Upload

```typescript
// Line 313-361
const handlePickPhoto = async (source: 'camera' | 'gallery') => {
  setShowImagePicker(false);
  setIsUploadingPhoto(true);

  try {
    const result = source === 'camera'
      ? await launchCamera(options)
      : await launchImageLibrary(options);

    if (result.assets && result.assets[0]) {
      const photo = result.assets[0];
      const uploadResult = await profileService.uploadAvatar(photo);

      if (uploadResult.success) {
        setPhotoUrl(uploadResult.avatarUrl);
        showSuccess('Profil fotoğrafı güncellendi');
      }
    }
  } catch (error) {
    showError('Fotoğraf yüklenemedi');
  } finally {
    setIsUploadingPhoto(false);
  }
};
```

### 2. Profile Information Update

```typescript
// Line 274-304
const handleProfileSave = async () => {
  // Validation
  const fullName = profileFields.find(f => f.key === 'fullName')?.value;
  const phone = profileFields.find(f => f.key === 'phone')?.value;
  const email = profileFields.find(f => f.key === 'email')?.value;

  if (!fullName || !phone || !email) {
    showError('Lütfen tüm alanları doldurun');
    return;
  }

  try {
    await profileService.updateProfile({
      name: fullName,
      phone,
      email,
    });

    showSuccess('Profil bilgileri güncellendi');
    setShowProfileModal(false);
  } catch (error) {
    showError('Profil güncellenemedi');
  }
};
```

### 3. Password Change

```typescript
// Line 306-338
const handlePasswordSave = async () => {
  const currentPassword = passwordFields[0]?.value;
  const newPassword = passwordFields[1]?.value;
  const confirmPassword = passwordFields[2]?.value;

  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    // Set errors...
    return;
  }

  if (newPassword !== confirmPassword) {
    // Set error...
    return;
  }

  if (newPassword.length < 6) {
    // Set error...
    return;
  }

  try {
    await authService.changePassword(currentPassword, newPassword);
    showSuccess('Şifre başarıyla değiştirildi');
    setShowPasswordModal(false);
  } catch (error) {
    showError('Şifre değiştirilemedi');
  }
};
```

### 4. Cache Management

**Referans:** [Cache Management](../features/CacheManagement.md)

```typescript
// Line 400-451: calculateCacheSizes()
// Line 453-569: handleClearCache()
```

### 5. Logout

```typescript
// Line 77-88
const handleLogoutConfirm = async () => {
  try {
    setShowLogoutConfirm(false);
    await logout();
    if (onLogout) {
      onLogout();
    }
  } catch (error) {
    showError('Çıkış yapılamadı');
  }
};
```

### 6. Delete Account

```typescript
// Line 379-398
const handleDeleteAccount = async () => {
  try {
    await profileService.deleteAccount();
    showSuccess('Hesabınız başarıyla silindi');

    await logout();
    if (onLogout) {
      onLogout();
    }
  } catch (error) {
    showError('Hesap silinirken bir hata oluştu');
  } finally {
    setShowDeleteAccountConfirm(false);
  }
};
```

## API Entegrasyonları

### Profile Service

```typescript
// Upload Avatar
await profileService.uploadAvatar(photo);

// Update Profile
await profileService.updateProfile({
  name: string,
  phone: string,
  email: string,
});

// Delete Account
await profileService.deleteAccount();
```

### Auth Service

```typescript
// Change Password
await authService.changePassword(currentPassword, newPassword);

// Logout
await logout(); // from useAuth()
```

### AsyncStorage (Cache)

```typescript
// Get all keys
const allKeys = await AsyncStorage.getAllKeys();

// Get item
const value = await AsyncStorage.getItem(key);

// Remove multiple
await AsyncStorage.multiRemove(uniqueKeysToRemove);
```

## İlişkili Modüller

### Components

- [MenuCard](../components/MenuCard.md) - 11 kullanım
- ActionFormModal - 2 kullanım
- ConfirmDialog - 2 kullanım
- ImagePickerModal - 1 kullanım
- Button - Multiple kullanım
- XButton - Modal close buttons
- IOSSwitch - Settings toggles
- SectionTitle - Bölüm başlıkları

### Features

- [Role-Based Access Control](../features/RoleBasedAccess.md)
- [Legal Documents](../features/LegalDocuments.md)
- [Cache Management](../features/CacheManagement.md)

### Services

- `profileService` - Profile operations
- `authService` - Auth operations

### Contexts

- `useTheme()` - Theme ve renk yönetimi
- `useAuth()` - User ve logout
- `useAlert()` - Success/Error messages

## 🎨 Styling

### Main Styles

```typescript
const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, paddingBottom: 120 },
    pageHeader: { marginBottom: 16 },
    profileCard: { /* Avatar card styles */ },
    section: { marginBottom: 24 },
    footer: { /* Footer styles */ },

    // Modal Styles
    legalModalContainer: { flex: 1 },
    notificationHeader: { /* Header styles */ },
    notificationScrollView: { /* ScrollView styles */ },
    notificationFooter: { /* Footer button container */ },

    // Legal Content
    legalContent: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
      textAlign: 'justify',
      paddingBottom: 20,
    },
  });
```

### Theme Integration

Tüm modals ve componentler tema renklerini kullanır:
- `colors.primary` - Ana renk (iconlar, aktif durumlar)
- `colors.card` - Card background
- `colors.text` - Ana metin rengi
- `colors.textSecondary` - İkincil metin rengi
- `colors.border` - Border renkleri

## 📊 Performans

### useEffect Hooks

```typescript
// Photo URL güncelleme
useEffect(() => {
  if (user?.avatar) {
    const newPhotoUrl = `${BASE_API_URL}/${user.avatar}`;
    setPhotoUrl(newPhotoUrl);
  }
}, [user?.avatar]);

// Cache size hesaplama
useEffect(() => {
  if (showClearCacheModal) {
    calculateCacheSizes();
  }
}, [showClearCacheModal]);

// Profile fields doldurma
useEffect(() => {
  if (user) {
    setProfileFields([...]);
  }
}, [user]);
```

### Optimization Opportunities

- [ ] React.memo for MenuCards
- [ ] useMemo for profileFields
- [ ] useCallback for handlers
- [ ] Lazy loading for modals
- [ ] Virtualized list için SectionList kullanımı

## 🐛 Bilinen Sınırlamalar

1. **Cache Size Calculation:** Approximate (UTF-16 based)
2. **Photo Upload:** Max 5MB limit
3. **Password Validation:** Min 6 characters only
4. **Legal Content:** Static, not from CMS

## ✅ Test Senaryoları

### User Flows

1. **Profile Update Flow**
   - [ ] Open profile modal
   - [ ] Update name, phone, email
   - [ ] Save successfully
   - [ ] See success message

2. **Password Change Flow**
   - [ ] Open password modal
   - [ ] Enter current password
   - [ ] Enter new password (min 6 chars)
   - [ ] Confirm new password (must match)
   - [ ] Save successfully

3. **Cache Clear Flow**
   - [ ] Open cache modal
   - [ ] See calculated sizes
   - [ ] Select cache types
   - [ ] Confirm clear
   - [ ] See updated sizes

4. **Role-Based Access**
   - [ ] Login as user → See disabled menus
   - [ ] Login as admin → All menus enabled
   - [ ] Try click disabled → No action

5. **Logout Flow**
   - [ ] Click logout
   - [ ] Confirm dialog
   - [ ] Successfully logged out

## 📝 Changelog

### v1.0.0 (25 Ocak 2026)
- ✅ Tüm iconlar primary color
- ✅ Tüm modals tam ekran + SafeAreaView
- ✅ Legal documents eklendi (Terms, Privacy, About)
- ✅ Cache management sistemi
- ✅ Role-based access control
- ✅ Profile photo upload
- ✅ Password change
- ✅ Notification settings

## 🔄 Gelecek Geliştirmeler

- [ ] Two-factor authentication
- [ ] Biometric login
- [ ] Dark mode toggle
- [ ] Language selection
- [ ] Export user data
- [ ] Activity log
- [ ] Session management
