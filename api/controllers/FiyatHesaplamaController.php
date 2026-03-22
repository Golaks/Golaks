<?php
/**
 * Fiyat Hesaplama Controller
 * firma_ayarlar JSON içindeki mobilAyarlar alanını okur/günceller
 *
 * Tip: 0 = Yüzde (%), 1 = Sabit (₺)
 */

class FiyatHesaplamaController {

    private function defaultMobilAyarlar(): array {
        return [
            'girisFiyatTipi'    => 0,
            'girisFiyatDegeri'  => 0,
            'maliyetFiyatTipi'  => 0,
            'maliyetFiyatDegeri'=> 0,
            'etiketFiyatTipi'   => 0,
            'etiketFiyatDegeri' => 0,
        ];
    }

    /**
     * GET /fiyat-hesaplama
     */
    public function get() {
        $auth = Auth::requireAuth(false);
        $userId = $auth['user_id'] ?? null;

        try {
            $db = Database::getInstance();

            $user = $db->fetchOne(
                "SELECT kullanici_rol, mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$user || $user['kullanici_rol'] == 0) {
                Response::error('Bu işlem için yetkiniz yok', 'FORBIDDEN', 403);
            }

            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$user['mobil_firmalar_id']]
            );

            $firmaAyarlar = !empty($firma['firma_ayarlar'])
                ? json_decode($firma['firma_ayarlar'], true)
                : [];

            $mobilAyarlar = $firmaAyarlar['mobilAyarlar'] ?? $this->defaultMobilAyarlar();

            Response::success(['mobilAyarlar' => $mobilAyarlar]);

        } catch (Exception $e) {
            error_log("FiyatHesaplama get error: " . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /fiyat-hesaplama
     */
    public function save() {
        $auth = Auth::requireAuth(false);
        $userId = $auth['user_id'] ?? null;

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        try {
            $db = Database::getInstance();

            $user = $db->fetchOne(
                "SELECT kullanici_rol, mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$user || $user['kullanici_rol'] == 0) {
                Response::error('Bu işlem için yetkiniz yok', 'FORBIDDEN', 403);
            }

            $firmaId = $user['mobil_firmalar_id'];

            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );

            $firmaAyarlar = !empty($firma['firma_ayarlar'])
                ? json_decode($firma['firma_ayarlar'], true)
                : [];

            // Yalnızca mobilAyarlar alanını güncelle, diğer ayarlar korunur
            $firmaAyarlar['mobilAyarlar'] = $data['mobilAyarlar'] ?? $this->defaultMobilAyarlar();

            $db->query(
                "UPDATE mobil_firmalar SET firma_ayarlar = ? WHERE id = ?",
                [json_encode($firmaAyarlar, JSON_UNESCAPED_UNICODE), $firmaId]
            );

            Response::success(['message' => 'Fiyat hesaplama ayarları kaydedildi']);

        } catch (Exception $e) {
            error_log("FiyatHesaplama save error: " . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }
}
