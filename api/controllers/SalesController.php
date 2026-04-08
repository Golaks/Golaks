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

            // Sube bilgisi - request'ten veya firma ayarlarından
            $subeAyarlar = $firmaAyarlar['sube'] ?? [];
            $subeId = (int)($data['subeId'] ?? $subeAyarlar['subeId'] ?? 0);

            // subeId 0 ise varsayılan şubeyi bul
            if ($subeId <= 0) {
                $defSubeStmt = $pdo->prepare("SELECT id FROM subeler ORDER BY id ASC LIMIT 1");
                $defSubeStmt->execute();
                $defSubeRow = $defSubeStmt->fetch();
                $subeId = $defSubeRow ? (int)$defSubeRow['id'] : 0;
            }

            // Firma DB'deki gerçek firma_id (subeler tablosundan)
            $dbFirmaStmt = $pdo->prepare("SELECT firma_id FROM subeler WHERE id = ?");
            $dbFirmaStmt->execute([$subeId]);
            $dbFirmaRow = $dbFirmaStmt->fetch();
            $dbFirmaId = $dbFirmaRow ? (int)$dbFirmaRow['firma_id'] : $firmaId;

            // Query parametreleri
            $params = [];
            $conditions = ["fim.aktif = 1"];

            $conditions[] = "fim.firma_id = :firmaId";
            $params[':firmaId'] = $dbFirmaId;

            if ($subeId > 0) {
                $conditions[] = "fim.sube_id = :subeId";
                $params[':subeId'] = $subeId;
            }

            // Modül filtresi
            if (!empty($modul)) {
                $modulMap = [
                    'muhasebe' => ['muhasebe'],
                    'magaza' => ['magaza-stoklar', 'magaza-satis'],
                    'konfeksiyon' => ['konfeksiyon-stok'],
                ];
                $modulKodlari = $modulMap[$modul] ?? [$modul];
                $placeholders = implode(',', array_map(fn($i) => ":modul{$i}", range(0, count($modulKodlari) - 1)));
                $conditions[] = "fim.modul_kodu IN ({$placeholders})";
                foreach ($modulKodlari as $i => $mk) {
                    $params[":modul{$i}"] = $mk;
                }
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

    /**
     * Ortak: Auth + firma DB bağlantısı
     */
    private function getContext() {
        $auth = Auth::requireAuth();
        $userId = $auth['user_id'];

        $db = Database::getInstance();
        $currentUser = $db->fetchOne("SELECT mobil_firmalar_id FROM mobil_kullanici WHERE id = ?", [$userId]);
        if (!$currentUser || !$currentUser['mobil_firmalar_id']) {
            Response::error('Kullanıcı firma bilgisi bulunamadı', 'USER_FIRMA_NOT_FOUND', 404);
        }

        $firmaId = $currentUser['mobil_firmalar_id'];
        $firma = $db->fetchOne("SELECT firma_ayarlar FROM mobil_firmalar WHERE id = ?", [$firmaId]);
        if (!$firma || empty($firma['firma_ayarlar'])) {
            Response::error('Firma ayarları bulunamadı', 'FIRMA_SETTINGS_NOT_FOUND', 404);
        }

        $firmaAyarlar = json_decode($firma['firma_ayarlar'], true) ?: [];
        $veritabani = $firmaAyarlar['veritabani'] ?? [];
        $dsn = "mysql:host={$veritabani['sunucu']};port=" . ((int)($veritabani['port'] ?? 3306)) . ";dbname={$veritabani['veriAdi']};charset=utf8mb4";
        $pdo = new PDO($dsn, $veritabani['kullanici'], $veritabani['sifre'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $subeAyarlar = $firmaAyarlar['sube'] ?? [];
        $subeId = (int)($subeAyarlar['subeId'] ?? 0);

        // Firma DB'deki gerçek firma_id (subeler tablosundan)
        $dbFirmaStmt = $pdo->prepare("SELECT firma_id FROM subeler WHERE id = ?");
        $dbFirmaStmt->execute([$subeId]);
        $dbFirmaRow = $dbFirmaStmt->fetch();
        $dbFirmaId = $dbFirmaRow ? (int)$dbFirmaRow['firma_id'] : $firmaId;

        return [
            'pdo' => $pdo,
            'firmaId' => $dbFirmaId,
            'subeId' => $subeId,
            'userId' => $userId,
        ];
    }

    /**
     * POST /sales/next-seri-no
     * Sıradaki seri numarasını getirir
     */
    public function getNextSeriNo() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $ctx = $this->getContext();
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $prefix = $data['prefix'] ?? 'STS';

            require_once __DIR__ . '/../includes/FaturaService.php';
            $faturaService = new FaturaService($ctx['pdo'], $ctx['firmaId'], $ctx['subeId'], $ctx['userId']);
            $seriNo = $faturaService->getNextSeriNo($prefix);

            // Şubenin varsayılan dövizi
            $subeStmt = $ctx['pdo']->prepare("SELECT varsayilan_doviz FROM subeler WHERE id = ?");
            $subeStmt->execute([$ctx['subeId']]);
            $subeRow = $subeStmt->fetch();
            $varsayilanDoviz = ($subeRow && !empty($subeRow['varsayilan_doviz'])) ? $subeRow['varsayilan_doviz'] : 'TL';

            // Debug: firma_id kontrolü
            $debugStmt = $ctx['pdo']->prepare("SELECT id, seri_no FROM fatura_irsaliye_master WHERE seri_no LIKE 'FAT-2026-%' ORDER BY id DESC LIMIT 1");
            $debugStmt->execute();
            $debugRow = $debugStmt->fetch();

            Response::success([
                'seriNo' => $seriNo,
                'varsayilanDoviz' => $varsayilanDoviz,
                'debug' => [
                    'firmaId' => $ctx['firmaId'],
                    'subeId' => $ctx['subeId'],
                    'lastFatura' => $debugRow ? $debugRow['seri_no'] : 'YOK',
                    'lastFaturaFirmaId' => $debugRow ? $debugRow['id'] : 0,
                ],
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /sales/create
     * Yeni satış faturası oluşturur
     */
    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $rawBody = file_get_contents('php://input');
            $data = json_decode($rawBody, true) ?? [];

            $ctx = $this->getContext();

            // Validasyon
            if (empty($data['carilerId'])) {
                Response::error('Müşteri seçimi zorunludur. Data: ' . $rawBody, 'VALIDATION_ERROR', 400);
            }

            require_once __DIR__ . '/../includes/FaturaService.php';

            // subeId 0 ise varsayılan şubeyi al
            $subeId = $ctx['subeId'];
            if ($subeId <= 0) {
                $subeStmt = $ctx['pdo']->prepare("SELECT id FROM subeler WHERE firma_id = ? LIMIT 1");
                $subeStmt->execute([$ctx['firmaId']]);
                $subeRow = $subeStmt->fetch();
                $subeId = $subeRow ? (int)$subeRow['id'] : 1;
            }

            // tipiId - fatura_irsaliye_tipi'den satış tipini al
            $tipiId = (int)($data['tipiId'] ?? 0);
            if ($tipiId <= 0) {
                $tipiStmt = $ctx['pdo']->prepare("SELECT id FROM fatura_irsaliye_tipi WHERE gc = -1 LIMIT 1");
                $tipiStmt->execute();
                $tipiRow = $tipiStmt->fetch();
                $tipiId = $tipiRow ? (int)$tipiRow['id'] : 51;
            }

            $faturaService = new FaturaService($ctx['pdo'], $ctx['firmaId'], $subeId, $ctx['userId']);

            $result = $faturaService->create([
                'carilerId' => (int)$data['carilerId'],
                'tipiId' => $tipiId,
                'modulKodu' => $data['modulKodu'] ?? 'magaza-satis',
                'seriNo' => $data['seriNo'] ?? $faturaService->getNextSeriNo('STS'),
                'tarih' => $data['tarih'] ?? date('Y-m-d H:i:s'),
                'vade' => $data['vade'] ?? $data['tarih'] ?? date('Y-m-d H:i:s'),
                'doviz' => $data['doviz'] ?? 'TL',
                'aciklama' => $data['aciklama'] ?? '',
                'acenteId' => (int)($data['acenteId'] ?? 0),
                'rehberId' => (int)($data['rehberId'] ?? 0),
                'masterIndirimTipi' => (int)($data['masterIndirimTipi'] ?? -1),
                'masterIndirimDeger' => isset($data['masterIndirimDeger']) ? (float)$data['masterIndirimDeger'] : null,
            ]);

            Response::success([
                'message' => 'Satış faturası oluşturuldu',
                'id' => $result['id'],
                'seriNo' => $result['seriNo'],
            ]);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }

    /**
     * POST /sales/fatura-tipi-list
     * Fatura/İrsaliye tiplerini listeler
     */
    public function getFaturaTipiList() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $ctx = $this->getContext();
            $data = json_decode(file_get_contents('php://input'), true) ?? [];

            $conditions = ['aktif = 1'];
            $params = [];

            if (isset($data['tur'])) {
                $conditions[] = 'tur = :tur';
                $params[':tur'] = (int)$data['tur'];
            }
            if (isset($data['gc'])) {
                $conditions[] = 'gc = :gc';
                $params[':gc'] = (int)$data['gc'];
            }

            $where = implode(' AND ', $conditions);
            $stmt = $ctx['pdo']->prepare("SELECT id, tur, gc, kod, aciklama FROM fatura_irsaliye_tipi WHERE {$where} ORDER BY id ASC");
            $stmt->execute($params);

            $items = [];
            foreach ($stmt->fetchAll() as $row) {
                $items[] = [
                    'id' => (int)$row['id'],
                    'tur' => (int)$row['tur'],
                    'gc' => (int)$row['gc'],
                    'kod' => $row['kod'],
                    'aciklama' => $row['aciklama'],
                ];
            }

            Response::success($items);

        } catch (PDOException $e) {
            Response::error('Veritabanı hatası: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }
}
