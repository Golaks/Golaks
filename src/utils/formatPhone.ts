/**
 * Telefon numarasını (5XX)XXX-XXXX formatına çevirir
 * Giriş: herhangi bir formatta numara (05324742233, +905324742233, 5324742233, vb.)
 * Çıkış: (532)274-2233
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';

  // Sadece rakamları al
  const digits = phone.replace(/\D/g, '');

  // +90 veya 90 prefix'ini kaldır
  let cleaned = digits;
  if (cleaned.startsWith('90') && cleaned.length >= 12) {
    cleaned = cleaned.slice(2);
  }

  // Baştaki 0'ı kaldır
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // 10 haneli numara bekleniyor
  if (cleaned.length !== 10) return phone;

  const area = cleaned.slice(0, 3);
  const mid = cleaned.slice(3, 6);
  const last = cleaned.slice(6, 10);

  return `(${area})${mid}-${last}`;
}
