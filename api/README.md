# Golaks API - PHP Backend

Modern PHP REST API with multi-tenant database support.

## 📁 Klasör Yapısı

```
api/
├── index.php              # Entry point
├── .htaccess              # Apache rewrite rules
├── config/
│   ├── config.php         # App configuration
│   └── database.php       # Database connections
├── controllers/
│   ├── BaseController.php # Base controller
│   ├── AuthController.php # Authentication (TODO)
│   ├── HealthController.php # Health check
│   └── apps/              # Uygulama programları
│       ├── account/       # Muhasebe (muhasebe)
│       │   ├── ReportsController.php
│       │   └── TransactionsController.php
│       ├── tannery/       # Tabakhane (tabakhane)
│       │   ├── ReportsController.php
│       │   └── TransactionsController.php
│       ├── confection/    # Konfeksiyon (konfeksiyon)
│       │   ├── ReportsController.php
│       │   └── TransactionsController.php
│       └── shop/          # Mağaza (magaza)
│           ├── ReportsController.php
│           └── TransactionsController.php
├── models/                # Database models (TODO)
├── middleware/            # Middlewares (TODO)
├── utils/
│   └── JWT.php            # JWT utility
└── routes/
    ├── api.php            # Route definitions
    └── apps/              # Uygulama route'ları
        ├── account.php
        ├── tannery.php
        ├── confection.php
        └── shop.php
```

## 🚀 Kurulum

### 1. Gereksinimler
- PHP >= 8.0
- MySQL >= 5.7
- Apache/Nginx web server
- PDO extension
- JSON extension
- mod_rewrite (Apache için)

### 2. Veritabanı Kurulumu

Veritabanı şemasını import edin:

```bash
mysql -u root -p < api/database/schema.sql
```

Bu komut şunları oluşturacak:
- ✅ `golaks_auth` - Merkezi kimlik doğrulama veritabanı
- ✅ `golaks_app`, `golaks_test`, `golaks_demo` - Tenant veritabanları
- ✅ Kullanıcı, tenant, program tabloları
- ✅ Test kullanıcıları (şifre: `password123`)

**Oluşturulan test kullanıcıları:**
- `admin@golaks.com` (app tenant, admin)
- `user@golaks.com` (app tenant, user)
- `test@test.com` (test tenant, user)
- `demo@demo.com` (demo tenant, user)

### 3. Yapılandırma

#### Database Config
`config/database.php` dosyasını düzenleyin:
```php
define('AUTH_DB_HOST', 'localhost');
define('AUTH_DB_NAME', 'golaks_auth');
define('AUTH_DB_USER', 'your_user');
define('AUTH_DB_PASS', 'your_password');
```

#### App Config
`config/config.php` dosyasını düzenleyin:
```php
define('JWT_SECRET_KEY', 'your-secret-key-here');
define('APP_ENV', 'production'); // development or production
```

### 4. Web Server

#### Apache
`.htaccess` dosyası zaten mevcut. `mod_rewrite` aktif olmalı.

#### Nginx
```nginx
location /api {
    try_files $uri $uri/ /api/index.php?$query_string;
}
```

## 📱 Uygulama Programları

| Program ID | Klasör | API Endpoint | Türkçe Adı | Açıklama |
|-----------|--------|--------------|-----------|----------|
| muhasebe | account | /apps/account | Muhasebe | Genel muhasebe yönetimi |
| tabakhane | tannery | /apps/tannery | Tabakhane | Deri üretim süreçleri |
| konfeksiyon | confection | /apps/confection | Konfeksiyon | Giyim üretimi |
| magaza | shop | /apps/shop | Mağaza | Perakende satış |

**Not:** API endpoint'leri İngilizce, program ID'leri Türkçe. Backend sorgularında ve veritabanında Türkçe program ID'leri kullanılır.

## 📡 API Endpoints

### Authentication
```
POST /api/auth/login           # Login
POST /api/auth/logout          # Logout
POST /api/auth/refresh         # Refresh token
POST /api/auth/forgot-password # Forgot password
POST /api/auth/reset-password  # Reset password
```

### Tenant
```
GET  /api/tenant/info          # Get tenant info
GET  /api/tenant/list          # List user's tenants
POST /api/tenant/switch        # Switch tenant
```

### User
```
GET  /api/user/profile         # Get user profile
PUT  /api/user/profile         # Update user profile
```

### Data (Tenant-specific)
```
GET /api/data/dashboard        # Dashboard data
GET /api/data/products         # Products
GET /api/data/customers        # Customers
```

### Account App (Muhasebe) - Program ID: muhasebe
```
# Reports
GET    /api/apps/account/reports       # Tüm raporlar
GET    /api/apps/account/reports/:id   # Rapor detayı
POST   /api/apps/account/reports       # Yeni rapor
PUT    /api/apps/account/reports/:id   # Rapor güncelle
DELETE /api/apps/account/reports/:id   # Rapor sil

# Transactions
GET    /api/apps/account/transactions       # Tüm işlemler
GET    /api/apps/account/transactions/:id   # İşlem detayı
POST   /api/apps/account/transactions       # Yeni işlem
PUT    /api/apps/account/transactions/:id   # İşlem güncelle
DELETE /api/apps/account/transactions/:id   # İşlem sil
```

### Tannery App (Tabakhane) - Program ID: tabakhane
```
# Reports
GET    /api/apps/tannery/reports       # Tüm raporlar
GET    /api/apps/tannery/reports/:id   # Rapor detayı
POST   /api/apps/tannery/reports       # Yeni rapor
PUT    /api/apps/tannery/reports/:id   # Rapor güncelle
DELETE /api/apps/tannery/reports/:id   # Rapor sil

# Transactions
GET    /api/apps/tannery/transactions       # Tüm işlemler
GET    /api/apps/tannery/transactions/:id   # İşlem detayı
POST   /api/apps/tannery/transactions       # Yeni işlem
PUT    /api/apps/tannery/transactions/:id   # İşlem güncelle
DELETE /api/apps/tannery/transactions/:id   # İşlem sil
```

### Confection App (Konfeksiyon) - Program ID: konfeksiyon
```
# Reports
GET    /api/apps/confection/reports       # Tüm raporlar
GET    /api/apps/confection/reports/:id   # Rapor detayı
POST   /api/apps/confection/reports       # Yeni rapor
PUT    /api/apps/confection/reports/:id   # Rapor güncelle
DELETE /api/apps/confection/reports/:id   # Rapor sil

# Transactions
GET    /api/apps/confection/transactions       # Tüm işlemler
GET    /api/apps/confection/transactions/:id   # İşlem detayı
POST   /api/apps/confection/transactions       # Yeni işlem
PUT    /api/apps/confection/transactions/:id   # İşlem güncelle
DELETE /api/apps/confection/transactions/:id   # İşlem sil
```

### Shop App (Mağaza) - Program ID: magaza
```
# Reports
GET    /api/apps/shop/reports       # Tüm raporlar
GET    /api/apps/shop/reports/:id   # Rapor detayı
POST   /api/apps/shop/reports       # Yeni rapor
PUT    /api/apps/shop/reports/:id   # Rapor güncelle
DELETE /api/apps/shop/reports/:id   # Rapor sil

# Transactions
GET    /api/apps/shop/transactions       # Tüm işlemler
GET    /api/apps/shop/transactions/:id   # İşlem detayı
POST   /api/apps/shop/transactions       # Yeni işlem
PUT    /api/apps/shop/transactions/:id   # İşlem güncelle
DELETE /api/apps/shop/transactions/:id   # İşlem sil
```

### Health Check
```
GET /api/health                # API health status
```

## 🔐 Authentication Flow

### Login Request
```json
POST /api/auth/login
Content-Type: application/json

{
  "companyId": "app",
  "username": "user123",
  "password": "password123"
}
```

### Login Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin"
    },
    "tenant": {
      "subdomain": "app",
      "databaseName": "golaks_app",
      "displayName": "Golaks Ana Sistem"
    }
  }
}
```

### Authenticated Request
```http
GET /api/data/products
Authorization: Bearer eyJhbGc...
X-Tenant-ID: app
Content-Type: application/json
```

## 🧪 Test

### Health Check
```bash
curl http://localhost/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "app": "Golaks API",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2026-01-24 03:30:00",
    "timezone": "Europe/Istanbul"
  }
}
```

## 🛡️ Security

### JWT Token
- Tokens expire after 1 hour (configurable)
- Refresh tokens valid for 7 days
- HS256 algorithm
- Secret key stored in config

### Database Security
- PDO prepared statements (SQL injection prevention)
- Password hashing (bcrypt recommended)
- Tenant isolation at database level

### Headers
- CORS configured
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block

## 🧪 Login Testi

### cURL ile Test

```bash
# Login Request
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "companyCode": "app",
    "email": "admin@golaks.com",
    "password": "password123"
  }'
```

### Başarılı Response

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "1",
      "name": "Admin User",
      "email": "admin@golaks.com",
      "role": "admin"
    },
    "tenant": {
      "id": "1",
      "subdomain": "app",
      "databaseName": "golaks_app",
      "displayName": "Golaks Ana Sistem"
    }
  },
  "message": "Giriş başarılı"
}
```

### Korumalı Endpoint'e İstek

```bash
# Get User Profile
curl -X GET http://localhost/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Tenant-ID: app"
```

## 📝 Sonraki Adımlar

1. ✅ Temel yapı oluşturuldu
2. ✅ Uygulama programları klasör yapısı oluşturuldu
3. ✅ 4 uygulama için controller'lar oluşturuldu (Account, Tannery, Confection, Shop)
4. ✅ Route dosyaları oluşturuldu
5. ✅ AuthController implementasyonu tamamlandı
6. ✅ Database schema oluşturuldu
7. ⏳ User model oluşturma
8. ⏳ Middleware (authentication, tenant validation)
9. ⏳ Controller'lara veritabanı sorguları ekleme
10. ⏳ Password reset email gönderimi
11. ⏳ Error logging
12. ⏳ Unit tests

### Controller TODO'lar

Her bir controller'da `// TODO: Implement database query` işareti var. Bunlara veritabanı bağlantısı ve sorguları eklenecek:
- `api/controllers/apps/account/ReportsController.php`
- `api/controllers/apps/account/TransactionsController.php`
- `api/controllers/apps/tannery/ReportsController.php`
- `api/controllers/apps/tannery/TransactionsController.php`
- `api/controllers/apps/confection/ReportsController.php`
- `api/controllers/apps/confection/TransactionsController.php`
- `api/controllers/apps/shop/ReportsController.php`
- `api/controllers/apps/shop/TransactionsController.php`

## 🔧 Development

### Error Reporting
Development ortamında hatalar gösterilir:
```php
// config/config.php
define('APP_ENV', 'development');
```

Production'da gizlenir:
```php
define('APP_ENV', 'production');
```

### Debugging
```php
// index.php başına ekle
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

## 📚 Kaynaklar

- [Multi-Tenant Architecture](../MULTI_TENANT_ARCHITECTURE.md)
- PHP 8 Documentation
- JWT Best Practices
- MySQL Multi-tenancy Patterns
