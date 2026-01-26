<?php
/**
 * POST /Golaks/login
 * Kullanıcı girişi
 *
 * Tablo yapısı:
 * - mobil_kullanici.mobil_firmalar_id → mobil_firmalar.id
 * - Firma ayarları mobil_firmalar.firma_ayarlar JSON içinde
 */

if ($requestMethod !== 'POST') {
    Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
}

// Parametreleri al
$email = $_POST_DATA['email'] ?? '';
$password = $_POST_DATA['password'] ?? '';

// Validasyon
if (empty($email) || empty($password)) {
    Response::error('Email ve şifre gerekli');
}

// Email validasyonu
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::error('Geçersiz email formatı');
}

try {
    $db = Database::getInstance();

    // Kullanıcıyı bul
    $user = $db->fetchOne(
        "SELECT * FROM mobil_kullanici WHERE kullanici_adi = ?",
        [$email]
    );

    if (!$user) {
        Response::error('E-posta veya şifreniz hatalı.', 'INVALID_CREDENTIALS', 401);
    }

    // Hesap durumu kontrolü
    if ($user['aktif'] == -1) {
        Response::error('Hesabınız silinmiş. Lütfen destek ekibi ile iletişime geçin.', 'ACCOUNT_DELETED', 403);
    }

    if ($user['aktif'] != 1) {
        Response::error('Hesabınız aktif değil. Lütfen destek ekibi ile iletişime geçin.', 'ACCOUNT_INACTIVE', 403);
    }

    // Şifre kontrolü
    if (!password_verify($password, $user['sifre'])) {
        Response::error('E-posta veya şifreniz hatalı.', 'INVALID_CREDENTIALS', 401);
    }

    // Mevcut cihaz bilgisini al (request header'dan veya body'den)
    $currentDeviceToken = $_POST_DATA['device_id'] ?? null;

    // JWT token oluştur (device_id ile birlikte)
    $token = Auth::generateToken($user['id'], $user['kullanici_adi'], $currentDeviceToken);

    // Son giriş zamanını ve IP'yi güncelle
    $db->query(
        "UPDATE mobil_kullanici
         SET son_giris_tarihi = NOW(),
             son_giris_ip = ?,
             son_aktivite_tarihi = NOW()
         WHERE id = ?",
        [$_SERVER['REMOTE_ADDR'] ?? '', $user['id']]
    );

    // Login log kaydı oluştur
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $db->query(
        "INSERT INTO mobil_kullanici_log (mobil_kullanici_id, islem, aciklama, ip_adresi)
         VALUES (?, 'login', ?, ?)",
        [$user['id'], "Başarılı giriş yapıldı - User Agent: {$userAgent}", $ipAddress]
    );

    // Firma bilgilerini getir (mobil_firmalar tablosundan)
    $firma = $db->fetchOne(
        "SELECT id, firma_unvani, firma_ayarlar, aktif
         FROM mobil_firmalar
         WHERE id = ? AND aktif = 1",
        [$user['mobil_firmalar_id']]
    );

    // Firma bulunamazsa hata döndür
    if (!$firma) {
        Response::error('Firma bilgisi bulunamadı veya aktif değil', 'COMPANY_NOT_FOUND', 403);
    }

    // Firma ayarlarını parse et
    $firmaAyarlar = [];
    if (!empty($firma['firma_ayarlar'])) {
        $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];
    }

    // Programlar (yetkiler) - firma_ayarlar.programlar içinden
    $programlarAyar = $firmaAyarlar['programlar'] ?? [];

    // Kullanıcı yetkilerini parse et
    $kullaniciYetkileri = json_decode($user['kullanici_yetkiler'] ?? '{}', true) ?: [];
    $isAdmin = ($user['kullanici_rol'] == 1) || ($user['kullanici_rol'] == 2);

    // App yetkileri - yeni yapı (app altında) veya eski yapı (root'ta)
    $appPerms = isset($kullaniciYetkileri['app']) ? $kullaniciYetkileri['app'] : $kullaniciYetkileri;

    // Program yetkileri: Firma yetkisi VE kullanıcı yetkisi (admin tüm yetkilere sahip)
    $programYetkileri = [
        'muhasebe' => isset($programlarAyar['muhasebe']['aktif']) && $programlarAyar['muhasebe']['aktif'] && ($isAdmin || !isset($appPerms['muhasebe']) || $appPerms['muhasebe']),
        'tabakhane' => isset($programlarAyar['tabakhane']['aktif']) && $programlarAyar['tabakhane']['aktif'] && ($isAdmin || !isset($appPerms['tabakhane']) || $appPerms['tabakhane']),
        'magaza' => isset($programlarAyar['magaza']['aktif']) && $programlarAyar['magaza']['aktif'] && ($isAdmin || !isset($appPerms['magaza']) || $appPerms['magaza']),
        'konfeksiyon' => isset($programlarAyar['konfeksiyon']['aktif']) && $programlarAyar['konfeksiyon']['aktif'] && ($isAdmin || !isset($appPerms['konfeksiyon']) || $appPerms['konfeksiyon']),
    ];

    // Barkod sorgulama yetkileri (admin için tüm yetkiler açık)
    $barcodePermissions = [];
    if ($isAdmin) {
        $barcodePermissions = [
            'manufacturer' => true,
            'year' => true,
            'info' => true,
            'entryPrice' => true,
            'costPrice' => true,
            'labelPrice' => true,
        ];
    } else if (isset($kullaniciYetkileri['barcodePermissions']) && is_array($kullaniciYetkileri['barcodePermissions'])) {
        $barcodePermissions = [
            'manufacturer' => isset($kullaniciYetkileri['barcodePermissions']['manufacturer']) ? (bool) $kullaniciYetkileri['barcodePermissions']['manufacturer'] : false,
            'year' => isset($kullaniciYetkileri['barcodePermissions']['year']) ? (bool) $kullaniciYetkileri['barcodePermissions']['year'] : false,
            'info' => isset($kullaniciYetkileri['barcodePermissions']['info']) ? (bool) $kullaniciYetkileri['barcodePermissions']['info'] : false,
            'entryPrice' => isset($kullaniciYetkileri['barcodePermissions']['entryPrice']) ? (bool) $kullaniciYetkileri['barcodePermissions']['entryPrice'] : false,
            'costPrice' => isset($kullaniciYetkileri['barcodePermissions']['costPrice']) ? (bool) $kullaniciYetkileri['barcodePermissions']['costPrice'] : false,
            'labelPrice' => isset($kullaniciYetkileri['barcodePermissions']['labelPrice']) ? (bool) $kullaniciYetkileri['barcodePermissions']['labelPrice'] : false,
        ];
    } else {
        $barcodePermissions = [
            'manufacturer' => false,
            'year' => false,
            'info' => false,
            'entryPrice' => false,
            'costPrice' => false,
            'labelPrice' => false,
        ];
    }

    // URL ve FTP ayarları
    $urlAyarlar = $firmaAyarlar['url'] ?? [];
    $ftpAyarlar = $firmaAyarlar['ftp'] ?? [];
    $lisansAyarlar = $firmaAyarlar['lisans'] ?? [];

    // Başarılı yanıt
    Response::success([
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'firma_id' => $user['mobil_firmalar_id'],
            'firma_unvani' => $firma['firma_unvani'] ?? '',
            'name' => $user['ad_soyad'],
            'email' => $user['kullanici_adi'],
            'telefon' => $user['kullanici_telefon'] ?? '',
            'avatar' => $user['resim_yolu'],
            'bildirimler' => (int) ($user['bildirimler'] ?? 1),
            'yetkiler' => $kullaniciYetkileri,
            'programYetkileri' => $programYetkileri,
            'barcodePermissions' => $barcodePermissions,
            'kullanici_rol' => (int) ($user['kullanici_rol'] ?? 0),
            'mobilDataVersiyon' => $lisansAyarlar['versiyon'] ?? 'v1',
            'mobilResim' => $ftpAyarlar['resimYuklemeTipi'] ?? 'model',
            'resimDomain' => $urlAyarlar['domain'] ?? '',
            'firmaAyarlar' => $firmaAyarlar
        ]
    ], 'Giriş başarılı');

} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    Response::serverError('Giriş işlemi başarısız');
}
