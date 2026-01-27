# Golaks API Mimarisi ve Geliştirme Rehberi

## İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Klasör Yapısı](#klasör-yapısı)
3. [Controller-Router Mimarisi](#controller-router-mimarisi)
4. [Authentication Sistemi](#authentication-sistemi)
5. [Veritabanı Yapısı](#veritabanı-yapısı)
6. [API Endpoint'leri](#api-endpointleri)
7. [Yeni Endpoint Ekleme](#yeni-endpoint-ekleme)
8. [Hata Yönetimi](#hata-yönetimi)
9. [Örnek Kullanımlar](#örnek-kullanımlar)

---

## Genel Bakış

Golaks API, modern PHP 8+ ile geliştirilmiş RESTful bir API'dir. MVC mimarisini takip eder ve tamamen controller-router tabanlı çalışır.

### Temel Özellikler
- ✅ Tamamen modern controller/router sistemi
- ✅ JWT tabanlı authentication
- ✅ Multi-tenant (Çok kiracılı) mimari
- ✅ Multi-database desteği (Her firma için ayrı veritabanı)
- ✅ RESTful API standartları
- ✅ Merkezi hata yönetimi
- ✅ CORS desteği

### Teknoloji Stack
- **Backend**: PHP 8.x
- **Veritabanı**: MySQL/MariaDB (PDO)
- **Authentication**: JWT (JSON Web Tokens)
- **API Format**: JSON

---

## Klasör Yapısı

```
api/
├── config/
│   └── config.php              # Ana konfigürasyon dosyası (JWT, DB, vb.)
│
├── includes/
│   ├── auth.php                # JWT authentication helper
│   ├── database.php            # PDO veritabanı wrapper
│   └── response.php            # JSON response helper
│
├── controllers/
│   ├── AuthController.php      # Login, logout, refresh, password reset
│   ├── UserController.php      # Kullanıcı yönetimi + profil
│   ├── CompanyController.php   # Firma yönetimi (SuperAdmin)
│   ├── AccountController.php   # Cari hesap işlemleri
│   ├── NotificationController.php
│   ├── TenantController.php
│   ├── DataController.php
│   ├── HealthController.php
│   │
│   └── apps/                   # Uygulama-spesifik controller'lar
│       ├── account/
│       ├── tannery/
│       ├── confection/
│       └── shop/
│
├── routes/
│   ├── api.php                 # Ana route tanımları
│   └── apps/                   # Uygulama-spesifik route'lar
│       ├── account.php
│       ├── tannery.php
│       ├── confection.php
│       └── shop.php
│
├── uploads/
│   └── profiles/               # Kullanıcı profil fotoğrafları
│
└── index.php                   # Ana entry point
```

---

## Controller-Router Mimarisi

### Router Sistemi

Router, tüm HTTP isteklerini karşılar ve uygun controller metoduna yönlendirir.

**Dosya**: `api/routes/api.php`

```php
class Router {
    private $routes = [];

    // Route tanımlama metodları
    private function get($path, $controller, $method)
    private function post($path, $controller, $method)
    private function put($path, $controller, $method)
    private function delete($path, $controller, $method)

    // Route eşleştirme ve dispatch
    public function dispatch()
}
```

### Controller Yapısı

Tüm controller'lar bağımsız PHP sınıflarıdır ve helper'ları doğrudan kullanır.

**Örnek Controller**:

```php
<?php
class ExampleController {
    /**
     * GET /example/list
     * Örnek liste endpoint'i
     */
    public function getList() {
        // 1. Authentication
        $payload = Auth::requireAuth();
        $userId = $payload['userId'];

        try {
            // 2. Database işlemleri
            $db = Database::getInstance();
            $data = $db->fetchAll("SELECT * FROM table WHERE user_id = ?", [$userId]);

            // 3. Response
            Response::success(['data' => $data]);

        } catch (Exception $e) {
            error_log('Error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }
}
```

---

## Authentication Sistemi

### JWT Token Yapısı

**Token Oluşturma** (`includes/auth.php`):

```php
Auth::generateToken([
    'userId' => $userId,
    'email' => $email,
    'companyId' => $companyId,
    'role' => $role
]);
```

**Token Payload Örneği**:

```json
{
  "userId": "123",
  "email": "user@example.com",
  "companyId": "5",
  "role": 1,
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Token Kullanımı

**1. Public Endpoint** (Token gerektirmez):
```php
public function login() {
    // Token kontrolü YOK
    $data = json_decode(file_get_contents('php://input'), true);
    // ...
}
```

**2. Protected Endpoint** (Token gerektirir):
```php
public function getProfile() {
    $payload = Auth::requireAuth(); // Token kontrolü
    $userId = $payload['userId'];
    // ...
}
```

**3. Admin-Only Endpoint**:
```php
public function getList() {
    $payload = Auth::requireAuth();
    $userId = $payload['userId'];

    // Rol kontrolü
    $user = $db->fetchOne("SELECT kullanici_rol FROM mobil_kullanici WHERE id = ?", [$userId]);

    if ($user['kullanici_rol'] < 1) {
        Response::error('Yetkiniz yok', 'UNAUTHORIZED', 403);
    }
    // ...
}
```

### Authorization Seviyeleri

| Rol | kullanici_rol | Açıklama |
|-----|---------------|----------|
| User | 0 | Normal kullanıcı |
| Admin | 1 | Firma yöneticisi |
| SuperAdmin | 2 | Sistem yöneticisi |

---

## Veritabanı Yapısı

### Ana Sistem Veritabanı

**Tablo**: `mobil_firmalar` (Firma bilgileri)

```sql
- id
- firma_adi
- yetkili_adsoyad
- telefon
- email
- aktif
- firma_ayarlar (JSON - Veritabanı bağlantı bilgileri)
- olusturma_tarihi
```

**firma_ayarlar JSON Yapısı**:

```json
{
  "veritabani": {
    "server": "localhost",
    "port": "3306",
    "username": "db_user",
    "password": "db_pass",
    "databases": {
      "golaks_demo": "Ana Veritabanı",
      "golaks_test": "Test Veritabanı"
    }
  }
}
```

**Tablo**: `mobil_kullanici` (Kullanıcı bilgileri)

```sql
- id
- mobil_firmalar_id (FK)
- ad_soyad
- kullanici_adi (email)
- kullanici_telefon
- sifre (bcrypt hash)
- kullanici_rol (0=User, 1=Admin, 2=SuperAdmin)
- aktif
- resim_yolu
- kullanici_yetkiler (JSON)
- son_giris_tarihi
- son_aktivite_tarihi
```

**kullanici_yetkiler JSON Yapısı**:

```json
{
  "uygulamalar": {
    "account": true,
    "tannery": false,
    "shop": true
  },
  "bildirim_ayarlari": {
    "email": true,
    "push": true
  }
}
```

### Firma Veritabanları

Her firmanın kendi veritabanında:

**Tablo**: `cariler` (Cari hesaplar)
```sql
- id
- firma_id
- sube_id
- hesap_kodu (120=Müşteri, 320=Tedarikçi, 100=Kasa, 102=Banka, 335=Personel)
- unvan
- kisa_unvan
- doviz
- ...
```

---

## API Endpoint'leri

### Authentication (`/auth/*`)

| Method | Endpoint | Controller | Açıklama |
|--------|----------|------------|----------|
| POST | `/auth/login` | AuthController::login | Kullanıcı girişi |
| POST | `/auth/logout` | AuthController::logout | Kullanıcı çıkışı |
| POST | `/auth/refresh` | AuthController::refresh | Token yenileme |
| POST | `/auth/forgot-password` | AuthController::forgotPassword | Şifre sıfırlama talebi |
| POST | `/auth/reset-password` | AuthController::resetPassword | Şifre sıfırlama |

**Login Örneği**:

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "123456"
}

# Response:
{
  "success": true,
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "id": "123",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

### User Management (`/user/*`)

#### Profil İşlemleri (Tüm kullanıcılar)

| Method | Endpoint | Controller | Açıklama |
|--------|----------|------------|----------|
| GET | `/user/profile` | UserController::profile | Profil bilgilerini getir |
| PUT | `/user/profile` | UserController::updateProfile | Profil güncelle |
| PUT | `/user/change-password` | UserController::changePassword | Şifre değiştir |
| PUT | `/user/notifications` | UserController::updateNotifications | Bildirim ayarları |
| POST | `/user/upload-photo` | UserController::uploadPhoto | Profil fotoğrafı yükle |

#### Kullanıcı Yönetimi (Admin/SuperAdmin)

| Method | Endpoint | Controller | Açıklama |
|--------|----------|------------|----------|
| GET | `/user/list` | UserController::getList | Kullanıcı listesi |
| POST | `/user/create` | UserController::create | Kullanıcı oluştur |
| PUT | `/user/update` | UserController::update | Kullanıcı güncelle |
| DELETE | `/user/delete` | UserController::delete | Kullanıcı sil |

### Company Management (`/company/*`) - SuperAdmin Only

| Method | Endpoint | Controller | Açıklama |
|--------|----------|------------|----------|
| GET | `/company/list` | CompanyController::getList | Firma listesi |
| POST | `/company/create` | CompanyController::create | Firma oluştur |
| PUT | `/company/update` | CompanyController::update | Firma güncelle |
| DELETE | `/company/delete` | CompanyController::delete | Firma sil (soft delete) |

### Account (`/account/*`)

| Method | Endpoint | Controller | Açıklama |
|--------|----------|------------|----------|
| POST | `/account/cari-list` | AccountController::getCariList | Cari hesap listesi (filtrelenebilir) |

**Cari List Örneği**:

```bash
POST /account/cari-list
Authorization: Bearer <token>
Content-Type: application/json

{
  "dataName": "golaks_demo",
  "filterType": "customers",  // all, customers, suppliers, safes, banks, personnel
  "search": ""
}

# Response:
{
  "success": true,
  "data": [
    {
      "id": "1",
      "hesapKodu": "120.001",
      "unvan": "ABC Müşteri",
      "kisaUnvan": "ABC",
      "bakiyeler": [
        {
          "doviz": "TRY",
          "bakiye": 5000.50,
          "bakiyeTipi": "AB"  // AB=Alacak, BB=Borç
        }
      ]
    }
  ]
}
```

### Notifications (`/notifications/*`)

| Method | Endpoint | Controller | Açıklama |
|--------|----------|------------|----------|
| GET | `/notifications` | NotificationController::getNotifications | Tüm bildirimler |
| GET | `/notifications/unread` | NotificationController::getUnreadNotifications | Okunmamış bildirimler |
| PUT | `/notifications/mark-all-read` | NotificationController::markAllAsRead | Tümünü okundu işaretle |
| PUT | `/notifications/:id/read` | NotificationController::markAsRead | Tek bildirimi okundu işaretle |
| DELETE | `/notifications/:id` | NotificationController::deleteNotification | Bildirim sil |
| POST | `/notifications/send` | NotificationController::sendNotification | Bildirim gönder |

### Tenant (`/tenant/*`)

| Method | Endpoint | Controller | Açıklama |
|--------|----------|------------|----------|
| GET | `/tenant/info` | TenantController::info | Firma bilgileri |
| GET | `/tenant/list` | TenantController::list | Kullanıcının erişebildiği firmalar |
| POST | `/tenant/switch` | TenantController::switch | Firma değiştir |

### Health Check

| Method | Endpoint | Controller | Açıklama |
|--------|----------|------------|----------|
| GET | `/` | HealthController::check | API durumu |
| GET | `/health` | HealthController::check | API durumu |

---

## Yeni Endpoint Ekleme

### 1. Controller Oluşturma

**Dosya**: `api/controllers/ProductController.php`

```php
<?php
/**
 * Product Controller
 * Ürün yönetimi işlemleri
 */

class ProductController {
    /**
     * GET /product/list
     * Ürün listesi
     */
    public function getList() {
        $payload = Auth::requireAuth();
        $userId = $payload['userId'];

        try {
            $db = Database::getInstance();

            // Kullanıcının firmasını al
            $user = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            // Ürünleri getir
            $products = $db->fetchAll(
                "SELECT * FROM products WHERE company_id = ?",
                [$user['mobil_firmalar_id']]
            );

            Response::success(['products' => $products]);

        } catch (Exception $e) {
            error_log('Product list error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /product/create
     * Yeni ürün oluştur
     */
    public function create() {
        $payload = Auth::requireAuth();
        $userId = $payload['userId'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        try {
            $db = Database::getInstance();

            // Validasyon
            if (empty($data['name'])) {
                Response::error('Ürün adı gerekli', 'VALIDATION_ERROR', 400);
            }

            // Kullanıcının firmasını al
            $user = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            // Ürünü kaydet
            $db->execute(
                "INSERT INTO products (company_id, name, price, created_at) VALUES (?, ?, ?, NOW())",
                [$user['mobil_firmalar_id'], $data['name'], $data['price']]
            );

            $productId = $db->lastInsertId();

            Response::success([
                'id' => $productId,
                'message' => 'Ürün başarıyla oluşturuldu'
            ]);

        } catch (Exception $e) {
            error_log('Product create error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }
}
```

### 2. Route Tanımlama

**Dosya**: `api/routes/api.php`

```php
private function registerRoutes() {
    // ... diğer route'lar ...

    // Product Routes (Protected)
    $this->get('/product/list', 'ProductController', 'getList');
    $this->post('/product/create', 'ProductController', 'create');
    $this->put('/product/update', 'ProductController', 'update');
    $this->delete('/product/delete', 'ProductController', 'delete');
}
```

### 3. Frontend'de Kullanım

**TypeScript Service** (`src/services/product.service.ts`):

```typescript
class ProductService {
  async getProducts(token: string) {
    const response = await fetch(`${BASE_API_URL}/product/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  }

  async createProduct(token: string, data: { name: string; price: number }) {
    const response = await fetch(`${BASE_API_URL}/product/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
}

export default new ProductService();
```

---

## Hata Yönetimi

### Response Helper

**Dosya**: `api/includes/response.php`

```php
class Response {
    // Başarılı response
    public static function success($data = null, $message = null, $statusCode = 200)

    // Hata response
    public static function error($message, $code = 'ERROR', $statusCode = 400, $details = null)
}
```

### Standart Hata Kodları

| HTTP Code | Error Code | Açıklama |
|-----------|------------|----------|
| 400 | VALIDATION_ERROR | Validasyon hatası |
| 400 | EMAIL_EXISTS | Email zaten kullanılıyor |
| 400 | INVALID_CREDENTIALS | Geçersiz giriş bilgileri |
| 401 | INVALID_TOKEN | Geçersiz veya süresi dolmuş token |
| 401 | TOKEN_EXPIRED | Token süresi dolmuş |
| 403 | UNAUTHORIZED | Yetkisiz erişim |
| 403 | FORBIDDEN | Yasaklı işlem |
| 404 | NOT_FOUND | Kayıt bulunamadı |
| 404 | USER_NOT_FOUND | Kullanıcı bulunamadı |
| 404 | ROUTE_NOT_FOUND | Route bulunamadı |
| 405 | METHOD_NOT_ALLOWED | HTTP metodu desteklenmiyor |
| 500 | SERVER_ERROR | Sunucu hatası |

### Hata Response Formatı

```json
{
  "success": false,
  "error": {
    "message": "Kullanıcı bulunamadı",
    "code": "USER_NOT_FOUND"
  }
}
```

---

## Örnek Kullanımlar

### 1. Login ve Token Kullanımı

```javascript
// Login
const loginResponse = await fetch('https://api.example.com/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: '123456'
  })
});

const loginData = await loginResponse.json();
const token = loginData.data.token;

// Protected endpoint'e istek
const profileResponse = await fetch('https://api.example.com/user/profile', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

const profile = await profileResponse.json();
```

### 2. Multi-Database Kullanımı (Cari İşlemleri)

```php
// Firma ayarlarından veritabanı bilgilerini al
$firma = $db->fetchOne("SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?", [$firmaId]);
$ayarlar = json_decode($firma['firma_ayarlar'], true);
$veritabani = $ayarlar['veritabani'];

// Firmaya özel veritabanına bağlan
$dsn = "mysql:host={$veritabani['server']};port={$veritabani['port']};dbname={$dataName}";
$pdo = new PDO($dsn, $veritabani['username'], $veritabani['password']);

// Firma veritabanından cari listesini al
$stmt = $pdo->prepare("SELECT * FROM cariler WHERE firma_id = ?");
$stmt->execute([$firmaId]);
$cariler = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

### 3. Dosya Upload

```php
public function uploadPhoto() {
    $payload = Auth::requireAuth();

    if (!isset($_FILES['photo'])) {
        Response::error('Dosya bulunamadı', 'UPLOAD_ERROR', 400);
    }

    $file = $_FILES['photo'];

    // Validasyon
    $maxSize = 5 * 1024 * 1024; // 5MB
    if ($file['size'] > $maxSize) {
        Response::error('Dosya çok büyük', 'FILE_TOO_LARGE', 400);
    }

    // Dosyayı kaydet
    $uploadDir = __DIR__ . '/../uploads/';
    $fileName = uniqid() . '_' . $file['name'];
    move_uploaded_file($file['tmp_name'], $uploadDir . $fileName);

    Response::success(['fileName' => $fileName]);
}
```

### 4. Pagination

```php
public function getList() {
    $payload = Auth::requireAuth();

    // Query parametrelerini al
    $page = $_GET['page'] ?? 1;
    $limit = $_GET['limit'] ?? 20;
    $offset = ($page - 1) * $limit;

    $db = Database::getInstance();

    // Total count
    $total = $db->fetchOne("SELECT COUNT(*) as count FROM products");

    // Paginated data
    $products = $db->fetchAll(
        "SELECT * FROM products LIMIT ? OFFSET ?",
        [$limit, $offset]
    );

    Response::success([
        'products' => $products,
        'pagination' => [
            'page' => (int)$page,
            'limit' => (int)$limit,
            'total' => (int)$total['count'],
            'totalPages' => ceil($total['count'] / $limit)
        ]
    ]);
}
```

---

## Best Practices

### 1. Güvenlik

- ✅ Her zaman prepared statements kullanın (SQL injection koruması)
- ✅ Şifreleri `password_hash()` ile hashleyin
- ✅ Hassas verileri loglamayın
- ✅ CORS ayarlarını production'da sıkılaştırın
- ✅ Rate limiting ekleyin (özellikle login endpoint'ine)

### 2. Kod Organizasyonu

- ✅ Her controller tek bir domain'den sorumlu olmalı
- ✅ Tekrarlayan kodu helper fonksiyonlara taşıyın
- ✅ Validasyon kurallarını tutarlı tutun
- ✅ İyi dokümantasyon yazın (PHPDoc)

### 3. Hata Yönetimi

- ✅ Try-catch kullanın
- ✅ Hataları loglayın (`error_log()`)
- ✅ Kullanıcıya anlamlı hata mesajları verin
- ✅ Production'da detaylı hata mesajları göstermeyin

### 4. Performans

- ✅ N+1 query probleminden kaçının
- ✅ Index'leri doğru kullanın
- ✅ Gerektiğinde cache kullanın
- ✅ Gereksiz JOIN'lerden kaçının

---

## Sorun Giderme

### 1. "Route not found" Hatası

**Çözüm**:
- Route'un `api/routes/api.php` dosyasında tanımlandığından emin olun
- HTTP metodunun doğru olduğunu kontrol edin (GET, POST, PUT, DELETE)
- URL path'inin doğru olduğunu kontrol edin

### 2. "Controller not found" Hatası

**Çözüm**:
- Controller dosyasının `api/controllers/` klasöründe olduğundan emin olun
- Class isminin dosya ismiyle aynı olduğunu kontrol edin
- Apps altındaki controller'lar için `api/routes/api.php` dosyasındaki loading logic'i kontrol edin

### 3. "Invalid token" Hatası

**Çözüm**:
- Token'ın süresi dolmuş olabilir, refresh token ile yenileyin
- Authorization header'ının doğru formatı: `Bearer <token>`
- JWT_SECRET_KEY'in production ve development'ta farklı olduğundan emin olun

### 4. Database Connection Error

**Çözüm**:
- `config/config.php` dosyasındaki DB bilgilerini kontrol edin
- MySQL/MariaDB servisinin çalıştığından emin olun
- Kullanıcı izinlerini kontrol edin

---

## Geliştirme Ortamı

### Gereksinimler

- PHP 8.0 veya üstü
- MySQL 5.7+ veya MariaDB 10.3+
- Apache veya Nginx
- Composer (opsiyonel)

### Local Development

```bash
# Apache ile
cd /path/to/Golaks/api
php -S localhost:8000 index.php

# Test
curl http://localhost:8000/health
```

### Production Deployment

1. `.env` dosyasını oluşturun
2. `JWT_SECRET_KEY` değerini güvenli bir değer ile değiştirin
3. `display_errors = 0` olarak ayarlayın
4. HTTPS kullanın
5. CORS ayarlarını sıkılaştırın

---

## Changelog

### v1.0.0 (2024-01-27)
- ✅ Tamamen modern controller/router mimarisine geçiş
- ✅ Legacy endpoint sistemi kaldırıldı
- ✅ UserController: Profil yönetimi metodları eklendi
- ✅ CompanyController: Firma yönetimi eklendi
- ✅ AccountController: Multi-database cari sistemi
- ✅ JWT backward compatibility alias'ları
- ✅ Cleanup: Gereksiz dosyalar ve config temizlendi

---

## Lisans

© 2024 Golaks. Tüm hakları saklıdır.
