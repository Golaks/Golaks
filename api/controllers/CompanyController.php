<?php
/**
 * Company Controller
 * Firma yönetimi (Super Admin)
 */

class CompanyController {
    /**
     * GET /company/list
     * Firma listesi
     */
    public function getList() {
        // Token kontrolü - Super admin için cihaz kontrolü kapalı
        $auth = Auth::requireAuth(false);
        $userId = $auth['user_id'] ?? null;

        try {
            $db = Database::getInstance();

            // Kullanıcının super admin olup olmadığını kontrol et
            $user = $db->fetchOne(
                "SELECT kullanici_rol FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            error_log("Company list access attempt - User ID: $userId, Role: " . ($user['kullanici_rol'] ?? 'null'));

            if (!$user || $user['kullanici_rol'] != 2) {
                error_log("Company list access denied - User role is not super admin");
                Response::error(
                    'Bu işlem için yetkiniz yok. Rolünüz: ' . ($user['kullanici_rol'] ?? 'null') . ' (Super Admin için 2 olmalı)',
                    'FORBIDDEN',
                    403
                );
            }

            // Tüm firmaları getir
            $firmalar = $db->fetchAll(
                "SELECT
                    id,
                    firma_unvani,
                    firma_ayarlar,
                    aktif
                FROM mobil_firmalar
                ORDER BY firma_unvani"
            );

            // Frontend için format düzenle
            $companies = [];
            foreach ($firmalar as $firma) {
                // JSON decode with error handling
                $firmaAyarlar = null;
                if (!empty($firma['firma_ayarlar'])) {
                    $decoded = json_decode($firma['firma_ayarlar'], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $firmaAyarlar = $decoded;
                    } else {
                        error_log("JSON decode error for company {$firma['id']}: " . json_last_error_msg());
                    }
                }

                // Lisans bilgilerini al
                $lisansAdet = $firmaAyarlar['lisans']['adet'] ?? '1';
                $paketBitisTarihi = $firmaAyarlar['lisans']['paketBitisTarihi'] ?? '';
                $lisansAnahtar = $firmaAyarlar['lisans']['anahtar'] ?? '';

                // Kullanılan lisans sayısını hesapla
                $kullaniciSayisi = $db->fetchOne(
                    "SELECT COUNT(*) as sayi FROM mobil_kullanici WHERE mobil_firmalar_id = ? AND aktif = 1",
                    [$firma['id']]
                );

                // Program modüllerini al
                $programlar = $firmaAyarlar['programlar'] ?? [];

                $companies[] = [
                    'id' => (string)$firma['id'],
                    'companyName' => $firma['firma_unvani'],
                    'companyCode' => $lisansAnahtar,
                    'totalLicense' => (int)$lisansAdet,
                    'usedLicense' => (int)($kullaniciSayisi['sayi'] ?? 0),
                    'expiryDate' => $paketBitisTarihi,
                    'isActive' => (bool)$firma['aktif'],
                    'dataVersiyon' => $firmaAyarlar['lisans']['versiyon'] ?? 'v1',
                    'modules' => [
                        'muhasebe' => $programlar['muhasebe']['aktif'] ?? false,
                        'tabakhane' => $programlar['tabakhane']['aktif'] ?? false,
                        'magaza' => $programlar['magaza']['aktif'] ?? false,
                        'konfeksiyon' => $programlar['konfeksiyon']['aktif'] ?? false,
                    ],
                    'firmaAyarlar' => $firmaAyarlar,
                ];
            }

            error_log("Company list success: " . count($companies) . " companies found");

            Response::success([
                'companies' => $companies,
                'count' => count($companies)
            ]);

        } catch (Exception $e) {
            error_log("Company list error: " . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /company/create
     * Yeni firma oluştur
     */
    public function create() {
        // Token kontrolü
        $auth = Auth::requireAuth(false);
        $userId = $auth['user_id'] ?? null;

        // Request body'yi al
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        try {
            $db = Database::getInstance();

            // Super admin kontrolü
            $user = $db->fetchOne(
                "SELECT kullanici_rol FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$user || $user['kullanici_rol'] != 2) {
                Response::error('Bu işlem için yetkiniz yok', 'FORBIDDEN', 403);
            }

            // Validasyon
            if (empty($data['firma_unvani'])) {
                Response::error('Firma ünvanı gereklidir', 'VALIDATION_ERROR', 400);
            }

            // Firma ayarları JSON
            $firmaAyarlar = $data['firma_ayarlar'] ?? '{}';

            // Firma oluştur
            $db->query(
                "INSERT INTO mobil_firmalar (
                    firma_unvani,
                    firma_ayarlar,
                    aktif
                ) VALUES (?, ?, ?)",
                [
                    $data['firma_unvani'],
                    $firmaAyarlar,
                    $data['aktif'] ?? 1
                ]
            );

            $firmaId = $db->lastInsertId();

            // Eğer varsayılan kullanıcı bilgileri varsa kullanıcı oluştur
            if (isset($data['default_user'])) {
                $defaultUser = $data['default_user'];

                // Şifreyi hashle
                $hashedPassword = password_hash($defaultUser['sifre'], PASSWORD_BCRYPT);

                // Kullanıcı ekle
                $db->query(
                    "INSERT INTO mobil_kullanici (
                        mobil_firmalar_id,
                        kullanici_adi,
                        ad_soyad,
                        kullanici_telefon,
                        sifre,
                        kullanici_rol,
                        aktif
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        $firmaId,
                        $defaultUser['email'],
                        $defaultUser['ad_soyad'],
                        $defaultUser['telefon'],
                        $hashedPassword,
                        1, // Admin role
                        1  // Active
                    ]
                );
            }

            Response::success([
                'id' => $firmaId,
                'message' => 'Firma başarıyla oluşturuldu'
            ]);

        } catch (Exception $e) {
            error_log("Company create error: " . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * PUT /company/update/:id
     * Firma güncelle
     */
    public function update() {
        // Token kontrolü
        $auth = Auth::requireAuth(false);
        $userId = $auth['user_id'] ?? null;

        // Request body'yi al
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        try {
            $db = Database::getInstance();

            // Super admin kontrolü
            $user = $db->fetchOne(
                "SELECT kullanici_rol FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$user || $user['kullanici_rol'] != 2) {
                Response::error('Bu işlem için yetkiniz yok', 'FORBIDDEN', 403);
            }

            if (empty($data['firma_id'])) {
                Response::error('Firma ID gereklidir', 'VALIDATION_ERROR', 400);
            }

            // Firma ayarları JSON
            $firmaAyarlar = $data['firma_ayarlar'] ?? '{}';

            // Firma güncelle
            $db->query(
                "UPDATE mobil_firmalar SET
                    firma_unvani = ?,
                    firma_ayarlar = ?,
                    aktif = ?
                WHERE id = ?",
                [
                    $data['firma_unvani'],
                    $firmaAyarlar,
                    $data['aktif'] ?? 1,
                    $data['firma_id']
                ]
            );

            Response::success(['message' => 'Firma başarıyla güncellendi']);

        } catch (Exception $e) {
            error_log("Company update error: " . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }

    /**
     * DELETE /company/delete/:id
     * Firma sil
     */
    public function delete() {
        // Token kontrolü
        $auth = Auth::requireAuth(false);
        $userId = $auth['user_id'] ?? null;

        // Request body'yi al
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        try {
            $db = Database::getInstance();

            // Super admin kontrolü
            $user = $db->fetchOne(
                "SELECT kullanici_rol FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$user || $user['kullanici_rol'] != 2) {
                Response::error('Bu işlem için yetkiniz yok', 'FORBIDDEN', 403);
            }

            if (empty($data['id'])) {
                Response::error('Firma ID gereklidir', 'VALIDATION_ERROR', 400);
            }

            // Firmayı pasif yap (soft delete)
            $db->query(
                "UPDATE mobil_firmalar SET aktif = 0 WHERE id = ?",
                [$data['id']]
            );

            Response::success(['message' => 'Firma başarıyla silindi']);

        } catch (Exception $e) {
            error_log("Company delete error: " . $e->getMessage());
            Response::error('Bir hata oluştu', 'SERVER_ERROR', 500);
        }
    }
}
