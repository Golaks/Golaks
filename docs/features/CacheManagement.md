# Cache Management (Önbellek Yönetimi)

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [AsyncStorage Yapısı](#asyncstorage-yapısı)
3. [Cache Türleri](#cache-türleri)
4. [Cache İşlemleri](#cache-işlemleri)
5. [UI Implementation](#ui-implementation)
6. [Güvenlik ve Gizlilik](#güvenlik-ve-gizlilik)
7. [İlgili Dosyalar](#ilgili-dosyalar)

---

## Genel Bakış

Golaks uygulaması, performans optimizasyonu ve offline kullanım için AsyncStorage tabanlı bir önbellek yönetim sistemi kullanır. Kullanıcılar önbellek boyutunu görüntüleyebilir ve seçici olarak temizleyebilir.

### Özellikler

- ✅ Önbellek boyutu hesaplama (KB/MB formatında)
- ✅ Seçici önbellek temizleme (oturum korunur)
- ✅ Tam önbellek temizleme (çıkış yap)
- ✅ Real-time boyut güncelleme
- ✅ Kullanıcı onay mekanizması
- ✅ Toast feedback

### Kullanım Senaryoları

1. **Performans İyileştirme**: Cache büyüdüğünde temizleme
2. **Depolama Yönetimi**: Cihaz hafızası dolduğunda
3. **Hata Giderme**: Bozuk cache verisi durumunda
4. **Gizlilik**: Cihaz paylaşımı öncesi veri temizleme

---

## AsyncStorage Yapısı

### Veri Organizasyonu

```typescript
// AsyncStorage key-value structure
{
  // Authentication & Session
  '@auth_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  '@user_data': '{"id":"123","username":"demo","role":"admin"}',
  '@company_id': 'app',
  '@refresh_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',

  // User Preferences
  '@theme': 'dark',
  '@language': 'tr',
  '@notifications_enabled': 'true',

  // Cache Data
  '@cache_dashboard': '{"timestamp":1706198400000,"data":{...}}',
  '@cache_products': '{"timestamp":1706198400000,"data":[...]}',
  '@cache_customers': '{"timestamp":1706198400000,"data":[...]}',

  // Offline Queue
  '@pending_requests': '[{"url":"...","method":"POST","body":{...}}]',
}
```

### Key Naming Convention

```typescript
// Prefix patterns
const KEY_PREFIXES = {
  AUTH: '@auth_',           // Authentication keys
  USER: '@user_',           // User data
  CACHE: '@cache_',         // Cached API responses
  SETTINGS: '@settings_',   // User preferences
  OFFLINE: '@offline_',     // Offline queue
  TEMP: '@temp_',           // Temporary data
};
```

---

## Cache Türleri

### 1. Session Cache (Korunmalı)

Oturum devam ettiği sürece saklanması gereken veriler:

```typescript
const SESSION_KEYS = [
  '@auth_token',      // JWT token
  '@refresh_token',   // Refresh token
  '@user_data',       // Kullanıcı bilgileri
  '@company_id',      // Aktif tenant
];

// Bu keyler seçici temizlemede korunur
const shouldPreserveKey = (key: string): boolean => {
  return SESSION_KEYS.some(sessionKey => key.includes(sessionKey));
};
```

### 2. Preference Cache (Kullanıcı Ayarları)

Kullanıcının tercihlerini içeren veriler:

```typescript
const PREFERENCE_KEYS = [
  '@theme',                   // Dark/Light tema
  '@language',                // Dil seçimi
  '@notifications_enabled',   // Bildirim ayarları
  '@notification_sound',      // Bildirim sesi
  '@auto_logout_time',        // Otomatik çıkış süresi
];

// Genellikle korunur, kullanıcı isteğine bağlı
```

### 3. Data Cache (API Önbellekleri)

API yanıtlarının cache'lenmiş versiyonları:

```typescript
const DATA_CACHE_KEYS = [
  '@cache_dashboard',         // Dashboard verileri
  '@cache_products',          // Ürün listesi
  '@cache_customers',         // Müşteri listesi
  '@cache_invoices',          // Fatura listesi
  '@cache_reports',           // Rapor verileri
];

// Timestamp ile birlikte saklanır
interface CacheEntry<T> {
  timestamp: number;
  data: T;
  expiresAt?: number;
}
```

### 4. Offline Cache

Offline modda yapılan işlemler:

```typescript
const OFFLINE_KEYS = [
  '@pending_requests',        // Gönderilemeyen istekler
  '@offline_changes',         // Offline yapılan değişiklikler
  '@sync_queue',             // Senkronizasyon kuyruğu
];

// Network döndüğünde işlenir ve temizlenir
```

### 5. Temporary Cache

Geçici veriler:

```typescript
const TEMP_KEYS = [
  '@temp_form_data',         // Form draft'ları
  '@temp_uploads',           // Yükleme kuyrukları
  '@temp_downloads',         // İndirme durumları
];

// Kısa ömürlü, sık temizlenir
```

---

## Cache İşlemleri

### Boyut Hesaplama

```typescript
// ProfileScreen.tsx (lines 220-239)
const calculateCacheSize = async (): Promise<number> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        // Her karakter ~2 byte (UTF-16)
        totalSize += value.length * 2;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Error calculating cache size:', error);
    return 0;
  }
};
```

#### Boyut Formatlama

```typescript
const formatCacheSize = (bytes: number): string => {
  const kb = bytes / 1024;
  const mb = kb / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  } else if (kb >= 1) {
    return `${kb.toFixed(2)} KB`;
  } else {
    return `${bytes} Bytes`;
  }
};
```

### Seçici Temizleme

```typescript
// ProfileScreen.tsx (lines 241-268)
const clearCache = async () => {
  try {
    // Tüm anahtarları al
    const keys = await AsyncStorage.getAllKeys();

    // Session anahtarlarını filtrele (koru)
    const keysToRemove = keys.filter(key =>
      !key.includes('@auth_token') &&
      !key.includes('@user_data') &&
      !key.includes('@company_id') &&
      !key.includes('@refresh_token')
    );

    // Seçili anahtarları sil
    await AsyncStorage.multiRemove(keysToRemove);

    // Boyutu yeniden hesapla
    const newSize = await calculateCacheSize();
    setCacheSize(newSize);

    Toast.show({
      type: 'success',
      text1: 'Önbellek Temizlendi',
      text2: `${keysToRemove.length} öğe silindi`,
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    Toast.show({
      type: 'error',
      text1: 'Hata',
      text2: 'Önbellek temizlenemedi',
    });
  }
};
```

### Tam Temizleme (Çıkış)

```typescript
const handleLogout = async () => {
  try {
    // Tüm cache'i temizle
    await AsyncStorage.clear();

    // API'ye logout isteği
    await authService.logout();

    // Auth context'i sıfırla
    logout();

    // Login ekranına yönlendir
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });

    Toast.show({
      type: 'success',
      text1: 'Çıkış Yapıldı',
      text2: 'Tüm veriler temizlendi',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

### Cache Güncelleme

```typescript
// Real-time cache update
useEffect(() => {
  const loadCacheSize = async () => {
    const size = await calculateCacheSize();
    setCacheSize(size);
  };

  loadCacheSize();

  // Modal açıldığında yeniden hesapla
  if (showCacheModal) {
    loadCacheSize();
  }
}, [showCacheModal]);
```

---

## UI Implementation

### Cache Management Modal

**Dosya**: ProfileScreen.tsx (lines 1238-1317)
**Modal State**: `showCacheModal`

```typescript
<Modal
  visible={showCacheModal}
  animationType="slide"
  transparent={false}
  onRequestClose={() => setShowCacheModal(false)}
>
  <SafeAreaView
    style={[styles.notificationModalContainer, { backgroundColor: colors.card }]}
    edges={['top', 'bottom']}
  >
    {/* Header */}
    <View style={styles.notificationHeader}>
      <View style={styles.notificationHeaderLeft}>
        <View style={[styles.notificationHeaderIcon, { backgroundColor: colors.primary + '15' }]}>
          <Icon name="server-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.notificationTitle}>Önbellek Yönetimi</Text>
      </View>
      <XButton onPress={() => setShowCacheModal(false)} size={36} iconSize={20} />
    </View>

    {/* Content */}
    <ScrollView style={styles.notificationScrollView}>
      <Text style={styles.notificationDescription}>
        Önbellek, uygulamanın daha hızlı çalışması için geçici olarak saklanan verilerdir.
        Önbelleği temizlemek, bazı verilerin yeniden yüklenmesine neden olabilir.
      </Text>

      <View style={styles.cacheInfoCard}>
        <View style={styles.cacheInfoRow}>
          <Icon name="save-outline" size={24} color={colors.primary} />
          <View style={styles.cacheInfoText}>
            <Text style={styles.cacheInfoLabel}>Toplam Önbellek Boyutu</Text>
            <Text style={styles.cacheInfoValue}>{formatCacheSize(cacheSize)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.warningBox}>
        <Icon name="warning-outline" size={20} color={colors.warning} />
        <Text style={styles.warningText}>
          Önbellek temizlendiğinde oturumunuz devam edecek ancak bazı veriler yeniden yüklenecektir.
        </Text>
      </View>
    </ScrollView>

    {/* Footer */}
    <View style={styles.notificationFooter}>
      <Button
        text="Önbelleği Temizle"
        onPress={handleClearCache}
        variant="secondary"
      />
    </View>
  </SafeAreaView>
</Modal>
```

### MenuCard Entry Point

```typescript
<MenuCard
  name="Önbellek Yönetimi"
  icon="server-outline"
  color={colors.primary}
  description={`Uygulama önbelleği - ${formatCacheSize(cacheSize)}`}
  onPress={() => setShowCacheModal(true)}
/>
```

### Onay Dialog

```typescript
const handleClearCache = () => {
  Alert.alert(
    'Önbellek Temizle',
    'Önbelleği temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
    [
      {
        text: 'İptal',
        style: 'cancel',
      },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: clearCache,
      },
    ]
  );
};
```

### Styling

```typescript
const styles = StyleSheet.create({
  cacheInfoCard: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },

  cacheInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  cacheInfoText: {
    marginLeft: 12,
    flex: 1,
  },

  cacheInfoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },

  cacheInfoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },

  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },

  warningText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});
```

---

## Cache Stratejileri

### 1. Time-Based Expiration

```typescript
interface CacheEntry<T> {
  timestamp: number;
  data: T;
  expiresAt?: number;
}

const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000,      // 5 dakika
  MEDIUM: 30 * 60 * 1000,    // 30 dakika
  LONG: 24 * 60 * 60 * 1000, // 24 saat
};

const setCacheWithExpiry = async <T>(
  key: string,
  data: T,
  duration: number = CACHE_DURATION.MEDIUM
) => {
  const entry: CacheEntry<T> = {
    timestamp: Date.now(),
    data,
    expiresAt: Date.now() + duration,
  };

  await AsyncStorage.setItem(key, JSON.stringify(entry));
};

const getCacheIfValid = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Expired mi kontrol et
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
};
```

### 2. Size-Based Eviction

```typescript
const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10 MB

const checkAndEvictCache = async () => {
  const size = await calculateCacheSize();

  if (size > MAX_CACHE_SIZE) {
    // En eski cache'leri bul
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('@cache_'));

    // Timestamp'e göre sırala
    const entries = await Promise.all(
      cacheKeys.map(async key => {
        const value = await AsyncStorage.getItem(key);
        const parsed = JSON.parse(value || '{}');
        return { key, timestamp: parsed.timestamp || 0 };
      })
    );

    entries.sort((a, b) => a.timestamp - b.timestamp);

    // İlk %20'yi sil
    const toRemove = entries.slice(0, Math.ceil(entries.length * 0.2));
    await AsyncStorage.multiRemove(toRemove.map(e => e.key));
  }
};
```

### 3. LRU (Least Recently Used)

```typescript
interface LRUEntry<T> {
  data: T;
  lastAccessed: number;
}

const updateLRU = async <T>(key: string, data: T) => {
  const entry: LRUEntry<T> = {
    data,
    lastAccessed: Date.now(),
  };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
};

const getLRU = async <T>(key: string): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  const entry: LRUEntry<T> = JSON.parse(raw);

  // Access time'ı güncelle
  entry.lastAccessed = Date.now();
  await AsyncStorage.setItem(key, JSON.stringify(entry));

  return entry.data;
};
```

---

## Güvenlik ve Gizlilik

### Hassas Veri Encryption

```typescript
import EncryptedStorage from 'react-native-encrypted-storage';

// Hassas veriler için encrypted storage
const saveSecureData = async (key: string, value: string) => {
  await EncryptedStorage.setItem(key, value);
};

const getSecureData = async (key: string): Promise<string | null> => {
  return await EncryptedStorage.getItem(key);
};

// Kullanım
await saveSecureData('@auth_token', token);
await saveSecureData('@refresh_token', refreshToken);
```

### Otomatik Temizleme

```typescript
// Uygulama başlangıcında eski cache'leri temizle
const cleanupExpiredCache = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith('@cache_'));

  for (const key of cacheKeys) {
    const value = await AsyncStorage.getItem(key);
    if (!value) continue;

    try {
      const { expiresAt } = JSON.parse(value);
      if (expiresAt && Date.now() > expiresAt) {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Bozuk veri, sil
      await AsyncStorage.removeItem(key);
    }
  }
};

// App.tsx içinde
useEffect(() => {
  cleanupExpiredCache();
}, []);
```

### KVKK Compliance

```typescript
// Kullanıcı silindiğinde tüm verilerini temizle
const deleteUserData = async (userId: string) => {
  const keys = await AsyncStorage.getAllKeys();

  // Bu kullanıcıya ait tüm keyleri bul
  const userKeys = keys.filter(key =>
    key.includes(userId) ||
    key.includes(`@user_${userId}`)
  );

  // Sil
  await AsyncStorage.multiRemove(userKeys);

  // Log
  console.log(`Deleted ${userKeys.length} entries for user ${userId}`);
};
```

---

## Performance Optimization

### Batch Operations

```typescript
// Birden fazla cache'i aynı anda yaz
const batchSetCache = async (entries: Array<[string, any]>) => {
  const pairs = entries.map(([key, value]) => [
    key,
    JSON.stringify({
      timestamp: Date.now(),
      data: value,
    }),
  ]);

  await AsyncStorage.multiSet(pairs);
};

// Kullanım
await batchSetCache([
  ['@cache_products', products],
  ['@cache_customers', customers],
  ['@cache_invoices', invoices],
]);
```

### Lazy Loading

```typescript
// Cache'i ihtiyaç duyulduğunda yükle
const useCachedData = <T>(key: string, fetcher: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Önce cache'den dene
      const cached = await getCacheIfValid<T>(key);

      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      // Cache yoksa fetch et
      try {
        const fresh = await fetcher();
        setData(fresh);
        await setCacheWithExpiry(key, fresh);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key]);

  return { data, loading };
};

// Kullanım
const { data: products, loading } = useCachedData(
  '@cache_products',
  () => productService.getAll()
);
```

---

## İlgili Dosyalar

### Ekranlar
- [ProfileScreen](../screens/ProfileScreen.md) - Ana cache yönetim UI'ı

### Bileşenler
- [MenuCard](../components/MenuCard.md) - Cache yönetimi entry point

### Services
- [authService.ts](../../src/services/authService.ts) - Token cache yönetimi
- [profileService.ts](../../src/services/profileService.ts) - Profil data cache

### Utilities
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) - Storage API
- [react-native-encrypted-storage](https://github.com/emeraldsanto/react-native-encrypted-storage) - Encrypted storage

### Features
- [Role-Based Access Control](./RoleBasedAccess.md) - Session data management
- [Legal Documents](./LegalDocuments.md) - Gizlilik ve veri saklama politikaları

---

## Test Senaryoları

### 1. Boyut Hesaplama
```typescript
describe('Cache Size Calculation', () => {
  it('should calculate total cache size', async () => {
    await AsyncStorage.setItem('@test_key', 'test_value');

    const size = await calculateCacheSize();
    expect(size).toBeGreaterThan(0);
  });

  it('should format size correctly', () => {
    expect(formatCacheSize(500)).toBe('500 Bytes');
    expect(formatCacheSize(1024)).toBe('1.00 KB');
    expect(formatCacheSize(1024 * 1024)).toBe('1.00 MB');
  });
});
```

### 2. Seçici Temizleme
```typescript
describe('Selective Cache Clear', () => {
  beforeEach(async () => {
    await AsyncStorage.setItem('@auth_token', 'token123');
    await AsyncStorage.setItem('@cache_data', 'cached_data');
  });

  it('should preserve session keys', async () => {
    await clearCache();

    const token = await AsyncStorage.getItem('@auth_token');
    const cached = await AsyncStorage.getItem('@cache_data');

    expect(token).toBe('token123');
    expect(cached).toBeNull();
  });
});
```

### 3. Cache Expiry
```typescript
describe('Cache Expiration', () => {
  it('should return null for expired cache', async () => {
    const key = '@cache_test';
    const data = { test: 'data' };

    // 1 saniye geçerlilik
    await setCacheWithExpiry(key, data, 1000);

    // Hemen geçerli olmalı
    const fresh = await getCacheIfValid(key);
    expect(fresh).toEqual(data);

    // 2 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Artık expired
    const expired = await getCacheIfValid(key);
    expect(expired).toBeNull();
  });
});
```

---

## Versiyon Geçmişi

### v1.0.0 (2024-01-25)
- ✅ Önbellek boyutu hesaplama
- ✅ Seçici temizleme (session korunur)
- ✅ UI modal implementasyonu
- ✅ Real-time boyut güncelleme
- ✅ Toast feedback

### Planlanan İyileştirmeler
- 🔄 Automatic cache cleanup (expired items)
- 🔄 Cache analytics (hangi key'ler ne kadar yer kaplıyor)
- 🔄 Selective key deletion (kullanıcı seçimi)
- 🔄 Cache export/import (backup)
- 🔄 Memory vs Disk cache stratejisi
- 🔄 Cache compression

---

**Son Güncelleme**: 2024-01-25
**Versiyon**: 1.0.0
**Yazar**: Golaks Development Team
