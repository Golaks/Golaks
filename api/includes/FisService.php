<?php
/**
 * FisService - Muhasebe Fişi Oluşturma Servisi
 *
 * Sistemin her yerinden çağrılabilir.
 * fis_master ve fis_detay tablolarına kayıt atar.
 *
 * Kullanım:
 *   $fisService = new FisService($pdo, $firmaId, $subeId, $kullaniciId);
 *   $fisId = $fisService->createFisMaster([
 *       'fisTipi'       => 'Mahsup',
 *       'fisTarihi'     => '2026-03-23 00:00:00',
 *       'fisAciklama'   => 'Sipariş avans fişi',
 *       'kayitId'       => 36,
 *       'kayitTablo'    => 'diger',
 *       'kasaHesapKodu' => '100.01.01.0001',
 *       'kasaDurum'     => 1,       // 0=kapalı, 1=açık
 *       'resmiGayriResmi' => 0,     // 0=gayri resmi, 1=resmi
 *   ]);
 */

class FisService {
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
     * Yeni fiş numarası üretir
     * Format: YY-NNNNNN (örn: 26-000001)
     */
    public function getNextFisNo(): string {
        $yil = date('y'); // 26
        $prefix = $yil . '-';

        $stmt = $this->pdo->prepare("
            SELECT fis_no FROM fis_master
            WHERE firma_id = :firmaId
              AND fis_no LIKE :prefix
            ORDER BY fis_no DESC
            LIMIT 1
        ");
        $stmt->execute([
            ':firmaId' => $this->firmaId,
            ':prefix' => $prefix . '%',
        ]);
        $row = $stmt->fetch();

        if ($row && !empty($row['fis_no'])) {
            $parts = explode('-', $row['fis_no']);
            if (count($parts) === 2) {
                $nextNum = intval($parts[1]) + 1;
                return $prefix . str_pad($nextNum, 6, '0', STR_PAD_LEFT);
            }
        }

        return $prefix . '000001';
    }

    /**
     * Fiş master kaydı oluşturur
     *
     * @param array $data Fiş bilgileri
     *   - fisTipi: string (Mahsup, Tahsil, Tediye) - varsayılan: Mahsup
     *   - fisTarihi: string (datetime) - varsayılan: şu an
     *   - fisAciklama: string - varsayılan: ''
     *   - kayitId: int - bağlı kayıt id - varsayılan: 0
     *   - kayitTablo: string (diger, fatura_master, cek_master) - varsayılan: diger
     *   - kasaHesapKodu: string - varsayılan: ''
     *   - kasaDurum: int (0=kapalı, 1=açık) - varsayılan: 1
     *   - resmiGayriResmi: int (0=gayri resmi, 1=resmi) - varsayılan: 0
     *   - fisNo: string - belirtilmezse otomatik üretilir
     *
     * @return array ['id' => int, 'fisNo' => string]
     */
    public function createFisMaster(array $data): array {
        $fisTipi = $data['fisTipi'] ?? 'Mahsup';
        $fisTarihi = $data['fisTarihi'] ?? date('Y-m-d H:i:s');
        $fisAciklama = $data['fisAciklama'] ?? '';
        $kayitId = (int)($data['kayitId'] ?? 0);
        $kayitTablo = $data['kayitTablo'] ?? 'diger';
        $kasaHesapKodu = $data['kasaHesapKodu'] ?? '';
        $kasaDurum = (int)($data['kasaDurum'] ?? 1);
        $resmiGayriResmi = (int)($data['resmiGayriResmi'] ?? 0);
        $fisNo = $data['fisNo'] ?? $this->getNextFisNo();

        // kayitTablo validasyonu
        $validTablolar = ['diger', 'fatura_master', 'cek_master', 'siparis_master'];
        if (!in_array($kayitTablo, $validTablolar)) {
            $kayitTablo = 'diger';
        }

        $sql = "INSERT INTO fis_master (
            firma_id, sube_id, fis_no, fis_tipi, fis_tarihi,
            kayit_id, kayit_tablo, resmi_gayri_resmi, fis_aciklama,
            kasa_hesap_kodu, kasa_durum,
            kayit_kullanici_id, kayit_ip, aktif
        ) VALUES (
            :firmaId, :subeId, :fisNo, :fisTipi, :fisTarihi,
            :kayitId, :kayitTablo, :resmiGayriResmi, :fisAciklama,
            :kasaHesapKodu, :kasaDurum,
            :kullaniciId, :ip, 1
        )";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':firmaId' => $this->firmaId,
            ':subeId' => $this->subeId,
            ':fisNo' => $fisNo,
            ':fisTipi' => $fisTipi,
            ':fisTarihi' => $fisTarihi,
            ':kayitId' => $kayitId,
            ':kayitTablo' => $kayitTablo,
            ':resmiGayriResmi' => $resmiGayriResmi,
            ':fisAciklama' => $fisAciklama,
            ':kasaHesapKodu' => $kasaHesapKodu,
            ':kasaDurum' => $kasaDurum,
            ':kullaniciId' => $this->kullaniciId,
            ':ip' => $this->ip,
        ]);

        return [
            'id' => (int)$this->pdo->lastInsertId(),
            'fisNo' => $fisNo,
        ];
    }

    /**
     * Fiş master kaydını günceller
     *
     * @param int $fisId Fiş ID
     * @param array $data Güncellenecek alanlar
     * @return bool
     */
    public function updateFisMaster(int $fisId, array $data): bool {
        $allowedFields = [
            'fisTipi' => 'fis_tipi',
            'fisTarihi' => 'fis_tarihi',
            'fisAciklama' => 'fis_aciklama',
            'kayitId' => 'kayit_id',
            'kayitTablo' => 'kayit_tablo',
            'kasaHesapKodu' => 'kasa_hesap_kodu',
            'kasaDurum' => 'kasa_durum',
            'resmiGayriResmi' => 'resmi_gayri_resmi',
        ];

        $updates = [];
        $params = [':id' => $fisId, ':firmaId' => $this->firmaId];

        foreach ($allowedFields as $inputKey => $dbColumn) {
            if (array_key_exists($inputKey, $data)) {
                $paramKey = ':' . $inputKey;
                $updates[] = "{$dbColumn} = {$paramKey}";
                $params[$paramKey] = $data[$inputKey];
            }
        }

        if (empty($updates)) return false;

        $sql = "UPDATE fis_master SET " . implode(', ', $updates) . " WHERE id = :id AND firma_id = :firmaId";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Fiş master kaydını siler (soft delete)
     *
     * @param int $fisId Fiş ID
     * @return bool
     */
    public function deleteFisMaster(int $fisId): bool {
        $stmt = $this->pdo->prepare("UPDATE fis_master SET aktif = -1 WHERE id = ? AND firma_id = ?");
        return $stmt->execute([$fisId, $this->firmaId]);
    }

    /**
     * Fiş master kaydını getirir
     *
     * @param int $fisId Fiş ID
     * @return array|null
     */
    public function getFisMaster(int $fisId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM fis_master
            WHERE id = ? AND firma_id = ? AND aktif != -1
        ");
        $stmt->execute([$fisId, $this->firmaId]);
        $row = $stmt->fetch();

        if (!$row) return null;

        return [
            'id' => (int)$row['id'],
            'firmaId' => (int)$row['firma_id'],
            'subeId' => (int)$row['sube_id'],
            'fisNo' => $row['fis_no'],
            'fisTipi' => $row['fis_tipi'],
            'fisTarihi' => $row['fis_tarihi'],
            'kayitId' => (int)$row['kayit_id'],
            'kayitTablo' => $row['kayit_tablo'],
            'resmiGayriResmi' => (int)$row['resmi_gayri_resmi'],
            'fisAciklama' => $row['fis_aciklama'],
            'kasaHesapKodu' => $row['kasa_hesap_kodu'],
            'kasaDurum' => (int)$row['kasa_durum'],
            'aktif' => (int)$row['aktif'],
            'kayitTarihi' => $row['kayit_tarihi'],
            'kayitKullaniciId' => (int)$row['kayit_kullanici_id'],
        ];
    }

    /**
     * Bir kaynağa ait fiş master kayıtlarını listeler
     *
     * @param int $kayitId Bağlı kayıt ID
     * @param string $kayitTablo Kaynak tablo
     * @return array
     */
    public function getFisListByKayit(int $kayitId, string $kayitTablo = 'diger'): array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM fis_master
            WHERE firma_id = ? AND kayit_id = ? AND kayit_tablo = ? AND aktif != -1
            ORDER BY fis_tarihi DESC
        ");
        $stmt->execute([$this->firmaId, $kayitId, $kayitTablo]);

        $items = [];
        foreach ($stmt->fetchAll() as $row) {
            $items[] = [
                'id' => (int)$row['id'],
                'fisNo' => $row['fis_no'],
                'fisTipi' => $row['fis_tipi'],
                'fisTarihi' => $row['fis_tarihi'],
                'fisAciklama' => $row['fis_aciklama'],
                'kasaDurum' => (int)$row['kasa_durum'],
                'aktif' => (int)$row['aktif'],
            ];
        }
        return $items;
    }

    // ─── FİŞ DETAY ────────────────────────────────────────────────

    /**
     * Fiş detay satırı ekler
     *
     * @param int $fisMasterId Bağlı fiş master ID
     * @param array $data Detay bilgileri
     *   - hesapKodu: string (zorunlu)
     *   - aciklama: string
     *   - borc: float
     *   - alacak: float
     *   - doviz: string (TL, USD, EUR...)
     *   - dovizKuru: float
     *   - dovizliBorc: float
     *   - dovizliAlacak: float
     *   - dovizliDoviz: string
     *   - dovizliKur: float
     *   - cariBorc: float
     *   - cariAlacak: float
     *   - cariDoviz: string
     *   - cariKur: float
     *   - miktar: float
     *   - birim: string
     *   - birimFiyat: float
     *   - kdvOrani: float
     *   - virmanSubeId: int
     *
     * @return int Oluşturulan fis_detay.id
     */
    public function addFisDetay(int $fisMasterId, array $data): int {
        $sql = "INSERT INTO fis_detay (
            firma_id, sube_id, fis_master_id, hesap_kodu, aciklama,
            borc, alacak, doviz, doviz_kuru,
            dovizli_borc, dovizli_alacak, dovizli_doviz, dovizli_kur,
            cari_borc, cari_alacak, cari_doviz, cari_kur,
            miktar, birim, birim_fiyat, kdv_orani,
            random, virman_sube_id,
            kayit_kullanici_id, kayit_ip, aktif
        ) VALUES (
            :firmaId, :subeId, :fisMasterId, :hesapKodu, :aciklama,
            :borc, :alacak, :doviz, :dovizKuru,
            :dovizliBorc, :dovizliAlacak, :dovizliDoviz, :dovizliKur,
            :cariBorc, :cariAlacak, :cariDoviz, :cariKur,
            :miktar, :birim, :birimFiyat, :kdvOrani,
            :random, :virmanSubeId,
            :kullaniciId, :ip, 1
        )";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':firmaId' => $this->firmaId,
            ':subeId' => $this->subeId,
            ':fisMasterId' => $fisMasterId,
            ':hesapKodu' => $data['hesapKodu'] ?? '',
            ':aciklama' => $data['aciklama'] ?? '',
            ':borc' => (float)($data['borc'] ?? 0),
            ':alacak' => (float)($data['alacak'] ?? 0),
            ':doviz' => !empty($data['doviz']) ? $data['doviz'] : null,
            ':dovizKuru' => (float)($data['dovizKuru'] ?? 0),
            ':dovizliBorc' => (float)($data['dovizliBorc'] ?? 0),
            ':dovizliAlacak' => (float)($data['dovizliAlacak'] ?? 0),
            ':dovizliDoviz' => !empty($data['dovizliDoviz']) ? $data['dovizliDoviz'] : null,
            ':dovizliKur' => (float)($data['dovizliKur'] ?? 0),
            ':cariBorc' => (float)($data['cariBorc'] ?? 0),
            ':cariAlacak' => (float)($data['cariAlacak'] ?? 0),
            ':cariDoviz' => !empty($data['cariDoviz']) ? $data['cariDoviz'] : null,
            ':cariKur' => (float)($data['cariKur'] ?? 0),
            ':miktar' => (float)($data['miktar'] ?? 0),
            ':birim' => $data['birim'] ?? '',
            ':birimFiyat' => (float)($data['birimFiyat'] ?? 0),
            ':kdvOrani' => (float)($data['kdvOrani'] ?? 0),
            ':random' => $data['random'] ?? '',
            ':virmanSubeId' => (int)($data['virmanSubeId'] ?? 0),
            ':kullaniciId' => $this->kullaniciId,
            ':ip' => $this->ip,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Birden fazla fiş detay satırı ekler
     *
     * @param int $fisMasterId Bağlı fiş master ID
     * @param array $rows Detay satır dizisi
     * @return array Oluşturulan ID'ler
     */
    public function addFisDetayBatch(int $fisMasterId, array $rows): array {
        $ids = [];
        foreach ($rows as $row) {
            $ids[] = $this->addFisDetay($fisMasterId, $row);
        }
        return $ids;
    }

    /**
     * Bir fişe ait detay satırlarını getirir
     *
     * @param int $fisMasterId Fiş master ID
     * @return array
     */
    public function getFisDetayList(int $fisMasterId): array {
        $stmt = $this->pdo->prepare("
            SELECT fd.*, c.unvan AS hesap_unvan
            FROM fis_detay fd
            LEFT JOIN cariler c ON c.hesap_kodu = fd.hesap_kodu AND c.firma_id = fd.firma_id AND c.aktif = 1
            WHERE fd.fis_master_id = ? AND fd.firma_id = ? AND fd.aktif != -1
            ORDER BY fd.id
        ");
        $stmt->execute([$fisMasterId, $this->firmaId]);

        $items = [];
        foreach ($stmt->fetchAll() as $row) {
            $items[] = [
                'id' => (int)$row['id'],
                'fisMasterId' => (int)$row['fis_master_id'],
                'hesapKodu' => $row['hesap_kodu'],
                'hesapUnvan' => $row['hesap_unvan'] ?? '',
                'aciklama' => $row['aciklama'] ?? '',
                'borc' => (float)$row['borc'],
                'alacak' => (float)$row['alacak'],
                'doviz' => $row['doviz'] ?? '',
                'dovizKuru' => (float)$row['doviz_kuru'],
                'dovizliBorc' => (float)$row['dovizli_borc'],
                'dovizliAlacak' => (float)$row['dovizli_alacak'],
                'dovizliDoviz' => $row['dovizli_doviz'] ?? '',
                'dovizliKur' => (float)$row['dovizli_kur'],
                'cariBorc' => (float)$row['cari_borc'],
                'cariAlacak' => (float)$row['cari_alacak'],
                'cariDoviz' => $row['cari_doviz'] ?? '',
                'cariKur' => (float)$row['cari_kur'],
                'miktar' => (float)$row['miktar'],
                'birim' => $row['birim'] ?? '',
                'birimFiyat' => (float)$row['birim_fiyat'],
                'kdvOrani' => (float)$row['kdv_orani'],
                'aktif' => (int)$row['aktif'],
            ];
        }
        return $items;
    }

    /**
     * Fiş detay satırını günceller
     *
     * @param int $detayId Detay ID
     * @param array $data Güncellenecek alanlar
     * @return bool
     */
    public function updateFisDetay(int $detayId, array $data): bool {
        $allowedFields = [
            'hesapKodu' => 'hesap_kodu',
            'aciklama' => 'aciklama',
            'borc' => 'borc',
            'alacak' => 'alacak',
            'doviz' => 'doviz',
            'dovizKuru' => 'doviz_kuru',
            'dovizliBorc' => 'dovizli_borc',
            'dovizliAlacak' => 'dovizli_alacak',
            'dovizliDoviz' => 'dovizli_doviz',
            'dovizliKur' => 'dovizli_kur',
            'cariBorc' => 'cari_borc',
            'cariAlacak' => 'cari_alacak',
            'cariDoviz' => 'cari_doviz',
            'cariKur' => 'cari_kur',
            'miktar' => 'miktar',
            'birim' => 'birim',
            'birimFiyat' => 'birim_fiyat',
            'kdvOrani' => 'kdv_orani',
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

        $sql = "UPDATE fis_detay SET " . implode(', ', $updates) . " WHERE id = :id AND firma_id = :firmaId";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Fiş detay satırını siler (soft delete)
     *
     * @param int $detayId Detay ID
     * @return bool
     */
    public function deleteFisDetay(int $detayId): bool {
        $stmt = $this->pdo->prepare("UPDATE fis_detay SET aktif = -1 WHERE id = ? AND firma_id = ?");
        return $stmt->execute([$detayId, $this->firmaId]);
    }

    /**
     * Bir fişe ait tüm detay satırlarını siler (soft delete)
     *
     * @param int $fisMasterId Fiş master ID
     * @return bool
     */
    public function deleteFisDetayByMaster(int $fisMasterId): bool {
        $stmt = $this->pdo->prepare("UPDATE fis_detay SET aktif = -1 WHERE fis_master_id = ? AND firma_id = ?");
        return $stmt->execute([$fisMasterId, $this->firmaId]);
    }

    // ─── TOPLU İŞLEMLER ───────────────────────────────────────────

    /**
     * Fiş master + detay satırlarını tek seferde oluşturur
     *
     * @param array $masterData Fiş master bilgileri
     * @param array $detayRows Fiş detay satırları dizisi
     * @return array ['fisMasterId' => int, 'fisNo' => string, 'detayIds' => int[]]
     */
    public function createFisWithDetay(array $masterData, array $detayRows): array {
        $this->pdo->beginTransaction();
        try {
            $masterResult = $this->createFisMaster($masterData);
            $fisMasterId = $masterResult['id'];
            $fisNo = $masterResult['fisNo'];
            $detayIds = $this->addFisDetayBatch($fisMasterId, $detayRows);

            $this->pdo->commit();
            return [
                'fisMasterId' => $fisMasterId,
                'fisNo' => $fisNo,
                'detayIds' => $detayIds,
            ];
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Fiş master + detaylarını siler (soft delete)
     *
     * @param int $fisMasterId Fiş master ID
     * @return bool
     */
    public function deleteFisWithDetay(int $fisMasterId): bool {
        $this->pdo->beginTransaction();
        try {
            $this->deleteFisDetayByMaster($fisMasterId);
            $this->deleteFisMaster($fisMasterId);
            $this->pdo->commit();
            return true;
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    // ─── DÖVİZ & KUR İŞLEMLERİ ───────────────────────────────────

    /**
     * Belirli bir tarih ve döviz tipi için kur bilgisini getirir
     * Önce firma_kurlari, yoksa doviz_kurlari tablosundan çeker
     *
     * @param string $dovizTipi Döviz tipi (USD, EUR vb.)
     * @param string $tarih Tarih (Y-m-d)
     * @param string $kurTipi Kur tipi: doviz_alis, doviz_satis, efektif_alis, efektif_satis, ozel_kur
     * @param string $kurAnahtar Kur anahtarı (varsayılan: tr)
     * @return float Kur değeri
     */
    public function getKur(string $dovizTipi, string $tarih, string $kurTipi = 'doviz_alis', string $kurAnahtar = 'tr'): float {
        if (empty($dovizTipi) || $dovizTipi === 'TL') return 1.0;

        // Önce firma kurlarına bak
        $stmt = $this->pdo->prepare("
            SELECT {$kurTipi} as kur FROM firma_kurlari
            WHERE firma_id = :firmaId AND tarih = :tarih AND kur_anahtar = :kurAnahtar AND doviz_tipi = :dovizTipi
            LIMIT 1
        ");
        $stmt->execute([
            ':firmaId' => $this->firmaId,
            ':tarih' => $tarih,
            ':kurAnahtar' => $kurAnahtar,
            ':dovizTipi' => $dovizTipi,
        ]);
        $row = $stmt->fetch();
        if ($row && (float)$row['kur'] > 0) return (float)$row['kur'];

        // Firma kurları yoksa genel kurlardan çek
        $stmt = $this->pdo->prepare("
            SELECT {$kurTipi} as kur FROM doviz_kurlari
            WHERE tarih <= :tarih AND kur_anahtar = :kurAnahtar AND doviz_tipi = :dovizTipi
            ORDER BY tarih DESC LIMIT 1
        ");
        $stmt->execute([
            ':tarih' => $tarih,
            ':kurAnahtar' => $kurAnahtar,
            ':dovizTipi' => $dovizTipi,
        ]);
        $row = $stmt->fetch();
        if ($row && (float)$row['kur'] > 0) return (float)$row['kur'];

        return 1.0;
    }

    /**
     * Tutarı bir dövizden diğerine çevirir
     *
     * @param float $tutar Kaynak tutar
     * @param string $kaynakDoviz Kaynak döviz (USD, EUR, TL vb.)
     * @param string $hedefDoviz Hedef döviz
     * @param string $tarih Tarih
     * @param string $kurTipi Kur tipi
     * @return array ['tutar' => float, 'kur' => float]
     */
    public function convertCurrency(float $tutar, string $kaynakDoviz, string $hedefDoviz, string $tarih, string $kurTipi = 'doviz_alis'): array {
        if ($kaynakDoviz === $hedefDoviz) {
            return ['tutar' => $tutar, 'kur' => 1.0];
        }

        $kaynakKur = $this->getKur($kaynakDoviz, $tarih, $kurTipi);
        $hedefKur = $this->getKur($hedefDoviz, $tarih, $kurTipi);

        // TL üzerinden çevrim: kaynak → TL → hedef
        $tlTutar = $tutar * $kaynakKur;
        $hedefTutar = $hedefKur > 0 ? $tlTutar / $hedefKur : $tlTutar;

        // kur = işlemin kaynak döviz kuru (USD→TL ise 44.xx)
        $kur = $kaynakKur;

        return ['tutar' => round($hedefTutar, 4), 'kur' => round($kur, 4)];
    }

    /**
     * Parametrik fiş detay satırı oluşturur
     * 3 farklı döviz alanını otomatik hesaplar:
     *   - borc/alacak: Şubenin varsayılan dövizinde
     *   - dovizli_borc/dovizli_alacak: Siparişin dövizinde
     *   - cari_borc/cari_alacak: Carinin dövizinde
     *
     * @param array $params Parametreler:
     *   - tutar: float (zorunlu) - İşlem tutarı (sipariş dövizinde)
     *   - islemDoviz: string - İşlem/sipariş dövizi (USD, EUR vb.)
     *   - subeDoviz: string - Şubenin varsayılan dövizi (genelde TL)
     *   - cariDoviz: string - Carinin dövizi
     *   - tarih: string - İşlem tarihi (Y-m-d)
     *   - kurTipi: string - Kur tipi (doviz_alis, doviz_satis vb.)
     *   - borcMu: bool - true=borç, false=alacak
     *   - hesapKodu: string
     *   - aciklama: string
     *   - random: string
     *
     * @return array Fiş detay verisi (addFisDetay'a geçilebilir)
     */
    public function buildFisDetayRow(array $params): array {
        $tutar = (float)($params['tutar'] ?? 0);
        $islemDoviz = $params['islemDoviz'] ?? 'TL';
        $subeDoviz = $params['subeDoviz'] ?? 'TL';
        $cariDoviz = $params['cariDoviz'] ?? $islemDoviz;
        $tarih = $params['tarih'] ?? date('Y-m-d');
        $kurTipi = $params['kurTipi'] ?? 'doviz_alis';
        $borcMu = $params['borcMu'] ?? true;

        // 1. Şube dövizine çevir (borc/alacak)
        $subeConvert = $this->convertCurrency($tutar, $islemDoviz, $subeDoviz, $tarih, $kurTipi);

        // 2. İşlem dövizi zaten biliniyor (dovizli_borc/dovizli_alacak)
        $dovizliKur = $this->getKur($islemDoviz, $tarih, $kurTipi);

        // 3. Cari dövizine çevir (cari_borc/cari_alacak)
        $cariConvert = $this->convertCurrency($tutar, $islemDoviz, $cariDoviz, $tarih, $kurTipi);

        // Her kur alanına o satırın kendi dövizinin kuru yazılır
        $subeKur = $this->getKur($subeDoviz, $tarih, $kurTipi);
        $dovizliKurVal = $this->getKur($islemDoviz, $tarih, $kurTipi);
        $cariKur = $this->getKur($cariDoviz, $tarih, $kurTipi);

        return [
            'hesapKodu' => $params['hesapKodu'] ?? '',
            'aciklama' => $params['aciklama'] ?? '',
            'borc' => $borcMu ? $subeConvert['tutar'] : 0,
            'alacak' => $borcMu ? 0 : $subeConvert['tutar'],
            'doviz' => $subeDoviz,
            'dovizKuru' => $subeKur,
            'dovizliBorc' => $borcMu ? $tutar : 0,
            'dovizliAlacak' => $borcMu ? 0 : $tutar,
            'dovizliDoviz' => $islemDoviz,
            'dovizliKur' => $dovizliKurVal,
            'cariBorc' => $borcMu ? $cariConvert['tutar'] : 0,
            'cariAlacak' => $borcMu ? 0 : $cariConvert['tutar'],
            'cariDoviz' => $cariDoviz,
            'cariKur' => $cariKur,
            'random' => $params['random'] ?? '',
        ];
    }

    /**
     * Parametrik çift ayaklı fiş oluşturur (borç + alacak)
     * Tüm döviz çevrimleri otomatik yapılır
     *
     * @param array $masterData Fiş master bilgileri
     * @param array $params Parametreler:
     *   - tutar: float
     *   - islemDoviz: string - Sipariş dövizi
     *   - subeDoviz: string - Şube varsayılan dövizi
     *   - borcHesapKodu: string - Borçlu hesap kodu
     *   - borcCariDoviz: string - Borçlu hesabın dövizi
     *   - alacakHesapKodu: string - Alacaklı hesap kodu
     *   - alacakCariDoviz: string - Alacaklı hesabın dövizi
     *   - tarih: string
     *   - kurTipi: string
     *   - aciklama: string
     *
     * @return array ['fisMasterId' => int, 'fisNo' => string, 'detayIds' => int[]]
     */
    public function createParametrikFis(array $masterData, array $params): array {
        $random = bin2hex(random_bytes(16));
        $aciklama = $params['aciklama'] ?? $masterData['fisAciklama'] ?? '';

        $borcRow = $this->buildFisDetayRow([
            'tutar' => $params['tutar'],
            'islemDoviz' => $params['islemDoviz'] ?? 'TL',
            'subeDoviz' => $params['subeDoviz'] ?? 'TL',
            'cariDoviz' => $params['borcCariDoviz'] ?? $params['islemDoviz'] ?? 'TL',
            'tarih' => $params['tarih'] ?? date('Y-m-d'),
            'kurTipi' => $params['kurTipi'] ?? 'doviz_alis',
            'borcMu' => true,
            'hesapKodu' => $params['borcHesapKodu'],
            'aciklama' => $aciklama,
            'random' => $random,
        ]);

        $alacakRow = $this->buildFisDetayRow([
            'tutar' => $params['tutar'],
            'islemDoviz' => $params['islemDoviz'] ?? 'TL',
            'subeDoviz' => $params['subeDoviz'] ?? 'TL',
            'cariDoviz' => $params['alacakCariDoviz'] ?? $params['islemDoviz'] ?? 'TL',
            'tarih' => $params['tarih'] ?? date('Y-m-d'),
            'kurTipi' => $params['kurTipi'] ?? 'doviz_alis',
            'borcMu' => false,
            'hesapKodu' => $params['alacakHesapKodu'],
            'aciklama' => $aciklama,
            'random' => $random,
        ]);

        return $this->createFisWithDetay($masterData, [$borcRow, $alacakRow]);
    }

    /**
     * Carinin döviz tipini getirir
     *
     * @param string $hesapKodu Hesap kodu
     * @return string Döviz tipi (TL, USD, EUR vb.)
     */
    public function getCariDoviz(string $hesapKodu): string {
        $stmt = $this->pdo->prepare("SELECT doviz FROM cariler WHERE hesap_kodu = ? AND firma_id = ? AND aktif = 1 LIMIT 1");
        $stmt->execute([$hesapKodu, $this->firmaId]);
        $row = $stmt->fetch();
        return $row ? ($row['doviz'] ?: 'TL') : 'TL';
    }

    /**
     * Şubenin varsayılan dövizini getirir
     *
     * @return string Döviz tipi
     */
    public function getSubeVarsayilanDoviz(): string {
        $stmt = $this->pdo->prepare("SELECT varsayilan_doviz FROM subeler WHERE id = ?");
        $stmt->execute([$this->subeId]);
        $row = $stmt->fetch();
        return ($row && !empty($row['varsayilan_doviz'])) ? $row['varsayilan_doviz'] : 'TL';
    }
}
