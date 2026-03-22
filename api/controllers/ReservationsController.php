<?php
/**
 * Reservations Controller
 * Rezervasyon işlemleri (mağaza modülü)
 *
 * DB Tablo: rezervasyon
 * Kolonlar: id, firma_id, sube_id, tarih, acente_id, rehber_id,
 *           beklenen_pax, beklenen_cocuk_pax, beklenen_saat, milliyet_id,
 *           giris_saati, kart_no, gelen_pax, gelen_cocuk_pax, giris_notu,
 *           cikis_saati, cikis_notu, iptal_notu, fisno, infocu,
 *           kayit_tarihi, kayit_kullanici_id, kayit_ip, aktif
 */

class ReservationsController {

    /**
     * Ortak: Auth + firma DB bağlantısı
     */
    private function getContext($needSubeYetki = false) {
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $db = Database::getInstance();

        $currentUser = $db->fetchOne(
            "SELECT mobil_firmalar_id, kullanici_yetkiler FROM mobil_kullanici WHERE id = ?",
            [$userId]
        );

        if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
            Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
        }

        $firmaId = $currentUser['mobil_firmalar_id'];
        $kullaniciYetkiler = json_decode($currentUser['kullanici_yetkiler'], true) ?: [];
        $subeYetkileri = $kullaniciYetkiler['sube_yetkileri'] ?? [];
        $varsayilanSube = $kullaniciYetkiler['varsayilan_sube'] ?? '';

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

        return [
            'userId' => $userId,
            'firmaId' => $firmaId,
            'subeYetkileri' => $subeYetkileri,
            'varsayilanSube' => $varsayilanSube,
            'pdo' => $pdo,
        ];
    }

    /**
     * POST /reservations/list
     * Rezervasyon listesi
     */
    public function getList() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $startDate = $data['startDate'] ?? '';
        $endDate = $data['endDate'] ?? '';
        $search = $data['search'] ?? '';
        $durum = $data['durum'] ?? null;

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];
            $subeYetkileri = $ctx['subeYetkileri'];

            $params = [];
            $conditions = ["r.aktif >= 0"];

            $conditions[] = "r.firma_id = :firmaId";
            $params[':firmaId'] = $firmaId;

            if (!empty($subeYetkileri)) {
                $subePlaceholders = [];
                foreach ($subeYetkileri as $idx => $sId) {
                    $key = ":subeYetki{$idx}";
                    $subePlaceholders[] = $key;
                    $params[$key] = (int)$sId;
                }
                $conditions[] = "r.sube_id IN (" . implode(',', $subePlaceholders) . ")";
            }

            if ($durum !== null && $durum !== '') {
                $conditions[] = "r.aktif = :durum";
                $params[':durum'] = (int)$durum;
            }

            if (!empty($startDate)) {
                $conditions[] = "r.tarih >= :startDate";
                $params[':startDate'] = $startDate;
            }
            if (!empty($endDate)) {
                $conditions[] = "r.tarih <= :endDate";
                $params[':endDate'] = $endDate;
            }

            if (!empty($search)) {
                $conditions[] = "(ca.unvan LIKE :search OR cr.unvan LIKE :search2 OR t.tanim_deger LIKE :search3)";
                $params[':search'] = "%{$search}%";
                $params[':search2'] = "%{$search}%";
                $params[':search3'] = "%{$search}%";
            }

            $whereClause = implode(' AND ', $conditions);

            $sql = "
                SELECT
                    r.id,
                    r.tarih,
                    r.acente_id,
                    r.rehber_id,
                    r.beklenen_pax,
                    r.beklenen_cocuk_pax,
                    r.beklenen_saat,
                    r.milliyet_id,
                    r.giris_saati,
                    r.kart_no,
                    r.gelen_pax,
                    r.gelen_cocuk_pax,
                    r.giris_notu,
                    r.cikis_saati,
                    r.cikis_notu,
                    r.iptal_notu,
                    r.fisno,
                    r.infocu,
                    r.aktif,
                    COALESCE(ca.unvan, '') AS acente_adi,
                    COALESCE(cr.unvan, '') AS rehber_adi,
                    COALESCE(t.tanim_deger, '') AS milliyet_adi
                FROM rezervasyon r
                LEFT JOIN cariler ca ON ca.id = r.acente_id
                LEFT JOIN cariler cr ON cr.id = r.rehber_id
                LEFT JOIN tanimlar t ON t.id = r.milliyet_id
                WHERE {$whereClause}
                ORDER BY r.tarih DESC, r.id DESC
                LIMIT 500
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $items = [];
            $stats = [
                'totalBeklenen' => 0,
                'totalIcerde' => 0,
                'totalCikti' => 0,
                'totalIptal' => 0,
                'totalBeklenenPax' => 0,
                'totalGelenPax' => 0,
            ];

            foreach ($rows as $row) {
                $items[] = [
                    'id' => (string)$row['id'],
                    'tarih' => $row['tarih'],
                    'acenteId' => (string)$row['acente_id'],
                    'acenteAdi' => $row['acente_adi'],
                    'rehberId' => (string)$row['rehber_id'],
                    'rehberAdi' => $row['rehber_adi'],
                    'beklenenPax' => (int)$row['beklenen_pax'],
                    'beklenenCocukPax' => (int)$row['beklenen_cocuk_pax'],
                    'beklenenSaat' => $row['beklenen_saat'] ?: '',
                    'milliyetId' => (int)$row['milliyet_id'],
                    'milliyetAdi' => $row['milliyet_adi'],
                    'girisSaati' => $row['giris_saati'] ?: '',
                    'kartNo' => $row['kart_no'] ?: '',
                    'gelenPax' => (int)$row['gelen_pax'],
                    'gelenCocukPax' => (int)$row['gelen_cocuk_pax'],
                    'girisNotu' => $row['giris_notu'] ?: '',
                    'cikisSaati' => $row['cikis_saati'] ?: '',
                    'cikisNotu' => $row['cikis_notu'] ?: '',
                    'iptalNotu' => $row['iptal_notu'] ?: '',
                    'fisNo' => (int)$row['fisno'],
                    'infocu' => $row['infocu'] ?: '',
                    'durum' => (int)$row['aktif'],
                ];

                switch ((int)$row['aktif']) {
                    case 0: $stats['totalBeklenen']++; break;
                    case 1: $stats['totalIcerde']++; break;
                    case 2: $stats['totalCikti']++; break;
                    case 3: $stats['totalIptal']++; break;
                }
                $stats['totalBeklenenPax'] += (int)$row['beklenen_pax'] + (int)$row['beklenen_cocuk_pax'];
                $stats['totalGelenPax'] += (int)$row['gelen_pax'] + (int)$row['gelen_cocuk_pax'];
            }

            Response::success([
                'items' => $items,
                'count' => count($items),
                'stats' => $stats,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /reservations/create
     * Yeni rezervasyon oluştur
     */
    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $tarih = $data['tarih'] ?? '';
        if (empty($tarih)) {
            Response::error('Tarih gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];
            $userId = $ctx['userId'];
            $subeYetkileri = $ctx['subeYetkileri'];
            $varsayilanSube = $ctx['varsayilanSube'];

            if (empty($subeYetkileri)) {
                Response::error('Kullanıcının şube yetkisi bulunamadı', 'SUBE_YETKI_NOT_FOUND', 400);
            }

            $requestedSubeId = $data['subeId'] ?? null;
            if ($requestedSubeId !== null && in_array((string)$requestedSubeId, $subeYetkileri)) {
                $subeId = (int)$requestedSubeId;
            } else {
                $subeId = !empty($varsayilanSube) ? (int)$varsayilanSube : (int)$subeYetkileri[0];
            }

            $clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';

            $sql = "
                INSERT INTO rezervasyon (
                    firma_id, sube_id, tarih, acente_id, rehber_id,
                    beklenen_pax, beklenen_cocuk_pax, beklenen_saat,
                    milliyet_id, giris_notu, infocu, aktif,
                    kayit_kullanici_id, kayit_ip
                ) VALUES (
                    :firmaId, :subeId, :tarih, :acenteId, :rehberId,
                    :beklenenPax, :beklenenCocukPax, :beklenenSaat,
                    :milliyetId, :girisNotu, :infocu, 0,
                    :kayitKullaniciId, :kayitIp
                )
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':firmaId' => $firmaId,
                ':subeId' => $subeId,
                ':tarih' => $tarih,
                ':acenteId' => (int)($data['acenteId'] ?? 0),
                ':rehberId' => (int)($data['rehberId'] ?? 0),
                ':beklenenPax' => (int)($data['beklenenPax'] ?? 0),
                ':beklenenCocukPax' => (int)($data['beklenenCocukPax'] ?? 0),
                ':beklenenSaat' => $data['beklenenSaat'] ?? null,
                ':milliyetId' => (int)($data['milliyetId'] ?? 0),
                ':girisNotu' => $data['girisNotu'] ?? '',
                ':infocu' => $data['infocu'] ?? '',
                ':kayitKullaniciId' => $userId,
                ':kayitIp' => $clientIp,
            ]);

            $newId = $pdo->lastInsertId();

            Response::success([
                'id' => (string)$newId,
                'message' => 'Rezervasyon başarıyla oluşturuldu',
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /reservations/update
     * Rezervasyon güncelle (durum değişikliği dahil)
     */
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $rezervasyonId = $data['rezervasyonId'] ?? '';

        if (empty($rezervasyonId)) {
            Response::error('rezervasyonId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];

            $updates = [];
            $params = [':id' => (int)$rezervasyonId, ':firmaId' => $firmaId];

            // API key => DB column
            $allowedFields = [
                'tarih' => 'tarih',
                'acenteId' => 'acente_id',
                'rehberId' => 'rehber_id',
                'beklenenPax' => 'beklenen_pax',
                'beklenenCocukPax' => 'beklenen_cocuk_pax',
                'beklenenSaat' => 'beklenen_saat',
                'milliyetId' => 'milliyet_id',
                'girisSaati' => 'giris_saati',
                'kartNo' => 'kart_no',
                'gelenPax' => 'gelen_pax',
                'gelenCocukPax' => 'gelen_cocuk_pax',
                'girisNotu' => 'giris_notu',
                'cikisSaati' => 'cikis_saati',
                'cikisNotu' => 'cikis_notu',
                'iptalNotu' => 'iptal_notu',
                'infocu' => 'infocu',
                'durum' => 'aktif',
            ];

            foreach ($allowedFields as $inputKey => $dbColumn) {
                if (array_key_exists($inputKey, $data)) {
                    $paramKey = ':' . $inputKey;
                    $updates[] = "{$dbColumn} = {$paramKey}";
                    $params[$paramKey] = $data[$inputKey];
                }
            }

            if (empty($updates)) {
                Response::error('Güncellenecek alan bulunamadı', 'VALIDATION_ERROR', 400);
            }

            $updateClause = implode(', ', $updates);
            $sql = "UPDATE rezervasyon SET {$updateClause} WHERE id = :id AND firma_id = :firmaId";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            Response::success([
                'message' => 'Rezervasyon başarıyla güncellendi',
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /reservations/lookups
     * Acente, rehber ve milliyet listelerini getir
     */
    public function getLookups() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];
            $firmaId = $ctx['firmaId'];
            $subeYetkileri = $ctx['subeYetkileri'];

            // Acente listesi (carilerden) - yetkili şubelere göre filtrele
            $acenteParams = [':firmaId' => $firmaId];
            if (!empty($subeYetkileri)) {
                $subePlaceholders = [];
                foreach ($subeYetkileri as $idx => $sId) {
                    $key = ":subeYetki{$idx}";
                    $subePlaceholders[] = $key;
                    $acenteParams[$key] = (int)$sId;
                }
                $acenteSql = "SELECT id, unvan FROM cariler WHERE firma_id = :firmaId AND sube_id IN (" . implode(',', $subePlaceholders) . ") AND aktif = 1 ORDER BY unvan LIMIT 200";
            } else {
                $acenteSql = "SELECT id, unvan FROM cariler WHERE firma_id = :firmaId AND aktif = 1 ORDER BY unvan LIMIT 200";
            }
            $stmt = $pdo->prepare($acenteSql);
            $stmt->execute($acenteParams);
            $acenteler = $stmt->fetchAll();

            // Milliyet listesi (tanimlardan)
            $stmt = $pdo->prepare("SELECT id, tanim_deger FROM tanimlar WHERE firma_id = :firmaId AND aktif = 1 AND tanim_kodu = 'MILLIYET' ORDER BY sira, tanim_deger LIMIT 100");
            $stmt->execute([':firmaId' => $firmaId]);
            $milliyetler = $stmt->fetchAll();

            // Kullanıcının yetkili şubeleri
            $subeler = [];
            if (!empty($subeYetkileri)) {
                $subePlaceholders2 = [];
                $subeParams2 = [':firmaId2' => $firmaId];
                foreach ($subeYetkileri as $idx => $sId) {
                    $key = ":sube2_{$idx}";
                    $subePlaceholders2[] = $key;
                    $subeParams2[$key] = (int)$sId;
                }
                $stmt = $pdo->prepare("SELECT id, sube_adi FROM subeler WHERE firma_id = :firmaId2 AND id IN (" . implode(',', $subePlaceholders2) . ") AND aktif = 1 ORDER BY sube_adi");
                $stmt->execute($subeParams2);
                $subeler = $stmt->fetchAll();
            }

            $varsayilanSube = $ctx['varsayilanSube'];

            Response::success([
                'acenteler' => array_map(function($row) {
                    return ['id' => (string)$row['id'], 'unvan' => $row['unvan']];
                }, $acenteler),
                'milliyetler' => array_map(function($row) {
                    return ['id' => (string)$row['id'], 'deger' => $row['tanim_deger']];
                }, $milliyetler),
                'subeler' => array_map(function($row) {
                    return ['id' => (string)$row['id'], 'name' => $row['sube_adi']];
                }, $subeler),
                'varsayilanSube' => $varsayilanSube,
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }
}
