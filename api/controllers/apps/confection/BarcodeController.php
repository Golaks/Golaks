<?php
/**
 * Confection Barcode Controller
 * Barkod ve model sorgu işlemleri (konfeksiyon stok)
 *
 * POST /apps/confection/barcode-query
 */

class ConfectionBarcodeController {

    /**
     * Barkod veya model adıyla stok sorgulama
     * POST /apps/confection/barcode-query
     *
     * Request Body:
     *   dataName   - Şirket veritabanı adı
     *   queryType  - 'barcode' veya 'model'
     *   queryValue - Aranacak barkod veya model adı
     */
    public function queryStock() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        // Token kontrolü
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'] ?? $auth['userId'] ?? null;

        if (!$userId) {
            Response::unauthorized('Geçersiz oturum');
        }

        // Request body
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $dataName = $data['dataName'] ?? '';
        $queryType = $data['queryType'] ?? '';
        $queryValue = $data['queryValue'] ?? '';

        // Validasyon
        if (empty($dataName)) {
            Response::error('dataName gereklidir', 'VALIDATION_ERROR', 400);
        }
        if (empty($queryType) || !in_array($queryType, ['barcode', 'model'])) {
            Response::error('queryType geçersiz (barcode veya model olmalı)', 'VALIDATION_ERROR', 400);
        }
        if (empty($queryValue)) {
            Response::error('queryValue gereklidir', 'VALIDATION_ERROR', 400);
        }

        try {
            $db = Database::getInstance();

            // Kullanıcının firma bilgilerini al
            $currentUser = $db->fetchOne(
                "SELECT mobil_firmalar_id, kullanici_yetkiler FROM mobil_kullanici WHERE id = ?",
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

            // Firma veritabanı bağlantısı
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

            // Kullanıcının şube yetkilerini al
            $yetkiler = [];
            if (!empty($currentUser['kullanici_yetkiler'])) {
                $yetkiler = json_decode($currentUser['kullanici_yetkiler'], true) ?? [];
            }
            $subeYetkileri = $yetkiler['sube_yetkileri'] ?? [];

            // ERP firma_id ve sube_id bilgilerini al
            $erpFirmaId = $firmaAyarlar['erp_firma_id'] ?? 1;
            $erpSubeId = $yetkiler['varsayilan_sube'] ?? null;

            // Şube filtresi
            $subeFilter = '';
            $subeParams = [];

            if (!empty($erpSubeId)) {
                $subeFilter = ' AND sm.sube_id = :subeId';
                $subeParams[':subeId'] = $erpSubeId;
            } elseif (!empty($subeYetkileri)) {
                $placeholders = [];
                foreach ($subeYetkileri as $i => $sid) {
                    $key = ':sube' . $i;
                    $placeholders[] = $key;
                    $subeParams[$key] = $sid;
                }
                $subeFilter = ' AND sm.sube_id IN (' . implode(',', $placeholders) . ')';
            }

            // Barcode / Model filtresi
            $queryFilter = '';
            $queryParams = [];

            if ($queryType === 'barcode') {
                $queryFilter = ' AND (sm.barkod = :queryValue OR sv.barkod = :queryValue2)';
                $queryParams[':queryValue'] = $queryValue;
                $queryParams[':queryValue2'] = $queryValue;
            } else {
                // model
                $queryFilter = ' AND mk.model_adi = :queryValue';
                $queryParams[':queryValue'] = $queryValue;
            }

            // Optimized SQL - LEFT JOIN kullanarak (subquery yerine)
            $sql = "
                SELECT
                    sm.barkod_tipi,
                    sm.beden,
                    mk.model_adi AS model,
                    t_renk.tanim_deger AS renk,
                    t_tip.tanim_deger AS tip,
                    t_alttip.tanim_deger AS alttip,
                    t_cins.tanim_deger AS cins,
                    CASE
                        WHEN sm.barkod_tipi = 'tekil' THEN COUNT(DISTINCT sm.id)
                        WHEN sm.barkod_tipi IN ('seri', 'cogul') THEN SUM(sv.miktar1_kalan)
                    END AS adet
                FROM stok_master sm
                LEFT JOIN stok_varyant sv
                    ON sv.stok_master_id = sm.id
                    AND sv.firma_id = sm.firma_id
                    AND sv.aktif = 1
                LEFT JOIN model_kartlar mk
                    ON sm.model_id = mk.id
                LEFT JOIN tanimlar t_renk ON t_renk.id = sv.renk_id
                LEFT JOIN tanimlar t_tip ON t_tip.id = sm.tipi_id
                LEFT JOIN tanimlar t_alttip ON t_alttip.id = sm.alt_tipi_id
                LEFT JOIN tanimlar t_cins ON t_cins.id = sm.cinsi_id
                WHERE sm.firma_id = :firmaId
                    AND sm.aktif = 1
                    AND sm.stok_alt_modul = 'konfeksiyon-stok'
                    {$subeFilter}
                    {$queryFilter}
                GROUP BY sm.model_id, sm.tipi_id, sm.alt_tipi_id, sm.cinsi_id, sm.barkod_tipi,
                    CASE WHEN sm.barkod_tipi = 'cogul' THEN NULL ELSE sm.beden END,
                    sv.renk_id
                ORDER BY sm.model_id, sm.tipi_id, sv.renk_id, sm.beden
            ";

            $params = array_merge(
                [':firmaId' => $erpFirmaId],
                $subeParams,
                $queryParams
            );

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            // Sonuçları formatla
            $items = [];
            foreach ($rows as $row) {
                $items[] = [
                    'barkod_tipi' => $row['barkod_tipi'] ?? 'tekil',
                    'beden' => $row['beden'] ?? '',
                    'model' => $row['model'] ?? '',
                    'renk' => $row['renk'] ?? '',
                    'tip' => $row['tip'] ?? '',
                    'alttip' => $row['alttip'] ?? '',
                    'cins' => $row['cins'] ?? '',
                    'adet' => (int)($row['adet'] ?? 0),
                ];
            }

            // Ürün bilgisi (ilk sonuçtan)
            $productInfo = null;
            if (!empty($items)) {
                // Barkod ile sorgulama ise ürün detaylarını al
                if ($queryType === 'barcode') {
                    $productInfoSql = "
                        SELECT
                            sm.barkod,
                            mk.model_adi,
                            sm.beden,
                            t_renk.tanim_deger AS renk,
                            s.sube_adi,
                            sm.depo,
                            sm.imalatci,
                            sm.yil,
                            sm.bilgi,
                            sm.giris_fiyat,
                            sm.maliyet_fiyat,
                            sm.etiket_fiyat,
                            sm.giris_maliyet_doviz,
                            sm.etiket_doviz
                        FROM stok_master sm
                        LEFT JOIN model_kartlar mk ON sm.model_id = mk.id
                        LEFT JOIN stok_varyant sv ON sv.stok_master_id = sm.id AND sv.aktif = 1
                        LEFT JOIN tanimlar t_renk ON t_renk.id = sv.renk_id
                        LEFT JOIN subeler s ON sm.sube_id = s.id
                        WHERE sm.firma_id = :firmaId
                            AND sm.aktif = 1
                            AND (sm.barkod = :barkod OR sv.barkod = :barkod2)
                        LIMIT 1
                    ";

                    $infoStmt = $pdo->prepare($productInfoSql);
                    $infoStmt->execute([
                        ':firmaId' => $erpFirmaId,
                        ':barkod' => $queryValue,
                        ':barkod2' => $queryValue,
                    ]);
                    $infoRow = $infoStmt->fetch();

                    if ($infoRow) {
                        $productInfo = [
                            'barcode' => $infoRow['barkod'] ?? $queryValue,
                            'model' => $infoRow['model_adi'] ?? '',
                            'size' => $infoRow['beden'] ?? '',
                            'color' => $infoRow['renk'] ?? '',
                            'branch' => $infoRow['sube_adi'] ?? '',
                            'warehouse' => $infoRow['depo'] ?? '',
                            'manufacturer' => $infoRow['imalatci'] ?? '',
                            'year' => $infoRow['yil'] ?? '',
                            'info' => $infoRow['bilgi'] ?? '',
                            'entryPrice' => $infoRow['giris_fiyat'] ?? '0',
                            'costPrice' => $infoRow['maliyet_fiyat'] ?? '0',
                            'labelPrice' => $infoRow['etiket_fiyat'] ?? '0',
                            'entryCostCurrency' => $infoRow['giris_maliyet_doviz'] ?? 'TL',
                            'labelCurrency' => $infoRow['etiket_doviz'] ?? 'TL',
                        ];
                    }
                }
            }

            Response::success([
                'items' => $items,
                'productInfo' => $productInfo,
                'images' => [],
                'count' => count($items),
            ]);

        } catch (PDOException $e) {
            error_log("Barcode Query DB Error: " . $e->getMessage());
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            error_log("Barcode Query Error: " . $e->getMessage());
            Response::error('Barkod sorgusu başarısız: ' . $e->getMessage(), 'QUERY_ERROR', 500);
        }
    }
}
