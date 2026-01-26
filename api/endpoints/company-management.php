<?php
/**
 * /api/company-management
 * Firma yönetimi endpoint'i (Super Admin)
 * GET: Firma listesi
 * POST: Yeni firma ekleme
 * PUT: Firma güncelleme
 * DELETE: Firma silme
 */

// Token kontrolü - Super admin için cihaz kontrolü kapalı
$auth = Auth::requireAuth(false);
$userId = $auth['userId'];

try {
    $db = Database::getInstance();

    // Kullanıcının super admin olup olmadığını kontrol et
    $user = $db->fetchOne(
        "SELECT kullanici_rol FROM mobil_kullanici WHERE id = ?",
        [$userId]
    );

    if (!$user || $user['kullanici_rol'] != 2) {
        Response::forbidden('Bu işlem için yetkiniz yok');
    }

    // GET - Firma listesi
    if ($requestMethod === 'GET') {
        // Tüm firmaları getir
        $companies = $db->fetchAll(
            "SELECT
                f.id,
                f.firma_unvani,
                f.firma_ayarlar,
                f.aktif,
                (SELECT COUNT(*) FROM mobil_kullanici WHERE mobil_firmalar_id = f.id AND aktif = 1) as kullanilan_lisans
            FROM mobil_firmalar f
            ORDER BY f.firma_unvani ASC"
        );

        $result = [];
        foreach ($companies as $company) {
            $firmaAyarlar = null;
            if (!empty($company['firma_ayarlar'])) {
                $firmaAyarlar = json_decode($company['firma_ayarlar'], true);
            }

            // Lisans adet bilgisini firma_ayarlar'dan al
            $lisansAdet = 1;
            $paketBitisTarihi = null;
            $dataVersiyon = 'v1'; // Varsayılan
            if ($firmaAyarlar && isset($firmaAyarlar['lisans'])) {
                if (isset($firmaAyarlar['lisans']['adet'])) {
                    $lisansAdet = (int) $firmaAyarlar['lisans']['adet'];
                }
                if (isset($firmaAyarlar['lisans']['paketBitisTarihi'])) {
                    $paketBitisTarihi = $firmaAyarlar['lisans']['paketBitisTarihi'];
                }
                if (isset($firmaAyarlar['lisans']['versiyon'])) {
                    $dataVersiyon = $firmaAyarlar['lisans']['versiyon'];
                }
            }

            $result[] = [
                'id' => $company['id'],
                'companyName' => $company['firma_unvani'],
                'companyCode' => $company['id'], // Firma kodu olarak ID kullanılıyor
                'totalLicense' => $lisansAdet,
                'usedLicense' => (int) $company['kullanilan_lisans'],
                'expiryDate' => $paketBitisTarihi,
                'isActive' => (int) $company['aktif'] === 1,
                'dataVersiyon' => $dataVersiyon,
                'modules' => [
                    'muhasebe' => isset($firmaAyarlar['programlar']['muhasebe']['aktif']) && $firmaAyarlar['programlar']['muhasebe']['aktif'],
                    'tabakhane' => isset($firmaAyarlar['programlar']['tabakhane']['aktif']) && $firmaAyarlar['programlar']['tabakhane']['aktif'],
                    'magaza' => isset($firmaAyarlar['programlar']['magaza']['aktif']) && $firmaAyarlar['programlar']['magaza']['aktif'],
                    'konfeksiyon' => isset($firmaAyarlar['programlar']['konfeksiyon']['aktif']) && $firmaAyarlar['programlar']['konfeksiyon']['aktif']
                ],
                'firmaAyarlar' => $firmaAyarlar
            ];
        }

        Response::success([
            'companies' => $result,
            'total' => count($result)
        ], 'Firma listesi başarıyla alındı');
    }

    // POST - Yeni firma ekleme
    elseif ($requestMethod === 'POST') {
        // İstek gövdesini al
        $input = $_POST_DATA;

        // Zorunlu alanları kontrol et
        if (empty($input['firma_unvani'])) {
            Response::badRequest('Firma ünvanı zorunludur');
        }

        if (empty($input['firma_ayarlar'])) {
            Response::badRequest('Firma ayarları zorunludur');
        }

        // Varsayılan kullanıcı bilgilerini kontrol et (sadece yeni firma eklerken)
        if (empty($input['default_user'])) {
            Response::badRequest('Varsayılan kullanıcı bilgileri zorunludur');
        }

        $defaultUser = $input['default_user'];
        if (empty($defaultUser['ad_soyad']) || empty($defaultUser['email']) ||
            empty($defaultUser['telefon']) || empty($defaultUser['sifre'])) {
            Response::badRequest('Varsayılan kullanıcı için tüm alanlar zorunludur');
        }

        // Email formatını kontrol et
        if (!filter_var($defaultUser['email'], FILTER_VALIDATE_EMAIL)) {
            Response::badRequest('Geçersiz e-posta adresi');
        }

        // E-posta zaten kullanılıyor mu kontrol et
        $existingUser = $db->fetchOne(
            "SELECT id FROM mobil_kullanici WHERE kullanici_adi = ?",
            [$defaultUser['email']]
        );

        if ($existingUser) {
            Response::badRequest('Bu e-posta adresi zaten kullanılıyor');
        }

        // Telefon zaten kullanılıyor mu kontrol et
        $existingPhone = $db->fetchOne(
            "SELECT id FROM mobil_kullanici WHERE kullanici_telefon = ?",
            [$defaultUser['telefon']]
        );

        if ($existingPhone) {
            Response::badRequest('Bu telefon numarası zaten kullanılıyor');
        }

        // Transaction başlat
        $db->beginTransaction();

        try {
            // Firmayı ekle
            $firmaId = $db->insert('mobil_firmalar', [
                'firma_unvani' => $input['firma_unvani'],
                'firma_ayarlar' => $input['firma_ayarlar'],
                'aktif' => isset($input['aktif']) ? (int)$input['aktif'] : 1
            ]);

            if (!$firmaId) {
                throw new Exception('Firma eklenemedi');
            }

            // Varsayılan kullanıcıyı ekle
            $hashedPassword = password_hash($defaultUser['sifre'], PASSWORD_DEFAULT);

            $kullaniciId = $db->insert('mobil_kullanici', [
                'mobil_firmalar_id' => $firmaId,
                'ad_soyad' => $defaultUser['ad_soyad'],
                'kullanici_adi' => $defaultUser['email'],
                'kullanici_telefon' => $defaultUser['telefon'],
                'sifre' => $hashedPassword,
                'kullanici_rol' => 1, // Normal kullanıcı
                'aktif' => 1
            ]);

            if (!$kullaniciId) {
                throw new Exception('Varsayılan kullanıcı eklenemedi');
            }

            // Transaction'ı commit et
            $db->commit();

            // Eklenen firmayı getir
            $newCompany = $db->fetchOne(
                "SELECT id, firma_unvani, firma_ayarlar, aktif FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );

            Response::success([
                'company' => [
                    'id' => $newCompany['id'],
                    'companyName' => $newCompany['firma_unvani'],
                    'firmaAyarlar' => json_decode($newCompany['firma_ayarlar'], true),
                    'isActive' => (int)$newCompany['aktif'] === 1
                ]
            ], 'Firma başarıyla eklendi');

        } catch (Exception $e) {
            // Hata durumunda rollback
            $db->rollback();
            throw $e;
        }
    }

    // PUT - Firma güncelleme
    elseif ($requestMethod === 'PUT') {
        // İstek gövdesini al
        $input = $_POST_DATA;

        // Firma ID kontrolü
        if (empty($input['firma_id'])) {
            Response::badRequest('Firma ID zorunludur');
        }

        // Firma var mı kontrol et
        $existingCompany = $db->fetchOne(
            "SELECT id FROM mobil_firmalar WHERE id = ?",
            [$input['firma_id']]
        );

        if (!$existingCompany) {
            Response::notFound('Firma bulunamadı');
        }

        // Zorunlu alanları kontrol et
        if (empty($input['firma_unvani'])) {
            Response::badRequest('Firma ünvanı zorunludur');
        }

        if (empty($input['firma_ayarlar'])) {
            Response::badRequest('Firma ayarları zorunludur');
        }

        // Firmayı güncelle
        $updated = $db->update('mobil_firmalar', [
            'firma_unvani' => $input['firma_unvani'],
            'firma_ayarlar' => $input['firma_ayarlar'],
            'aktif' => isset($input['aktif']) ? (int)$input['aktif'] : 1
        ], 'id = ?', [$input['firma_id']]);

        if ($updated === false) {
            Response::serverError('Firma güncellenemedi');
        }

        // Güncellenmiş firmayı getir
        $updatedCompany = $db->fetchOne(
            "SELECT id, firma_unvani, firma_ayarlar, aktif FROM mobil_firmalar WHERE id = ?",
            [$input['firma_id']]
        );

        Response::success([
            'company' => [
                'id' => $updatedCompany['id'],
                'companyName' => $updatedCompany['firma_unvani'],
                'firmaAyarlar' => json_decode($updatedCompany['firma_ayarlar'], true),
                'isActive' => (int)$updatedCompany['aktif'] === 1
            ]
        ], 'Firma başarıyla güncellendi');
    }

    // DELETE - Firma silme
    elseif ($requestMethod === 'DELETE') {
        // TODO: Firma silme işlemi
        Response::error('Firma silme henüz implement edilmedi', 'NOT_IMPLEMENTED', 501);
    }

    else {
        Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
    }

} catch (Exception $e) {
    error_log("Company management error: " . $e->getMessage());
    Response::serverError('İşlem gerçekleştirilemedi: ' . $e->getMessage());
}
