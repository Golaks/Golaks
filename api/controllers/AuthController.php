<?php
/**
 * Authentication Controller
 * Handles user authentication and token management
 */

require_once __DIR__ . '/BaseController.php';

class AuthController extends BaseController {

    /**
     * Login
     * POST /api/auth/login
     *
     * Request Body:
     * {
     *   "email": "kullanici_adi",
     *   "password": "password123"
     * }
     */
    public function login() {
        // Validate required fields
        $this->validateRequired(['email', 'password']);

        $kullaniciAdi = $this->requestData['email'];
        $password = $this->requestData['password'];

        try {
            // Get auth database connection
            $db = $this->getAuthDb();

            // Find user by kullanici_adi with firma bilgileri
            $stmt = $db->prepare("
                SELECT
                    u.*,
                    f.id as firma_id,
                    f.firma_unvani,
                    f.firma_ayarlar,
                    f.aktif as firma_aktif
                FROM mobil_kullanici u
                INNER JOIN mobil_firmalar f ON u.mobil_firmalar_id = f.id
                WHERE u.kullanici_adi = :kullanici_adi
                AND u.aktif = 1
                AND f.aktif = 1
                LIMIT 1
            ");

            $stmt->execute([
                ':kullanici_adi' => $kullaniciAdi
            ]);

            $user = $stmt->fetch();

            // Check if user exists
            if (!$user) {
                $this->sendError(
                    'Geçersiz kullanıcı adı',
                    'INVALID_CREDENTIALS',
                    401
                );
            }

            // Verify password
            if (!password_verify($password, $user['sifre'])) {
                $this->sendError(
                    'Geçersiz şifre',
                    'INVALID_CREDENTIALS',
                    401
                );
            }

            // Generate JWT tokens
            require_once UTILS_PATH . '/JWT.php';

            $payload = [
                'user_id' => $user['id'],
                'kullanici_adi' => $user['kullanici_adi'],
                'firma_id' => $user['mobil_firmalar_id']
            ];

            $token = JWT::encode($payload, JWT_SECRET_KEY, JWT_EXPIRY);
            $refreshToken = JWT::encode($payload, JWT_SECRET_KEY, REFRESH_TOKEN_EXPIRY);

            // Update last login
            $updateStmt = $db->prepare("UPDATE mobil_kullanici SET son_giris_tarihi = NOW() WHERE id = :id");
            $updateStmt->execute([':id' => $user['id']]);

            // Parse firma_ayarlar JSON
            $firmaAyarlar = json_decode($user['firma_ayarlar'], true) ?? [];

            // Şirket DB'den ERP firma_id'yi al
            $erpFirmaId = null;
            $veritabani = $firmaAyarlar['veritabani'] ?? [];
            if (!empty($veritabani['sunucu']) && !empty($veritabani['veriAdi'])) {
                try {
                    $dsn = "mysql:host={$veritabani['sunucu']};port=" . ($veritabani['port'] ?? 3306) . ";dbname={$veritabani['veriAdi']};charset=utf8mb4";
                    $companyPdo = new PDO($dsn, $veritabani['kullanici'] ?? '', $veritabani['sifre'] ?? '', [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                    ]);
                    $erpStmt = $companyPdo->prepare("SELECT firma_id FROM kullanicilar WHERE kullanici_adi = :kullaniciAdi LIMIT 1");
                    $erpStmt->execute([':kullaniciAdi' => $user['kullanici_adi']]);
                    $erpUser = $erpStmt->fetch();
                    if ($erpUser) {
                        $erpFirmaId = (int)$erpUser['firma_id'];
                    }
                } catch (Exception $e) {
                    error_log("ERP firma_id fetch error: " . $e->getMessage());
                }
            }

            // Prepare response
            $response = [
                'token' => $token,
                'refreshToken' => $refreshToken,
                'user' => [
                    'id' => $user['id'],
                    'firma_id' => $user['firma_id'],
                    'firma_unvani' => $user['firma_unvani'],
                    'name' => $user['ad_soyad'],
                    'email' => $user['kullanici_adi'],
                    'telefon' => $user['kullanici_telefon'],
                    'avatar' => $user['resim_yolu'],
                    'bildirimler' => $user['bildirimler'],
                    'yetkiler' => json_decode($user['kullanici_yetkiler'], true) ?? [],
                    'kullanici_rol' => $user['kullanici_rol'],
                    'role' => $user['kullanici_rol'], // Frontend mapping yapacak
                    'erp_firma_id' => $erpFirmaId,
                    'firmaAyarlar' => $firmaAyarlar,
                    'mobilDataVersiyon' => '1.0.0',
                    'mobilResim' => $user['resim_yolu'],
                    'resimDomain' => BASE_URL
                ]
            ];

            $this->sendSuccess($response, 'Giriş başarılı');

        } catch (PDOException $e) {
            $this->sendError(
                'Veritabanı hatası: ' . $e->getMessage(),
                'DATABASE_ERROR',
                500
            );
        } catch (Exception $e) {
            $this->sendError(
                'Bir hata oluştu: ' . $e->getMessage(),
                'SERVER_ERROR',
                500
            );
        }
    }

    /**
     * Logout
     * POST /api/auth/logout
     */
    public function logout() {
        $payload = $this->verifyToken();

        // TODO: Implement token blacklist if needed

        $this->sendSuccess(null, 'Çıkış başarılı');
    }

    /**
     * Refresh Token
     * POST /api/auth/refresh
     *
     * Request Body:
     * {
     *   "refreshToken": "..."
     * }
     */
    public function refresh() {
        $this->validateRequired(['refreshToken']);

        try {
            require_once UTILS_PATH . '/JWT.php';

            $refreshToken = $this->requestData['refreshToken'];
            $payload = JWT::decode($refreshToken, JWT_SECRET_KEY);

            if (!$payload) {
                $this->sendError(
                    'Geçersiz refresh token',
                    'INVALID_TOKEN',
                    401
                );
            }

            // Generate new access token
            $newTokenPayload = [
                'user_id' => $payload['user_id'],
                'email' => $payload['email'],
                'tenant_id' => $payload['tenant_id'],
                'subdomain' => $payload['subdomain']
            ];

            $newToken = JWT::encode($newTokenPayload, JWT_SECRET_KEY, JWT_EXPIRY);

            $this->sendSuccess([
                'token' => $newToken
            ], 'Token yenilendi');

        } catch (Exception $e) {
            $this->sendError(
                'Token yenileme hatası',
                'TOKEN_REFRESH_ERROR',
                401
            );
        }
    }

    /**
     * Forgot Password
     * POST /api/auth/forgot-password
     *
     * Request Body:
     * {
     *   "action": "request|verify|reset",
     *   "email": "kullanici_adi",
     *   "code": "123456",    // for verify & reset
     *   "newPassword": "..." // for reset
     * }
     */
    public function forgotPassword() {
        $action = $this->requestData['action'] ?? 'request';

        try {
            $db = $this->getAuthDb();

            if ($action === 'request') {
                // Step 1: Generate and send verification code
                $this->validateRequired(['email']);
                $kullaniciAdi = $this->requestData['email'];

                // Check if user exists
                $stmt = $db->prepare("SELECT id, ad_soyad FROM mobil_kullanici WHERE kullanici_adi = :kullanici_adi LIMIT 1");
                $stmt->execute([':kullanici_adi' => $kullaniciAdi]);
                $user = $stmt->fetch();

                if (!$user) {
                    $this->sendError('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
                }

                // Generate 6-digit code
                $code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
                $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

                // Save to database
                $updateStmt = $db->prepare("
                    UPDATE mobil_kullanici
                    SET sifre_sifirlama_token = :token,
                        sifre_sifirlama_token_sure = :expiry
                    WHERE id = :id
                ");
                $updateStmt->execute([
                    ':token' => $code,
                    ':expiry' => $expiry,
                    ':id' => $user['id']
                ]);

                // Send Email
                require_once UTILS_PATH . '/Email.php';
                $emailResult = Email::sendPasswordResetCode($kullaniciAdi, $user['ad_soyad'], $code);

                if ($emailResult['success']) {
                    $this->sendSuccess(null, 'Doğrulama kodu e-posta adresinize gönderildi');
                } else {
                    $this->sendError(
                        'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.',
                        'EMAIL_SEND_FAILED',
                        500
                    );
                }

            } elseif ($action === 'verify') {
                // Step 2: Verify code
                $this->validateRequired(['email', 'code']);
                $kullaniciAdi = $this->requestData['email'];
                $code = $this->requestData['code'];

                $stmt = $db->prepare("
                    SELECT id FROM mobil_kullanici
                    WHERE kullanici_adi = :kullanici_adi
                    AND sifre_sifirlama_token = :code
                    AND sifre_sifirlama_token_sure > NOW()
                    LIMIT 1
                ");
                $stmt->execute([
                    ':kullanici_adi' => $kullaniciAdi,
                    ':code' => $code
                ]);
                $user = $stmt->fetch();

                if (!$user) {
                    $this->sendError('Geçersiz veya süresi dolmuş kod', 'INVALID_CODE', 400);
                }

                $this->sendSuccess(null, 'Kod doğrulandı');

            } elseif ($action === 'reset') {
                // Step 3: Reset password
                $this->validateRequired(['email', 'code', 'newPassword']);
                $kullaniciAdi = $this->requestData['email'];
                $code = $this->requestData['code'];
                $newPassword = $this->requestData['newPassword'];

                $stmt = $db->prepare("
                    SELECT id FROM mobil_kullanici
                    WHERE kullanici_adi = :kullanici_adi
                    AND sifre_sifirlama_token = :code
                    AND sifre_sifirlama_token_sure > NOW()
                    LIMIT 1
                ");
                $stmt->execute([
                    ':kullanici_adi' => $kullaniciAdi,
                    ':code' => $code
                ]);
                $user = $stmt->fetch();

                if (!$user) {
                    $this->sendError('Geçersiz veya süresi dolmuş kod', 'INVALID_CODE', 400);
                }

                // Update password
                $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
                $updateStmt = $db->prepare("
                    UPDATE mobil_kullanici
                    SET sifre = :sifre,
                        sifre_sifirlama_token = NULL,
                        sifre_sifirlama_token_sure = NULL,
                        son_sifre_degisim_tarihi = NOW()
                    WHERE id = :id
                ");
                $updateStmt->execute([
                    ':sifre' => $hashedPassword,
                    ':id' => $user['id']
                ]);

                $this->sendSuccess(null, 'Şifreniz başarıyla değiştirildi');
            } else {
                $this->sendError('Geçersiz action parametresi', 'INVALID_ACTION', 400);
            }

        } catch (PDOException $e) {
            $this->sendError('Veritabanı hatası: ' . $e->getMessage(), 'DATABASE_ERROR', 500);
        } catch (Exception $e) {
            $this->sendError('Bir hata oluştu: ' . $e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * Reset Password
     * POST /api/auth/reset-password
     *
     * Request Body:
     * {
     *   "token": "reset_token",
     *   "password": "new_password"
     * }
     */
    public function resetPassword() {
        $this->validateRequired(['token', 'password']);

        // TODO: Verify reset token
        // TODO: Update password

        $this->sendSuccess(null, 'Şifreniz başarıyla güncellendi');
    }

    /**
     * Get Current User Profile
     * GET /api/auth/profile
     */
    public function profile() {
        $payload = $this->verifyToken();

        try {
            $db = $this->getAuthDb();

            $stmt = $db->prepare("
                SELECT u.id, u.name, u.email, u.role, u.created_at, u.last_login,
                       t.subdomain, t.display_name as tenant_display_name
                FROM users u
                INNER JOIN tenants t ON u.tenant_id = t.id
                WHERE u.id = :user_id
                LIMIT 1
            ");

            $stmt->execute([':user_id' => $payload['user_id']]);
            $user = $stmt->fetch();

            if (!$user) {
                $this->sendError('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
            }

            $response = [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'createdAt' => $user['created_at'],
                'lastLogin' => $user['last_login'],
                'tenant' => [
                    'subdomain' => $user['subdomain'],
                    'displayName' => $user['tenant_display_name']
                ]
            ];

            $this->sendSuccess($response);

        } catch (Exception $e) {
            $this->sendError('Profil bilgileri alınamadı', 'PROFILE_ERROR', 500);
        }
    }
}
