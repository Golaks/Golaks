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
     *   "companyCode": "app",
     *   "email": "user@example.com",
     *   "password": "password123"
     * }
     */
    public function login() {
        // Validate required fields
        $this->validateRequired(['companyCode', 'email', 'password']);

        $companyCode = $this->requestData['companyCode'];
        $email = $this->requestData['email'];
        $password = $this->requestData['password'];

        try {
            // Get auth database connection
            $db = $this->getAuthDb();

            // Find user by email and company code
            $stmt = $db->prepare("
                SELECT u.*, t.id as tenant_id, t.subdomain, t.database_name, t.display_name as tenant_display_name
                FROM users u
                INNER JOIN tenants t ON u.tenant_id = t.id
                WHERE u.email = :email
                AND t.subdomain = :company_code
                AND u.status = 'active'
                LIMIT 1
            ");

            $stmt->execute([
                ':email' => $email,
                ':company_code' => $companyCode
            ]);

            $user = $stmt->fetch();

            // Check if user exists
            if (!$user) {
                $this->sendError(
                    'Geçersiz e-posta veya şirket kodu',
                    'INVALID_CREDENTIALS',
                    401
                );
            }

            // Verify password
            if (!password_verify($password, $user['password'])) {
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
                'email' => $user['email'],
                'tenant_id' => $user['tenant_id'],
                'subdomain' => $user['subdomain']
            ];

            $token = JWT::encode($payload, JWT_SECRET_KEY, JWT_EXPIRY);
            $refreshToken = JWT::encode($payload, JWT_SECRET_KEY, REFRESH_TOKEN_EXPIRY);

            // Update last login
            $updateStmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
            $updateStmt->execute([':id' => $user['id']]);

            // Prepare response
            $response = [
                'token' => $token,
                'refreshToken' => $refreshToken,
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ],
                'tenant' => [
                    'id' => $user['tenant_id'],
                    'subdomain' => $user['subdomain'],
                    'databaseName' => $user['database_name'],
                    'displayName' => $user['tenant_display_name']
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
     *   "email": "user@example.com"
     * }
     */
    public function forgotPassword() {
        $this->validateRequired(['email']);

        $email = $this->requestData['email'];

        // TODO: Generate password reset token
        // TODO: Send email with reset link

        $this->sendSuccess(null, 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
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
