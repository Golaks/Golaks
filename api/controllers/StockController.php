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

            // Mağaza rapor modları: gruplanmış rapor döndür
            $magazaReportModes = ['sube_tipi', 'tumu_tipi', 'tumu_uretici', 'sube_uretici'];
            if ($stokModul === 'magaza' && in_array($stokAltModul, $magazaReportModes)) {
                $this->getGroupedReport($pdo, $firmaId, $subeId, $stokModul, $stokAltModul, $search);
                return;
            }

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
     * Mağaza stok raporu - gruplanmış veri döndürür
     * sube_tipi: Tip → Şube dağılımı (iki seviyeli)
     * tumu_tipi: Tip bazlı toplam (tek seviyeli)
     * sube_uretici: Üretici → Şube dağılımı (iki seviyeli)
     * tumu_uretici: Üretici bazlı toplam (tek seviyeli)
     */
    private function getGroupedReport($pdo, $firmaId, $subeId, $stokModul, $reportMode, $search) {
        $params = [];
        $conditions = ["sm.aktif = 1"];

        $conditions[] = "sm.firma_id = :firmaId";
        $params[':firmaId'] = $firmaId;

        $conditions[] = "sm.stok_modul = :stokModul";
        $params[':stokModul'] = $stokModul;

        // Arama filtresi
        if (!empty($search)) {
            $conditions[] = "(sm.stok_kodu LIKE :search OR sm.stok_adi LIKE :search2 OR sm.barkod LIKE :search3)";
            $params[':search'] = "%{$search}%";
            $params[':search2'] = "%{$search}%";
            $params[':search3'] = "%{$search}%";
        }

        $whereClause = implode(' AND ', $conditions);

        $isTip = in_array($reportMode, ['sube_tipi', 'tumu_tipi']);
        $isSube = in_array($reportMode, ['sube_tipi', 'sube_uretici']);

        if ($isTip && $isSube) {
            // Şube → Tip dağılımı (üst: şube, alt: tip)
            $sql = "
                SELECT
                    COALESCE(s.sube_adi, 'Tanımsız') AS group_name,
                    sm.sube_id AS group_id,
                    COALESCE(t_tip.tanim_deger, 'Tanımsız') AS sub_group_name,
                    sm.tipi_id AS sub_group_id,
                    sm.doviz,
                    COUNT(DISTINCT sm.id) AS item_count,
                    SUM(sm.miktar1_giren) AS total_in,
                    SUM(sm.miktar1_cikan) AS total_out,
                    SUM(sm.miktar1_kalan) AS total_remaining,
                    COALESCE(SUM(sd.tutar_giren), 0) AS amount_in,
                    COALESCE(SUM(sd.tutar_cikan), 0) AS amount_out,
                    COALESCE(SUM(sd.tutar_giren), 0) - COALESCE(SUM(sd.tutar_cikan), 0) AS amount_remaining
                FROM stok_master sm
                LEFT JOIN tanimlar t_tip ON t_tip.id = sm.tipi_id
                LEFT JOIN subeler s ON s.id = sm.sube_id
                LEFT JOIN (
                    SELECT stok_master_id,
                        SUM(CASE WHEN gc = 1 THEN fiyat * miktar ELSE 0 END) AS tutar_giren,
                        SUM(CASE WHEN gc = -1 THEN fiyat * miktar ELSE 0 END) AS tutar_cikan
                    FROM stok_detay
                    WHERE aktif = 1
                    GROUP BY stok_master_id
                ) sd ON sd.stok_master_id = sm.id
                WHERE {$whereClause}
                GROUP BY sm.sube_id, s.sube_adi, sm.tipi_id, t_tip.tanim_deger, sm.doviz
                ORDER BY s.sube_adi ASC, t_tip.tanim_deger ASC
            ";
        } elseif ($isTip) {
            // Tip bazlı toplam (tek seviyeli)
            $sql = "
                SELECT
                    COALESCE(t_tip.tanim_deger, 'Tanımsız') AS group_name,
                    sm.tipi_id AS group_id,
                    sm.doviz,
                    COUNT(DISTINCT sm.id) AS item_count,
                    SUM(sm.miktar1_giren) AS total_in,
                    SUM(sm.miktar1_cikan) AS total_out,
                    SUM(sm.miktar1_kalan) AS total_remaining
                FROM stok_master sm
                LEFT JOIN tanimlar t_tip ON t_tip.id = sm.tipi_id
                WHERE {$whereClause}
                GROUP BY sm.tipi_id, t_tip.tanim_deger, sm.doviz
                ORDER BY t_tip.tanim_deger ASC
            ";
        } elseif ($isSube) {
            // Şube → Üretici dağılımı (üst: şube, alt: üretici)
            $sql = "
                SELECT
                    COALESCE(s.sube_adi, 'Tanımsız') AS group_name,
                    sm.sube_id AS group_id,
                    COALESCE(c.cari_adi, 'Tanımsız') AS sub_group_name,
                    sv.uretici_id AS sub_group_id,
                    sm.doviz,
                    COUNT(DISTINCT sm.id) AS item_count,
                    SUM(sv.miktar1_giren) AS total_in,
                    SUM(sv.miktar1_cikan) AS total_out,
                    SUM(sv.miktar1_kalan) AS total_remaining
                FROM stok_varyant sv
                INNER JOIN stok_master sm ON sm.id = sv.stok_master_id
                LEFT JOIN cariler c ON c.id = sv.uretici_id
                LEFT JOIN subeler s ON s.id = sm.sube_id
                WHERE {$whereClause} AND sv.aktif = 1
                GROUP BY sm.sube_id, s.sube_adi, sv.uretici_id, c.cari_adi, sm.doviz
                ORDER BY s.sube_adi ASC, c.cari_adi ASC
            ";
        } else {
            // Üretici bazlı toplam (tek seviyeli)
            $sql = "
                SELECT
                    COALESCE(c.cari_adi, 'Tanımsız') AS group_name,
                    sv.uretici_id AS group_id,
                    sm.doviz,
                    COUNT(DISTINCT sm.id) AS item_count,
                    SUM(sv.miktar1_giren) AS total_in,
                    SUM(sv.miktar1_cikan) AS total_out,
                    SUM(sv.miktar1_kalan) AS total_remaining
                FROM stok_varyant sv
                INNER JOIN stok_master sm ON sm.id = sv.stok_master_id
                LEFT JOIN cariler c ON c.id = sv.uretici_id
                WHERE {$whereClause} AND sv.aktif = 1
                GROUP BY sv.uretici_id, c.cari_adi, sm.doviz
                ORDER BY c.cari_adi ASC
            ";
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $groups = [];
        $grandTotals = [];

        if ($isSube) {
            // İki seviyeli: şube → alt gruplar (tip veya üretici)
            $groupMap = [];

            foreach ($rows as $row) {
                $groupId = (string)($row['group_id'] ?: '0');
                $key = $groupId;

                if (!isset($groupMap[$key])) {
                    $groupMap[$key] = [
                        'groupId' => $groupId,
                        'groupName' => $row['group_name'],
                        'currency' => '',
                        'itemCount' => 0,
                        'totalIn' => 0,
                        'totalOut' => 0,
                        'totalRemaining' => 0,
                        'totalValue' => 0,
                        'subGroups' => [],
                    ];
                }

                $subGroupId = (string)($row['sub_group_id'] ?: '0');
                $subKey = $row['sub_group_name'] ?: 'Tanımsız';

                // Alt grupları birleştir (aynı isimli tipler tek satırda)
                $found = false;
                foreach ($groupMap[$key]['subGroups'] as &$existingSub) {
                    if ($existingSub['subGroupName'] === $subKey) {
                        $existingSub['itemCount'] += (int)$row['item_count'];
                        $existingSub['totalIn'] += (float)$row['total_in'];
                        $existingSub['totalOut'] += (float)$row['total_out'];
                        $existingSub['totalRemaining'] += (float)$row['total_remaining'];
                        $found = true;
                        break;
                    }
                }
                unset($existingSub);

                if (!$found) {
                    $groupMap[$key]['subGroups'][] = [
                        'subGroupId' => $subKey,
                        'subGroupName' => $row['sub_group_name'],
                        'itemCount' => (int)$row['item_count'],
                        'totalIn' => (float)$row['total_in'],
                        'totalOut' => (float)$row['total_out'],
                        'totalRemaining' => (float)$row['total_remaining'],
                    ];
                }
                $groupMap[$key]['itemCount'] += (int)$row['item_count'];
                $groupMap[$key]['totalIn'] += (float)$row['total_in'];
                $groupMap[$key]['totalOut'] += (float)$row['total_out'];
                $groupMap[$key]['totalRemaining'] += (float)$row['total_remaining'];

                // Genel toplam (döviz bazlı)
                $doviz = $row['doviz'] ?: 'TL';
                if (!isset($grandTotals[$doviz])) {
                    $grandTotals[$doviz] = [
                        'currency' => $doviz,
                        'totalItems' => 0,
                        'totalIn' => 0,
                        'totalOut' => 0,
                        'totalRemaining' => 0,
                        'totalValue' => 0,
                        'amountIn' => 0,
                        'amountOut' => 0,
                        'amountRemaining' => 0,
                    ];
                }
                $grandTotals[$doviz]['totalItems'] += (int)$row['item_count'];
                $grandTotals[$doviz]['totalIn'] += (float)$row['total_in'];
                $grandTotals[$doviz]['totalOut'] += (float)$row['total_out'];
                $grandTotals[$doviz]['totalRemaining'] += (float)$row['total_remaining'];
                $grandTotals[$doviz]['amountIn'] += (float)($row['amount_in'] ?? 0);
                $grandTotals[$doviz]['amountOut'] += (float)($row['amount_out'] ?? 0);
                $grandTotals[$doviz]['amountRemaining'] += (float)($row['amount_remaining'] ?? 0);
            }

            $groups = array_values($groupMap);
        } else {
            // Tek seviyeli
            foreach ($rows as $row) {
                $doviz = $row['doviz'] ?: 'TL';

                $groups[] = [
                    'groupId' => (string)($row['group_id'] ?: '0'),
                    'groupName' => $row['group_name'],
                    'currency' => $doviz,
                    'itemCount' => (int)$row['item_count'],
                    'totalIn' => (float)$row['total_in'],
                    'totalOut' => (float)$row['total_out'],
                    'totalRemaining' => (float)$row['total_remaining'],
                    'totalValue' => 0,
                ];

                if (!isset($grandTotals[$doviz])) {
                    $grandTotals[$doviz] = [
                        'currency' => $doviz,
                        'totalItems' => 0,
                        'totalIn' => 0,
                        'totalOut' => 0,
                        'totalRemaining' => 0,
                        'totalValue' => 0,
                    ];
                }
                $grandTotals[$doviz]['totalItems'] += (int)$row['item_count'];
                $grandTotals[$doviz]['totalIn'] += (float)$row['total_in'];
                $grandTotals[$doviz]['totalOut'] += (float)$row['total_out'];
                $grandTotals[$doviz]['totalRemaining'] += (float)$row['total_remaining'];
            }
        }

        Response::success([
            'reportMode' => $reportMode,
            'groups' => $groups,
            'count' => count($groups),
            'summary' => array_values($grandTotals),
        ]);
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
