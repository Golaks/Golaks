<?php
/**
 * Account Controller
 * Cari hesap işlemleri
 */

class AccountController {
    /**
     * POST /account/cari-list
     * Cari hesap listesi
     */
    public function getCariList() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        // Token kontrolü
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        // Request body'yi al
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        // Parametreleri al
        $dataName = $data['dataName'] ?? '';
        $filterType = $data['filterType'] ?? 'all';
        $search = $data['search'] ?? '';
        $subeId = isset($data['subeId']) ? (int)$data['subeId'] : null;
        $customPrefix = $data['prefix'] ?? '';

        // Validasyon
        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        $validFilters = ['all', 'customers', 'suppliers', 'safes', 'banks', 'personnel', 'stocks'];
        if (!in_array($filterType, $validFilters)) {
            Response::error('Geçersiz filtre tipi', 'VALIDATION_ERROR', 400);
        }

        try {
            $db = Database::getInstance();

            // Kullanıcının firma bilgilerini al
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
                Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
            }

            $firmaId = $currentUser['mobil_firmalar_id'];

            // Firma ayarlarını al
            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );

            if (!$firma || empty($firma['firma_ayarlar'])) {
                Response::error('Firma ayarları bulunamadı', 'FIRMA_SETTINGS_NOT_FOUND', 404);
            }

            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];

            // Firma veritabanı bağlantı bilgilerini al
            $veritabani = $firmaAyarlar['veritabani'] ?? [];
            $dbServer = $veritabani['sunucu'] ?? '';
            $dbPort = (int)($veritabani['port'] ?? 3306);
            $dbUser = $veritabani['kullanici'] ?? '';
            $dbPass = $veritabani['sifre'] ?? '';
            $dbName = $veritabani['veriAdi'] ?? '';

            if (empty($dbServer) || empty($dbUser) || empty($dbName)) {
                Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            }

            // Şirket veritabanına bağlan (firma ayarlarındaki veriAdi kullanılır)
            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Hesap kodu prefix'ini belirle
            $hesapKoduFilter = '%';
            switch ($filterType) {
                case 'customers':
                    $hesapKoduFilter = '120%'; // Müşteriler
                    break;
                case 'suppliers':
                    $hesapKoduFilter = '320%'; // Tedarikçiler
                    break;
                case 'safes':
                    $hesapKoduFilter = '100%'; // Kasalar
                    break;
                case 'banks':
                    $hesapKoduFilter = '102%'; // Bankalar
                    break;
                case 'personnel':
                    $hesapKoduFilter = '335%'; // Personeller
                    break;
                case 'stocks':
                    $hesapKoduFilter = '150%'; // Stoklar
                    break;
            }

            // Custom prefix varsa onu kullan
            if (!empty($customPrefix)) {
                $hesapKoduFilter = $customPrefix . '%';
            }

            // Arama terimi
            $searchTerm = '%' . $search . '%';

            // Cari listesi sorgusu
            $sql = "
                SELECT
                    c.id,
                    c.hesap_kodu,
                    c.unvan,
                    c.kisa_unvan,
                    c.doviz,
                    s.sube_adi,
                    c.aktif
                FROM cariler c
                INNER JOIN subeler s ON c.sube_id = s.id
                WHERE c.aktif = 1
                    AND c.firma_id = :firmaId
                    AND c.hesap_kodu LIKE :hesapKodu
                    AND (
                        c.unvan LIKE :search
                        OR c.kisa_unvan LIKE :search2
                        OR c.hesap_kodu LIKE :search3
                        OR s.sube_adi LIKE :search4
                    )
            ";

            $params = [
                ':firmaId' => $firmaId,
                ':hesapKodu' => $hesapKoduFilter,
                ':search' => $searchTerm,
                ':search2' => $searchTerm,
                ':search3' => $searchTerm,
                ':search4' => $searchTerm
            ];

            if ($subeId) {
                $sql .= " AND c.sube_id = :subeId";
                $params[':subeId'] = $subeId;
            }

            $sql .= " ORDER BY c.unvan LIMIT 100";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            $rows = $stmt->fetchAll();

            $results = [];
            foreach ($rows as $row) {
                $results[] = [
                    'id' => $row['id'],
                    'hesapKodu' => $row['hesap_kodu'],
                    'unvan' => $row['unvan'],
                    'kisaUnvan' => $row['kisa_unvan'] ?? '',
                    'doviz' => $row['doviz'],
                    'sube' => $row['sube_adi']
                ];
            }

            Response::success([
                'data' => $results,
                'count' => count($results),
                'filterType' => $filterType
            ]);

        } catch (PDOException $e) {
            error_log("Cari List DB Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("Cari List Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/cari-create
     * Yeni cari hesap oluştur
     */
    public function createCari() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $hesapKodu = trim($data['hesapKodu'] ?? '');
        $unvan = trim($data['unvan'] ?? '');
        $kisaUnvan = trim($data['kisaUnvan'] ?? '');
        $doviz = trim($data['doviz'] ?? 'TL');
        $kurTipi = $data['kurTipi'] ?? 'doviz_alis';
        $subeId = (int)($data['subeId'] ?? 0);
        $ozelKod1 = trim($data['ozelKod1'] ?? '');
        $ozelKod2 = trim($data['ozelKod2'] ?? '');
        $ozelKod3 = trim($data['ozelKod3'] ?? '');
        $ozelKod4 = trim($data['ozelKod4'] ?? '');

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }
        if (empty($hesapKodu)) {
            Response::error('Hesap kodu gereklidir', 'VALIDATION_ERROR', 400);
        }
        if (empty($unvan)) {
            Response::error('Ünvan gereklidir', 'VALIDATION_ERROR', 400);
        }
        if ($subeId <= 0) {
            Response::error('Şube seçilmelidir', 'VALIDATION_ERROR', 400);
        }

        $validKurTipleri = ['doviz_alis', 'doviz_satis', 'efektif_alis', 'efektif_satis', 'ozel_kur'];
        if (!in_array($kurTipi, $validKurTipleri)) {
            $kurTipi = 'doviz_alis';
        }

        try {
            $db = Database::getInstance();

            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
                Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
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

            // Aynı hesap kodu + şube + firma kontrolü
            $existing = $pdo->prepare(
                "SELECT id FROM cariler WHERE firma_id = ? AND sube_id = ? AND hesap_kodu = ? AND aktif != -1"
            );
            $existing->execute([$firmaId, $subeId, $hesapKodu]);
            if ($existing->fetch()) {
                Response::error('Bu hesap kodu zaten mevcut', 'DUPLICATE_ERROR', 409);
            }

            $sql = "INSERT INTO cariler (firma_id, sube_id, hesap_kodu, unvan, kisa_unvan, doviz, kur_tipi, ozel_kod_1, ozel_kod_2, ozel_kod_3, ozel_kod_4, kayit_kullanici_id, kayit_ip)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $firmaId,
                $subeId,
                $hesapKodu,
                $unvan,
                $kisaUnvan,
                $doviz,
                $kurTipi,
                $ozelKod1,
                $ozelKod2,
                $ozelKod3,
                $ozelKod4,
                $userId,
                $_SERVER['REMOTE_ADDR'] ?? ''
            ]);

            $newId = $pdo->lastInsertId();

            Response::success([
                'id' => $newId,
                'message' => 'Cari hesap başarıyla oluşturuldu'
            ], 201);

        } catch (PDOException $e) {
            error_log("Cari Create DB Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("Cari Create Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/cari-update
     * Cari hesap güncelleme
     */
    public function updateCari() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $cariId = (int)($data['cariId'] ?? 0);
        $hesapKodu = trim($data['hesapKodu'] ?? '');
        $unvan = trim($data['unvan'] ?? '');
        $kisaUnvan = trim($data['kisaUnvan'] ?? '');
        $doviz = trim($data['doviz'] ?? 'TL');

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }
        if ($cariId <= 0) {
            Response::error('Cari ID gereklidir', 'VALIDATION_ERROR', 400);
        }
        if (empty($unvan)) {
            Response::error('Ünvan gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $db = Database::getInstance();

            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
                Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
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

            // Cari kaydının varlığını kontrol et
            $existing = $pdo->prepare(
                "SELECT id FROM cariler WHERE id = ? AND firma_id = ? AND aktif != -1"
            );
            $existing->execute([$cariId, $firmaId]);
            if (!$existing->fetch()) {
                Response::error('Cari hesap bulunamadı', 'NOT_FOUND', 404);
            }

            // Hesap kodu değiştiyse duplicate kontrolü
            if (!empty($hesapKodu)) {
                $dupCheck = $pdo->prepare(
                    "SELECT id FROM cariler WHERE firma_id = ? AND hesap_kodu = ? AND id != ? AND aktif != -1"
                );
                $dupCheck->execute([$firmaId, $hesapKodu, $cariId]);
                if ($dupCheck->fetch()) {
                    Response::error('Bu hesap kodu zaten mevcut', 'DUPLICATE_ERROR', 409);
                }
            }

            $updateFields = ['unvan = ?', 'kisa_unvan = ?', 'doviz = ?'];
            $updateParams = [$unvan, $kisaUnvan, $doviz];

            if (!empty($hesapKodu)) {
                $updateFields[] = 'hesap_kodu = ?';
                $updateParams[] = $hesapKodu;
            }

            $updateParams[] = $cariId;
            $updateParams[] = $firmaId;

            $sql = "UPDATE cariler SET " . implode(', ', $updateFields) . " WHERE id = ? AND firma_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($updateParams);

            Response::success([
                'message' => 'Cari hesap güncellendi'
            ]);

        } catch (PDOException $e) {
            error_log("Cari Update DB Error: " . $e->getMessage());
            Response::error('Veritabanı hatası', 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("Cari Update Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/cari-next-kod
     * Seçilen filtre ve şubeye göre sıradaki hesap kodunu döner
     */
    public function getNextHesapKodu() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $filterType = $data['filterType'] ?? 'customers';
        $subeId = (int)($data['subeId'] ?? 0);
        $customPrefix = $data['prefix'] ?? '';

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }
        if ($subeId <= 0) {
            Response::error('Şube seçilmelidir', 'VALIDATION_ERROR', 400);
        }

        // filterType -> hesap kodu prefix
        $prefixMap = [
            'customers' => '120',
            'suppliers' => '320',
            'safes' => '100',
            'banks' => '102',
            'personnel' => '335',
            'stocks' => '150',
        ];

        $prefix = !empty($customPrefix) ? $customPrefix : ($prefixMap[$filterType] ?? '120');

        try {
            $db = Database::getInstance();

            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
                Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
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

            // Şube kodunu al
            $subeStmt = $pdo->prepare("SELECT sube_kodu FROM subeler WHERE id = ? AND firma_id = ? AND aktif = 1 LIMIT 1");
            $subeStmt->execute([$subeId, $firmaId]);
            $subeResult = $subeStmt->fetch();

            if ($subeResult && !empty($subeResult['sube_kodu'])) {
                $subeKodu = $subeResult['sube_kodu'];
            } else {
                $subeKodu = str_pad($subeId, 2, '0', STR_PAD_LEFT);
            }

            $searchPrefix = $prefix . '.' . $subeKodu;

            // Son hesap kodunu bul
            $stmt = $pdo->prepare(
                "SELECT hesap_kodu FROM cariler
                 WHERE firma_id = ? AND sube_id = ? AND hesap_kodu LIKE ?
                 ORDER BY hesap_kodu DESC LIMIT 1"
            );
            $stmt->execute([$firmaId, $subeId, $searchPrefix . '%']);
            $result = $stmt->fetch();

            if ($result && !empty($result['hesap_kodu'])) {
                $lastKod = $result['hesap_kodu'];
                $parts = explode('.', $lastKod);

                if (count($parts) === 4) {
                    $lastNumber = intval($parts[3]);
                    $nextNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
                    $nextKod = implode('.', [$parts[0], $parts[1], $parts[2], $nextNumber]);
                } else {
                    $nextKod = $searchPrefix . '.01.0001';
                }
            } else {
                $nextKod = $searchPrefix . '.01.0001';
            }

            Response::success([
                'hesapKodu' => $nextKod,
                'prefix' => $prefix,
                'subeKodu' => $subeKodu,
            ]);

        } catch (PDOException $e) {
            error_log("Next HesapKodu DB Error: " . $e->getMessage());
            Response::error('Veritabanı hatası', 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("Next HesapKodu Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/cari-balance
     * Cari hesap bakiyesi
     */
    public function getCariBalance() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        // Token kontrolü
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        // Request body'yi al
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        // Parametreleri al
        $dataName = $data['dataName'] ?? '';
        $cariId = $data['cariId'] ?? '';

        // Validasyon
        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        if (empty($cariId)) {
            Response::error('cariId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $db = Database::getInstance();

            // Kullanıcının firma bilgilerini al
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
                Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
            }

            $firmaId = $currentUser['mobil_firmalar_id'];

            // Firma ayarlarını al
            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );

            if (!$firma || empty($firma['firma_ayarlar'])) {
                Response::error('Firma ayarları bulunamadı', 'FIRMA_SETTINGS_NOT_FOUND', 404);
            }

            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];

            // Firma veritabanı bağlantı bilgilerini al
            $veritabani = $firmaAyarlar['veritabani'] ?? [];
            $dbServer = $veritabani['sunucu'] ?? '';
            $dbPort = (int)($veritabani['port'] ?? 3306);
            $dbUser = $veritabani['kullanici'] ?? '';
            $dbPass = $veritabani['sifre'] ?? '';
            $dbName = $veritabani['veriAdi'] ?? '';

            if (empty($dbServer) || empty($dbUser) || empty($dbName)) {
                Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            }

            // Şirket veritabanına bağlan
            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Cari bilgilerini al
            $cariSql = "SELECT hesap_kodu FROM cariler WHERE id = ? AND aktif = 1";
            $cariStmt = $pdo->prepare($cariSql);
            $cariStmt->execute([$cariId]);
            $cari = $cariStmt->fetch();

            if (!$cari) {
                Response::error('Cari bulunamadı', 'CARI_NOT_FOUND', 404);
            }

            // Bakiye hesapla
            $bakiyeSql = "
                SELECT
                    d.cari_doviz AS doviz,
                    SUM(COALESCE(d.cari_alacak, 0) - COALESCE(d.cari_borc, 0)) AS bakiye
                FROM fis_detay d
                INNER JOIN fis_master m ON m.id = d.fis_master_id
                WHERE d.aktif <> -1
                    AND d.hesap_kodu = :hesapKodu
                GROUP BY d.cari_doviz
                HAVING bakiye <> 0
            ";

            $bakiyeStmt = $pdo->prepare($bakiyeSql);
            $bakiyeStmt->execute([':hesapKodu' => $cari['hesap_kodu']]);
            $bakiyeler = $bakiyeStmt->fetchAll();

            $bakiyeList = [];
            foreach ($bakiyeler as $bakiye) {
                $bakiyeList[] = [
                    'doviz' => $bakiye['doviz'] ?? 'TL',
                    'bakiye' => floatval($bakiye['bakiye'] ?? 0),
                    'durum' => floatval($bakiye['bakiye'] ?? 0) > 0 ? 'AB' : 'BB'
                ];
            }

            Response::success([
                'bakiyeler' => $bakiyeList
            ]);

        } catch (PDOException $e) {
            error_log("Cari Balance DB Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("Cari Balance Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/cash-bank-summary
     * Kasa ve Banka özet raporu
     */
    public function getCashBankSummary() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        // Token kontrolü
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        // Request body'yi al
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        // Parametreleri al
        $dataName = $data['dataName'] ?? '';
        $groupBy = $data['groupBy'] ?? 'all'; // 'all' veya 'branch'

        // Validasyon
        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $db = Database::getInstance();

            // Kullanıcının firma bilgilerini al
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
                Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
            }

            $firmaId = $currentUser['mobil_firmalar_id'];

            // Firma ayarlarını al
            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );

            if (!$firma || empty($firma['firma_ayarlar'])) {
                Response::error('Firma ayarları bulunamadı', 'FIRMA_SETTINGS_NOT_FOUND', 404);
            }

            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];

            // Firma veritabanı bağlantı bilgilerini al
            $veritabani = $firmaAyarlar['veritabani'] ?? [];
            $dbServer = $veritabani['sunucu'] ?? '';
            $dbPort = (int)($veritabani['port'] ?? 3306);
            $dbUser = $veritabani['kullanici'] ?? '';
            $dbPass = $veritabani['sifre'] ?? '';
            $dbName = $veritabani['veriAdi'] ?? '';

            if (empty($dbServer) || empty($dbUser) || empty($dbName)) {
                Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            }

            // Şirket veritabanına bağlan
            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            if ($groupBy === 'branch') {
                // Şubeye göre grupla - Optimize edilmiş sorgu
                $kasaQuery = "
                    SELECT
                        s.sube_adi,
                        bakiye_data.doviz,
                        SUM(bakiye_data.bakiye) AS bakiye
                    FROM cariler c
                    INNER JOIN subeler s ON c.sube_id = s.id
                    INNER JOIN (
                        SELECT
                            hesap_kodu,
                            cari_doviz AS doviz,
                            SUM(IFNULL(cari_borc, 0) - IFNULL(cari_alacak, 0)) AS bakiye
                        FROM fis_detay
                        WHERE aktif <> -1
                          AND hesap_kodu LIKE '100%'
                        GROUP BY hesap_kodu, cari_doviz
                        HAVING bakiye <> 0
                    ) AS bakiye_data ON c.hesap_kodu = bakiye_data.hesap_kodu
                    WHERE c.aktif = 1
                    GROUP BY s.sube_adi, bakiye_data.doviz
                    ORDER BY s.sube_adi
                ";

                $bankaQuery = "
                    SELECT
                        s.sube_adi,
                        bakiye_data.doviz,
                        SUM(bakiye_data.bakiye) AS bakiye
                    FROM cariler c
                    INNER JOIN subeler s ON c.sube_id = s.id
                    INNER JOIN (
                        SELECT
                            hesap_kodu,
                            cari_doviz AS doviz,
                            SUM(IFNULL(cari_borc, 0) - IFNULL(cari_alacak, 0)) AS bakiye
                        FROM fis_detay
                        WHERE aktif <> -1
                          AND hesap_kodu LIKE '102%'
                        GROUP BY hesap_kodu, cari_doviz
                        HAVING bakiye <> 0
                    ) AS bakiye_data ON c.hesap_kodu = bakiye_data.hesap_kodu
                    WHERE c.aktif = 1
                    GROUP BY s.sube_adi, bakiye_data.doviz
                    ORDER BY s.sube_adi
                ";
            } else {
                // Tüm şubeler - hesap bazında - Optimize edilmiş sorgu
                $kasaQuery = "
                    SELECT
                        c.id,
                        c.hesap_kodu,
                        c.unvan,
                        s.sube_adi,
                        bakiye_data.doviz,
                        bakiye_data.bakiye
                    FROM cariler c
                    INNER JOIN subeler s ON c.sube_id = s.id
                    INNER JOIN (
                        SELECT
                            hesap_kodu,
                            cari_doviz AS doviz,
                            SUM(IFNULL(cari_borc, 0) - IFNULL(cari_alacak, 0)) AS bakiye
                        FROM fis_detay
                        WHERE aktif <> -1
                          AND hesap_kodu LIKE '100%'
                        GROUP BY hesap_kodu, cari_doviz
                        HAVING bakiye <> 0
                    ) AS bakiye_data ON c.hesap_kodu = bakiye_data.hesap_kodu
                    WHERE c.aktif = 1
                    ORDER BY c.unvan
                ";

                $bankaQuery = "
                    SELECT
                        c.id,
                        c.hesap_kodu,
                        c.unvan,
                        s.sube_adi,
                        bakiye_data.doviz,
                        bakiye_data.bakiye
                    FROM cariler c
                    INNER JOIN subeler s ON c.sube_id = s.id
                    INNER JOIN (
                        SELECT
                            hesap_kodu,
                            cari_doviz AS doviz,
                            SUM(IFNULL(cari_borc, 0) - IFNULL(cari_alacak, 0)) AS bakiye
                        FROM fis_detay
                        WHERE aktif <> -1
                          AND hesap_kodu LIKE '102%'
                        GROUP BY hesap_kodu, cari_doviz
                        HAVING bakiye <> 0
                    ) AS bakiye_data ON c.hesap_kodu = bakiye_data.hesap_kodu
                    WHERE c.aktif = 1
                    ORDER BY c.unvan
                ";
            }

            $kasaStmt = $pdo->query($kasaQuery);
            $kasaList = $kasaStmt->fetchAll();

            $bankaStmt = $pdo->query($bankaQuery);
            $bankaList = $bankaStmt->fetchAll();

            // Sonuçları formatla
            $kasaData = [];
            $bankaData = [];

            if ($groupBy === 'branch') {
                foreach ($kasaList as $row) {
                    $kasaData[] = [
                        'sube' => $row['sube_adi'],
                        'doviz' => $row['doviz'] ?? 'TL',
                        'bakiye' => floatval($row['bakiye'] ?? 0),
                    ];
                }

                foreach ($bankaList as $row) {
                    $bankaData[] = [
                        'sube' => $row['sube_adi'],
                        'doviz' => $row['doviz'] ?? 'TL',
                        'bakiye' => floatval($row['bakiye'] ?? 0),
                    ];
                }
            } else {
                foreach ($kasaList as $row) {
                    $kasaData[] = [
                        'id' => $row['id'],
                        'hesapKodu' => $row['hesap_kodu'],
                        'unvan' => $row['unvan'],
                        'sube' => $row['sube_adi'],
                        'doviz' => $row['doviz'] ?? 'TL',
                        'bakiye' => floatval($row['bakiye'] ?? 0),
                    ];
                }

                foreach ($bankaList as $row) {
                    $bankaData[] = [
                        'id' => $row['id'],
                        'hesapKodu' => $row['hesap_kodu'],
                        'unvan' => $row['unvan'],
                        'sube' => $row['sube_adi'],
                        'doviz' => $row['doviz'] ?? 'TL',
                        'bakiye' => floatval($row['bakiye'] ?? 0),
                    ];
                }
            }

            Response::success([
                'kasa' => $kasaData,
                'banka' => $bankaData,
                'groupBy' => $groupBy
            ]);

        } catch (PDOException $e) {
            error_log("Cash Bank Summary DB Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("Cash Bank Summary Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/cari-ekstre
     * Cari hesap ekstre (işlem hareketleri)
     */
    public function getCariEkstre() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        // Token kontrolü
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        // Request body'yi al
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        // Parametreleri al
        $dataName = $data['dataName'] ?? '';
        $cariId = $data['cariId'] ?? null;
        $startDate = $data['startDate'] ?? null;
        $endDate = $data['endDate'] ?? null;
        $limit = min((int)($data['limit'] ?? 100), 500); // Max 500

        // Validasyon
        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        if (!$cariId) {
            Response::error('cariId gereklidir', 'VALIDATION_ERROR', 400);
        }

        $cariId = (int)$cariId;

        try {
            $db = Database::getInstance();

            // Kullanıcının firma bilgilerini al
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );

            if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
                Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
            }

            $firmaId = $currentUser['mobil_firmalar_id'];

            // Firma ayarlarını al
            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );

            if (!$firma || empty($firma['firma_ayarlar'])) {
                Response::error('Firma ayarları bulunamadı', 'FIRMA_SETTINGS_NOT_FOUND', 404);
            }

            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];

            // Firma veritabanı bağlantı bilgilerini al
            $veritabani = $firmaAyarlar['veritabani'] ?? [];
            $dbServer = $veritabani['sunucu'] ?? '';
            $dbPort = (int)($veritabani['port'] ?? 3306);
            $dbUser = $veritabani['kullanici'] ?? '';
            $dbPass = $veritabani['sifre'] ?? '';
            $dbName = $veritabani['veriAdi'] ?? '';

            if (empty($dbServer) || empty($dbUser) || empty($dbName)) {
                Response::error('Firma veritabanı ayarları eksik', 'DB_CONFIG_MISSING', 400);
            }

            // Şirket veritabanına bağlan
            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Cari bilgilerini al
            $cariSql = "SELECT id, hesap_kodu, unvan, doviz FROM cariler WHERE id = ? AND aktif = 1";
            $cariStmt = $pdo->prepare($cariSql);
            $cariStmt->execute([$cariId]);
            $cari = $cariStmt->fetch();

            if (!$cari) {
                Response::error('Cari bulunamadı', 'CARI_NOT_FOUND', 404);
            }

            // Tarih filtresi hazırla
            $dateFilter = '';
            $params = [':hesapKodu' => $cari['hesap_kodu']];

            if ($startDate) {
                $dateFilter .= ' AND m.fis_tarihi >= :startDate';
                $params[':startDate'] = $startDate;
            }
            if ($endDate) {
                $dateFilter .= ' AND m.fis_tarihi <= :endDate';
                $params[':endDate'] = $endDate;
            }

            // Ekstre sorgusu - kümülatif bakiye hesaplama
            $ekstreSql = "
                SELECT
                    d.id,
                    m.fis_tarihi AS tarih,
                    m.fis_no AS fisNo,
                    COALESCE(d.aciklama, '') AS aciklama,
                    COALESCE(d.cari_borc, 0) AS borc,
                    COALESCE(d.cari_alacak, 0) AS alacak,
                    d.cari_doviz AS doviz
                FROM fis_detay d
                INNER JOIN fis_master m ON m.id = d.fis_master_id
                WHERE d.aktif <> -1
                    AND d.hesap_kodu = :hesapKodu
                    {$dateFilter}
                ORDER BY m.fis_tarihi ASC, m.id ASC
                LIMIT {$limit}
            ";

            $ekstreStmt = $pdo->prepare($ekstreSql);
            $ekstreStmt->execute($params);
            $rows = $ekstreStmt->fetchAll();

            // Kümülatif bakiye hesapla
            $transactions = [];
            $bakiye = 0;

            foreach ($rows as $row) {
                $borc = floatval($row['borc'] ?? 0);
                $alacak = floatval($row['alacak'] ?? 0);
                $bakiye = $bakiye + $borc - $alacak;

                $transactions[] = [
                    'id' => (int)$row['id'],
                    'tarih' => $row['tarih'],
                    'fisNo' => $row['fisNo'] ?? '',
                    'aciklama' => $row['aciklama'],
                    'borc' => $borc,
                    'alacak' => $alacak,
                    'bakiye' => $bakiye,
                    'doviz' => $row['doviz'] ?? 'TL',
                    'fisTuru' => 'İşlem'
                ];
            }

            // Toplam hesapla
            $toplamBorc = array_sum(array_column($transactions, 'borc'));
            $toplamAlacak = array_sum(array_column($transactions, 'alacak'));

            Response::success([
                'cari' => [
                    'id' => (int)$cari['id'],
                    'hesapKodu' => $cari['hesap_kodu'],
                    'unvan' => $cari['unvan'],
                    'doviz' => $cari['doviz'] ?? 'TL'
                ],
                'transactions' => $transactions,
                'summary' => [
                    'toplamBorc' => $toplamBorc,
                    'toplamAlacak' => $toplamAlacak,
                    'bakiye' => $bakiye,
                    'count' => count($transactions)
                ]
            ]);

        } catch (PDOException $e) {
            error_log("Cari Ekstre DB Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("Cari Ekstre Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/banka-komisyon-oran
     * Bir bankanın komisyon oranlarını getirir
     */
    public function getBankaKomisyonOran() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $dataName = $data['dataName'] ?? '';
        $cariId = isset($data['cariId']) ? (int)$data['cariId'] : 0;

        if (empty($dataName) || !$cariId) {
            Response::error('dataName ve cariId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $pdo = $this->getFirmaPdo($userId, $dataName);

            $row = $pdo->prepare("SELECT id, unvan, banka_kart_oran FROM cariler WHERE id = ? AND aktif = 1 LIMIT 1");
            $row->execute([$cariId]);
            $cari = $row->fetch();

            if (!$cari) {
                Response::error('Cari bulunamadı', 'NOT_FOUND', 404);
            }

            $komisyonOranlar = [];
            if (!empty($cari['banka_kart_oran'])) {
                $decoded = json_decode($cari['banka_kart_oran'], true);
                if (is_array($decoded)) {
                    $komisyonOranlar = $decoded;
                }
            }

            Response::success([
                'cariId' => $cariId,
                'bankaAdi' => $cari['unvan'],
                'komisyonOranlar' => $komisyonOranlar,
            ]);

        } catch (PDOException $e) {
            error_log("BankaKomisyonOran DB Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("BankaKomisyonOran Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/banka-komisyon-oran-update
     * Bir bankanın komisyon oranlarını günceller (banka_komisyon_oran JSON alanı)
     */
    public function updateBankaKomisyonOran() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $dataName = $data['dataName'] ?? '';
        $cariId = isset($data['cariId']) ? (int)$data['cariId'] : 0;
        $komisyonOranlar = $data['komisyonOranlar'] ?? [];

        if (empty($dataName) || !$cariId) {
            Response::error('dataName ve cariId gereklidir', 'VALIDATION_ERROR', 400);
        }

        if (!is_array($komisyonOranlar)) {
            Response::error('komisyonOranlar dizi olmalıdır', 'VALIDATION_ERROR', 400);
        }

        // Sanitize: sadece taksit (string) ve oran (float) kabul et
        $sanitized = [];
        foreach ($komisyonOranlar as $item) {
            if (!isset($item['taksit']) || !isset($item['oran'])) continue;
            $sanitized[] = [
                'taksit' => (string)$item['taksit'],
                'oran' => (float)$item['oran'],
            ];
        }

        try {
            $pdo = $this->getFirmaPdo($userId, $dataName);

            $stmt = $pdo->prepare("UPDATE cariler SET banka_kart_oran = ? WHERE id = ? AND aktif = 1");
            $stmt->execute([json_encode($sanitized, JSON_UNESCAPED_UNICODE), $cariId]);

            if ($stmt->rowCount() === 0) {
                Response::error('Cari bulunamadı veya güncelleme yapılamadı', 'NOT_FOUND', 404);
            }

            Response::success(['message' => 'Komisyon oranları güncellendi', 'cariId' => $cariId]);

        } catch (PDOException $e) {
            error_log("UpdateBankaKomisyonOran DB Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("UpdateBankaKomisyonOran Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * Firma PDO bağlantısını döner (ortak yardımcı)
     */
    /**
     * POST /account/kasa-list
     * Kasa fişleri listesi
     */
    public function getKasaList() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];
        $dataName = $data['dataName'] ?? '';
        $subeId = isset($data['subeId']) ? (int)$data['subeId'] : 0;
        $kasaDurum = $data['kasaDurum'] ?? 'acik';

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            // Cari hesaplarla aynı pattern: firma bilgilerini al, DB'ye bağlan
            $db = Database::getInstance();
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );
            if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
                Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
            }
            $firmaId = $currentUser['mobil_firmalar_id'];

            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );
            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];
            $veritabani = $firmaAyarlar['veritabani'] ?? [];
            $dbServer = $veritabani['sunucu'] ?? '';
            $dbPort = (int)($veritabani['port'] ?? 3306);
            $dbUser = $veritabani['kullanici'] ?? '';
            $dbPass = $veritabani['sifre'] ?? '';
            $dbName = $veritabani['veriAdi'] ?? '';

            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            $params = [':firma_id' => $firmaId, ':firma_id2' => $firmaId];
            $subeFilter = '';
            if ($subeId > 0) {
                $subeFilter = ' AND fm.sube_id = :sube_id';
                $params[':sube_id'] = $subeId;
            }
            $durumFilter = '';
            if ($kasaDurum === 'acik') {
                $durumFilter = ' AND fm.kasa_durum = 1';
            } elseif ($kasaDurum === 'kapali') {
                $durumFilter = ' AND fm.kasa_durum = 0';
            }

            $sql = "
                SELECT
                    fm.id,
                    fm.fis_no,
                    fm.fis_tipi,
                    fm.fis_tarihi,
                    fm.fis_aciklama,
                    fm.kasa_hesap_kodu,
                    fm.kasa_durum,
                    fm.kayit_tarihi,
                    c.unvan AS kasa_unvan,
                    c.doviz AS kasa_doviz,
                    s.sube_adi
                FROM fis_master fm
                LEFT JOIN cariler c ON c.hesap_kodu = fm.kasa_hesap_kodu AND c.firma_id = :firma_id2 AND c.sube_id = fm.sube_id AND c.aktif = 1
                LEFT JOIN subeler s ON fm.sube_id = s.id
                WHERE fm.firma_id = :firma_id
                  AND fm.aktif = 0
                  AND fm.kasa_hesap_kodu <> ''
                  {$durumFilter}
                  {$subeFilter}
                GROUP BY fm.id
                ORDER BY fm.fis_tarihi DESC, fm.id DESC
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $result = [];
            foreach ($rows as $row) {
                $result[] = [
                    'id' => (int)$row['id'],
                    'fisNo' => $row['fis_no'],
                    'fisTipi' => $row['fis_tipi'],
                    'fisTarihi' => $row['fis_tarihi'],
                    'fisAciklama' => $row['fis_aciklama'],
                    'kasaHesapKodu' => $row['kasa_hesap_kodu'],
                    'kasaUnvan' => $row['kasa_unvan'] ?? '',
                    'kasaDoviz' => $row['kasa_doviz'] ?? 'TL',
                    'kasaDurum' => (int)$row['kasa_durum'],
                    'subeAdi' => $row['sube_adi'] ?? '',
                    'kayitTarihi' => $row['kayit_tarihi'],
                ];
            }

            Response::success([
                'data' => $result,
                'count' => count($result),
            ]);
        } catch (PDOException $e) {
            error_log("getKasaList Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("getKasaList Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/kasa-create
     * Yeni kasa fişi oluştur
     */
    public function createKasa() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $kasaHesapKodu = $data['kasaHesapKodu'] ?? '';
        $fisTarihi = $data['fisTarihi'] ?? '';
        $fisAciklama = $data['fisAciklama'] ?? '';
        $subeId = isset($data['subeId']) ? (int)$data['subeId'] : 0;

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }
        if (empty($kasaHesapKodu)) {
            Response::error('Kasa seçimi zorunludur', 'VALIDATION_ERROR', 400);
        }
        if (empty($fisTarihi)) {
            Response::error('Tarih zorunludur', 'VALIDATION_ERROR', 400);
        }
        if (empty($subeId)) {
            Response::error('Şube bilgisi zorunludur', 'VALIDATION_ERROR', 400);
        }

        try {
            $pdo = $this->getFirmaPdo($userId, $dataName);

            // Firma id al
            $db = Database::getInstance();
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );
            $firmaId = $currentUser['mobil_firmalar_id'];

            // Aynı tarih + aynı kasa kodu ile mükerrer kayıt kontrolü
            $fisTarihiDate = date('Y-m-d', strtotime($fisTarihi));
            $duplicateCheck = $pdo->prepare("
                SELECT id FROM fis_master
                WHERE firma_id = :firma_id
                  AND sube_id = :sube_id
                  AND kasa_hesap_kodu = :kasa_hesap_kodu
                  AND DATE(fis_tarihi) = :fis_tarihi
                  AND aktif != -1
                LIMIT 1
            ");
            $duplicateCheck->execute([
                ':firma_id' => $firmaId,
                ':sube_id' => $subeId,
                ':kasa_hesap_kodu' => $kasaHesapKodu,
                ':fis_tarihi' => $fisTarihiDate,
            ]);
            if ($duplicateCheck->fetch()) {
                Response::error('Bu tarih ve kasa kodu ile zaten bir kasa fişi mevcut', 'DUPLICATE_ERROR', 400);
            }

            // Son fiş numarasını al ve bir sonrakini oluştur
            $yil = date('y', strtotime($fisTarihi));
            $prefix = $yil . '-';
            $lastFisNo = $pdo->prepare("
                SELECT fis_no FROM fis_master
                WHERE fis_no LIKE :prefix
                ORDER BY fis_no DESC
                LIMIT 1
            ");
            $lastFisNo->execute([':prefix' => $prefix . '%']);
            $lastRow = $lastFisNo->fetch();

            if ($lastRow) {
                $lastNum = (int)substr($lastRow['fis_no'], strlen($prefix));
                $nextNum = $lastNum + 1;
            } else {
                $nextNum = 1;
            }
            $fisNo = $prefix . str_pad($nextNum, 6, '0', STR_PAD_LEFT);

            // Insert
            $stmt = $pdo->prepare("
                INSERT INTO fis_master (
                    firma_id, sube_id, fis_no, fis_tipi, fis_tarihi,
                    kayit_id, kayit_tablo, resmi_gayri_resmi,
                    fis_aciklama, kasa_hesap_kodu, kasa_durum,
                    kayit_kullanici_id, kayit_ip, aktif
                ) VALUES (
                    :firma_id, :sube_id, :fis_no, 'Kasa', :fis_tarihi,
                    0, 'diger', 0,
                    :fis_aciklama, :kasa_hesap_kodu, 1,
                    :kullanici_id, :ip, 0
                )
            ");

            $stmt->execute([
                ':firma_id' => $firmaId,
                ':sube_id' => $subeId,
                ':fis_no' => $fisNo,
                ':fis_tarihi' => $fisTarihi,
                ':fis_aciklama' => $fisAciklama,
                ':kasa_hesap_kodu' => $kasaHesapKodu,
                ':kullanici_id' => $userId,
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]);

            $newId = (int)$pdo->lastInsertId();

            Response::success([
                'id' => $newId,
                'fisNo' => $fisNo,
                'message' => 'Kasa fişi başarıyla oluşturuldu',
            ]);
        } catch (PDOException $e) {
            error_log("createKasa Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("createKasa Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/kasa-bakiye
     * Kasa bakiyesi - döviz bazında borç/alacak toplamları
     */
    public function getKasaBakiye() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];
        $dataName = $data['dataName'] ?? '';
        $fisMasterId = isset($data['fisMasterId']) ? (int)$data['fisMasterId'] : 0;

        if (empty($dataName) || empty($fisMasterId)) {
            Response::error('dataName ve fisMasterId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $db = Database::getInstance();
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );
            $firmaId = $currentUser['mobil_firmalar_id'];
            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );
            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];
            $veritabani = $firmaAyarlar['veritabani'] ?? [];

            $dsn = "mysql:host={$veritabani['sunucu']};port=" . (int)($veritabani['port'] ?? 3306) . ";dbname={$veritabani['veriAdi']};charset=utf8mb4";
            $pdo = new PDO($dsn, $veritabani['kullanici'], $veritabani['sifre'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            $sql = "
                SELECT
                    COALESCE(NULLIF(fd.dovizli_doviz, ''), 'TL') AS doviz,
                    SUM(fd.dovizli_borc) AS toplam_borc,
                    SUM(fd.dovizli_alacak) AS toplam_alacak,
                    SUM(fd.dovizli_borc) - SUM(fd.dovizli_alacak) AS bakiye
                FROM fis_detay fd
                WHERE fd.fis_master_id = :fis_master_id
                  AND fd.aktif != -1
                  AND fd.hesap_kodu NOT LIKE '100%'
                GROUP BY COALESCE(NULLIF(fd.dovizli_doviz, ''), 'TL')
                ORDER BY doviz
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([':fis_master_id' => $fisMasterId]);
            $rows = $stmt->fetchAll();

            $result = [];
            foreach ($rows as $row) {
                $result[] = [
                    'doviz' => $row['doviz'],
                    'borc' => (float)$row['toplam_borc'],
                    'alacak' => (float)$row['toplam_alacak'],
                    'bakiye' => (float)$row['bakiye'],
                ];
            }

            // Hareketler - 100 ile başlayan kasa hesapları hariç
            $sqlHareketler = "
                SELECT
                    fd.id,
                    fd.hesap_kodu,
                    fd.aciklama,
                    fd.dovizli_borc,
                    fd.dovizli_alacak,
                    COALESCE(NULLIF(fd.dovizli_doviz, ''), 'TL') AS doviz,
                    c.unvan AS cari_unvan
                FROM fis_detay fd
                LEFT JOIN cariler c ON c.hesap_kodu = fd.hesap_kodu AND c.firma_id = :firma_id AND c.aktif = 1
                WHERE fd.fis_master_id = :fis_master_id2
                  AND fd.aktif != -1
                  AND fd.hesap_kodu NOT LIKE '100%'
                ORDER BY fd.id
            ";

            $stmtH = $pdo->prepare($sqlHareketler);
            $stmtH->execute([':fis_master_id2' => $fisMasterId, ':firma_id' => $firmaId]);
            $hareketRows = $stmtH->fetchAll();

            $girisler = [];
            $cikislar = [];
            foreach ($hareketRows as $row) {
                $item = [
                    'id' => (int)$row['id'],
                    'hesapKodu' => $row['hesap_kodu'],
                    'unvan' => $row['cari_unvan'] ?? '',
                    'aciklama' => $row['aciklama'] ?? '',
                    'doviz' => $row['doviz'],
                ];
                // Alacak = kasaya giriş, Borç = kasadan çıkış
                if ((float)$row['dovizli_alacak'] > 0) {
                    $item['tutar'] = (float)$row['dovizli_alacak'];
                    $girisler[] = $item;
                }
                if ((float)$row['dovizli_borc'] > 0) {
                    $item['tutar'] = (float)$row['dovizli_borc'];
                    $cikislar[] = $item;
                }
            }

            Response::success([
                'data' => $result,
                'girisler' => $girisler,
                'cikislar' => $cikislar,
            ]);
        } catch (PDOException $e) {
            error_log("getKasaBakiye Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("getKasaBakiye Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/kasa-hareket
     * Kasa giriş/çıkış hareketi ekle
     */
    public function createKasaHareket() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $fisMasterId = isset($data['fisMasterId']) ? (int)$data['fisMasterId'] : 0;
        $hesapKodu = $data['hesapKodu'] ?? '';
        $aciklama = $data['aciklama'] ?? '';
        $tip = $data['tip'] ?? 'giris';
        $subeId = isset($data['subeId']) ? (int)$data['subeId'] : 0;

        // Dövizli
        $dovizliTutar = isset($data['tutar']) ? (float)$data['tutar'] : 0;
        $dovizliDoviz = $data['doviz'] ?? 'TL';
        $dovizliKur = isset($data['dovizKuru']) ? (float)$data['dovizKuru'] : 1;
        // Muhasebe
        $muhasebeTutar = isset($data['muhasebeTutar']) ? (float)$data['muhasebeTutar'] : $dovizliTutar;
        $muhasebeDoviz = $data['muhasebeDoviz'] ?? 'TL';
        $muhasebeKur = isset($data['muhasebeKuru']) ? (float)$data['muhasebeKuru'] : 1;
        // Cari
        $cariTutar = isset($data['cariTutar']) ? (float)$data['cariTutar'] : $dovizliTutar;
        $cariDoviz = $data['cariDoviz'] ?? 'TL';
        $cariKur = isset($data['cariKuru']) ? (float)$data['cariKuru'] : 1;

        if (empty($dataName) || empty($fisMasterId) || empty($hesapKodu) || $dovizliTutar <= 0) {
            Response::error('Zorunlu alanlar eksik', 'VALIDATION_ERROR', 400);
        }

        try {
            $db = Database::getInstance();
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );
            $firmaId = $currentUser['mobil_firmalar_id'];
            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );
            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];
            $veritabani = $firmaAyarlar['veritabani'] ?? [];

            $dsn = "mysql:host={$veritabani['sunucu']};port=" . (int)($veritabani['port'] ?? 3306) . ";dbname={$veritabani['veriAdi']};charset=utf8mb4";
            $pdo = new PDO($dsn, $veritabani['kullanici'], $veritabani['sifre'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Giriş: karşı hesap alacak, kasa borç
            // Çıkış: karşı hesap borç, kasa alacak
            $muhBorc = $tip === 'cikis' ? $muhasebeTutar : 0;
            $muhAlacak = $tip === 'giris' ? $muhasebeTutar : 0;
            $dovBorc = $tip === 'cikis' ? $dovizliTutar : 0;
            $dovAlacak = $tip === 'giris' ? $dovizliTutar : 0;
            $carBorc = $tip === 'cikis' ? $cariTutar : 0;
            $carAlacak = $tip === 'giris' ? $cariTutar : 0;

            // Random: iki ayağı eşleştirmek için
            $random = bin2hex(random_bytes(18));

            // Karşı hesap kaydı
            $insertSql = "
                INSERT INTO fis_detay (
                    firma_id, sube_id, fis_master_id, hesap_kodu, aciklama,
                    borc, alacak, doviz, doviz_kuru,
                    dovizli_borc, dovizli_alacak, dovizli_doviz, dovizli_kur,
                    cari_borc, cari_alacak, cari_doviz, cari_kur,
                    random, kayit_kullanici_id, kayit_ip, aktif
                ) VALUES (
                    :firma_id, :sube_id, :fis_master_id, :hesap_kodu, :aciklama,
                    :borc, :alacak, :doviz, :doviz_kuru,
                    :dovizli_borc, :dovizli_alacak, :dovizli_doviz, :dovizli_kur,
                    :cari_borc, :cari_alacak, :cari_doviz, :cari_kur,
                    :random, :kullanici_id, :ip, 1
                )
            ";

            $stmt = $pdo->prepare($insertSql);
            $stmt->execute([
                ':firma_id' => $firmaId,
                ':sube_id' => $subeId,
                ':fis_master_id' => $fisMasterId,
                ':hesap_kodu' => $hesapKodu,
                ':aciklama' => $aciklama,
                ':borc' => $muhBorc,
                ':alacak' => $muhAlacak,
                ':doviz' => $muhasebeDoviz,
                ':doviz_kuru' => $muhasebeKur,
                ':dovizli_borc' => $dovBorc,
                ':dovizli_alacak' => $dovAlacak,
                ':dovizli_doviz' => $dovizliDoviz,
                ':dovizli_kur' => $dovizliKur,
                ':cari_borc' => $carBorc,
                ':cari_alacak' => $carAlacak,
                ':cari_doviz' => $cariDoviz,
                ':cari_kur' => $cariKur,
                ':random' => $random,
                ':kullanici_id' => $userId,
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]);

            $karsiHesapId = (int)$pdo->lastInsertId();

            // Kasa hesap kaydı (ters yön)
            $kasaRow = $pdo->prepare("SELECT kasa_hesap_kodu FROM fis_master WHERE id = ?");
            $kasaRow->execute([$fisMasterId]);
            $kasaHesapKodu = $kasaRow->fetchColumn();

            if ($kasaHesapKodu) {
                $kasaMuhBorc = $tip === 'giris' ? $muhasebeTutar : 0;
                $kasaMuhAlacak = $tip === 'cikis' ? $muhasebeTutar : 0;
                $kasaDovBorc = $tip === 'giris' ? $dovizliTutar : 0;
                $kasaDovAlacak = $tip === 'cikis' ? $dovizliTutar : 0;
                $kasaCarBorc = $tip === 'giris' ? $cariTutar : 0;
                $kasaCarAlacak = $tip === 'cikis' ? $cariTutar : 0;

                $stmt2 = $pdo->prepare($insertSql);
                $stmt2->execute([
                    ':firma_id' => $firmaId,
                    ':sube_id' => $subeId,
                    ':fis_master_id' => $fisMasterId,
                    ':hesap_kodu' => $kasaHesapKodu,
                    ':aciklama' => $aciklama,
                    ':borc' => $kasaMuhBorc,
                    ':alacak' => $kasaMuhAlacak,
                    ':doviz' => $muhasebeDoviz,
                    ':doviz_kuru' => $muhasebeKur,
                    ':dovizli_borc' => $kasaDovBorc,
                    ':dovizli_alacak' => $kasaDovAlacak,
                    ':dovizli_doviz' => $dovizliDoviz,
                    ':dovizli_kur' => $dovizliKur,
                    ':cari_borc' => $kasaCarBorc,
                    ':cari_alacak' => $kasaCarAlacak,
                    ':cari_doviz' => $cariDoviz,
                    ':cari_kur' => $cariKur,
                    ':random' => $random,
                    ':kullanici_id' => $userId,
                    ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                ]);
            }

            Response::success([
                'message' => 'Kasa hareketi başarıyla kaydedildi',
                'fisDetayId' => $karsiHesapId,
            ]);
        } catch (PDOException $e) {
            error_log("createKasaHareket Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("createKasaHareket Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/kasa-cari-list
     * Kasalar (hesap_kodu LIKE 100%) cari listesi
     */
    public function getKasaCariList() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];
        $dataName = $data['dataName'] ?? '';

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $db = Database::getInstance();
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );
            $firmaId = $currentUser['mobil_firmalar_id'];

            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );
            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];
            $veritabani = $firmaAyarlar['veritabani'] ?? [];

            $dsn = "mysql:host={$veritabani['sunucu']};port=" . (int)($veritabani['port'] ?? 3306) . ";dbname={$veritabani['veriAdi']};charset=utf8mb4";
            $pdo = new PDO($dsn, $veritabani['kullanici'], $veritabani['sifre'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            $sql = "
                SELECT c.id, c.hesap_kodu, c.unvan, s.sube_adi
                FROM cariler c
                LEFT JOIN subeler s ON c.sube_id = s.id
                WHERE c.aktif = 1
                  AND c.firma_id = :firmaId
                  AND c.hesap_kodu LIKE '100%'
                ORDER BY c.unvan
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([':firmaId' => $firmaId]);
            $rows = $stmt->fetchAll();

            $result = [];
            foreach ($rows as $row) {
                $result[] = [
                    'id' => (int)$row['id'],
                    'hesapKodu' => $row['hesap_kodu'],
                    'unvan' => $row['unvan'],
                    'subeAdi' => $row['sube_adi'] ?? '',
                ];
            }

            Response::success([
                'data' => $result,
                'count' => count($result),
            ]);
        } catch (PDOException $e) {
            error_log("getKasaCariList Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("getKasaCariList Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    /**
     * POST /account/kasa-upload-fis
     * Kasa fişi görseli yükle
     */
    public function uploadFisDosya() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $fisMasterId = $_POST['fisMasterId'] ?? '';
        $dataName = $_POST['dataName'] ?? '';
        $subeId = isset($_POST['subeId']) ? (int)$_POST['subeId'] : 0;

        if (empty($fisMasterId) || empty($dataName)) {
            Response::error('fisMasterId ve dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            Response::error('Dosya gereklidir', 'FILE_REQUIRED', 400);
        }

        $file = $_FILES['file'];

        if ($file['size'] > 10 * 1024 * 1024) {
            Response::error('Dosya boyutu 10MB\'dan büyük olamaz', 'FILE_TOO_LARGE', 400);
        }

        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes)) {
            Response::error('Geçersiz dosya tipi. JPG, PNG, WebP ve PDF kabul edilir.', 'INVALID_FILE_TYPE', 400);
        }

        try {
            $db = Database::getInstance();
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
                [$userId]
            );
            $firmaId = $currentUser['mobil_firmalar_id'];

            $firma = $db->fetchOne(
                "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
                [$firmaId]
            );
            $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];
            $veritabani = $firmaAyarlar['veritabani'] ?? [];

            $dsn = "mysql:host={$veritabani['sunucu']};port=" . (int)($veritabani['port'] ?? 3306) . ";dbname={$veritabani['veriAdi']};charset=utf8mb4";
            $pdo = new PDO($dsn, $veritabani['kullanici'], $veritabani['sifre'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Domain bilgisi
            $url = $firmaAyarlar['url'] ?? [];
            $domain = $url['domain'] ?? '';
            if (empty($domain)) {
                Response::error('Firma domain bilgisi bulunamadı', 'DOMAIN_NOT_FOUND', 400);
            }

            // Dosya uzantısı
            $extMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'application/pdf' => 'pdf'];
            $ext = $extMap[$mimeType] ?? 'jpg';

            $fileName = bin2hex(random_bytes(32)) . '.' . $ext;

            $subdomain = explode('.', $domain)[0];
            $uploadDir = '/home/golakscom/public_html/' . $subdomain . '/upload/' . $firmaId . '/fis_dosya/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $filePath = $uploadDir . $fileName;
            $publicUrl = 'https://' . $domain . '/upload/' . $firmaId . '/fis_dosya/' . $fileName;

            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                Response::error('Dosya yüklenemedi', 'UPLOAD_FAILED', 500);
            }

            // Resim optimizasyonu (PDF hariç)
            if ($mimeType !== 'application/pdf') {
                $this->optimizeFisImage($filePath, $mimeType);
                $file['size'] = filesize($filePath);
            }

            // dosyalar tablosuna kaydet
            $dosyaBoyutuMB = round($file['size'] / (1024 * 1024), 2);
            $stmt = $pdo->prepare("
                INSERT INTO dosyalar (firma_id, sube_id, modul, modul_kayit_id, tanim_id, dosya_adi, dosya_yolu, dosya_tipi, dosya_boyutu, aciklama, kayit_tarihi, kullanici_kayit_id, kayit_ip, aktif)
                VALUES (?, ?, 'fis_detay', ?, 0, ?, ?, ?, ?, '', NOW(), ?, ?, 1)
            ");
            $stmt->execute([
                $firmaId,
                $subeId ?: 1,
                (int)$fisMasterId,
                $file['name'],
                $publicUrl,
                $ext,
                $dosyaBoyutuMB,
                $userId,
                $_SERVER['REMOTE_ADDR'] ?? '',
            ]);

            Response::success([
                'id' => (int)$pdo->lastInsertId(),
                'url' => $publicUrl,
                'dosyaAdi' => $file['name'],
            ]);
        } catch (PDOException $e) {
            error_log("uploadFisDosya Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("uploadFisDosya Error: " . $e->getMessage());
            Response::error($e->getMessage(), 'SERVER_ERROR', 500);
        }
    }

    private function optimizeFisImage(string $filePath, string $mimeType): void {
        if (!extension_loaded('gd')) return;

        $maxWidth = 1200;
        $maxHeight = 1200;
        $jpegQuality = 70;

        $source = null;
        switch ($mimeType) {
            case 'image/jpeg': $source = @imagecreatefromjpeg($filePath); break;
            case 'image/png': $source = @imagecreatefrompng($filePath); break;
            case 'image/webp': $source = @imagecreatefromwebp($filePath); break;
        }

        if (!$source) return;

        $origWidth = imagesx($source);
        $origHeight = imagesy($source);
        $ratio = min($maxWidth / $origWidth, $maxHeight / $origHeight, 1.0);
        $newWidth = (int)round($origWidth * $ratio);
        $newHeight = (int)round($origHeight * $ratio);

        $resized = imagecreatetruecolor($newWidth, $newHeight);
        if ($mimeType === 'image/png' || $mimeType === 'image/webp') {
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
        }
        imagecopyresampled($resized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);
        imagedestroy($source);
        imagejpeg($resized, $filePath, $jpegQuality);
        imagedestroy($resized);
    }

    private function getFirmaPdo(int $userId, string $dataName): PDO {
        $db = Database::getInstance();

        $currentUser = $db->fetchOne(
            "SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?",
            [$userId]
        );
        if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
            throw new Exception('Kullanıcı firma bilgisi bulunamadı');
        }

        $firma = $db->fetchOne(
            "SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?",
            [$currentUser['mobil_firmalar_id']]
        );
        if (!$firma || empty($firma['firma_ayarlar'])) {
            throw new Exception('Firma ayarları bulunamadı');
        }

        $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];
        $v = $firmaAyarlar['veritabani'] ?? [];
        $dbServer = $v['sunucu'] ?? '';
        $dbPort   = (int)($v['port'] ?? 3306);
        $dbUser   = $v['kullanici'] ?? '';
        $dbPass   = $v['sifre'] ?? '';
        $dbName   = $v['veriAdi'] ?? '';

        if (empty($dbServer) || empty($dbUser) || empty($dbName)) {
            throw new Exception('Firma veritabanı ayarları eksik');
        }

        $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbName};charset=utf8mb4";
        return new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    /**
     * POST /account/sube-ayarlar
     * Şube genel ayarlarını getirir
     */
    public function getSubeAyarlar() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $dataName = $data['dataName'] ?? '';
        $subeId = (int)($data['subeId'] ?? 0);

        if (empty($dataName) || $subeId <= 0) {
            Response::error('dataName ve subeId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $pdo = $this->getFirmaPdo($auth['user_id'], $dataName);

            $stmt = $pdo->prepare("SELECT sube_genel_ayar FROM subeler WHERE id = ?");
            $stmt->execute([$subeId]);
            $row = $stmt->fetch();

            if (!$row) {
                Response::error('Şube bulunamadı', 'NOT_FOUND', 404);
                return;
            }

            $ayarlar = $row['sube_genel_ayar'] ? json_decode($row['sube_genel_ayar'], true) : [];

            Response::success($ayarlar);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        }
    }

    /**
     * POST /account/sube-ayarlar-save
     * Şube genel ayarlarını kaydeder
     */
    public function saveSubeAyarlar() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $dataName = $data['dataName'] ?? '';
        $subeId = (int)($data['subeId'] ?? 0);
        $ayarlar = $data['ayarlar'] ?? [];

        if (empty($dataName) || $subeId <= 0) {
            Response::error('dataName ve subeId gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $pdo = $this->getFirmaPdo($auth['user_id'], $dataName);

            // Mevcut ayarları al ve merge et
            $stmt = $pdo->prepare("SELECT sube_genel_ayar FROM subeler WHERE id = ?");
            $stmt->execute([$subeId]);
            $row = $stmt->fetch();

            if (!$row) {
                Response::error('Şube bulunamadı', 'NOT_FOUND', 404);
                return;
            }

            $mevcutAyarlar = $row['sube_genel_ayar'] ? json_decode($row['sube_genel_ayar'], true) : [];
            $yeniAyarlar = array_merge($mevcutAyarlar, $ayarlar);

            $stmt = $pdo->prepare("UPDATE subeler SET sube_genel_ayar = ? WHERE id = ?");
            $stmt->execute([json_encode($yeniAyarlar, JSON_UNESCAPED_UNICODE), $subeId]);

            Response::success(['message' => 'Ayarlar kaydedildi']);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        }
    }
}
