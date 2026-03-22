<?php
/**
 * Sales Controller
 * Satış işlemleri (tüm modüller için ortak)
 */

class SalesController {
    /**
     * POST /sales/list
     * Satış listesi
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
        $modul = $data['modul'] ?? '';
        $startDate = $data['startDate'] ?? '';
        $endDate = $data['endDate'] ?? '';
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

            // Query parametreleri
            $params = [];
            $conditions = ["fim.aktif = 1"];

            $conditions[] = "fim.firma_id = :firmaId";
            $params[':firmaId'] = $firmaId;

            if ($subeId > 0) {
                $conditions[] = "fim.sube_id = :subeId";
                $params[':subeId'] = $subeId;
            }

            // Modül filtresi
            if (!empty($modul)) {
                $modulMap = [
                    'muhasebe' => 'muhasebe',
                    'magaza' => 'magaza-stoklar',
                    'konfeksiyon' => 'konfeksiyon-stok',
                ];
                $modulKodu = $modulMap[$modul] ?? $modul;
                $conditions[] = "fim.modul_kodu = :modulKodu";
                $params[':modulKodu'] = $modulKodu;
            }

            // Sadece satış faturaları (gc = -1 çıkış = satış)
            $conditions[] = "fit.gc = -1";

            // Tarih filtresi
            if (!empty($startDate)) {
                $conditions[] = "DATE(fim.tarih) >= :startDate";
                $params[':startDate'] = $startDate;
            }
            if (!empty($endDate)) {
                $conditions[] = "DATE(fim.tarih) <= :endDate";
                $params[':endDate'] = $endDate;
            }

            // Arama filtresi
            if (!empty($search)) {
                $conditions[] = "(c.unvan LIKE :search OR fim.seri_no LIKE :search2)";
                $params[':search'] = "%{$search}%";
                $params[':search2'] = "%{$search}%";
            }

            $whereClause = implode(' AND ', $conditions);

            $sql = "
                SELECT
                    fim.id,
                    fim.seri_no,
                    fim.tarih,
                    fim.vade,
                    fim.doviz,
                    fim.toplam_miktar,
                    fim.toplam_tutar,
                    fim.toplam_indirim,
                    fim.toplam_kdv,
                    fim.odeme_durum,
                    fim.modul_kodu,
                    fim.aciklama,
                    fit.gc,
                    COALESCE(fit.aciklama, '') AS tipi_aciklama,
                    COALESCE(c.unvan, 'Tanımsız') AS cari_adi,
                    COALESCE(s.sube_adi, 'Tanımsız') AS sube_adi
                FROM fatura_irsaliye_master fim
                LEFT JOIN fatura_irsaliye_tipi fit ON fit.id = fim.tipi_id
                LEFT JOIN cariler c ON c.id = fim.cariler_id
                LEFT JOIN subeler s ON s.id = fim.sube_id
                WHERE {$whereClause}
                ORDER BY fim.tarih DESC, fim.id DESC
                LIMIT 500
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $items = [];
            $summaryByCurrency = [];

            foreach ($rows as $row) {
                $doviz = $row['doviz'] ?: 'TL';

                $items[] = [
                    'id' => (string)$row['id'],
                    'seriNo' => $row['seri_no'] ?: '',
                    'tarih' => $row['tarih'],
                    'vadeTarih' => $row['vade'],
                    'cariAdi' => $row['cari_adi'],
                    'subeAdi' => $row['sube_adi'],
                    'tipiAciklama' => $row['tipi_aciklama'],
                    'gc' => (int)$row['gc'],
                    'doviz' => $doviz,
                    'toplamMiktar' => (float)$row['toplam_miktar'],
                    'toplamTutar' => (float)$row['toplam_tutar'],
                    'toplamIndirim' => (float)$row['toplam_indirim'],
                    'toplamKdv' => (float)$row['toplam_kdv'],
                    'odemeDurum' => (int)$row['odeme_durum'],
                    'modulKodu' => $row['modul_kodu'] ?: '',
                    'aciklama' => $row['aciklama'] ?: '',
                ];

                // Döviz bazlı özet
                if (!isset($summaryByCurrency[$doviz])) {
                    $summaryByCurrency[$doviz] = [
                        'currency' => $doviz,
                        'totalCount' => 0,
                        'totalAmount' => 0,
                        'totalDiscount' => 0,
                        'totalVat' => 0,
                        'paidCount' => 0,
                        'partialCount' => 0,
                        'unpaidCount' => 0,
                    ];
                }

                $summaryByCurrency[$doviz]['totalCount']++;
                $summaryByCurrency[$doviz]['totalAmount'] += (float)$row['toplam_tutar'];
                $summaryByCurrency[$doviz]['totalDiscount'] += (float)$row['toplam_indirim'];
                $summaryByCurrency[$doviz]['totalVat'] += (float)$row['toplam_kdv'];

                switch ((int)$row['odeme_durum']) {
                    case 1: $summaryByCurrency[$doviz]['paidCount']++; break;
                    case 2: $summaryByCurrency[$doviz]['partialCount']++; break;
                    case 3: $summaryByCurrency[$doviz]['unpaidCount']++; break;
                }
            }

            Response::success([
                'items' => $items,
                'count' => count($items),
                'summary' => array_values($summaryByCurrency),
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }
}
