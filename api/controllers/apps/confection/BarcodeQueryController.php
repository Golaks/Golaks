<?php
/**
 * Confection Barcode Query Controller
 * Barkod/Model sorgulaması - Konfeksiyon stok bilgisi
 * POST /apps/confection/barcode-query
 *
 * stok_master kolonları:
 * id, firma_id, sube_id, stok_modul, stok_alt_modul, barkod, barkod_tipi,
 * stok_kodu, stok_adi, model_id, tipi_id, alt_tipi_id, cinsi_id, mensei_id,
 * birim1_id, birim2_id, kdv_oran, doviz, kesim_kart, aciklama,
 * miktar1_giren, miktar1_cikan, miktar1_kalan, miktar2_giren, miktar2_cikan, miktar2_kalan,
 * beden_set_id, beden, aktif
 */

class ConfectionBarcodeQueryController {

    /**
     * POST /apps/confection/barcode-query
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
        $queryType = $data['queryType'] ?? 'barcode'; // 'barcode' | 'model'
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

            // stok_varyant tablosu var mi kontrol
            $hasVaryant = $this->tableExists($pdo, 'stok_varyant');

            // === URUN BILGISI SORGUSU ===
            $productInfo = null;
            $modelId = null;

            if ($queryType === 'barcode') {
                $productInfo = $this->getProductByBarcode($pdo, $firmaId, $subeId, $queryValue, $hasVaryant);
            } else {
                $productInfo = $this->getProductByModel($pdo, $firmaId, $subeId, $queryValue);
            }

            if ($productInfo) {
                $modelId = $productInfo['model_id'] ?? null;
            }

            // === RESIMLER ===
            $images = [];
            if ($modelId && !empty($resimDomain)) {
                $images = $this->getModelImages($pdo, $modelId, $resimDomain);
            }

            // === KONFEKSIYON DAGILIM ===
            $konfeksiyonDistribution = [];
            if ($productInfo) {
                $konfeksiyonDistribution = $this->getKonfeksiyonDistribution(
                    $pdo, $firmaId, $subeId, $queryType, $queryValue, $modelId, $hasVaryant
                );
            }

            // === FIYAT BILGISI (stok_detay tablosundan) ===
            $priceInfo = null;
            if ($productInfo) {
                $priceInfo = $this->getProductPrice($pdo, (int)$productInfo['id']);
            }

            // Urun bilgisini formatla
            $product = null;
            if ($productInfo) {
                $product = [
                    'barcode' => $productInfo['barkod'] ?: $queryValue,
                    'model' => $productInfo['model_adi'] ?: '-',
                    'size' => $productInfo['beden'] ?: '-',
                    'color' => $productInfo['renk'] ?? '-',
                    'branch' => $productInfo['sube_adi'] ?? '-',
                    'warehouse' => '-',
                    'manufacturer' => '-',
                    'year' => '-',
                    'info' => $productInfo['aciklama'] ?: '-',
                    'entryPrice' => $priceInfo['giris_fiyat'] ?? '0',
                    'costPrice' => $priceInfo['maliyet_fiyat'] ?? '0',
                    'labelPrice' => $priceInfo['etiket_fiyat'] ?? '0',
                    'entryCostCurrency' => $productInfo['doviz'] ?: 'TRY',
                    'labelCurrency' => $productInfo['doviz'] ?: 'TRY',
                ];
            }

            Response::success([
                'product' => $product,
                'images' => $images,
                'magazaDistribution' => [],
                'konfeksiyonDistribution' => $konfeksiyonDistribution,
                'productionDistribution' => [],
                'noMagazaModule' => true,
                'noKonfeksiyonModule' => false,
            ]);

        } catch (PDOException $e) {
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Barkod sorgusu başarısız: ' . $e->getMessage());
        }
    }

    /**
     * Tablo var mi kontrol
     */
    private function tableExists(PDO $pdo, string $tableName): bool {
        try {
            $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$tableName]);
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Barkod ile urun bilgisi getir
     */
    private function getProductByBarcode(PDO $pdo, int $firmaId, int $subeId, string $barcode, bool $hasVaryant): ?array {
        $sql = "
            SELECT
                sm.id,
                sm.model_id,
                sm.barkod,
                sm.beden,
                sm.barkod_tipi,
                sm.stok_kodu,
                sm.stok_adi,
                sm.doviz,
                sm.aciklama,
                COALESCE(mk.model_adi, '') AS model_adi,
                COALESCE(t_tip.tanim_deger, '') AS tip,
                COALESCE(t_alttip.tanim_deger, '') AS alttip,
                COALESCE(t_cins.tanim_deger, '') AS cins,
                COALESCE(sb.sube_adi, '') AS sube_adi
        ";

        if ($hasVaryant) {
            $sql .= ", COALESCE(t_renk.tanim_deger, '') AS renk";
        } else {
            $sql .= ", '' AS renk";
        }

        $sql .= "
            FROM stok_master sm
            LEFT JOIN model_kartlar mk ON mk.id = sm.model_id
            LEFT JOIN tanimlar t_tip ON t_tip.id = sm.tipi_id
            LEFT JOIN tanimlar t_alttip ON t_alttip.id = sm.alt_tipi_id
            LEFT JOIN tanimlar t_cins ON t_cins.id = sm.cinsi_id
            LEFT JOIN subeler sb ON sb.id = sm.sube_id
        ";

        if ($hasVaryant) {
            $sql .= "
            LEFT JOIN stok_varyant sv ON sv.stok_master_id = sm.id AND sv.firma_id = sm.firma_id AND sv.aktif = 1
            LEFT JOIN tanimlar t_renk ON t_renk.id = sv.renk_id
            ";
        }

        $sql .= "
            WHERE sm.firma_id = :firmaId
              AND sm.aktif = 1
              AND sm.stok_alt_modul = 'konfeksiyon-stok'
        ";

        $params = [':firmaId' => $firmaId];

        if ($subeId > 0) {
            $sql .= " AND sm.sube_id = :subeId";
            $params[':subeId'] = $subeId;
        }

        if ($hasVaryant) {
            $sql .= " AND (sm.barkod = :barcode1 OR sv.barkod = :barcode2)";
            $params[':barcode1'] = $barcode;
            $params[':barcode2'] = $barcode;
        } else {
            $sql .= " AND sm.barkod = :barcode1";
            $params[':barcode1'] = $barcode;
        }

        $sql .= " LIMIT 1";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() ?: null;
    }

    /**
     * Model adi ile urun bilgisi getir
     */
    private function getProductByModel(PDO $pdo, int $firmaId, int $subeId, string $modelName): ?array {
        $sql = "
            SELECT
                sm.id,
                sm.model_id,
                sm.barkod,
                sm.beden,
                sm.barkod_tipi,
                sm.stok_kodu,
                sm.stok_adi,
                sm.doviz,
                sm.aciklama,
                COALESCE(mk.model_adi, '') AS model_adi,
                COALESCE(t_tip.tanim_deger, '') AS tip,
                COALESCE(t_alttip.tanim_deger, '') AS alttip,
                COALESCE(t_cins.tanim_deger, '') AS cins,
                COALESCE(sb.sube_adi, '') AS sube_adi,
                '' AS renk
            FROM stok_master sm
            LEFT JOIN model_kartlar mk ON mk.id = sm.model_id
            LEFT JOIN tanimlar t_tip ON t_tip.id = sm.tipi_id
            LEFT JOIN tanimlar t_alttip ON t_alttip.id = sm.alt_tipi_id
            LEFT JOIN tanimlar t_cins ON t_cins.id = sm.cinsi_id
            LEFT JOIN subeler sb ON sb.id = sm.sube_id
            WHERE sm.firma_id = :firmaId
              AND sm.aktif = 1
              AND sm.stok_alt_modul = 'konfeksiyon-stok'
              AND mk.model_adi = :modelName
        ";

        $params = [
            ':firmaId' => $firmaId,
            ':modelName' => $modelName,
        ];

        if ($subeId > 0) {
            $sql .= " AND sm.sube_id = :subeId";
            $params[':subeId'] = $subeId;
        }

        $sql .= " LIMIT 1";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() ?: null;
    }

    /**
     * Fiyat bilgisi - stok_detay tablosundan son giris fiyati
     */
    private function getProductPrice(PDO $pdo, int $stokMasterId): ?array {
        try {
            $stmt = $pdo->prepare("
                SELECT fiyat, doviz
                FROM stok_detay
                WHERE aktif = 1 AND gc = 1 AND stok_master_id = ?
                ORDER BY id DESC
                LIMIT 1
            ");
            $stmt->execute([$stokMasterId]);
            $row = $stmt->fetch();

            if ($row) {
                return [
                    'giris_fiyat' => (string)$row['fiyat'],
                    'maliyet_fiyat' => '0',
                    'etiket_fiyat' => '0',
                ];
            }
        } catch (Exception $e) {
            // stok_detay tablosu yoksa sessiz devam
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
        } catch (Exception $e) {
            // Resim tablosu yoksa sessiz devam
        }

        return $images;
    }

    /**
     * Konfeksiyon stok dagilimini getir
     */
    private function getKonfeksiyonDistribution(
        PDO $pdo, int $firmaId, int $subeId,
        string $queryType, string $queryValue, ?int $modelId, bool $hasVaryant
    ): array {
        $sql = "
            SELECT
                sm.barkod_tipi,
                sm.beden,
                COALESCE(mk.model_adi, '') AS model,
                COALESCE(t_tip.tanim_deger, '') AS type,
                COALESCE(t_alttip.tanim_deger, '') AS subtype,
                COALESCE(t_cins.tanim_deger, '') AS kind
        ";

        if ($hasVaryant) {
            $sql .= ",
                COALESCE(t_renk.tanim_deger, '') AS color,
                CASE
                    WHEN sm.barkod_tipi = 'tekil' THEN COUNT(DISTINCT sm.id)
                    WHEN sm.barkod_tipi IN ('seri', 'cogul') THEN COALESCE(SUM(sv.miktar1_kalan), 0)
                    ELSE 0
                END AS quantity
            ";
        } else {
            $sql .= ",
                '' AS color,
                CASE
                    WHEN sm.barkod_tipi = 'tekil' THEN COUNT(DISTINCT sm.id)
                    ELSE COALESCE(SUM(sm.miktar1_kalan), 0)
                END AS quantity
            ";
        }

        $sql .= "
            FROM stok_master sm
            LEFT JOIN model_kartlar mk ON sm.model_id = mk.id
            LEFT JOIN tanimlar t_tip ON t_tip.id = sm.tipi_id
            LEFT JOIN tanimlar t_alttip ON t_alttip.id = sm.alt_tipi_id
            LEFT JOIN tanimlar t_cins ON t_cins.id = sm.cinsi_id
        ";

        if ($hasVaryant) {
            $sql .= "
            LEFT JOIN stok_varyant sv
                ON sv.stok_master_id = sm.id
                AND sv.firma_id = sm.firma_id
                AND sv.aktif = 1
            LEFT JOIN tanimlar t_renk ON t_renk.id = sv.renk_id
            ";
        }

        $sql .= "
            WHERE sm.firma_id = :firmaId
              AND sm.aktif = 1
              AND sm.stok_alt_modul = 'konfeksiyon-stok'
        ";

        $params = [':firmaId' => $firmaId];

        if ($subeId > 0) {
            $sql .= " AND sm.sube_id = :subeId";
            $params[':subeId'] = $subeId;
        }

        if ($queryType === 'barcode') {
            if ($hasVaryant) {
                $sql .= " AND (sm.barkod = :qv1 OR sv.barkod = :qv2)";
                $params[':qv1'] = $queryValue;
                $params[':qv2'] = $queryValue;
            } else {
                $sql .= " AND sm.barkod = :qv1";
                $params[':qv1'] = $queryValue;
            }
        } else {
            if ($modelId) {
                $sql .= " AND sm.model_id = :modelId";
                $params[':modelId'] = $modelId;
            } else {
                $sql .= " AND mk.model_adi = :modelName";
                $params[':modelName'] = $queryValue;
            }
        }

        $groupBy = "sm.model_id, sm.tipi_id, sm.alt_tipi_id, sm.cinsi_id, sm.barkod_tipi,
            CASE WHEN sm.barkod_tipi = 'cogul' THEN NULL ELSE sm.beden END";

        if ($hasVaryant) {
            $groupBy .= ", sv.renk_id";
        }

        $sql .= " GROUP BY {$groupBy}";
        $sql .= " ORDER BY sm.model_id, sm.tipi_id, sm.beden";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'branchWarehouse' => '-',
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
