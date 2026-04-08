<?php
/**
 * FaturaService - Fatura/İrsaliye Master Servisi
 *
 * Sistemin her yerinden çağrılabilir.
 * fatura_irsaliye_master tablosuna CRUD işlemleri yapar.
 *
 * Kullanım:
 *   $faturaService = new FaturaService($pdo, $firmaId, $subeId, $kullaniciId);
 *   $faturaId = $faturaService->create([
 *       'carilerId'   => 123,
 *       'tipiId'      => 2,        // fatura_irsaliye_tipi.id
 *       'modulKodu'   => 'magaza-satis',
 *       'seriNo'      => 'STS-2026-000001',
 *       'tarih'       => '2026-03-24 10:30:00',
 *       'vade'        => '2026-04-24 00:00:00',
 *       'doviz'       => 'USD',
 *       'aciklama'    => 'Mağaza satış faturası',
 *   ]);
 */

class FaturaService {
    private PDO $pdo;
    private int $firmaId;
    private int $subeId;
    private int $kullaniciId;
    private string $ip;

    public function __construct(PDO $pdo, int $firmaId, int $subeId, int $kullaniciId) {
        $this->pdo = $pdo;
        $this->firmaId = $firmaId;
        $this->subeId = $subeId;
        $this->kullaniciId = $kullaniciId;
        $this->ip = $_SERVER['REMOTE_ADDR'] ?? '';
    }

    /**
     * Yeni seri no üretir
     * Format: PREFIX-YYYY-NNNNNN (örn: STS-2026-000001)
     *
     * @param string $prefix Seri prefix (STS, ALS, IAD vb.)
     * @return string
     */
    public function getNextSeriNo(string $prefix = 'STS'): string {
        $yil = date('Y');
        $aramaPrefix = $prefix . '-' . $yil . '-';

        $stmt = $this->pdo->prepare("
            SELECT seri_no FROM fatura_irsaliye_master
            WHERE firma_id = :firmaId
              AND seri_no LIKE :prefix
            ORDER BY id DESC
            LIMIT 1
        ");
        $stmt->execute([
            ':firmaId' => $this->firmaId,
            ':prefix' => $aramaPrefix . '%',
        ]);
        $row = $stmt->fetch();

        if ($row && !empty($row['seri_no'])) {
            $parts = explode('-', $row['seri_no']);
            if (count($parts) === 3) {
                $nextNum = intval($parts[2]) + 1;
                return $aramaPrefix . str_pad($nextNum, 6, '0', STR_PAD_LEFT);
            }
        }

        return $aramaPrefix . '000001';
    }

    /**
     * Fatura/İrsaliye master kaydı oluşturur
     *
     * @param array $data Fatura bilgileri
     * @return array ['id' => int, 'seriNo' => string]
     */
    public function create(array $data): array {
        $carilerId = (int)($data['carilerId'] ?? 0);
        $tipiId = (int)($data['tipiId'] ?? 0);
        $modulKodu = $data['modulKodu'] ?? '';
        $seriNo = $data['seriNo'] ?? $this->getNextSeriNo();
        $tarih = $data['tarih'] ?? date('Y-m-d H:i:s');
        $vade = $data['vade'] ?? $tarih;
        $doviz = $data['doviz'] ?? 'USD';
        $faturaAdresId = (int)($data['faturaAdresId'] ?? 0);
        $sevkAdresId = (int)($data['sevkAdresId'] ?? 0);
        $aciklama = $data['aciklama'] ?? '';
        $faturaKur = (float)($data['faturaKur'] ?? 0);
        $acenteId = (int)($data['acenteId'] ?? 0);
        $rehberId = (int)($data['rehberId'] ?? 0);
        $irsaliyeOnay = (int)($data['irsaliyeOnay'] ?? 0);
        $masterIndirimTipi = (int)($data['masterIndirimTipi'] ?? -1);
        $masterIndirimDeger = isset($data['masterIndirimDeger']) ? (float)$data['masterIndirimDeger'] : null;
        $masterIndirimTutar = (float)($data['masterIndirimTutar'] ?? 0);

        $sql = "INSERT INTO fatura_irsaliye_master (
            firma_id, sube_id, cariler_id, tipi_id, modul_kodu,
            seri_no, tarih, vade, doviz,
            fatura_adres_id, sevk_adres_id,
            aciklama, fatura_kur,
            acente_id, rehber_id, irsaliye_onay,
            master_indirim_tipi, master_indirim_deger, master_indirim_tutar,
            kayit_kullanici_id, kayit_ip, aktif
        ) VALUES (
            :firmaId, :subeId, :carilerId, :tipiId, :modulKodu,
            :seriNo, :tarih, :vade, :doviz,
            :faturaAdresId, :sevkAdresId,
            :aciklama, :faturaKur,
            :acenteId, :rehberId, :irsaliyeOnay,
            :masterIndirimTipi, :masterIndirimDeger, :masterIndirimTutar,
            :kullaniciId, :ip, 1
        )";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':firmaId' => $this->firmaId,
            ':subeId' => $this->subeId,
            ':carilerId' => $carilerId,
            ':tipiId' => $tipiId,
            ':modulKodu' => $modulKodu,
            ':seriNo' => $seriNo,
            ':tarih' => $tarih,
            ':vade' => $vade,
            ':doviz' => $doviz,
            ':faturaAdresId' => $faturaAdresId,
            ':sevkAdresId' => $sevkAdresId,
            ':aciklama' => $aciklama,
            ':faturaKur' => $faturaKur,
            ':acenteId' => $acenteId,
            ':rehberId' => $rehberId,
            ':irsaliyeOnay' => $irsaliyeOnay,
            ':masterIndirimTipi' => $masterIndirimTipi,
            ':masterIndirimDeger' => $masterIndirimDeger,
            ':masterIndirimTutar' => $masterIndirimTutar,
            ':kullaniciId' => $this->kullaniciId,
            ':ip' => $this->ip,
        ]);

        $id = (int)$this->pdo->lastInsertId();
        return ['id' => $id, 'seriNo' => $seriNo];
    }

    /**
     * Fatura/İrsaliye master kaydını günceller
     *
     * @param int $faturaId Fatura ID
     * @param array $data Güncellenecek alanlar
     * @return bool
     */
    public function update(int $faturaId, array $data): bool {
        $allowedFields = [
            'carilerId' => 'cariler_id',
            'tipiId' => 'tipi_id',
            'modulKodu' => 'modul_kodu',
            'seriNo' => 'seri_no',
            'tarih' => 'tarih',
            'vade' => 'vade',
            'doviz' => 'doviz',
            'faturaAdresId' => 'fatura_adres_id',
            'sevkAdresId' => 'sevk_adres_id',
            'toplamMiktar' => 'toplam_miktar',
            'toplamTutar' => 'toplam_tutar',
            'toplamIndirim' => 'toplam_indirim',
            'toplamKdv' => 'toplam_kdv',
            'toplamOtv' => 'toplam_otv',
            'toplamOiv' => 'toplam_oiv',
            'toplamKonaklama' => 'toplam_konaklama',
            'toplamTevkifat' => 'toplam_tevkifat',
            'faturaKur' => 'fatura_kur',
            'odemeDurum' => 'odeme_durum',
            'aciklama' => 'aciklama',
            'masterIndirimTipi' => 'master_indirim_tipi',
            'masterIndirimDeger' => 'master_indirim_deger',
            'masterIndirimTutar' => 'master_indirim_tutar',
            'irsaliyeOnay' => 'irsaliye_onay',
            'fisMasterId' => 'fis_master_id',
            'acenteId' => 'acente_id',
            'rehberId' => 'rehber_id',
        ];

        $updates = [];
        $params = [':id' => $faturaId, ':firmaId' => $this->firmaId];

        foreach ($allowedFields as $inputKey => $dbColumn) {
            if (array_key_exists($inputKey, $data)) {
                $paramKey = ':' . $inputKey;
                $updates[] = "{$dbColumn} = {$paramKey}";
                $params[$paramKey] = $data[$inputKey];
            }
        }

        if (empty($updates)) return false;

        $sql = "UPDATE fatura_irsaliye_master SET " . implode(', ', $updates) . " WHERE id = :id AND firma_id = :firmaId";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Toplamları yeniden hesaplar (detaylardan)
     *
     * @param int $faturaId Fatura ID
     * @return bool
     */
    public function recalculateTotals(int $faturaId): bool {
        $stmt = $this->pdo->prepare("
            SELECT
                COALESCE(SUM(miktar), 0) AS toplam_miktar,
                COALESCE(SUM(tutar), 0) AS toplam_tutar,
                COALESCE(SUM(indirim_tutar), 0) AS toplam_indirim,
                COALESCE(SUM(kdv_tutar), 0) AS toplam_kdv,
                COALESCE(SUM(otv_tutar), 0) AS toplam_otv
            FROM fatura_irsaliye_detay
            WHERE fatura_irsaliye_master_id = ? AND aktif = 1
        ");
        $stmt->execute([$faturaId]);
        $row = $stmt->fetch();

        if (!$row) return false;

        return $this->update($faturaId, [
            'toplamMiktar' => (float)$row['toplam_miktar'],
            'toplamTutar' => (float)$row['toplam_tutar'],
            'toplamIndirim' => (float)$row['toplam_indirim'],
            'toplamKdv' => (float)$row['toplam_kdv'],
            'toplamOtv' => (float)$row['toplam_otv'],
        ]);
    }

    /**
     * Fatura/İrsaliye master kaydını siler (soft delete)
     *
     * @param int $faturaId Fatura ID
     * @return bool
     */
    public function delete(int $faturaId): bool {
        $stmt = $this->pdo->prepare("UPDATE fatura_irsaliye_master SET aktif = -1 WHERE id = ? AND firma_id = ?");
        return $stmt->execute([$faturaId, $this->firmaId]);
    }

    /**
     * Fatura/İrsaliye master kaydını getirir
     *
     * @param int $faturaId Fatura ID
     * @return array|null
     */
    public function get(int $faturaId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT fm.*,
                   COALESCE(c.unvan, '') AS cari_adi,
                   COALESCE(c.hesap_kodu, '') AS cari_hesap_kodu,
                   COALESCE(ft.tipi, '') AS fatura_tipi_adi
            FROM fatura_irsaliye_master fm
            LEFT JOIN cariler c ON c.id = fm.cariler_id
            LEFT JOIN fatura_irsaliye_tipi ft ON ft.id = fm.tipi_id
            WHERE fm.id = ? AND fm.firma_id = ? AND fm.aktif != -1
        ");
        $stmt->execute([$faturaId, $this->firmaId]);
        $row = $stmt->fetch();

        if (!$row) return null;

        return $this->mapRow($row);
    }

    /**
     * Fatura/İrsaliye listesi getirir
     *
     * @param array $filters Filtreler
     * @return array
     */
    public function getList(array $filters = []): array {
        $where = ['fm.firma_id = :firmaId', 'fm.aktif != -1'];
        $params = [':firmaId' => $this->firmaId];

        if (!empty($filters['subeId'])) {
            $where[] = 'fm.sube_id = :subeId';
            $params[':subeId'] = (int)$filters['subeId'];
        }

        if (!empty($filters['modulKodu'])) {
            $where[] = 'fm.modul_kodu = :modulKodu';
            $params[':modulKodu'] = $filters['modulKodu'];
        }

        if (!empty($filters['tipiId'])) {
            $where[] = 'fm.tipi_id = :tipiId';
            $params[':tipiId'] = (int)$filters['tipiId'];
        }

        if (!empty($filters['carilerId'])) {
            $where[] = 'fm.cariler_id = :carilerId';
            $params[':carilerId'] = (int)$filters['carilerId'];
        }

        if (!empty($filters['startDate'])) {
            $where[] = 'fm.tarih >= :startDate';
            $params[':startDate'] = $filters['startDate'];
        }

        if (!empty($filters['endDate'])) {
            $where[] = 'fm.tarih <= :endDate';
            $params[':endDate'] = $filters['endDate'];
        }

        if (isset($filters['odemeDurum'])) {
            $where[] = 'fm.odeme_durum = :odemeDurum';
            $params[':odemeDurum'] = (int)$filters['odemeDurum'];
        }

        $whereClause = implode(' AND ', $where);
        $limit = (int)($filters['limit'] ?? 100);
        $offset = (int)($filters['offset'] ?? 0);

        $sql = "
            SELECT fm.*,
                   COALESCE(c.unvan, '') AS cari_adi,
                   COALESCE(c.hesap_kodu, '') AS cari_hesap_kodu,
                   COALESCE(ft.tipi, '') AS fatura_tipi_adi,
                   (SELECT COUNT(*) FROM fatura_irsaliye_detay fd WHERE fd.fatura_irsaliye_master_id = fm.id AND fd.aktif = 1) AS detay_sayisi
            FROM fatura_irsaliye_master fm
            LEFT JOIN cariler c ON c.id = fm.cariler_id
            LEFT JOIN fatura_irsaliye_tipi ft ON ft.id = fm.tipi_id
            WHERE {$whereClause}
            ORDER BY fm.tarih DESC, fm.id DESC
            LIMIT {$limit} OFFSET {$offset}
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        $items = [];
        foreach ($stmt->fetchAll() as $row) {
            $items[] = $this->mapRow($row);
        }
        return $items;
    }

    /**
     * Fatura onaylar ve muhasebe fişi oluşturur
     *
     * @param int $faturaId Fatura ID
     * @param FisService $fisService Fiş servisi
     * @return array ['fisMasterId' => int, 'fisNo' => string]
     */
    public function onayla(int $faturaId, FisService $fisService): array {
        $fatura = $this->get($faturaId);
        if (!$fatura) {
            throw new \Exception('Fatura bulunamadı');
        }

        if ($fatura['fisMasterId'] > 0) {
            throw new \Exception('Fatura zaten onaylanmış');
        }

        // Şube ayarlarından kasa durumunu al
        $subeAyarStmt = $this->pdo->prepare("SELECT sube_genel_ayar FROM subeler WHERE id = ?");
        $subeAyarStmt->execute([$this->subeId]);
        $subeAyarRow = $subeAyarStmt->fetch();
        $subeAyar = $subeAyarRow && $subeAyarRow['sube_genel_ayar']
            ? json_decode($subeAyarRow['sube_genel_ayar'], true) : [];
        $kasaDurum = ($subeAyar['fisleri_aktif_yaz'] ?? true) ? 1 : 0;

        $result = $fisService->createFisMaster([
            'fisTipi' => 'Fatura',
            'fisTarihi' => $fatura['tarih'],
            'fisAciklama' => 'Fatura - ' . $fatura['seriNo'],
            'kayitId' => $faturaId,
            'kayitTablo' => 'fatura_master',
            'kasaDurum' => $kasaDurum,
        ]);

        // Fatura master'a fiş ID'sini yaz
        $this->update($faturaId, ['fisMasterId' => $result['id']]);

        return $result;
    }

    /**
     * DB row'u response formatına çevirir
     */
    private function mapRow(array $row): array {
        return [
            'id' => (int)$row['id'],
            'firmaId' => (int)$row['firma_id'],
            'subeId' => (int)$row['sube_id'],
            'carilerId' => (int)$row['cariler_id'],
            'cariAdi' => $row['cari_adi'] ?? '',
            'cariHesapKodu' => $row['cari_hesap_kodu'] ?? '',
            'tipiId' => (int)$row['tipi_id'],
            'faturaTipiAdi' => $row['fatura_tipi_adi'] ?? '',
            'modulKodu' => $row['modul_kodu'],
            'fisMasterId' => (int)($row['fis_master_id'] ?? 0),
            'seriNo' => $row['seri_no'],
            'tarih' => $row['tarih'],
            'vade' => $row['vade'],
            'doviz' => $row['doviz'],
            'faturaKur' => (float)$row['fatura_kur'],
            'toplamMiktar' => (float)$row['toplam_miktar'],
            'toplamTutar' => (float)$row['toplam_tutar'],
            'toplamIndirim' => (float)$row['toplam_indirim'],
            'toplamKdv' => (float)$row['toplam_kdv'],
            'toplamOtv' => (float)($row['toplam_otv'] ?? 0),
            'toplamOiv' => (float)($row['toplam_oiv'] ?? 0),
            'toplamKonaklama' => (float)($row['toplam_konaklama'] ?? 0),
            'toplamTevkifat' => (float)($row['toplam_tevkifat'] ?? 0),
            'odemeDurum' => (int)$row['odeme_durum'],
            'aciklama' => $row['aciklama'] ?? '',
            'masterIndirimTipi' => (int)$row['master_indirim_tipi'],
            'masterIndirimDeger' => $row['master_indirim_deger'] !== null ? (float)$row['master_indirim_deger'] : null,
            'masterIndirimTutar' => (float)$row['master_indirim_tutar'],
            'irsaliyeOnay' => (int)$row['irsaliye_onay'],
            'acenteId' => (int)($row['acente_id'] ?? 0),
            'rehberId' => (int)($row['rehber_id'] ?? 0),
            'detaySayisi' => (int)($row['detay_sayisi'] ?? 0),
            'aktif' => (int)$row['aktif'],
            'kayitTarihi' => $row['kayit_tarihi'],
        ];
    }
}
