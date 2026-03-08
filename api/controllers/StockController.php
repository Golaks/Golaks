<?php
/**
 * Stock Controller
 * Stok işlemleri (tüm modüller için ortak)
 */

class StockController {
    /**
     * POST /stock/list
     * Stok listesi
     */
    public function getList() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $stokModul = $data['stokModul'] ?? '';
        $stokAltModul = $data['stokAltModul'] ?? '';
        $search = $data['search'] ?? '';

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
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

            // Sube bilgisi
            $subeAyarlar = $firmaAyarlar['sube'] ?? [];
            $subeId = (int)($subeAyarlar['subeId'] ?? 0);

            // Build query
            $params = [];
            $conditions = ["sm.aktif = 1"];

            // Firma filtresi
            $conditions[] = "sm.firma_id = :firmaId";
            $params[':firmaId'] = $firmaId;

            // Sube filtresi
            if ($subeId > 0) {
                $conditions[] = "sm.sube_id = :subeId";
                $params[':subeId'] = $subeId;
            }

            // Modül filtresi
            if (!empty($stokModul)) {
                $conditions[] = "sm.stok_modul = :stokModul";
                $params[':stokModul'] = $stokModul;
            }

            // Alt modül filtresi
            if (!empty($stokAltModul)) {
                $conditions[] = "sm.stok_alt_modul = :stokAltModul";
                $params[':stokAltModul'] = $stokAltModul;
            }

            // Arama filtresi
            if (!empty($search)) {
                $conditions[] = "(sm.stok_kodu LIKE :search OR sm.stok_adi LIKE :search2 OR sm.barkod LIKE :search3)";
                $params[':search'] = "%{$search}%";
                $params[':search2'] = "%{$search}%";
                $params[':search3'] = "%{$search}%";
            }

            $whereClause = implode(' AND ', $conditions);

            $sql = "
                SELECT
                    sm.id,
                    sm.stok_kodu,
                    sm.stok_adi,
                    sm.barkod,
                    sm.barkod_tipi,
                    sm.stok_modul,
                    sm.stok_alt_modul,
                    sm.doviz,
                    sm.beden,
                    sm.miktar1_giren,
                    sm.miktar1_cikan,
                    sm.miktar1_kalan,
                    sm.miktar2_giren,
                    sm.miktar2_cikan,
                    sm.miktar2_kalan,
                    sm.kdv_oran,
                    sm.aciklama,
                    COALESCE(t_tip.tanim_deger, '') AS tip,
                    COALESCE(t_alttip.tanim_deger, '') AS alt_tip,
                    COALESCE(t_cins.tanim_deger, '') AS cins,
                    COALESCE(t_mensei.tanim_deger, '') AS mensei,
                    COALESCE(t_birim1.tanim_deger, '') AS birim1,
                    COALESCE(t_birim2.tanim_deger, '') AS birim2,
                    COALESCE(mk.model_adi, '') AS model
                FROM stok_master sm
                LEFT JOIN tanimlar t_tip ON t_tip.id = sm.tipi_id
                LEFT JOIN tanimlar t_alttip ON t_alttip.id = sm.alt_tipi_id
                LEFT JOIN tanimlar t_cins ON t_cins.id = sm.cinsi_id
                LEFT JOIN tanimlar t_mensei ON t_mensei.id = sm.mensei_id
                LEFT JOIN tanimlar t_birim1 ON t_birim1.id = sm.birim1_id
                LEFT JOIN tanimlar t_birim2 ON t_birim2.id = sm.birim2_id
                LEFT JOIN model_kartlar mk ON mk.id = sm.model_id
                WHERE {$whereClause}
                ORDER BY sm.stok_kodu ASC
                LIMIT 500
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            // Map rows
            $items = [];
            foreach ($rows as $row) {
                $items[] = [
                    'id' => (string)$row['id'],
                    'stockCode' => $row['stok_kodu'] ?: '',
                    'stockName' => $row['stok_adi'] ?: '',
                    'barcode' => $row['barkod'] ?: '',
                    'barcodeType' => $row['barkod_tipi'] ?: 'tekil',
                    'module' => $row['stok_modul'] ?: '',
                    'subModule' => $row['stok_alt_modul'] ?: '',
                    'currency' => $row['doviz'] ?: 'TL',
                    'size' => $row['beden'] ?: '',
                    'quantity1In' => (float)$row['miktar1_giren'],
                    'quantity1Out' => (float)$row['miktar1_cikan'],
                    'quantity1Remaining' => (float)$row['miktar1_kalan'],
                    'quantity2In' => (float)$row['miktar2_giren'],
                    'quantity2Out' => (float)$row['miktar2_cikan'],
                    'quantity2Remaining' => (float)$row['miktar2_kalan'],
                    'vatRate' => (float)$row['kdv_oran'],
                    'description' => $row['aciklama'] ?: '',
                    'type' => $row['tip'],
                    'subType' => $row['alt_tip'],
                    'kind' => $row['cins'],
                    'origin' => $row['mensei'],
                    'unit1' => $row['birim1'],
                    'unit2' => $row['birim2'],
                    'model' => $row['model'],
                ];
            }

            // Döviz bazlı özet hesapla
            $summaryByCurrency = [];
            foreach ($items as $item) {
                $cur = $item['currency'] ?: 'TL';
                if (!isset($summaryByCurrency[$cur])) {
                    $summaryByCurrency[$cur] = [
                        'currency' => $cur,
                        'totalItems' => 0,
                        'totalIn' => 0,
                        'totalOut' => 0,
                        'totalRemaining' => 0,
                    ];
                }
                $summaryByCurrency[$cur]['totalItems']++;
                $summaryByCurrency[$cur]['totalIn'] += $item['quantity1In'];
                $summaryByCurrency[$cur]['totalOut'] += $item['quantity1Out'];
                $summaryByCurrency[$cur]['totalRemaining'] += $item['quantity1Remaining'];
            }

            // Stok detaylarından tutar bilgisi al (son giriş fiyatı üzerinden)
            if (!empty($items)) {
                $masterIds = array_column($items, 'id');
                $placeholders = implode(',', array_fill(0, count($masterIds), '?'));

                $tutarSql = "
                    SELECT
                        sd.stok_master_id,
                        sd.fiyat,
                        sd.doviz
                    FROM stok_detay sd
                    INNER JOIN (
                        SELECT stok_master_id, MAX(id) AS last_id
                        FROM stok_detay
                        WHERE aktif = 1 AND gc = 1 AND stok_master_id IN ({$placeholders})
                        GROUP BY stok_master_id
                    ) latest ON sd.id = latest.last_id
                ";

                $tutarStmt = $pdo->prepare($tutarSql);
                $tutarStmt->execute($masterIds);
                $tutarRows = $tutarStmt->fetchAll();

                $priceMap = [];
                foreach ($tutarRows as $t) {
                    $priceMap[(string)$t['stok_master_id']] = (float)$t['fiyat'];
                }

                // Toplam tutar hesapla (kalan miktar * son giriş fiyatı)
                $totalValueByCurrency = [];
                foreach ($items as &$item) {
                    $lastPrice = $priceMap[$item['id']] ?? 0;
                    $item['lastPrice'] = $lastPrice;
                    $item['totalValue'] = $lastPrice * $item['quantity1Remaining'];

                    $cur = $item['currency'] ?: 'TL';
                    if (!isset($totalValueByCurrency[$cur])) {
                        $totalValueByCurrency[$cur] = 0;
                    }
                    $totalValueByCurrency[$cur] += $item['totalValue'];
                }

                // Summary'ye tutar ekle
                foreach ($summaryByCurrency as $cur => &$s) {
                    $s['totalValue'] = $totalValueByCurrency[$cur] ?? 0;
                }
            }

            Response::success([
                'data' => $items,
                'count' => count($items),
                'summary' => array_values($summaryByCurrency),
            ]);

        } catch (PDOException $e) {
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Stok listesi alınamadı: ' . $e->getMessage());
        }
    }

    /**
     * POST /stock/create
     * Yeni stok kartı oluştur
     */
    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $stockData = $data['stockData'] ?? [];

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        $stockCode = trim($stockData['stockCode'] ?? '');
        $stockName = trim($stockData['stockName'] ?? '');

        if (empty($stockCode)) {
            Response::error('Stok kodu gereklidir', 'VALIDATION_ERROR', 400);
        }
        if (empty($stockName)) {
            Response::error('Stok adı gereklidir', 'VALIDATION_ERROR', 400);
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

            $subeAyarlar = $firmaAyarlar['sube'] ?? [];
            $subeId = (int)($subeAyarlar['subeId'] ?? 0);

            // Stok kodu benzersizlik kontrolü
            $existing = $pdo->prepare(
                "SELECT id FROM stok_master WHERE stok_kodu = ? AND firma_id = ? AND aktif = 1 LIMIT 1"
            );
            $existing->execute([$stockCode, $firmaId]);
            if ($existing->fetch()) {
                Response::error('Bu stok kodu zaten kullanılmaktadır', 'DUPLICATE_STOCK_CODE', 409);
            }

            $sql = "INSERT INTO stok_master (
                stok_kodu, stok_adi, barkod, barkod_tipi,
                stok_modul, stok_alt_modul, doviz, beden,
                kdv_oran, aciklama, firma_id, sube_id, aktif,
                miktar1_giren, miktar1_cikan, miktar1_kalan,
                miktar2_giren, miktar2_cikan, miktar2_kalan
            ) VALUES (
                :stok_kodu, :stok_adi, :barkod, :barkod_tipi,
                :stok_modul, :stok_alt_modul, :doviz, :beden,
                :kdv_oran, :aciklama, :firma_id, :sube_id, 1,
                0, 0, 0, 0, 0, 0
            )";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':stok_kodu' => $stockCode,
                ':stok_adi' => $stockName,
                ':barkod' => trim($stockData['barcode'] ?? ''),
                ':barkod_tipi' => $stockData['barcodeType'] ?? 'tekil',
                ':stok_modul' => $stockData['module'] ?? 'muhasebe',
                ':stok_alt_modul' => $stockData['subModule'] ?? '',
                ':doviz' => $stockData['currency'] ?? 'TL',
                ':beden' => trim($stockData['size'] ?? ''),
                ':kdv_oran' => (float)($stockData['vatRate'] ?? 0),
                ':aciklama' => trim($stockData['description'] ?? ''),
                ':firma_id' => $firmaId,
                ':sube_id' => $subeId,
            ]);

            $newId = $pdo->lastInsertId();

            Response::success([
                'id' => (string)$newId,
                'stockCode' => $stockCode,
                'stockName' => $stockName,
            ], 'Stok kartı başarıyla oluşturuldu');

        } catch (PDOException $e) {
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Stok kartı oluşturulamadı: ' . $e->getMessage());
        }
    }
}
