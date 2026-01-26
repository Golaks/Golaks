<?php
/**
 * User Settings Endpoint
 * Kullanıcı ayarları yönetimi (profil, şifre, bildirimler)
 */

header('Content-Type: application/json; charset=UTF-8');

// Sadece POST metoduna izin ver
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
}

try {
    $db = Database::getInstance();

    // Token'ı doğrula ve kullanıcı bilgilerini al
    $payload = Auth::requireAuth();
    $userId = $payload['userId'] ?? null;

    if (!$userId) {
        Response::error('Geçersiz token', 'INVALID_TOKEN', 401);
    }

    // Action parametresini al (multipart/form-data veya JSON)
    $action = $_POST['action'] ?? $_POST_DATA['action'] ?? '';

    switch ($action) {
        case 'update-profile':
            handleUpdateProfile($db, $userId);
            break;

        case 'change-password':
            handleChangePassword($db, $userId);
            break;

        case 'update-notifications':
            handleUpdateNotifications($db, $userId);
            break;

        case 'upload-photo':
            handleUploadPhoto($db, $userId);
            break;

        default:
            Response::error('Geçersiz action parametresi', 'INVALID_ACTION', 400);
    }

} catch (Exception $e) {
    error_log('User settings error: ' . $e->getMessage());
    Response::error('Bir hata oluştu. Lütfen tekrar deneyin.', 'SERVER_ERROR', 500);
}

/**
 * Profil bilgilerini güncelle
 */
function handleUpdateProfile($db, $userId) {
    global $_POST_DATA;

    // Parametreleri al
    $name = $_POST_DATA['name'] ?? '';
    $phone = $_POST_DATA['phone'] ?? '';

    // Validasyon
    if (empty($name)) {
        Response::error('Ad soyad gerekli', 'VALIDATION_ERROR', 400);
    }

    // Kullanıcı bilgilerini güncelle
    $db->query(
        "UPDATE mobil_kullanici
         SET ad_soyad = ?,
             kullanici_telefon = ?,
             son_aktivite_tarihi = NOW()
         WHERE id = ?",
        [$name, $phone, $userId]
    );

    // Güncellenmiş kullanıcı bilgilerini getir
    $user = $db->fetchOne(
        "SELECT id, ad_soyad, kullanici_adi, kullanici_telefon, resim_yolu
         FROM mobil_kullanici
         WHERE id = ?",
        [$userId]
    );

    if (!$user) {
        Response::error('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
    }

    Response::success([
        'user' => [
            'name' => $user['ad_soyad'],
            'email' => $user['kullanici_adi'],
            'telefon' => $user['kullanici_telefon'] ?? '',
            'avatar' => $user['resim_yolu'],
        ]
    ], 'Profil bilgileriniz güncellendi');
}

/**
 * Şifreyi değiştir
 */
function handleChangePassword($db, $userId) {
    global $_POST_DATA;

    // Parametreleri al
    $currentPassword = $_POST_DATA['currentPassword'] ?? '';
    $newPassword = $_POST_DATA['newPassword'] ?? '';

    // Validasyon
    if (empty($currentPassword)) {
        Response::error('Mevcut şifre gerekli', 'VALIDATION_ERROR', 400);
    }

    if (empty($newPassword)) {
        Response::error('Yeni şifre gerekli', 'VALIDATION_ERROR', 400);
    }

    if (strlen($newPassword) < 6) {
        Response::error('Yeni şifre en az 6 karakter olmalı', 'VALIDATION_ERROR', 400);
    }

    // Kullanıcıyı getir
    $user = $db->fetchOne(
        "SELECT id, sifre FROM mobil_kullanici WHERE id = ?",
        [$userId]
    );

    if (!$user) {
        Response::error('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
    }

    // Mevcut şifreyi kontrol et
    if (!password_verify($currentPassword, $user['sifre'])) {
        Response::error('Mevcut şifre yanlış', 'INVALID_PASSWORD', 400);
    }

    // Yeni şifreyi hashle ve güncelle
    $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

    $db->query(
        "UPDATE mobil_kullanici
         SET sifre = ?,
             son_aktivite_tarihi = NOW()
         WHERE id = ?",
        [$hashedPassword, $userId]
    );

    Response::success(null, 'Şifreniz başarıyla güncellendi');
}

/**
 * Bildirim ayarlarını güncelle
 */
function handleUpdateNotifications($db, $userId) {
    global $_POST_DATA;

    // Parametreleri al
    $notificationSettings = $_POST_DATA['settings'] ?? [];

    // Kullanıcının mevcut yetkilerini getir
    $user = $db->fetchOne(
        "SELECT kullanici_yetkiler FROM mobil_kullanici WHERE id = ?",
        [$userId]
    );

    if (!$user) {
        Response::error('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
    }

    // Mevcut yetkileri decode et
    $yetkiler = [];
    if (!empty($user['kullanici_yetkiler'])) {
        $yetkiler = json_decode($user['kullanici_yetkiler'], true) ?? [];
    }

    // Bildirim ayarlarını güncelle
    $yetkiler['bildirim_ayarlari'] = $notificationSettings;

    // JSON'a encode et ve kaydet
    $yetkilerJson = json_encode($yetkiler, JSON_UNESCAPED_UNICODE);

    $db->query(
        "UPDATE mobil_kullanici
         SET kullanici_yetkiler = ?,
             son_aktivite_tarihi = NOW()
         WHERE id = ?",
        [$yetkilerJson, $userId]
    );

    Response::success([
        'settings' => $notificationSettings
    ], 'Bildirim ayarlarınız güncellendi');
}

/**
 * Profil fotoğrafı yükle
 */
function handleUploadPhoto($db, $userId) {
    // Dosya kontrolü
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        Response::error('Fotoğraf yüklenemedi', 'UPLOAD_ERROR', 400);
    }

    $file = $_FILES['photo'];

    // Dosya boyutu kontrolü (max 5MB)
    $maxSize = 5 * 1024 * 1024; // 5MB
    if ($file['size'] > $maxSize) {
        Response::error('Dosya boyutu çok büyük (max 5MB)', 'FILE_TOO_LARGE', 400);
    }

    // Dosya tipi kontrolü
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes)) {
        Response::error('Geçersiz dosya tipi. Sadece JPG, PNG, GIF, WEBP desteklenir', 'INVALID_FILE_TYPE', 400);
    }

    // Dosya uzantısını al
    $extension = '';
    switch ($mimeType) {
        case 'image/jpeg':
        case 'image/jpg':
            $extension = 'jpg';
            break;
        case 'image/png':
            $extension = 'png';
            break;
        case 'image/gif':
            $extension = 'gif';
            break;
        case 'image/webp':
            $extension = 'webp';
            break;
    }

    // 100 karakterlik random dosya adı oluştur
    $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $randomString = '';
    for ($i = 0; $i < 100; $i++) {
        $randomString .= $characters[random_int(0, strlen($characters) - 1)];
    }

    $fileName = $randomString . '.' . $extension;
    $uploadDir = __DIR__ . '/../uploads/profiles/';
    $filePath = $uploadDir . $fileName;

    // Eski profil fotoğrafını sil
    $user = $db->fetchOne(
        "SELECT resim_yolu FROM mobil_kullanici WHERE id = ?",
        [$userId]
    );

    if ($user && !empty($user['resim_yolu'])) {
        $oldFilePath = __DIR__ . '/../' . $user['resim_yolu'];
        if (file_exists($oldFilePath)) {
            unlink($oldFilePath);
        }
    }

    // Uploads dizininin var olduğundan emin ol
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Dosyayı kaydet
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        Response::error('Dosya kaydedilemedi', 'SAVE_ERROR', 500);
    }

    // Veritabanını güncelle
    $dbPath = 'uploads/profiles/' . $fileName;
    $db->query(
        "UPDATE mobil_kullanici SET resim_yolu = ? WHERE id = ?",
        [$dbPath, $userId]
    );

    Response::success([
        'photoUrl' => $dbPath,
        'fullUrl' => BASE_URL . '/' . $dbPath
    ], 'Profil fotoğrafı başarıyla yüklendi');
}
