<?php
/**
 * LogService - İşlem Log Servisi
 *
 * Düzenleme ve silme işlemlerinin loglarını tutar.
 *
 * Kullanım:
 *   $logService = new LogService($pdo, $firmaId, $subeId, $kullaniciId);
 *   $logService->duzenle('siparis_master', $id, $eskiVeri, $yeniVeri, 'Sipariş güncellendi');
 *   $logService->sil('fis_master', $id, $eskiVeri, 'Fiş silindi');
 */

class LogService {
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
     * Düzenleme logu yazar
     * Sadece değişen alanları kaydeder
     *
     * @param string $tabloAdi Tablo adı (siparis_master, fis_master vb.)
     * @param int $kayitId Kaydın ID'si
     * @param array $eskiVeri Eski değerler
     * @param array $yeniVeri Yeni değerler
     * @param string $aciklama Açıklama
     * @return int Log ID
     */
    public function duzenle(string $tabloAdi, int $kayitId, array $eskiVeri, array $yeniVeri, string $aciklama = ''): int {
        // Değişen alanları bul
        $degisen = [];
        foreach ($yeniVeri as $key => $val) {
            if (!array_key_exists($key, $eskiVeri) || $eskiVeri[$key] != $val) {
                $degisen[$key] = ['eski' => $eskiVeri[$key] ?? null, 'yeni' => $val];
            }
        }

        // Geri dönüş UPDATE SQL'i oluştur
        $geriDonusSql = $this->buildRevertSql($tabloAdi, $kayitId, $eskiVeri);

        $degerler = json_encode([
            'degisen' => $degisen,
            'eski' => $eskiVeri,
            'yeni' => $yeniVeri,
            'geriDonus' => $geriDonusSql,
        ], JSON_UNESCAPED_UNICODE);

        return $this->yazLog($tabloAdi, $kayitId, 'duzenle', $degerler, $aciklama);
    }

    /**
     * Silme logu yazar
     *
     * @param string $tabloAdi Tablo adı
     * @param int $kayitId Kaydın ID'si
     * @param array $eskiVeri Silinen kaydın verileri
     * @param string $aciklama Açıklama
     * @return int Log ID
     */
    public function sil(string $tabloAdi, int $kayitId, array $eskiVeri, string $aciklama = ''): int {
        // Geri dönüş INSERT SQL'i oluştur
        $geriDonusSql = $this->buildReinsertSql($tabloAdi, $eskiVeri);

        $degerler = json_encode([
            'eski' => $eskiVeri,
            'geriDonus' => $geriDonusSql,
        ], JSON_UNESCAPED_UNICODE);

        return $this->yazLog($tabloAdi, $kayitId, 'sil', $degerler, $aciklama);
    }

    /**
     * Log kaydı yazar
     */
    private function yazLog(string $tabloAdi, int $kayitId, string $islemTipi, string $degerler, string $aciklama): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO islem_log (firma_id, sube_id, kullanici_id, tablo_adi, kayit_id, islem_tipi, degerler, aciklama, kayit_kullanici_id, kayit_ip)
            VALUES (:firmaId, :subeId, :kullaniciId, :tabloAdi, :kayitId, :islemTipi, :degerler, :aciklama, :kayitKullaniciId, :kayitIp)
        ");
        $stmt->execute([
            ':firmaId' => $this->firmaId,
            ':subeId' => $this->subeId,
            ':kullaniciId' => $this->kullaniciId,
            ':tabloAdi' => $tabloAdi,
            ':kayitId' => $kayitId,
            ':islemTipi' => $islemTipi,
            ':degerler' => $degerler,
            ':aciklama' => $aciklama,
            ':kayitKullaniciId' => $this->kullaniciId,
            ':kayitIp' => $this->ip,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Bir kaydın log geçmişini getirir
     *
     * @param string $tabloAdi Tablo adı
     * @param int $kayitId Kayıt ID
     * @param int $limit Limit
     * @return array
     */
    public function getLoglar(string $tabloAdi, int $kayitId, int $limit = 50): array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM islem_log
            WHERE firma_id = ? AND tablo_adi = ? AND kayit_id = ?
            ORDER BY tarih DESC
            LIMIT ?
        ");
        $stmt->execute([$this->firmaId, $tabloAdi, $kayitId, $limit]);

        $items = [];
        foreach ($stmt->fetchAll() as $row) {
            $items[] = [
                'id' => (int)$row['id'],
                'islemTipi' => $row['islem_tipi'],
                'degerler' => json_decode($row['degerler'], true),
                'aciklama' => $row['aciklama'],
                'kullaniciId' => (int)$row['kullanici_id'],
                'ip' => $row['kayit_ip'],
                'tarih' => $row['kayit_tarihi'],
            ];
        }
        return $items;
    }

    /**
     * Geri dönüş UPDATE SQL'i oluşturur (düzenleme için)
     * Eski değerlere geri dönmek için kullanılır
     */
    private function buildRevertSql(string $tabloAdi, int $kayitId, array $eskiVeri): string {
        $setClauses = [];
        foreach ($eskiVeri as $key => $val) {
            if ($key === 'id') continue;
            if ($val === null) {
                $setClauses[] = "`{$key}` = NULL";
            } elseif (is_int($val) || is_float($val)) {
                $setClauses[] = "`{$key}` = {$val}";
            } else {
                $escaped = addslashes((string)$val);
                $setClauses[] = "`{$key}` = '{$escaped}'";
            }
        }
        if (empty($setClauses)) return '';
        return "UPDATE `{$tabloAdi}` SET " . implode(', ', $setClauses) . " WHERE `id` = {$kayitId};";
    }

    /**
     * Geri dönüş INSERT SQL'i oluşturur (silme için)
     * Silinen kaydı tekrar eklemek için kullanılır
     */
    private function buildReinsertSql(string $tabloAdi, array $eskiVeri): string {
        $columns = [];
        $values = [];
        foreach ($eskiVeri as $key => $val) {
            $columns[] = "`{$key}`";
            if ($val === null) {
                $values[] = "NULL";
            } elseif (is_int($val) || is_float($val)) {
                $values[] = (string)$val;
            } else {
                $escaped = addslashes((string)$val);
                $values[] = "'{$escaped}'";
            }
        }
        if (empty($columns)) return '';
        return "INSERT INTO `{$tabloAdi}` (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ");";
    }
}
