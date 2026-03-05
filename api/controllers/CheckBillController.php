<?php
/**
 * Check/Bill Controller
 * Çek ve senet işlemleri
 */

class CheckBillController {
    /**
     * POST /account/check-bill-list
     * Çek/Senet listesi
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
        $startDate = $data['startDate'] ?? '';
        $endDate = $data['endDate'] ?? '';
        $documentType = $data['documentType'] ?? '%';
        $documentLocation = $data['documentLocation'] ?? '%';
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
            $conditions = ["cm.aktif = 1"];

            // Sube filtresi
            if ($subeId > 0) {
                $conditions[] = "cm.sube_id = :subeId";
                $params[':subeId'] = $subeId;
            }

            // Tarih filtresi (vade tarihine göre)
            if (!empty($startDate)) {
                $conditions[] = "cm.vade >= :startDate";
                $params[':startDate'] = $startDate;
            }
            if (!empty($endDate)) {
                $conditions[] = "cm.vade <= :endDate";
                $params[':endDate'] = $endDate;
            }

            // Evrak tipi filtresi
            if ($documentType !== '%' && !empty($documentType)) {
                $conditions[] = "cm.evrak_tipi = :evrakTipi";
                $params[':evrakTipi'] = $documentType;
            }

            // Evrak yeri filtresi
            if ($documentLocation !== '%' && !empty($documentLocation)) {
                $conditions[] = "cm.evrak_yeri = :evrakYeri";
                $params[':evrakYeri'] = $documentLocation;
            }

            // Arama filtresi
            if (!empty($search)) {
                $conditions[] = "(cm.evrak_no LIKE :search OR c.unvan LIKE :search2 OR cm.banka LIKE :search3)";
                $params[':search'] = "%{$search}%";
                $params[':search2'] = "%{$search}%";
                $params[':search3'] = "%{$search}%";
            }

            $whereClause = implode(' AND ', $conditions);

            $sql = "
                SELECT
                    cm.id,
                    cm.evrak_tipi,
                    cm.evrak_yeri,
                    cm.evrak_no,
                    cm.cek_seri_no,
                    DATE_FORMAT(cm.tarih, '%d.%m.%Y') AS tarih,
                    DATE_FORMAT(cm.vade, '%d.%m.%Y') AS vade,
                    DATE_FORMAT(cm.vade, '%Y-%m') AS vade_ay_sort,
                    DATE_FORMAT(cm.odeme, '%d.%m.%Y') AS odeme_tarihi,
                    cm.tutar,
                    cm.doviz,
                    cm.odenen,
                    (cm.tutar - cm.odenen) AS kalan,
                    cm.banka,
                    cm.banka_sube,
                    cm.banka_hesap,
                    cm.evrak_sahibi,
                    COALESCE(c.unvan, '') AS cari_unvan,
                    COALESCE(c.hesap_kodu, '') AS cari_hesap_kodu,
                    COALESCE(sc.unvan, '') AS son_cari_unvan
                FROM cek_master cm
                LEFT JOIN cariler c ON c.id = cm.cari_id
                LEFT JOIN cariler sc ON sc.id = cm.son_cari_id
                WHERE {$whereClause}
                ORDER BY cm.vade ASC
                LIMIT 500
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            // Aylık vade özeti hesapla
            $monthNames = [
                '01' => 'Ocak', '02' => 'Şubat', '03' => 'Mart',
                '04' => 'Nisan', '05' => 'Mayıs', '06' => 'Haziran',
                '07' => 'Temmuz', '08' => 'Ağustos', '09' => 'Eylül',
                '10' => 'Ekim', '11' => 'Kasım', '12' => 'Aralık'
            ];

            // Map rows
            $items = [];
            foreach ($rows as $row) {
                $vadeAy = $row['vade_ay_sort'] ?? '';
                $monthPart = substr($vadeAy, 5, 2);
                $yearPart = substr($vadeAy, 0, 4);
                $dueMonth = isset($monthNames[$monthPart]) ? $monthNames[$monthPart] . ' ' . $yearPart : $vadeAy;

                $items[] = [
                    'id' => (string)$row['id'],
                    'documentNo' => $row['evrak_no'] ?: $row['cek_seri_no'] ?: '',
                    'documentType' => $row['evrak_tipi'] === 'Çek' ? 'check' : 'bill',
                    'documentLocation' => $row['evrak_yeri'],
                    'customerName' => $row['cari_unvan'],
                    'customerCode' => $row['cari_hesap_kodu'],
                    'lastCustomerName' => $row['son_cari_unvan'],
                    'documentDate' => $row['tarih'],
                    'dueDate' => $row['vade'],
                    'paymentDate' => $row['odeme_tarihi'] !== '00.00.0000' ? $row['odeme_tarihi'] : null,
                    'bank' => $row['banka'] ?: null,
                    'bankBranch' => $row['banka_sube'] ?: null,
                    'bankAccount' => $row['banka_hesap'] ?: null,
                    'owner' => $row['evrak_sahibi'] ?: null,
                    'currency' => $row['doviz'] ?: 'TL',
                    'amount' => (float)$row['tutar'],
                    'paid' => (float)$row['odenen'],
                    'remaining' => (float)$row['kalan'],
                    'dueMonth' => $dueMonth,
                ];
            }

            // Hareketleri al (detay)
            if (!empty($items)) {
                $masterIds = array_column($items, 'id');
                $placeholders = implode(',', array_fill(0, count($masterIds), '?'));

                $detaySql = "
                    SELECT
                        cd.id,
                        cd.cek_master_id,
                        cd.evrak_yeri,
                        DATE_FORMAT(cd.tarih, '%d.%m.%Y') AS tarih,
                        cd.tutar,
                        cd.doviz,
                        cd.giris_cikis,
                        COALESCE(cd.aciklama, '') AS aciklama,
                        COALESCE(c.unvan, '') AS cari_unvan
                    FROM cek_detay cd
                    LEFT JOIN cariler c ON c.id = cd.cari_id
                    WHERE cd.aktif = 1 AND cd.cek_master_id IN ({$placeholders})
                    ORDER BY cd.tarih ASC
                ";

                $detayStmt = $pdo->prepare($detaySql);
                $detayStmt->execute($masterIds);
                $detayRows = $detayStmt->fetchAll();

                // Group by master id
                $movementsMap = [];
                foreach ($detayRows as $d) {
                    $mid = (string)$d['cek_master_id'];
                    if (!isset($movementsMap[$mid])) {
                        $movementsMap[$mid] = [];
                    }
                    $movementsMap[$mid][] = [
                        'id' => (string)$d['id'],
                        'date' => $d['tarih'],
                        'location' => $d['evrak_yeri'],
                        'customer' => $d['cari_unvan'] ?: null,
                        'description' => $d['aciklama'] ?: null,
                        'amount' => (float)$d['tutar'],
                        'currency' => $d['doviz'] ?: 'TL',
                        'type' => $d['giris_cikis'] == 1 ? 'in' : 'out',
                    ];
                }

                // Attach movements to items
                foreach ($items as &$item) {
                    $item['movements'] = $movementsMap[$item['id']] ?? [];
                }
            }

            Response::success([
                'data' => $items,
                'count' => count($items),
            ]);

        } catch (PDOException $e) {
            Response::serverError('Veritabanı hatası: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Çek/Senet listesi alınamadı: ' . $e->getMessage());
        }
    }
}
