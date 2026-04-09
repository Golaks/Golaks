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

        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true) ?? [];

        $modul = $data['modul'] ?? '';
        $startDate = $data['startDate'] ?? '';
        $endDate = $data['endDate'] ?? '';
        $search = $data['search'] ?? '';

        try {
            $ctx = $this->getContext();
            $pdo = $ctx['pdo'];

            // Query parametreleri
            $params = [];
            $conditions = ["fim.aktif >= -1"];

            // Firma filtresi
            $conditions[] = "fim.firma_id = :firmaId";
            $params[':firmaId'] = $ctx['firmaId'];

            // Modül filtresi
            if (!empty($modul)) {
                $conditions[] = "fim.modul_kodu = :modulKodu";
                $params[':modulKodu'] = $modul;
            }

            // Satış faturaları - gc filtresi opsiyonel
            if (!empty($data['gc'])) {
                $conditions[] = "fit.gc = :gc";
                $params[':gc'] = (int)$data['gc'];
            }

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
                    fim.aktif,
                    fim.cariler_id,
                    fim.tipi_id,
                    fim.art_id,
                    fim.modul_kodu,
                    fim.aciklama,
                    fit.gc,
                    COALESCE(fit.aciklama, '') AS tipi_aciklama,
                    COALESCE(c.unvan, 'Tanımsız') AS cari_adi,
                    COALESCE(s.sube_adi, 'Tanımsız') AS sube_adi,
                    fim.master_indirim_tipi,
                    fim.master_indirim_deger,
                    fim.master_indirim_tutar,
                    (SELECT COUNT(*) FROM stok_detay sd WHERE sd.fatura_master_id = fim.id AND sd.aktif = 1) AS detay_sayisi,
                    (SELECT COALESCE(SUM(IF(sd2.hesaplama_tipi = 1, sd2.miktar2, sd2.miktar) * sd2.gc), 0) FROM stok_detay sd2 WHERE sd2.fatura_master_id = fim.id AND sd2.aktif = 1) AS toplam_urun_miktar
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
                    'carilerId' => (int)$row['cariler_id'],
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
                    'tipiId' => (int)$row['tipi_id'],
                    'artId' => $row['art_id'] ? json_decode($row['art_id'], true) : null,
                    'masterIndirimTipi' => (int)$row['master_indirim_tipi'],
                    'masterIndirimDeger' => $row['master_indirim_deger'] !== null ? (float)$row['master_indirim_deger'] : null,
                    'masterIndirimTutar' => (float)$row['master_indirim_tutar'],
                    'detaySayisi' => (int)$row['detay_sayisi'],
                    'toplamUrunMiktar' => abs((float)$row['toplam_urun_miktar']),
                    'aktif' => (int)$row['aktif'],
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
    private function getContext(): array {
        require_once __DIR__ . '/../includes/ContextHelper.php';
        return ContextHelper::get();
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

            Response::success([
                'seriNo' => $seriNo,
                'varsayilanDoviz' => $varsayilanDoviz,
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
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $ctx = $this->getContext();

            // Validasyon
            if (empty($data['carilerId'])) {
                Response::error('Müşteri seçimi zorunludur', 'VALIDATION_ERROR', 400);
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
                $tipiId = $tipiRow ? (int)$tipiRow['id'] : 18;
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
                'artId' => isset($data['artId']) ? $data['artId'] : null,
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

    /**
     * POST /sales/update
     * Satış faturası günceller
     */
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
        }

        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $ctx = $this->getContext();

            $faturaId = (int)($data['id'] ?? 0);
            if ($faturaId <= 0) {
                Response::error('Fatura ID gereklidir', 'VALIDATION_ERROR', 400);
            }

            require_once __DIR__ . '/../includes/FaturaService.php';
            require_once __DIR__ . '/../includes/LogService.php';

            $faturaService = new FaturaService($ctx['pdo'], $ctx['firmaId'], $ctx['subeId'], $ctx['userId']);
            $logService = new LogService($ctx['pdo'], $ctx['firmaId'], $ctx['subeId'], $ctx['userId']);

            // Eski veriyi al
            $eskiFatura = $faturaService->get($faturaId);
            if (!$eskiFatura) {
                Response::error('Fatura bulunamadı', 'NOT_FOUND', 404);
            }

            // Güncelle
            $updateData = [];
            if (isset($data['carilerId'])) $updateData['carilerId'] = (int)$data['carilerId'];
            if (isset($data['tipiId'])) $updateData['tipiId'] = (int)$data['tipiId'];
            if (isset($data['seriNo'])) $updateData['seriNo'] = $data['seriNo'];
            if (isset($data['tarih'])) $updateData['tarih'] = $data['tarih'];
            if (isset($data['vade'])) $updateData['vade'] = $data['vade'];
            if (isset($data['doviz'])) $updateData['doviz'] = $data['doviz'];
            if (isset($data['aciklama'])) $updateData['aciklama'] = $data['aciklama'];
            if (isset($data['artId'])) $updateData['artId'] = $data['artId'];
            if (isset($data['masterIndirimTipi'])) $updateData['masterIndirimTipi'] = (int)$data['masterIndirimTipi'];
            if (isset($data['masterIndirimDeger'])) $updateData['masterIndirimDeger'] = (float)$data['masterIndirimDeger'];

            $faturaService->update($faturaId, $updateData);

            // Yeni veriyi al
            $yeniFatura = $faturaService->get($faturaId);

            // Log yaz
            $logService->duzenle('fatura_irsaliye_master', $faturaId, $eskiFatura, $yeniFatura, 'Satış faturası güncellendi');

            Response::success([
                'message' => 'Fatura güncellendi',
                'id' => $faturaId,
            ]);

        } catch (PDOException $e) {
            Response::error('DB: ' . $e->getMessage(), 'DB_ERROR', 500);
        } catch (Exception $e) {
            Response::error('ERR: ' . $e->getMessage(), 'GENERAL_ERROR', 500);
        }
    }
}
