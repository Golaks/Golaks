<?php
/**
 * Tanimlar Controller
 * Parametrik tanım CRUD işlemleri (global - tüm modüller)
 */

class TanimlarController {

    /**
     * Ortak: Auth + firma DB bağlantısı
     */
    private function getContext(): array {
        require_once __DIR__ . '/../includes/ContextHelper.php';
        return ContextHelper::get();
    }

    /**
     * POST /tanimlar/list
     * Tanım koduna göre listele
     */
    public function getList() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];
        $tanimKodu = $data['tanimKodu'] ?? '';

        if (empty($tanimKodu)) {
            Response::error('tanimKodu gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];

            $stmt = $pdo->prepare(
                "SELECT id, tanim_kodu, tanim_deger, sira FROM tanimlar
                 WHERE firma_id = :firmaId AND tanim_kodu = :tanimKodu AND aktif = 1
                 ORDER BY sira ASC"
            );
            $stmt->execute([
                ':firmaId' => $ctx['firmaId'],
                ':tanimKodu' => $tanimKodu,
            ]);

            $rows = $stmt->fetchAll();
            $items = array_map(function($row) {
                return [
                    'id' => (string)$row['id'],
                    'tanimKodu' => $row['tanim_kodu'],
                    'tanimDeger' => $row['tanim_deger'],
                    'sira' => (int)$row['sira'],
                ];
            }, $rows);

            Response::success(['items' => $items]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /tanimlar/create
     * Yeni tanım oluştur
     */
    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $tanimKodu = $data['tanimKodu'] ?? '';
        $tanimDeger = trim($data['tanimDeger'] ?? '');

        if (empty($tanimKodu)) {
            Response::error('tanimKodu gereklidir', 'VALIDATION_ERROR', 400);
        }

        if (empty($tanimDeger)) {
            Response::error('tanimDeger gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];

            // Aynı tanım var mı kontrol et
            $existing = $pdo->prepare(
                "SELECT id FROM tanimlar WHERE firma_id = :firmaId AND tanim_kodu = :tanimKodu AND tanim_deger = :tanimDeger AND aktif = 1"
            );
            $existing->execute([
                ':firmaId' => $ctx['firmaId'],
                ':tanimKodu' => $tanimKodu,
                ':tanimDeger' => $tanimDeger,
            ]);

            if ($existing->fetch()) {
                Response::error('Bu tanım zaten mevcut', 'DUPLICATE_TANIM', 409);
            }

            // Sıra numarası
            $maxSira = $pdo->prepare(
                "SELECT COALESCE(MAX(sira), 0) + 1 as nextSira FROM tanimlar WHERE firma_id = :firmaId AND tanim_kodu = :tanimKodu"
            );
            $maxSira->execute([':firmaId' => $ctx['firmaId'], ':tanimKodu' => $tanimKodu]);
            $nextSira = (int)$maxSira->fetch()['nextSira'];

            $sql = "
                INSERT INTO tanimlar (firma_id, sube_id, tanim_kodu, tanim_deger, sira, kayit_kullanici_id, aktif)
                VALUES (:firmaId, :subeId, :tanimKodu, :tanimDeger, :sira, :kullaniciId, 1)
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':firmaId' => $ctx['firmaId'],
                ':subeId' => $ctx['subeId'],
                ':tanimKodu' => $tanimKodu,
                ':tanimDeger' => $tanimDeger,
                ':sira' => $nextSira,
                ':kullaniciId' => $ctx['userId'],
            ]);

            $newId = $pdo->lastInsertId();

            Response::success([
                'id' => (string)$newId,
                'tanimKodu' => $tanimKodu,
                'tanimDeger' => $tanimDeger,
                'message' => 'Tanım başarıyla oluşturuldu',
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /tanimlar/update
     * Tanım güncelle
     */
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $id = $data['id'] ?? '';
        $tanimDeger = trim($data['tanimDeger'] ?? '');

        if (empty($id)) {
            Response::error('id gereklidir', 'VALIDATION_ERROR', 400);
        }

        if (empty($tanimDeger)) {
            Response::error('tanimDeger gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];

            // Kayıt var mı kontrol et
            $existing = $pdo->prepare(
                "SELECT id, tanim_kodu FROM tanimlar WHERE id = :id AND firma_id = :firmaId AND aktif = 1"
            );
            $existing->execute([':id' => $id, ':firmaId' => $ctx['firmaId']]);
            $record = $existing->fetch();

            if (!$record) {
                Response::error('Tanım bulunamadı', 'NOT_FOUND', 404);
            }

            // Aynı isimde başka kayıt var mı
            $duplicate = $pdo->prepare(
                "SELECT id FROM tanimlar WHERE firma_id = :firmaId AND tanim_kodu = :tanimKodu AND tanim_deger = :tanimDeger AND id != :id AND aktif = 1"
            );
            $duplicate->execute([
                ':firmaId' => $ctx['firmaId'],
                ':tanimKodu' => $record['tanim_kodu'],
                ':tanimDeger' => $tanimDeger,
                ':id' => $id,
            ]);

            if ($duplicate->fetch()) {
                Response::error('Bu tanım zaten mevcut', 'DUPLICATE_TANIM', 409);
            }

            $stmt = $pdo->prepare(
                "UPDATE tanimlar SET tanim_deger = :tanimDeger WHERE id = :id AND firma_id = :firmaId"
            );
            $stmt->execute([
                ':tanimDeger' => $tanimDeger,
                ':id' => $id,
                ':firmaId' => $ctx['firmaId'],
            ]);

            Response::success([
                'id' => (string)$id,
                'tanimDeger' => $tanimDeger,
                'message' => 'Tanım başarıyla güncellendi',
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /tanimlar/delete
     * Tanım sil (soft delete - aktif = 0)
     */
    public function delete() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $id = $data['id'] ?? '';

        if (empty($id)) {
            Response::error('id gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];

            // Kayıt var mı kontrol et
            $existing = $pdo->prepare(
                "SELECT id FROM tanimlar WHERE id = :id AND firma_id = :firmaId AND aktif = 1"
            );
            $existing->execute([':id' => $id, ':firmaId' => $ctx['firmaId']]);

            if (!$existing->fetch()) {
                Response::error('Tanım bulunamadı', 'NOT_FOUND', 404);
            }

            $stmt = $pdo->prepare(
                "UPDATE tanimlar SET aktif = 0 WHERE id = :id AND firma_id = :firmaId"
            );
            $stmt->execute([
                ':id' => $id,
                ':firmaId' => $ctx['firmaId'],
            ]);

            Response::success([
                'id' => (string)$id,
                'message' => 'Tanım başarıyla silindi',
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }
}
