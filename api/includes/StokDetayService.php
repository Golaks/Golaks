<?php
/**
 * StokDetayService - Stok Detay (Hareket) Servisi
 *
 * Stok giriş/çıkış hareketleri ve fatura detayları için kullanılır.
 * Trigger'lar stok_master, stok_varyant ve fatura_irsaliye_master toplamlarını otomatik günceller.
 *
 * Kullanım:
 *   $stokDetayService = new StokDetayService($pdo, $firmaId, $subeId, $kullaniciId);
 *   $detayId = $stokDetayService->create([
 *       'stokMasterId'    => 100,
 *       'faturaMasterId'  => 50,
 *       'gc'              => -1,      // 1=giriş, -1=çıkış
 *       'fiyat'           => 25.50,
 *       'miktar'          => 10,
 *       'doviz'           => 'USD',
 *   ]);
 */

class StokDetayService {
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
     * Stok detay (hareket) kaydı oluşturur
     *
     * @param array $data Hareket bilgileri
     * @return int Oluşturulan stok_detay.id
     */
    public function create(array $data): int {
        $sql = "INSERT INTO stok_detay (
            firma_id, sube_id, stok_master_id, stok_varyant_id,
            fatura_master_id, irsaliye_master_id, proses_master_id,
            depo_id, blok_raf_id, tarih, gc,
            fiyat, dovizli_fiyat, doviz,
            miktar, miktar2,
            detay_indirim_tipi, detay_indirim_deger, detay_indirim_tutar,
            beden_set_id, beden,
            beden1, beden2, beden3, beden4, beden5, beden6,
            beden7, beden8, beden9, beden10, beden11, beden12,
            aciklama, hesaplama_tipi,
            kdv_oran, kdv_tutar, otv_tip, otv_deger, otv_tutar,
            oiv_oran, oiv_tutar, konaklama_oran, konaklama_tutar,
            tevkifat_oran, tevkifat_tutar,
            marazlar,
            kayit_kullanici_id, kayit_ip, aktif
        ) VALUES (
            :firmaId, :subeId, :stokMasterId, :stokVaryantId,
            :faturaMasterId, :irsaliyeMasterId, :prosesMasterId,
            :depoId, :blokRafId, :tarih, :gc,
            :fiyat, :dovizliFiyat, :doviz,
            :miktar, :miktar2,
            :detayIndirimTipi, :detayIndirimDeger, :detayIndirimTutar,
            :bedenSetId, :beden,
            :beden1, :beden2, :beden3, :beden4, :beden5, :beden6,
            :beden7, :beden8, :beden9, :beden10, :beden11, :beden12,
            :aciklama, :hesaplamaTipi,
            :kdvOran, :kdvTutar, :otvTip, :otvDeger, :otvTutar,
            :oivOran, :oivTutar, :konaklamaOran, :konaklamaTutar,
            :tevkifatOran, :tevkifatTutar,
            :marazlar,
            :kullaniciId, :ip, 1
        )";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':firmaId' => $this->firmaId,
            ':subeId' => $this->subeId,
            ':stokMasterId' => (int)($data['stokMasterId'] ?? 0),
            ':stokVaryantId' => (int)($data['stokVaryantId'] ?? 0),
            ':faturaMasterId' => (int)($data['faturaMasterId'] ?? 0),
            ':irsaliyeMasterId' => (int)($data['irsaliyeMasterId'] ?? 0),
            ':prosesMasterId' => isset($data['prosesMasterId']) ? (int)$data['prosesMasterId'] : null,
            ':depoId' => (int)($data['depoId'] ?? 0),
            ':blokRafId' => (int)($data['blokRafId'] ?? 0),
            ':tarih' => $data['tarih'] ?? date('Y-m-d H:i:s'),
            ':gc' => (int)($data['gc'] ?? -1),
            ':fiyat' => (float)($data['fiyat'] ?? 0),
            ':dovizliFiyat' => (float)($data['dovizliFiyat'] ?? 0),
            ':doviz' => $data['doviz'] ?? '',
            ':miktar' => (float)($data['miktar'] ?? 0),
            ':miktar2' => (float)($data['miktar2'] ?? 0),
            ':detayIndirimTipi' => (int)($data['detayIndirimTipi'] ?? -1),
            ':detayIndirimDeger' => (float)($data['detayIndirimDeger'] ?? 0),
            ':detayIndirimTutar' => (float)($data['detayIndirimTutar'] ?? 0),
            ':bedenSetId' => (int)($data['bedenSetId'] ?? 0),
            ':beden' => $data['beden'] ?? '',
            ':beden1' => (float)($data['beden1'] ?? 0),
            ':beden2' => (float)($data['beden2'] ?? 0),
            ':beden3' => (float)($data['beden3'] ?? 0),
            ':beden4' => (float)($data['beden4'] ?? 0),
            ':beden5' => (float)($data['beden5'] ?? 0),
            ':beden6' => (float)($data['beden6'] ?? 0),
            ':beden7' => (float)($data['beden7'] ?? 0),
            ':beden8' => (float)($data['beden8'] ?? 0),
            ':beden9' => (float)($data['beden9'] ?? 0),
            ':beden10' => (float)($data['beden10'] ?? 0),
            ':beden11' => (float)($data['beden11'] ?? 0),
            ':beden12' => (float)($data['beden12'] ?? 0),
            ':aciklama' => $data['aciklama'] ?? '',
            ':hesaplamaTipi' => (int)($data['hesaplamaTipi'] ?? 0),
            ':kdvOran' => (float)($data['kdvOran'] ?? 0),
            ':kdvTutar' => (float)($data['kdvTutar'] ?? 0),
            ':otvTip' => (int)($data['otvTip'] ?? -1),
            ':otvDeger' => (float)($data['otvDeger'] ?? 0),
            ':otvTutar' => (float)($data['otvTutar'] ?? 0),
            ':oivOran' => (float)($data['oivOran'] ?? 0),
            ':oivTutar' => (float)($data['oivTutar'] ?? 0),
            ':konaklamaOran' => (float)($data['konaklamaOran'] ?? 0),
            ':konaklamaTutar' => (float)($data['konaklamaTutar'] ?? 0),
            ':tevkifatOran' => $data['tevkifatOran'] ?? '',
            ':tevkifatTutar' => (float)($data['tevkifatTutar'] ?? 0),
            ':marazlar' => isset($data['marazlar']) ? json_encode($data['marazlar'], JSON_UNESCAPED_UNICODE) : null,
            ':kullaniciId' => $this->kullaniciId,
            ':ip' => $this->ip,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Toplu stok detay ekleme
     *
     * @param array $rows Detay satırları dizisi
     * @return int[] Eklenen ID'ler
     */
    public function createBatch(array $rows): array {
        $ids = [];
        foreach ($rows as $row) {
            $ids[] = $this->create($row);
        }
        return $ids;
    }

    /**
     * Stok detay kaydını günceller
     *
     * @param int $detayId Detay ID
     * @param array $data Güncellenecek alanlar
     * @return bool
     */
    public function update(int $detayId, array $data): bool {
        $allowedFields = [
            'stokMasterId' => 'stok_master_id',
            'stokVaryantId' => 'stok_varyant_id',
            'faturaMasterId' => 'fatura_master_id',
            'irsaliyeMasterId' => 'irsaliye_master_id',
            'depoId' => 'depo_id',
            'tarih' => 'tarih',
            'gc' => 'gc',
            'fiyat' => 'fiyat',
            'dovizliFiyat' => 'dovizli_fiyat',
            'doviz' => 'doviz',
            'miktar' => 'miktar',
            'miktar2' => 'miktar2',
            'detayIndirimTipi' => 'detay_indirim_tipi',
            'detayIndirimDeger' => 'detay_indirim_deger',
            'detayIndirimTutar' => 'detay_indirim_tutar',
            'beden' => 'beden',
            'beden1' => 'beden1', 'beden2' => 'beden2', 'beden3' => 'beden3',
            'beden4' => 'beden4', 'beden5' => 'beden5', 'beden6' => 'beden6',
            'beden7' => 'beden7', 'beden8' => 'beden8', 'beden9' => 'beden9',
            'beden10' => 'beden10', 'beden11' => 'beden11', 'beden12' => 'beden12',
            'aciklama' => 'aciklama',
            'hesaplamaTipi' => 'hesaplama_tipi',
            'kdvOran' => 'kdv_oran', 'kdvTutar' => 'kdv_tutar',
            'otvTip' => 'otv_tip', 'otvDeger' => 'otv_deger', 'otvTutar' => 'otv_tutar',
            'oivOran' => 'oiv_oran', 'oivTutar' => 'oiv_tutar',
            'konaklamaOran' => 'konaklama_oran', 'konaklamaTutar' => 'konaklama_tutar',
            'tevkifatOran' => 'tevkifat_oran', 'tevkifatTutar' => 'tevkifat_tutar',
            'aktif' => 'aktif',
        ];

        $updates = [];
        $params = [':id' => $detayId, ':firmaId' => $this->firmaId];

        foreach ($allowedFields as $inputKey => $dbColumn) {
            if (array_key_exists($inputKey, $data)) {
                $paramKey = ':' . $inputKey;
                $updates[] = "{$dbColumn} = {$paramKey}";
                $params[$paramKey] = $data[$inputKey];
            }
        }

        if (empty($updates)) return false;

        $sql = "UPDATE stok_detay SET " . implode(', ', $updates) . " WHERE id = :id AND firma_id = :firmaId";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Stok detay kaydını siler (soft delete - trigger'lar stok toplamlarını günceller)
     *
     * @param int $detayId Detay ID
     * @return bool
     */
    public function delete(int $detayId): bool {
        return $this->update($detayId, ['aktif' => -1]);
    }

    /**
     * Bir faturaya ait tüm detayları siler
     *
     * @param int $faturaMasterId Fatura master ID
     * @return int Silinen kayıt sayısı
     */
    public function deleteByFatura(int $faturaMasterId): int {
        $stmt = $this->pdo->prepare("
            UPDATE stok_detay SET aktif = -1
            WHERE fatura_master_id = ? AND firma_id = ? AND aktif = 1
        ");
        $stmt->execute([$faturaMasterId, $this->firmaId]);
        return $stmt->rowCount();
    }

    /**
     * Stok detay kaydını getirir
     *
     * @param int $detayId Detay ID
     * @return array|null
     */
    public function get(int $detayId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT sd.*,
                   COALESCE(sm.stok_adi, '') AS stok_adi,
                   COALESCE(sm.stok_kodu, '') AS stok_kodu,
                   COALESCE(sv.varyant_adi, '') AS varyant_adi
            FROM stok_detay sd
            LEFT JOIN stok_master sm ON sm.id = sd.stok_master_id
            LEFT JOIN stok_varyant sv ON sv.id = sd.stok_varyant_id
            WHERE sd.id = ? AND sd.firma_id = ? AND sd.aktif != -1
        ");
        $stmt->execute([$detayId, $this->firmaId]);
        $row = $stmt->fetch();

        return $row ? $this->mapRow($row) : null;
    }

    /**
     * Bir faturaya ait detayları listeler
     *
     * @param int $faturaMasterId Fatura master ID
     * @return array
     */
    public function getByFatura(int $faturaMasterId): array {
        $stmt = $this->pdo->prepare("
            SELECT sd.*,
                   COALESCE(sm.stok_adi, '') AS stok_adi,
                   COALESCE(sm.stok_kodu, '') AS stok_kodu,
                   COALESCE(sv.varyant_adi, '') AS varyant_adi,
                   COALESCE(d.depo_adi, '') AS depo_adi
            FROM stok_detay sd
            LEFT JOIN stok_master sm ON sm.id = sd.stok_master_id
            LEFT JOIN stok_varyant sv ON sv.id = sd.stok_varyant_id
            LEFT JOIN depolar d ON d.id = sd.depo_id
            WHERE sd.fatura_master_id = ? AND sd.firma_id = ? AND sd.aktif = 1
            ORDER BY sd.id ASC
        ");
        $stmt->execute([$faturaMasterId, $this->firmaId]);

        $items = [];
        foreach ($stmt->fetchAll() as $row) {
            $items[] = $this->mapRow($row);
        }
        return $items;
    }

    /**
     * Bir irsaliyeye ait detayları listeler
     *
     * @param int $irsaliyeMasterId İrsaliye master ID
     * @return array
     */
    public function getByIrsaliye(int $irsaliyeMasterId): array {
        $stmt = $this->pdo->prepare("
            SELECT sd.*,
                   COALESCE(sm.stok_adi, '') AS stok_adi,
                   COALESCE(sm.stok_kodu, '') AS stok_kodu,
                   COALESCE(sv.varyant_adi, '') AS varyant_adi,
                   COALESCE(d.depo_adi, '') AS depo_adi
            FROM stok_detay sd
            LEFT JOIN stok_master sm ON sm.id = sd.stok_master_id
            LEFT JOIN stok_varyant sv ON sv.id = sd.stok_varyant_id
            LEFT JOIN depolar d ON d.id = sd.depo_id
            WHERE sd.irsaliye_master_id = ? AND sd.firma_id = ? AND sd.aktif = 1
            ORDER BY sd.id ASC
        ");
        $stmt->execute([$irsaliyeMasterId, $this->firmaId]);

        $items = [];
        foreach ($stmt->fetchAll() as $row) {
            $items[] = $this->mapRow($row);
        }
        return $items;
    }

    /**
     * DB row'u response formatına çevirir
     */
    private function mapRow(array $row): array {
        return [
            'id' => (int)$row['id'],
            'firmaId' => (int)$row['firma_id'],
            'subeId' => (int)$row['sube_id'],
            'stokMasterId' => (int)$row['stok_master_id'],
            'stokVaryantId' => (int)$row['stok_varyant_id'],
            'stokAdi' => $row['stok_adi'] ?? '',
            'stokKodu' => $row['stok_kodu'] ?? '',
            'varyantAdi' => $row['varyant_adi'] ?? '',
            'faturaMasterId' => (int)$row['fatura_master_id'],
            'irsaliyeMasterId' => (int)$row['irsaliye_master_id'],
            'depoId' => (int)$row['depo_id'],
            'depoAdi' => $row['depo_adi'] ?? '',
            'tarih' => $row['tarih'],
            'gc' => (int)$row['gc'],
            'fiyat' => (float)$row['fiyat'],
            'dovizliFiyat' => (float)$row['dovizli_fiyat'],
            'doviz' => $row['doviz'],
            'miktar' => (float)$row['miktar'],
            'miktar2' => (float)$row['miktar2'],
            'detayIndirimTipi' => (int)$row['detay_indirim_tipi'],
            'detayIndirimDeger' => (float)$row['detay_indirim_deger'],
            'detayIndirimTutar' => (float)$row['detay_indirim_tutar'],
            'beden' => $row['beden'] ?? '',
            'bedenler' => [
                (float)$row['beden1'], (float)$row['beden2'], (float)$row['beden3'],
                (float)$row['beden4'], (float)$row['beden5'], (float)$row['beden6'],
                (float)$row['beden7'], (float)$row['beden8'], (float)$row['beden9'],
                (float)$row['beden10'], (float)$row['beden11'], (float)$row['beden12'],
            ],
            'aciklama' => $row['aciklama'] ?? '',
            'hesaplamaTipi' => (int)$row['hesaplama_tipi'],
            'kdvOran' => (float)$row['kdv_oran'],
            'kdvTutar' => (float)$row['kdv_tutar'],
            'otvTip' => (int)($row['otv_tip'] ?? -1),
            'otvDeger' => (float)($row['otv_deger'] ?? 0),
            'otvTutar' => (float)($row['otv_tutar'] ?? 0),
            'tutar' => (float)$row['fiyat'] * ((int)$row['hesaplama_tipi'] === 1 ? (float)$row['miktar2'] : (float)$row['miktar']),
            'aktif' => (int)$row['aktif'],
        ];
    }
}
