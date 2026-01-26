<?php
/**
 * User Management Endpoint
 * Kullanıcı yönetimi işlemleri (list, create, update, delete)
 */

header('Content-Type: application/json; charset=UTF-8');

// Sadece GET ve POST metoduna izin ver
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST', 'DELETE'])) {
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

    // Kullanıcının yetkisini ve firma bilgisini kontrol et
    $currentUser = $db->fetchOne(
        "SELECT kullanici_rol, mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
        [$userId]
    );

    // Sadece admin ve super admin kullanıcı yönetimi yapabilir (rol: 1 veya 2)
    if (!$currentUser || $currentUser['kullanici_rol'] < 1) {
        Response::error('Bu işlem için yetkiniz yok', 'UNAUTHORIZED', 403);
    }

    // Kullanıcının firma ID'sini global değişkene kaydet
    $GLOBALS['current_user_firma_id'] = $currentUser['mobil_firmalar_id'];

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            handleGetUsers($db);
            break;

        case 'POST':
            $action = $_POST_DATA['action'] ?? 'create';
            if ($action === 'update') {
                handleUpdateUser($db);
            } else {
                handleCreateUser($db);
            }
            break;

        case 'DELETE':
            handleDeleteUser($db);
            break;
    }

} catch (Exception $e) {
    error_log('User management error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Response::error('Bir hata oluştu. Lütfen tekrar deneyin.', 'SERVER_ERROR', 500);
}

/**
 * Kullanıcı listesini getir
 */
function handleGetUsers($db) {
    $firmaId = $GLOBALS['current_user_firma_id'];

    $users = $db->fetchAll(
        "SELECT
            id,
            ad_soyad,
            kullanici_adi,
            kullanici_telefon,
            kullanici_rol,
            aktif,
            resim_yolu,
            son_giris_tarihi,
            kullanici_yetkiler
         FROM mobil_kullanici
         WHERE mobil_firmalar_id = ?
         ORDER BY id DESC",
        [$firmaId]
    );

    $formattedUsers = array_map(function($user) {
        $yetkiler = [];
        if (!empty($user['kullanici_yetkiler'])) {
            $yetkiler = json_decode($user['kullanici_yetkiler'], true) ?? [];
        }

        // Ensure permissions is always an object, not an array
        $permissions = $yetkiler['uygulamalar'] ?? [];
        if (!is_array($permissions) || empty($permissions)) {
            $permissions = new stdClass(); // Empty object for JSON
        }

        return [
            'id' => (string)$user['id'],
            'name' => $user['ad_soyad'],
            'email' => $user['kullanici_adi'],
            'phone' => $user['kullanici_telefon'] ?? '',
            'role' => $user['kullanici_rol'] == 2 ? 'superAdmin' : ($user['kullanici_rol'] == 1 ? 'admin' : 'user'),
            'active' => $user['aktif'] == 1,
            'avatar' => $user['resim_yolu'] ?? null,
            'lastLogin' => $user['son_giris_tarihi'] ?? null,
            'permissions' => $permissions,
        ];
    }, $users);

    Response::success([
        'users' => $formattedUsers
    ]);
}

/**
 * Yeni kullanıcı oluştur
 */
function handleCreateUser($db) {
    global $_POST_DATA;

    $firmaId = $GLOBALS['current_user_firma_id'];
    $name = $_POST_DATA['name'] ?? '';
    $email = $_POST_DATA['email'] ?? '';
    $phone = $_POST_DATA['phone'] ?? '';
    $password = $_POST_DATA['password'] ?? '';
    $role = $_POST_DATA['role'] ?? 'user';
    $permissions = $_POST_DATA['permissions'] ?? [];

    // Validasyon
    if (empty($name)) {
        Response::error('Ad soyad gerekli', 'VALIDATION_ERROR', 400);
    }

    if (empty($email)) {
        Response::error('E-posta gerekli', 'VALIDATION_ERROR', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Response::error('Geçerli bir e-posta adresi giriniz', 'VALIDATION_ERROR', 400);
    }

    if (empty($password)) {
        Response::error('Şifre gerekli', 'VALIDATION_ERROR', 400);
    }

    if (strlen($password) < 6) {
        Response::error('Şifre en az 6 karakter olmalı', 'VALIDATION_ERROR', 400);
    }

    // Email kontrolü (aynı firma içinde)
    $existingUser = $db->fetchOne(
        "SELECT id FROM mobil_kullanici WHERE kullanici_adi = ? AND mobil_firmalar_id = ?",
        [$email, $firmaId]
    );

    if ($existingUser) {
        Response::error('Bu e-posta adresi firmada zaten kullanılıyor', 'EMAIL_EXISTS', 400);
    }

    // Rol değerini belirle
    $roleValue = $role === 'superAdmin' ? 2 : ($role === 'admin' ? 1 : 0);

    // Şifreyi hashle
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    // Yetkileri JSON olarak hazırla
    $yetkilerJson = json_encode([
        'uygulamalar' => $permissions
    ], JSON_UNESCAPED_UNICODE);

    // Kullanıcıyı oluştur
    $db->execute(
        "INSERT INTO mobil_kullanici
        (mobil_firmalar_id, ad_soyad, kullanici_adi, kullanici_telefon, sifre, kullanici_rol, aktif, kullanici_yetkiler)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
        [$firmaId, $name, $email, $phone, $hashedPassword, $roleValue, $yetkilerJson]
    );

    Response::success([
        'message' => 'Kullanıcı başarıyla oluşturuldu'
    ]);
}

/**
 * Kullanıcı bilgilerini güncelle
 */
function handleUpdateUser($db) {
    global $_POST_DATA;

    $firmaId = $GLOBALS['current_user_firma_id'];
    $id = $_POST_DATA['id'] ?? '';
    $name = $_POST_DATA['name'] ?? '';
    $email = $_POST_DATA['email'] ?? '';
    $phone = $_POST_DATA['phone'] ?? '';
    $role = $_POST_DATA['role'] ?? 'user';
    $active = $_POST_DATA['active'] ?? true;
    $permissions = $_POST_DATA['permissions'] ?? [];
    $password = $_POST_DATA['password'] ?? '';

    // Validasyon
    if (empty($id)) {
        Response::error('Kullanıcı ID gerekli', 'VALIDATION_ERROR', 400);
    }

    if (empty($name)) {
        Response::error('Ad soyad gerekli', 'VALIDATION_ERROR', 400);
    }

    if (empty($email)) {
        Response::error('E-posta gerekli', 'VALIDATION_ERROR', 400);
    }

    // Kullanıcının var olduğunu ve aynı firmadan olduğunu kontrol et
    $user = $db->fetchOne(
        "SELECT id FROM mobil_kullanici WHERE id = ? AND mobil_firmalar_id = ?",
        [$id, $firmaId]
    );

    if (!$user) {
        Response::error('Kullanıcı bulunamadı veya erişim yetkiniz yok', 'USER_NOT_FOUND', 404);
    }

    // Email başka kullanıcıda var mı kontrol et (aynı firma içinde)
    $existingUser = $db->fetchOne(
        "SELECT id FROM mobil_kullanici WHERE kullanici_adi = ? AND id != ? AND mobil_firmalar_id = ?",
        [$email, $id, $firmaId]
    );

    if ($existingUser) {
        Response::error('Bu e-posta adresi firmada zaten kullanılıyor', 'EMAIL_EXISTS', 400);
    }

    // Rol değerini belirle
    $roleValue = $role === 'superAdmin' ? 2 : ($role === 'admin' ? 1 : 0);
    $activeValue = $active ? 1 : 0;

    // Son aktif kullanıcı pasife alınamaz kontrolü
    if (!$active) {
        $activeUserCount = $db->fetchOne(
            "SELECT COUNT(*) as count FROM mobil_kullanici WHERE mobil_firmalar_id = ? AND aktif = 1",
            [$firmaId]
        );
        if ($activeUserCount['count'] <= 1) {
            Response::error('Firmadaki son aktif kullanıcı pasife alınamaz', 'LAST_ACTIVE_USER', 400);
        }
    }

    // Yetkileri JSON olarak hazırla
    $yetkilerJson = json_encode([
        'uygulamalar' => $permissions
    ], JSON_UNESCAPED_UNICODE);

    // Şifre güncellemesi var mı?
    if (!empty($password)) {
        if (strlen($password) < 6) {
            Response::error('Şifre en az 6 karakter olmalı', 'VALIDATION_ERROR', 400);
        }
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $db->execute(
            "UPDATE mobil_kullanici
             SET ad_soyad = ?,
                 kullanici_adi = ?,
                 kullanici_telefon = ?,
                 sifre = ?,
                 kullanici_rol = ?,
                 aktif = ?,
                 kullanici_yetkiler = ?
             WHERE id = ?",
            [$name, $email, $phone, $hashedPassword, $roleValue, $activeValue, $yetkilerJson, $id]
        );
    } else {
        $db->execute(
            "UPDATE mobil_kullanici
             SET ad_soyad = ?,
                 kullanici_adi = ?,
                 kullanici_telefon = ?,
                 kullanici_rol = ?,
                 aktif = ?,
                 kullanici_yetkiler = ?
             WHERE id = ?",
            [$name, $email, $phone, $roleValue, $activeValue, $yetkilerJson, $id]
        );
    }

    Response::success([
        'message' => 'Kullanıcı başarıyla güncellendi'
    ]);
}

/**
 * Kullanıcıyı sil
 */
function handleDeleteUser($db) {
    $firmaId = $GLOBALS['current_user_firma_id'];
    $userId = $_GET['user_id'] ?? '';

    if (empty($userId)) {
        Response::error('Kullanıcı ID gerekli', 'VALIDATION_ERROR', 400);
    }

    // Kullanıcının var olduğunu ve aynı firmadan olduğunu kontrol et
    $user = $db->fetchOne(
        "SELECT id FROM mobil_kullanici WHERE id = ? AND mobil_firmalar_id = ?",
        [$userId, $firmaId]
    );

    if (!$user) {
        Response::error('Kullanıcı bulunamadı veya erişim yetkiniz yok', 'USER_NOT_FOUND', 404);
    }

    // Firmadaki toplam kullanıcı sayısını kontrol et (son kullanıcı silinemesin)
    $userCount = $db->fetchOne(
        "SELECT COUNT(*) as count FROM mobil_kullanici WHERE mobil_firmalar_id = ?",
        [$firmaId]
    );
    if ($userCount['count'] <= 1) {
        Response::error('Firmadaki son kullanıcı silinemez', 'LAST_USER', 400);
    }

    // Kullanıcıyı sil
    $db->execute(
        "DELETE FROM mobil_kullanici WHERE id = ?",
        [$userId]
    );

    Response::success([
        'message' => 'Kullanıcı başarıyla silindi'
    ]);
}
