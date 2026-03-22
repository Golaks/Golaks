<?php
/**
 * User Controller
 * Kullanıcı yönetimi işlemleri
 */

class UserController {
    /**
     * GET /user/list
     * Kullanıcı listesi (Admin/SuperAdmin)
     */
    public function getList() {
        // Token kontrolü
        $payload = Auth::requireAuth();
        $userId = $payload['user_id'] ?? null;

        if (!$userId) {
            Response::error('Geçersiz token', 'INVALID_TOKEN', 401);
        }

        try {
            $db = Database::getInstance();

            // Kullanıcının yetkisini ve firma bilgisini kontrol et
            $currentUser = $db->fetchOne(
                "SELECT kullanici_rol, mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            // Sadece admin ve super admin kullanıcı yönetimi yapabilir
            if (!$currentUser || $currentUser['kullanici_rol'] < 1) {
                Response::error('Bu işlem için yetkiniz yok', 'UNAUTHORIZED', 403);
            }

            $firmaId = $currentUser['mobil_firmalar_id'];

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

                $permissions = $yetkiler['uygulamalar'] ?? [];
                if (!is_array($permissions) || empty($permissions)) {
                    $permissions = new stdClass();
                }

                $subeYetkileri = $yetkiler['sube_yetkileri'] ?? [];
                $varsayilanSube = $yetkiler['varsayilan_sube'] ?? '';

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
                    'subeYetkileri' => $subeYetkileri,
                    'varsayilanSube' => $varsayilanSube,
                    'programYetkileri' => $yetkiler['program_yetkileri'] ?? null,
                    'barcodePermissions' => $yetkiler['barcode_permissions'] ?? null,
                ];
            }, $users);

            Response::success(['users' => $formattedUsers]);

        } catch (Exception $e) {
            error_log('User list error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /user/create
     * Yeni kullanıcı oluştur
     */
    public function create() {
        $payload = Auth::requireAuth();
        $userId = $payload['user_id'] ?? null;

        // Request body
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        try {
            $db = Database::getInstance();

            // Yetki kontrolü
            $currentUser = $db->fetchOne(
                "SELECT kullanici_rol, mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || $currentUser['kullanici_rol'] < 1) {
                Response::error('Bu işlem için yetkiniz yok', 'UNAUTHORIZED', 403);
            }

            $firmaId = $currentUser['mobil_firmalar_id'];
            $name = $data['name'] ?? '';
            $email = $data['email'] ?? '';
            $phone = $data['phone'] ?? '';
            $password = $data['password'] ?? '';
            $role = $data['role'] ?? 'user';
            $permissions = $data['permissions'] ?? [];
            $subeYetkileri = $data['subeYetkileri'] ?? [];
            $varsayilanSube = $data['varsayilanSube'] ?? '';

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

            // Email kontrolü
            $existingUser = $db->fetchOne(
                "SELECT id FROM mobil_kullanici WHERE kullanici_adi = ? AND mobil_firmalar_id = ?",
                [$email, $firmaId]
            );

            if ($existingUser) {
                Response::error('Bu e-posta adresi firmada zaten kullanılıyor', 'EMAIL_EXISTS', 400);
            }

            // Rol değerini belirle
            $roleValue = $role === 'superAdmin' ? 2 : ($role === 'admin' ? 1 : 0);
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

            // Yetkileri JSON olarak hazırla
            $yetkilerJson = json_encode([
                'uygulamalar' => $permissions,
                'sube_yetkileri' => array_values($subeYetkileri),
                'varsayilan_sube' => $varsayilanSube,
                'program_yetkileri' => new stdClass(),
            ], JSON_UNESCAPED_UNICODE);

            // Kullanıcıyı oluştur
            $db->execute(
                "INSERT INTO mobil_kullanici
                (mobil_firmalar_id, ad_soyad, kullanici_adi, kullanici_telefon, sifre, kullanici_rol, aktif, kullanici_yetkiler)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
                [$firmaId, $name, $email, $phone, $hashedPassword, $roleValue, $yetkilerJson]
            );

            Response::success(['message' => 'Kullanıcı başarıyla oluşturuldu']);

        } catch (Exception $e) {
            error_log('User create error: ' . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * PUT /user/update
     * Kullanıcı güncelle
     */
    public function update() {
        $payload = Auth::requireAuth();
        $userId = $payload['user_id'] ?? null;

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        try {
            $db = Database::getInstance();

            $currentUser = $db->fetchOne(
                "SELECT kullanici_rol, mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || $currentUser['kullanici_rol'] < 1) {
                Response::error('Bu işlem için yetkiniz yok', 'UNAUTHORIZED', 403);
            }

            $firmaId = $currentUser['mobil_firmalar_id'];
            $id = $data['id'] ?? '';
            $name = $data['name'] ?? '';
            $email = $data['email'] ?? '';
            $phone = $data['phone'] ?? '';
            $role = $data['role'] ?? 'user';
            $active = $data['active'] ?? true;
            $permissions = $data['permissions'] ?? [];
            $subeYetkileri = $data['subeYetkileri'] ?? null;
            $varsayilanSube = $data['varsayilanSube'] ?? null;
            $programYetkileri = $data['programYetkileri'] ?? null;
            $barcodePermissions = $data['barcodePermissions'] ?? null;
            $password = $data['password'] ?? '';

            // Validasyon
            if (empty($id) || empty($name) || empty($email)) {
                Response::error('Gerekli alanları doldurun', 'VALIDATION_ERROR', 400);
            }

            // Kullanıcının var olduğunu kontrol et
            $user = $db->fetchOne(
                "SELECT id FROM mobil_kullanici WHERE id = ? AND mobil_firmalar_id = ?",
                [$id, $firmaId]
            );

            if (!$user) {
                Response::error('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
            }

            // Email kontrolü
            $existingUser = $db->fetchOne(
                "SELECT id FROM mobil_kullanici WHERE kullanici_adi = ? AND id != ? AND mobil_firmalar_id = ?",
                [$email, $id, $firmaId]
            );

            if ($existingUser) {
                Response::error('Bu e-posta adresi zaten kullanılıyor', 'EMAIL_EXISTS', 400);
            }

            $roleValue = $role === 'superAdmin' ? 2 : ($role === 'admin' ? 1 : 0);
            $activeValue = $active ? 1 : 0;

            // Son aktif kullanıcı kontrolü
            if (!$active) {
                $activeUserCount = $db->fetchOne(
                    "SELECT COUNT(*) as count FROM mobil_kullanici WHERE mobil_firmalar_id = ? AND aktif = 1",
                    [$firmaId]
                );
                if ($activeUserCount['count'] <= 1) {
                    Response::error('Son aktif kullanıcı pasife alınamaz', 'LAST_ACTIVE_USER', 400);
                }
            }

            // Mevcut yetkileri oku (sube_yetkileri ve bildirim_ayarlari korunsun)
            $existingUser = $db->fetchOne(
                "SELECT kullanici_yetkiler FROM mobil_kullanici WHERE id = ?",
                [$id]
            );
            $mevcutYetkiler = [];
            if ($existingUser && !empty($existingUser['kullanici_yetkiler'])) {
                $mevcutYetkiler = json_decode($existingUser['kullanici_yetkiler'], true) ?? [];
            }

            $yeniYetkiler = [
                'uygulamalar' => $permissions,
                'sube_yetkileri' => $subeYetkileri !== null ? array_values($subeYetkileri) : ($mevcutYetkiler['sube_yetkileri'] ?? []),
                'varsayilan_sube' => $varsayilanSube !== null ? $varsayilanSube : ($mevcutYetkiler['varsayilan_sube'] ?? ''),
                'bildirim_ayarlari' => $mevcutYetkiler['bildirim_ayarlari'] ?? [],
                'program_yetkileri' => $programYetkileri !== null ? $programYetkileri : ($mevcutYetkiler['program_yetkileri'] ?? new stdClass()),
                'barcode_permissions' => $barcodePermissions !== null ? $barcodePermissions : ($mevcutYetkiler['barcode_permissions'] ?? null),
            ];
            $yetkilerJson = json_encode($yeniYetkiler, JSON_UNESCAPED_UNICODE);

            // Şifre güncellemesi var mı?
            if (!empty($password)) {
                if (strlen($password) < 6) {
                    Response::error('Şifre en az 6 karakter olmalı', 'VALIDATION_ERROR', 400);
                }
                $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                $db->execute(
                    "UPDATE mobil_kullanici
                     SET ad_soyad = ?, kullanici_adi = ?, kullanici_telefon = ?,
                         sifre = ?, kullanici_rol = ?, aktif = ?, kullanici_yetkiler = ?
                     WHERE id = ?",
                    [$name, $email, $phone, $hashedPassword, $roleValue, $activeValue, $yetkilerJson, $id]
                );
            } else {
                $db->execute(
                    "UPDATE mobil_kullanici
                     SET ad_soyad = ?, kullanici_adi = ?, kullanici_telefon = ?,
                         kullanici_rol = ?, aktif = ?, kullanici_yetkiler = ?
                     WHERE id = ?",
                    [$name, $email, $phone, $roleValue, $activeValue, $yetkilerJson, $id]
                );
            }

            Response::success(['message' => 'Kullanıcı başarıyla güncellendi']);

        } catch (Exception $e) {
            error_log('User update error: ' . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * DELETE /user/delete
     * Kullanıcı sil
     */
    public function delete() {
        $payload = Auth::requireAuth();
        $userId = $payload['user_id'] ?? null;

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        try {
            $db = Database::getInstance();

            $currentUser = $db->fetchOne(
                "SELECT kullanici_rol, mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || $currentUser['kullanici_rol'] < 1) {
                Response::error('Bu işlem için yetkiniz yok', 'UNAUTHORIZED', 403);
            }

            $firmaId = $currentUser['mobil_firmalar_id'];
            $deleteUserId = $data['user_id'] ?? '';

            if (empty($deleteUserId)) {
                Response::error('Kullanıcı ID gerekli', 'VALIDATION_ERROR', 400);
            }

            // Kullanıcının var olduğunu kontrol et
            $user = $db->fetchOne(
                "SELECT id FROM mobil_kullanici WHERE id = ? AND mobil_firmalar_id = ?",
                [$deleteUserId, $firmaId]
            );

            if (!$user) {
                Response::error('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
            }

            // Son kullanıcı kontrolü
            $userCount = $db->fetchOne(
                "SELECT COUNT(*) as count FROM mobil_kullanici WHERE mobil_firmalar_id = ?",
                [$firmaId]
            );
            if ($userCount['count'] <= 1) {
                Response::error('Son kullanıcı silinemez', 'LAST_USER', 400);
            }

            // Kullanıcıyı sil
            $db->execute(
                "DELETE FROM mobil_kullanici WHERE id = ?",
                [$deleteUserId]
            );

            Response::success(['message' => 'Kullanıcı başarıyla silindi']);

        } catch (Exception $e) {
            error_log('User delete error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * GET /user/profile
     * Kullanıcının kendi profil bilgilerini getir
     */
    public function profile() {
        $payload = Auth::requireAuth();
        $userId = $payload['user_id'] ?? null;

        if (!$userId) {
            Response::error('Geçersiz token', 'INVALID_TOKEN', 401);
        }

        try {
            $db = Database::getInstance();

            $user = $db->fetchOne(
                "SELECT id, ad_soyad, kullanici_adi, kullanici_telefon, resim_yolu,
                        kullanici_rol, kullanici_yetkiler
                 FROM mobil_kullanici
                 WHERE id = ?",
                [$userId]
            );

            if (!$user) {
                Response::error('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
            }

            $yetkiler = [];
            if (!empty($user['kullanici_yetkiler'])) {
                $yetkiler = json_decode($user['kullanici_yetkiler'], true) ?? [];
            }

            Response::success([
                'user' => [
                    'id' => (string)$user['id'],
                    'name' => $user['ad_soyad'],
                    'email' => $user['kullanici_adi'],
                    'phone' => $user['kullanici_telefon'] ?? '',
                    'avatar' => $user['resim_yolu'],
                    'role' => $user['kullanici_rol'] == 2 ? 'superAdmin' : ($user['kullanici_rol'] == 1 ? 'admin' : 'user'),
                    'permissions' => $yetkiler['uygulamalar'] ?? [],
                    'notificationSettings' => $yetkiler['bildirim_ayarlari'] ?? [],
                ]
            ]);

        } catch (Exception $e) {
            error_log('User profile error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * PUT /user/profile
     * Kullanıcının kendi profil bilgilerini güncelle
     */
    public function updateProfile() {
        $payload = Auth::requireAuth();
        $userId = $payload['user_id'] ?? null;

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        try {
            $db = Database::getInstance();

            $name = $data['name'] ?? '';
            $phone = $data['phone'] ?? '';
            $yetkilerUpdate = $data['yetkiler'] ?? null;

            // Eğer sadece yetkiler güncelleniyorsa (ekran ayarları vb.)
            if ($yetkilerUpdate !== null && empty($name)) {
                $user = $db->fetchOne(
                    "SELECT kullanici_yetkiler FROM mobil_kullanici WHERE id = ?",
                    [$userId]
                );
                $mevcutYetkiler = [];
                if ($user && !empty($user['kullanici_yetkiler'])) {
                    $mevcutYetkiler = json_decode($user['kullanici_yetkiler'], true) ?? [];
                }
                $mevcutYetkiler = array_merge($mevcutYetkiler, $yetkilerUpdate);
                $yetkilerJson = json_encode($mevcutYetkiler, JSON_UNESCAPED_UNICODE);

                $db->execute(
                    "UPDATE mobil_kullanici
                     SET kullanici_yetkiler = ?,
                         son_aktivite_tarihi = NOW()
                     WHERE id = ?",
                    [$yetkilerJson, $userId]
                );

                Response::success(['message' => 'Ayarlar güncellendi']);
                return;
            }

            // Validasyon
            if (empty($name)) {
                Response::error('Ad soyad gerekli', 'VALIDATION_ERROR', 400);
            }

            // Kullanıcı bilgilerini güncelle
            if ($yetkilerUpdate !== null) {
                $userRow = $db->fetchOne(
                    "SELECT kullanici_yetkiler FROM mobil_kullanici WHERE id = ?",
                    [$userId]
                );
                $mevcutYetkiler = [];
                if ($userRow && !empty($userRow['kullanici_yetkiler'])) {
                    $mevcutYetkiler = json_decode($userRow['kullanici_yetkiler'], true) ?? [];
                }
                $mevcutYetkiler = array_merge($mevcutYetkiler, $yetkilerUpdate);
                $yetkilerJson = json_encode($mevcutYetkiler, JSON_UNESCAPED_UNICODE);

                $db->execute(
                    "UPDATE mobil_kullanici
                     SET ad_soyad = ?,
                         kullanici_telefon = ?,
                         kullanici_yetkiler = ?,
                         son_aktivite_tarihi = NOW()
                     WHERE id = ?",
                    [$name, $phone, $yetkilerJson, $userId]
                );
            } else {
                $db->execute(
                    "UPDATE mobil_kullanici
                     SET ad_soyad = ?,
                         kullanici_telefon = ?,
                         son_aktivite_tarihi = NOW()
                     WHERE id = ?",
                    [$name, $phone, $userId]
                );
            }

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
                    'phone' => $user['kullanici_telefon'] ?? '',
                    'avatar' => $user['resim_yolu'],
                ],
                'message' => 'Profil bilgileriniz güncellendi'
            ]);

        } catch (Exception $e) {
            error_log('Update profile error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * PUT /user/change-password
     * Kullanıcının kendi şifresini değiştir
     */
    public function changePassword() {
        $payload = Auth::requireAuth();
        $userId = $payload['user_id'] ?? null;

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        try {
            $db = Database::getInstance();

            $currentPassword = $data['currentPassword'] ?? '';
            $newPassword = $data['newPassword'] ?? '';

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

            $db->execute(
                "UPDATE mobil_kullanici
                 SET sifre = ?,
                     son_aktivite_tarihi = NOW()
                 WHERE id = ?",
                [$hashedPassword, $userId]
            );

            Response::success(['message' => 'Şifreniz başarıyla güncellendi']);

        } catch (Exception $e) {
            error_log('Change password error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * PUT /user/notifications
     * Bildirim ayarlarını güncelle
     */
    public function updateNotifications() {
        $payload = Auth::requireAuth();
        $userId = $payload['user_id'] ?? null;

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        try {
            $db = Database::getInstance();

            $notificationSettings = $data['settings'] ?? [];

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

            $db->execute(
                "UPDATE mobil_kullanici
                 SET kullanici_yetkiler = ?,
                     son_aktivite_tarihi = NOW()
                 WHERE id = ?",
                [$yetkilerJson, $userId]
            );

            Response::success([
                'settings' => $notificationSettings,
                'message' => 'Bildirim ayarlarınız güncellendi'
            ]);

        } catch (Exception $e) {
            error_log('Update notifications error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * GET /user/subeler
     * Firmanın şube listesini getir (tenant DB'den)
     */
    public function getSubeler() {
        $payload = Auth::requireAuth();
        $userId = $payload['user_id'] ?? null;

        if (!$userId) {
            Response::error('Geçersiz token', 'INVALID_TOKEN', 401);
        }

        try {
            $db = Database::getInstance();

            $currentUser = $db->fetchOne(
                "SELECT kullanici_rol, mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || $currentUser['kullanici_rol'] < 1) {
                Response::error('Bu işlem için yetkiniz yok', 'UNAUTHORIZED', 403);
            }

            $firmaId = $currentUser['mobil_firmalar_id'];

            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );

            if (!$firma || empty($firma['firma_ayarlar'])) {
                Response::error('Firma ayarları bulunamadı', 'FIRMA_SETTINGS_NOT_FOUND', 404);
            }

            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];
            $veritabani = $firmaAyarlar['veritabani'] ?? [];
            $dbServer = $veritabani['sunucu'] ?? '';
            $dbPort = (int)($veritabani['port'] ?? 3306);
            $dbUser = $veritabani['kullanici'] ?? '';
            $dbPass = $veritabani['sifre'] ?? '';
            $dbName = $veritabani['veriAdi'] ?? '';

            if (empty($dbServer) || empty($dbUser) || empty($dbName)) {
                Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            }

            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Kullanıcının varsayılan şubesini al
            $userInfo = $db->fetchOne(
                "SELECT kullanici_yetkiler FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );
            $yetkiler = [];
            if (!empty($userInfo['kullanici_yetkiler'])) {
                $yetkiler = json_decode($userInfo['kullanici_yetkiler'], true) ?? [];
            }
            $varsayilanSube = $yetkiler['varsayilan_sube'] ?? '';
            $subeYetkileri = $yetkiler['sube_yetkileri'] ?? [];

            // Şube listesini al
            $stmt = $pdo->prepare("SELECT id, sube_adi FROM subeler WHERE firma_id = ? AND aktif = 1 ORDER BY sube_adi");
            $stmt->execute([$firmaId]);
            $subeler = $stmt->fetchAll();

            // Kullanıcının yetkili olduğu şubeleri filtrele
            $formattedSubeler = [];
            foreach ($subeler as $sube) {
                if (empty($subeYetkileri) || in_array((string)$sube['id'], $subeYetkileri)) {
                    $formattedSubeler[] = [
                        'id' => (string)$sube['id'],
                        'name' => $sube['sube_adi'],
                    ];
                }
            }

            Response::success([
                'subeler' => $formattedSubeler,
                'varsayilanSube' => $varsayilanSube,
            ]);

        } catch (PDOException $e) {
            error_log('Get subeler DB error: ' . $e->getMessage());
            Response::error('Veritabanı hatası', 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log('Get subeler error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /user/upload-photo
     * Profil fotoğrafı yükle
     */
    public function uploadPhoto() {
        $payload = Auth::requireAuth();
        $userId = $payload['user_id'] ?? null;

        try {
            $db = Database::getInstance();

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
            $db->execute(
                "UPDATE mobil_kullanici SET resim_yolu = ? WHERE id = ?",
                [$dbPath, $userId]
            );

            Response::success([
                'photoUrl' => $dbPath,
                'fullUrl' => BASE_URL . '/' . $dbPath,
                'message' => 'Profil fotoğrafı başarıyla yüklendi'
            ]);

        } catch (Exception $e) {
            error_log('Upload photo error: ' . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }
}
