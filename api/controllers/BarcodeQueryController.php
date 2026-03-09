<?php
/**
 * Barcode Query Controller
 * Barkod/Model sorgulaması - Tüm programlar için genel stok sorgulama
 * POST /stock/barcode-query
 */

class BarcodeQueryController {

    /**
     * POST /stock/barcode-query
     * Body: { dataName, queryType: 'barcode'|'model', queryValue }
     */
    public function query() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $queryType = $data['queryType'] ?? 'barcode';
        $queryValue = trim($data['queryValue'] ?? '');

        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }

        if (empty($queryValue)) {
            Response::error('queryValue gereklidir', 'VALIDATION_ERROR', 400);
        }

        if (!in_array($queryType, ['barcode', 'model'])) {
            Response::error('queryType barcode veya model olmalıdır', 'VALIDATION_ERROR', 400);
        }

        try {
            // Kullanici ve firma bilgisi
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

            // Firma DB bağlantısı
            $dsn = "mysql:host={$dbServer};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Sube bilgisi
            $subeAyarlar = $firmaAyarlar['sube'] ?? [];
            $subeId = (int)($subeAyarlar['subeId'] ?? 0);

            // Resim domain
            $resimDomain = $firmaAyarlar['resim']['resimDomain'] ?? '';

            // Mevcut tabloları kontrol et
            $existingTables = $this->getExistingTables($pdo, [
                'stok_varyant', 'model_kartlar', 'tanimlar', 'subeler', 'stok_detay', 'model_resimleri', 'cariler'
            ]);

            // === URUN BILGISI SORGUSU ===
            error_log("BARCODE DEBUG: firmaId={$firmaId}, subeId={$subeId}, queryType={$queryType}, queryValue={$queryValue}");
            error_log("BARCODE DEBUG: existingTables=" . json_encode($existingTables));
            $productInfo = null;

            if ($queryType === 'barcode') {
                $productInfo = $this->getProductByBarcode($pdo, $firmaId, $subeId, $queryValue, $existingTables);
            } else {
                $productInfo = $this->getProductByModel($pdo, $firmaId, $subeId, $queryValue, $existingTables);
            }

            $modelId = $productInfo['model_id'] ?? null;

            // === RESIMLER ===
            $images = [];
            if ($modelId && !empty($resimDomain) && $existingTables['model_resimleri']) {
                $images = $this->getModelImages($pdo, $modelId, $resimDomain);
            }

            // === STOK DAGILIM ===
            $distribution = [];
            $magazaDistribution = [];
            $konfeksiyonDistribution = [];
            $tabakhaneDistribution = [];
            $muhasebeDistribution = [];
            $stokModul = $productInfo['stok_modul'] ?? '';

            if ($productInfo) {
                $distribution = $this->getDistribution(
                    $pdo, $firmaId, $subeId, $queryType, $queryValue, $modelId, $existingTables
                );

                // stok_modul'e göre dağılımı ilgili alana yönlendir
                if (stripos($stokModul, 'magaza') !== false) {
                    $magazaDistribution = $distribution;
                } elseif (stripos($stokModul, 'tabakhane') !== false) {
                    $tabakhaneDistribution = $distribution;
                } elseif (stripos($stokModul, 'muhasebe') !== false) {
                    $muhasebeDistribution = $distribution;
                } else {
                    $konfeksiyonDistribution = $distribution;
                }
            }

            // === FIYAT BILGISI ===
            $priceInfo = null;
            if ($productInfo && $existingTables['stok_detay']) {
                $priceInfo = $this->getProductPrice($pdo, (int)$productInfo['id'], $existingTables);
            }

            // Urun bilgisini formatla
            $product = null;
            if ($productInfo) {
                $product = [
                    'barcode' => $productInfo['barkod'] ?: $queryValue,
                    'barcodeType' => $productInfo['barkod_tipi'] ?? 'tekil',
                    'model' => $productInfo['model_adi'] ?? '-',
                    'size' => $productInfo['varyant_beden'] ?: '-',
                    'color' => $productInfo['renk'] ?? '-',
                    'branch' => $productInfo['sube_adi'] ?? '-',
                    'warehouse' => $priceInfo['depo_adi'] ?? '-',
                    'manufacturer' => $productInfo['uretici'] ?: '-',
                    'year' => $productInfo['varyant_yil'] ? (string)$productInfo['varyant_yil'] : '-',
                    'info' => $productInfo['aciklama'] ?: '-',
                    'entryPrice' => $productInfo['alis_fiyat'] ? (string)$productInfo['alis_fiyat'] : '0',
                    'costPrice' => $productInfo['maliyet_fiyat'] ? (string)$productInfo['maliyet_fiyat'] : '0',
                    'labelPrice' => $productInfo['satis_fiyat'] ? (string)$productInfo['satis_fiyat'] : '0',
                    'entryCostCurrency' => $productInfo['doviz'] ?: 'TRY',
                    'labelCurrency' => $productInfo['doviz'] ?: 'TRY',
                ];
            }

            Response::success([
                'product' => $product,
                'images' => $images,
                'stokModul' => $stokModul,
                'magazaDistribution' => $magazaDistribution,
                'konfeksiyonDistribution' => $konfeksiyonDistribution,
                'tabakhaneDistribution' => $tabakhaneDistribution,
                'muhasebeDistribution' => $muhasebeDistribution,
            ]);

        } catch (PDOException $e) {
            error_log("BARCODE PDO ERROR: " . $e->getMessage());
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            error_log("BARCODE ERROR: " . $e->getMessage());
            Response::serverError('Barkod sorgusu başarısız: ' . $e->getMessage());
        }
    }

    /**
     * Birden fazla tablonun varligini kontrol et
     */
    private function getExistingTables(PDO $pdo, array $tableNames): array {
        $result = [];
        try {
            $stmt = $pdo->query("SHOW TABLES");
            $allTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($tableNames as $name) {
                $result[$name] = in_array($name, $allTables);
            }
        } catch (Exception $e) {
            foreach ($tableNames as $name) {
                $result[$name] = false;
            }
        }
        return $result;
    }

    /**
     * Barkod ile urun bilgisi getir
     */
    private function getProductByBarcode(PDO $pdo, int $firmaId, int $subeId, string $barcode, array $tables): ?array {
        $select = "
            sm.id, sm.model_id, sm.barkod, sm.beden, sm.barkod_tipi,
            sm.stok_kodu, sm.stok_adi, sm.doviz, sm.aciklama,
            sm.stok_modul, sm.stok_alt_modul
        ";
        $joins = "";
        $where = "sm.firma_id = :firmaId AND sm.aktif = 1";
        $params = [':firmaId' => $firmaId];

        if ($tables['model_kartlar']) {
            $select .= ", COALESCE(mk.model_adi, '') AS model_adi";
            $joins .= " LEFT JOIN model_kartlar mk ON mk.id = sm.model_id";
        } else {
            $select .= ", '' AS model_adi";
        }

        if ($tables['tanimlar']) {
            $select .= ",
                COALESCE(t_tip.tanim_deger, '') AS tip,
                COALESCE(t_alttip.tanim_deger, '') AS alttip,
                COALESCE(t_cins.tanim_deger, '') AS cins";
            $joins .= "
                LEFT JOIN tanimlar t_tip ON t_tip.id = sm.tipi_id
                LEFT JOIN tanimlar t_alttip ON t_alttip.id = sm.alt_tipi_id
                LEFT JOIN tanimlar t_cins ON t_cins.id = sm.cinsi_id";
        } else {
            $select .= ", '' AS tip, '' AS alttip, '' AS cins";
        }

        if ($tables['subeler']) {
            $select .= ", COALESCE(sb.sube_adi, '') AS sube_adi";
            $joins .= " LEFT JOIN subeler sb ON sb.id = sm.sube_id";
        } else {
            $select .= ", '' AS sube_adi";
        }

        if ($tables['stok_varyant']) {
            $select .= ", COALESCE(t_renk.tanim_deger, '') AS renk, sv.beden AS varyant_beden, YEAR(sv.kayit_tarihi) AS varyant_yil, sv.alis_fiyat, sv.maliyet_fiyat, sv.satis_fiyat";
            $joins .= "
                LEFT JOIN stok_varyant sv ON sv.stok_master_id = sm.id AND sv.firma_id = sm.firma_id AND sv.aktif = 1";
            if ($tables['tanimlar']) {
                $joins .= " LEFT JOIN tanimlar t_renk ON t_renk.id = sv.renk_id";
            }
            // Üretici bilgisi - stok_varyant.uretici_id -> cariler
            if ($tables['cariler']) {
                $select .= ", COALESCE(c.unvan, '') AS uretici";
                $joins .= " LEFT JOIN cariler c ON c.id = sv.uretici_id";
            } else {
                $select .= ", '' AS uretici";
            }
            $where .= " AND sv.barkod = :barcode";
            $params[':barcode'] = $barcode;
        } else {
            $select .= ", '' AS renk, '' AS varyant_beden, NULL AS varyant_yil, '' AS uretici";
            // stok_varyant tablosu yoksa barkod sorgulanamaz
            return null;
        }

        if ($subeId > 0) {
            $where .= " AND sm.sube_id = :subeId";
            $params[':subeId'] = $subeId;
        }

        $sql = "SELECT {$select} FROM stok_master sm {$joins} WHERE {$where} LIMIT 1";

        error_log("BARCODE DEBUG SQL: " . $sql);
        error_log("BARCODE DEBUG PARAMS: " . json_encode($params));

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch() ?: null;
        error_log("BARCODE DEBUG RESULT: " . ($result ? json_encode($result) : 'NULL'));
        return $result;
    }

    /**
     * Model adi ile urun bilgisi getir
     */
    private function getProductByModel(PDO $pdo, int $firmaId, int $subeId, string $modelName, array $tables): ?array {
        if (!$tables['model_kartlar']) {
            return null;
        }

        $select = "
            sm.id, sm.model_id, sm.barkod, sm.beden, sm.barkod_tipi,
            sm.stok_kodu, sm.stok_adi, sm.doviz, sm.aciklama,
            sm.stok_modul, sm.stok_alt_modul,
            COALESCE(mk.model_adi, '') AS model_adi
        ";
        $joins = " LEFT JOIN model_kartlar mk ON mk.id = sm.model_id";
        $where = "sm.firma_id = :firmaId AND sm.aktif = 1 AND mk.model_adi = :modelName";
        $params = [':firmaId' => $firmaId, ':modelName' => $modelName];

        if ($tables['tanimlar']) {
            $select .= ",
                COALESCE(t_tip.tanim_deger, '') AS tip,
                COALESCE(t_alttip.tanim_deger, '') AS alttip,
                COALESCE(t_cins.tanim_deger, '') AS cins";
            $joins .= "
                LEFT JOIN tanimlar t_tip ON t_tip.id = sm.tipi_id
                LEFT JOIN tanimlar t_alttip ON t_alttip.id = sm.alt_tipi_id
                LEFT JOIN tanimlar t_cins ON t_cins.id = sm.cinsi_id";
        } else {
            $select .= ", '' AS tip, '' AS alttip, '' AS cins";
        }

        if ($tables['subeler']) {
            $select .= ", COALESCE(sb.sube_adi, '') AS sube_adi";
            $joins .= " LEFT JOIN subeler sb ON sb.id = sm.sube_id";
        } else {
            $select .= ", '' AS sube_adi";
        }

        $select .= ", '' AS renk";

        if ($subeId > 0) {
            $where .= " AND sm.sube_id = :subeId";
            $params[':subeId'] = $subeId;
        }

        $sql = "SELECT {$select} FROM stok_master sm {$joins} WHERE {$where} LIMIT 1";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() ?: null;
    }

    /**
     * Fiyat ve depo bilgisi - stok_detay tablosundan
     */
    private function getProductPrice(PDO $pdo, int $stokMasterId, array $tables): ?array {
        try {
            $select = "sd.fiyat, sd.doviz";
            $joins = "";

            if ($tables['tanimlar']) {
                $select .= ", COALESCE(t_depo.tanim_deger, '') AS depo_adi";
                $joins .= " LEFT JOIN tanimlar t_depo ON t_depo.id = sd.depo_id AND t_depo.tanim_kodu = 'DEPO'";
            } else {
                $select .= ", '' AS depo_adi";
            }

            $stmt = $pdo->prepare("
                SELECT {$select}
                FROM stok_detay sd {$joins}
                WHERE sd.aktif = 1 AND sd.gc = 1 AND sd.stok_master_id = ?
                ORDER BY sd.id DESC LIMIT 1
            ");
            $stmt->execute([$stokMasterId]);
            $row = $stmt->fetch();
            if ($row) {
                return [
                    'giris_fiyat' => (string)$row['fiyat'],
                    'depo_adi' => $row['depo_adi'] ?: '-',
                ];
            }
        } catch (Exception $e) {
            error_log("BARCODE PRICE ERROR: " . $e->getMessage());
        }
        return null;
    }

    /**
     * Model resimlerini getir
     */
    private function getModelImages(PDO $pdo, int $modelId, string $resimDomain): array {
        $images = [];
        try {
            $stmt = $pdo->prepare(
                "SELECT id, resim_yol FROM model_resimleri WHERE model_id = ? AND aktif = 1 ORDER BY sira ASC LIMIT 4"
            );
            $stmt->execute([$modelId]);
            $rows = $stmt->fetchAll();
            foreach ($rows as $row) {
                if (!empty($row['resim_yol'])) {
                    $images[] = [
                        'id' => (string)$row['id'],
                        'url' => rtrim($resimDomain, '/') . '/' . ltrim($row['resim_yol'], '/'),
                    ];
                }
            }
        } catch (Exception $e) {}
        return $images;
    }

    /**
     * Stok dagilimini getir
     */
    private function getDistribution(
        PDO $pdo, int $firmaId, int $subeId,
        string $queryType, string $queryValue, ?int $modelId, array $tables
    ): array {
        $select = "sm.barkod_tipi";
        $joins = "";
        $where = "sm.firma_id = :firmaId AND sm.aktif = 1";
        $params = [':firmaId' => $firmaId];

        // Şube bilgisi
        if ($tables['subeler']) {
            $select .= ", COALESCE(sb.sube_adi, '') AS branch";
            $joins .= " LEFT JOIN subeler sb ON sb.id = sm.sube_id";
        } else {
            $select .= ", '' AS branch";
        }

        if ($tables['model_kartlar']) {
            $select .= ", COALESCE(mk.model_adi, '') AS model";
            $joins .= " LEFT JOIN model_kartlar mk ON sm.model_id = mk.id";
        } else {
            $select .= ", '' AS model";
        }

        if ($tables['tanimlar']) {
            $select .= ",
                COALESCE(t_tip.tanim_deger, '') AS type,
                COALESCE(t_alttip.tanim_deger, '') AS subtype,
                COALESCE(t_cins.tanim_deger, '') AS kind";
            $joins .= "
                LEFT JOIN tanimlar t_tip ON t_tip.id = sm.tipi_id
                LEFT JOIN tanimlar t_alttip ON t_alttip.id = sm.alt_tipi_id
                LEFT JOIN tanimlar t_cins ON t_cins.id = sm.cinsi_id";
        } else {
            $select .= ", '' AS type, '' AS subtype, '' AS kind";
        }

        if ($tables['stok_varyant']) {
            $select .= ", sv.beden, COALESCE(t_renk.tanim_deger, '') AS color";
            $select .= ",
                CASE
                    WHEN sm.barkod_tipi = 'tekil' THEN COUNT(DISTINCT sm.id)
                    WHEN sm.barkod_tipi IN ('seri', 'cogul') THEN COALESCE(SUM(sv.miktar1_kalan), 0)
                    ELSE 0
                END AS quantity";
            $joins .= "
                LEFT JOIN stok_varyant sv ON sv.stok_master_id = sm.id AND sv.firma_id = sm.firma_id AND sv.aktif = 1";
            if ($tables['tanimlar']) {
                $joins .= " LEFT JOIN tanimlar t_renk ON t_renk.id = sv.renk_id";
            }
            // Depo bilgisi - stok_detay üzerinden
            if ($tables['stok_detay'] && $tables['tanimlar']) {
                $select .= ", COALESCE(t_depo.tanim_deger, '') AS warehouse";
                $joins .= "
                    LEFT JOIN stok_detay sd ON sd.stok_master_id = sm.id AND sd.aktif = 1 AND sd.gc = 1
                    LEFT JOIN tanimlar t_depo ON t_depo.id = sd.depo_id AND t_depo.tanim_kodu = 'DEPO'";
            } else {
                $select .= ", '' AS warehouse";
            }
            $groupBy = "sm.sube_id, sm.model_id, sm.tipi_id, sm.alt_tipi_id, sm.cinsi_id, sm.barkod_tipi,
                CASE WHEN sm.barkod_tipi = 'cogul' THEN NULL ELSE sv.beden END,
                sv.renk_id";
            if ($tables['stok_detay'] && $tables['tanimlar']) {
                $groupBy .= ", sd.depo_id";
            }
        } else {
            $select .= ", '' AS beden, '' AS color, '' AS warehouse";
            $select .= ",
                CASE
                    WHEN sm.barkod_tipi = 'tekil' THEN COUNT(DISTINCT sm.id)
                    ELSE COALESCE(SUM(sm.miktar1_kalan), 0)
                END AS quantity";
            $groupBy = "sm.sube_id, sm.model_id, sm.tipi_id, sm.alt_tipi_id, sm.cinsi_id, sm.barkod_tipi";
        }

        if ($subeId > 0) {
            $where .= " AND sm.sube_id = :subeId";
            $params[':subeId'] = $subeId;
        }

        if ($queryType === 'barcode') {
            if ($tables['stok_varyant']) {
                $where .= " AND sv.barkod = :qv1";
                $params[':qv1'] = $queryValue;
            } else {
                // stok_varyant tablosu yoksa barkod sorgulanamaz
                return [];
            }
        } else {
            if ($modelId) {
                $where .= " AND sm.model_id = :modelId";
                $params[':modelId'] = $modelId;
            } elseif ($tables['model_kartlar']) {
                $where .= " AND mk.model_adi = :modelName";
                $params[':modelName'] = $queryValue;
            }
        }

        $sql = "SELECT {$select} FROM stok_master sm {$joins} WHERE {$where} GROUP BY {$groupBy} ORDER BY sm.model_id, beden";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'branch' => $row['branch'] ?: '-',
                'warehouse' => $row['warehouse'] ?: '-',
                'branchWarehouse' => ($row['branch'] ?: '-') . ' / ' . ($row['warehouse'] ?: '-'),
                'type' => $row['type'] ?: '-',
                'color' => $row['color'] ?: '-',
                'size' => $row['beden'] ?: '-',
                'quantity' => (int)$row['quantity'],
                'status' => 'stock',
            ];
        }
        return $result;
    }
}
