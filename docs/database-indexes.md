# Veritabanı Index Önerileri

## Kasa & Banka Raporu İçin Gerekli Index'ler

Bu index'ler Kasa & Banka raporunun performansını önemli ölçüde artıracaktır.

### 1. fis_detay Tablosu

```sql
-- Hesap kodu ve aktif durumu için composite index
CREATE INDEX idx_fis_detay_hesap_aktif ON fis_detay(hesap_kodu, aktif);

-- Daha spesifik: hesap kodu prefix + döviz + aktif
CREATE INDEX idx_fis_detay_kasa ON fis_detay(hesap_kodu, cari_doviz, aktif)
WHERE hesap_kodu LIKE '100%';

CREATE INDEX idx_fis_detay_banka ON fis_detay(hesap_kodu, cari_doviz, aktif)
WHERE hesap_kodu LIKE '102%';

-- Eğer yukarıdaki partial index'ler desteklenmiyorsa:
CREATE INDEX idx_fis_detay_hesap_doviz_aktif ON fis_detay(hesap_kodu, cari_doviz, aktif);
```

### 2. cariler Tablosu

```sql
-- Hesap kodu ve aktif durumu için composite index
CREATE INDEX idx_cariler_hesap_aktif ON cariler(hesap_kodu, aktif);

-- Şube ilişkisi için index
CREATE INDEX idx_cariler_sube ON cariler(sube_id, aktif);

-- Hesap kodu prefix aramaları için
CREATE INDEX idx_cariler_hesap_prefix ON cariler(hesap_kodu(5), aktif);
```

### 3. subeler Tablosu

```sql
-- Primary key zaten var ama kontrol edin
-- İhtiyaç halinde:
CREATE INDEX idx_subeler_id ON subeler(id);
```

## Mevcut Index'leri Kontrol Etme

```sql
-- fis_detay index'lerini göster
SHOW INDEX FROM fis_detay;

-- cariler index'lerini göster
SHOW INDEX FROM cariler;

-- subeler index'lerini göster
SHOW INDEX FROM subeler;
```

## Query Performance Analizi

Sorgu performansını test etmek için:

```sql
-- Query execution plan'ı göster
EXPLAIN SELECT
    c.id,
    c.hesap_kodu,
    c.unvan,
    s.sube_adi,
    bakiye_data.doviz,
    bakiye_data.bakiye
FROM cariler c
INNER JOIN subeler s ON c.sube_id = s.id
INNER JOIN (
    SELECT
        hesap_kodu,
        cari_doviz AS doviz,
        SUM(IFNULL(cari_alacak, 0) - IFNULL(cari_borc, 0)) AS bakiye
    FROM fis_detay
    WHERE aktif <> -1
      AND hesap_kodu LIKE '100%'
    GROUP BY hesap_kodu, cari_doviz
    HAVING bakiye <> 0
) AS bakiye_data ON c.hesap_kodu = bakiye_data.hesap_kodu
WHERE c.aktif = 1
ORDER BY c.unvan;
```

## Performans İpuçları

1. **Index Kullanımı**: `EXPLAIN` ile sorgunun index'leri kullanıp kullanmadığını kontrol edin
2. **Table Scan**: "Using filesort" veya "Using temporary" görüyorsanız, ek index'ler gerekebilir
3. **Statistics**: Tablo istatistiklerini güncel tutun: `ANALYZE TABLE fis_detay, cariler, subeler;`
4. **Query Cache**: MySQL query cache'ini aktif tutun (MySQL 5.7 ve öncesi için)

## Optimizasyon Sonuçları

### Eski Sorgu (LEFT JOIN)
- Tüm fis_detay tablosunu tarar
- GROUP BY sonrası HAVING ile filtreleme
- Yavaş performans (büyük tablolarda 5-10 saniye)

### Yeni Sorgu (Subquery + INNER JOIN)
- Sadece ilgili hesap kodlarını tarar
- Önce bakiyeleri hesaplar, sonra JOIN yapar
- Hızlı performans (büyük tablolarda 0.5-2 saniye)
- Index'lerle birlikte daha da hızlı (0.1-0.5 saniye)

## Index Boyutları

Index'ler disk alanı kullanır. Yaklaşık boyutlar:
- `idx_fis_detay_hesap_aktif`: ~50-100MB (1M kayıt için)
- `idx_cariler_hesap_aktif`: ~5-10MB (10K kayıt için)

Fayda/maliyet oranı çok yüksek olduğu için bu index'ler kesinlikle önerilir.
