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

        // Validasyon
        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        $validFilters = ['all', 'customers', 'suppliers', 'safes', 'banks', 'personnel'];
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
                    AND c.hesap_kodu LIKE :hesapKodu
                    AND (
                        c.unvan LIKE :search
                        OR c.kisa_unvan LIKE :search2
                        OR c.hesap_kodu LIKE :search3
                        OR s.sube_adi LIKE :search4
                    )
                ORDER BY c.unvan
                LIMIT 100
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':hesapKodu' => $hesapKoduFilter,
                ':search' => $searchTerm,
                ':search2' => $searchTerm,
                ':search3' => $searchTerm,
                ':search4' => $searchTerm
            ]);

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
}
