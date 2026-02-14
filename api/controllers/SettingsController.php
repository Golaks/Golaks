<?php
/**
 * Settings Controller
 * Handles firma_ayarlar updates (e.g. fiyatHesaplama)
 */

require_once __DIR__ . '/BaseController.php';

class SettingsController extends BaseController {

    /**
     * Update firma_ayarlar key
     * POST /api/settings
     *
     * Request Body:
     * {
     *   "firma_ayarlar_key": "fiyatHesaplama",
     *   "firma_ayarlar_value": { ... }
     * }
     */
    public function update() {
        // Verify token
        $payload = $this->verifyToken();

        // Validate required fields
        $this->validateRequired(['firma_ayarlar_key', 'firma_ayarlar_value']);

        $key = $this->requestData['firma_ayarlar_key'];
        $value = $this->requestData['firma_ayarlar_value'];

        try {
            $db = $this->getAuthDb();

            // Get firma_id from user
            $userStmt = $db->prepare("
                SELECT mobil_firmalar_id
                FROM mobil_kullanici
                WHERE id = :user_id AND aktif = 1
                LIMIT 1
            ");
            $userStmt->execute([':user_id' => $payload['user_id']]);
            $user = $userStmt->fetch();

            if (!$user) {
                $this->sendError('Kullanıcı bulunamadı', 'USER_NOT_FOUND', 404);
            }

            $firmaId = $user['mobil_firmalar_id'];

            // Get current firma_ayarlar
            $firmaStmt = $db->prepare("
                SELECT firma_ayarlar
                FROM mobil_firmalar
                WHERE id = :firma_id AND aktif = 1
                LIMIT 1
            ");
            $firmaStmt->execute([':firma_id' => $firmaId]);
            $firma = $firmaStmt->fetch();

            if (!$firma) {
                $this->sendError('Firma bulunamadı', 'COMPANY_NOT_FOUND', 404);
            }

            // Parse current settings
            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?? [];

            // Update the specific key
            $firmaAyarlar[$key] = $value;

            // Save back
            $updateStmt = $db->prepare("
                UPDATE mobil_firmalar
                SET firma_ayarlar = :firma_ayarlar
                WHERE id = :firma_id
            ");
            $updateStmt->execute([
                ':firma_ayarlar' => json_encode($firmaAyarlar, JSON_UNESCAPED_UNICODE),
                ':firma_id' => $firmaId
            ]);

            $this->sendSuccess(null, 'Ayarlar başarıyla kaydedildi');

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
}
