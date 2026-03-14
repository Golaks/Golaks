import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { Platform } from 'react-native';
import { OrderItem, OrderDetailItem } from '../services/orders.service';

interface SiparisParams {
  siparis: OrderItem;
  detaylar: OrderDetailItem[];
  fiyatli: boolean;
}

function formatNumber(num: number): string {
  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === '0000-00-00') return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function getDurumLabel(durum: string): string {
  switch (durum) {
    case 'beklemede': return 'Beklemede';
    case 'uretimde': return 'Üretimde';
    case 'kapali': return 'Kapalı';
    case 'iptal': return 'İptal';
    default: return durum || '-';
  }
}

function getDurumColor(durum: string): string {
  switch (durum) {
    case 'beklemede': return '#F59E0B';
    case 'uretimde': return '#3B82F6';
    case 'kapali': return '#10B981';
    case 'iptal': return '#EF4444';
    default: return '#6b7280';
  }
}

// Tüm detaylardan benzersiz beden isimlerini topla (sıralı)
function collectAllBedenler(detaylar: OrderDetailItem[]): string[] {
  const bedenSet = new Set<string>();
  detaylar.forEach(det => {
    if (det.bedenler && det.bedenler.length > 0) {
      det.bedenler.forEach(b => bedenSet.add(b.beden));
    }
  });
  return Array.from(bedenSet);
}

function buildDetailRows(detaylar: OrderDetailItem[], fiyatli: boolean, allBedenler: string[], hasImages: boolean): string {
  const hasBedenler = allBedenler.length > 0;

  return detaylar
    .map((det, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f7f8fb';
      const toplam = det.fiyat * det.miktar;

      const imgCell = hasImages
        ? `<td class="cell" style="text-align:center;padding:3px">${det.resimUrl ? `<img src="${det.resimUrl}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb" />` : '<span style="color:#d1d5db;font-size:8px">—</span>'}</td>`
        : '';

      // Beden map
      const bedenMap: Record<string, number> = {};
      if (det.bedenler) {
        det.bedenler.forEach(b => { bedenMap[b.beden] = b.miktar; });
      }

      let bedenCells = '';
      if (hasBedenler) {
        bedenCells = allBedenler.map(beden => {
          const m = bedenMap[beden];
          return `<td class="cell num" style="font-size:9px;${m ? 'color:#1e293b;font-weight:600' : 'color:#d1d5db'}">${m || '-'}</td>`;
        }).join('');
      }

      if (fiyatli) {
        const indirimStr = det.indirim > 0
          ? (det.indirimTip === 1 ? `%${det.indirim}` : formatNumber(det.indirim))
          : '';
        return `
        <tr style="background:${bg}">
          <td class="cell" style="text-align:center;color:#6b7280">${i + 1}</td>
          ${imgCell}
          <td class="cell">${det.modelAdi || det.stokAdi || '-'}</td>
          <td class="cell">${det.varyantAdi || '-'}</td>
          ${bedenCells}
          <td class="cell num" style="font-weight:600">${det.miktar.toLocaleString('tr-TR')}</td>
          <td class="cell num">${formatNumber(det.fiyat)}</td>
          <td class="cell num" style="color:#EF4444">${indirimStr}</td>
          <td class="cell num" style="font-weight:600;color:#047857">${formatNumber(toplam)}</td>
        </tr>`;
      } else {
        return `
        <tr style="background:${bg}">
          <td class="cell" style="text-align:center;color:#6b7280">${i + 1}</td>
          ${imgCell}
          <td class="cell">${det.modelAdi || det.stokAdi || '-'}</td>
          <td class="cell">${det.varyantAdi || '-'}</td>
          ${bedenCells}
          <td class="cell num" style="font-weight:600">${det.miktar.toLocaleString('tr-TR')}</td>
        </tr>`;
      }
    })
    .join('');
}

function buildHTML(params: SiparisParams): string {
  const { siparis, detaylar, fiyatli } = params;
  const now = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const toplamMiktar = detaylar.reduce((s, d) => s + d.miktar, 0);
  const toplamTutar = detaylar.reduce((s, d) => s + d.fiyat * d.miktar, 0);
  const durumColor = getDurumColor(siparis.durum);
  const durumLabel = getDurumLabel(siparis.durum);
  const allBedenler = collectAllBedenler(detaylar);
  const hasBedenler = allBedenler.length > 0;
  const hasImages = detaylar.some(d => !!d.resimUrl);

  // Beden toplamları
  const bedenTotals: Record<string, number> = {};
  if (hasBedenler) {
    detaylar.forEach(det => {
      if (det.bedenler) {
        det.bedenler.forEach(b => {
          bedenTotals[b.beden] = (bedenTotals[b.beden] || 0) + b.miktar;
        });
      }
    });
  }

  // Header sağ taraf - fiyatlı ise tutar/avans/indirim göster
  let headerRightBottom = '';
  if (fiyatli) {
    const avanslar = siparis.masterAvansIndirim?.avans || [];
    const indirim = siparis.masterAvansIndirim?.indirim;
    const avansTop = avanslar.reduce((s, a) => s + a.tutar, 0);
    const indTutar = indirim && indirim.tip !== -1 && indirim.deger > 0
      ? (indirim.tip === 0 ? siparis.tutar * indirim.deger / 100 : indirim.deger)
      : 0;
    const kalanTutar = siparis.tutar - indTutar - avansTop;

    let avansHTML = '';
    if (avanslar.length > 0) {
      avansHTML = avanslar.map(a =>
        `<div style="font-size:10px;color:#3B82F6;margin-top:2px">Avans: ${formatNumber(a.tutar)} ${a.doviz}</div>`
      ).join('');
    }

    let indirimHTML = '';
    if (indirim && indirim.tip !== -1 && indirim.deger > 0) {
      indirimHTML = `<div style="font-size:10px;color:#EF4444;margin-top:2px">İndirim: ${indirim.tip === 0 ? `%${indirim.deger}` : `${formatNumber(indirim.deger)} ${indirim.doviz || siparis.doviz}`}</div>`;
    }

    let kalanHTML = '';
    if (avansTop > 0 || indTutar > 0) {
      kalanHTML = `<div style="font-size:12px;font-weight:700;color:#10B981;margin-top:4px">Kalan: ${formatNumber(kalanTutar)} ${siparis.doviz}</div>`;
    }

    headerRightBottom = `
      <div style="margin-top:8px;text-align:right">
        <div style="font-size:18px;font-weight:800;color:#1e293b">${formatNumber(siparis.tutar)} <span style="font-size:12px;color:#6b7280">${siparis.doviz}</span></div>
        ${avansHTML}
        ${indirimHTML}
        ${kalanHTML}
      </div>`;
  }

  // Summary cards
  let summaryCards = `
    <div style="flex:1;background:#EFF6FF;border:1px solid #BFDBFE;padding:10px 14px;border-radius:6px">
      <div style="font-size:9px;text-transform:uppercase;color:#6b7280;margin-bottom:2px">Toplam Kalem</div>
      <div style="font-size:16px;font-weight:800;color:#2563EB">${detaylar.length}</div>
    </div>
    <div style="flex:1;background:#F0FDF4;border:1px solid #BBF7D0;padding:10px 14px;border-radius:6px">
      <div style="font-size:9px;text-transform:uppercase;color:#6b7280;margin-bottom:2px">Toplam Miktar</div>
      <div style="font-size:16px;font-weight:800;color:#047857">${toplamMiktar.toLocaleString('tr-TR')}</div>
    </div>`;

  if (fiyatli) {
    summaryCards += `
    <div style="flex:1;background:#FFFBEB;border:1px solid #FDE68A;padding:10px 14px;border-radius:6px">
      <div style="font-size:9px;text-transform:uppercase;color:#6b7280;margin-bottom:2px">Toplam Tutar</div>
      <div style="font-size:16px;font-weight:800;color:#D97706">${formatNumber(toplamTutar)} ${siparis.doviz}</div>
    </div>`;
  }

  // Beden header sütunları
  const bedenHeaders = hasBedenler
    ? allBedenler.map(b => `<th class="th num" style="font-size:8px;padding:5px 3px">${b}</th>`).join('')
    : '';

  // Table headers & footer
  let tableHeaders = '';
  let tableFooter = '';
  const imgHeader = hasImages ? '<th class="th" style="width:40px;text-align:center"></th>' : '';
  const footColspan = hasImages ? 4 : 3;

  if (fiyatli) {
    tableHeaders = `
          <th class="th" style="width:3%;text-align:center">#</th>
          ${imgHeader}
          <th class="th">MODEL / STOK</th>
          <th class="th">VARYANT</th>
          ${bedenHeaders}
          <th class="th num">TOP.</th>
          <th class="th num">FİYAT</th>
          <th class="th num">İND.</th>
          <th class="th num">TOPLAM</th>`;
    const bedenFootCells = hasBedenler
      ? allBedenler.map(b => `<td class="foot num" style="font-size:9px;font-weight:700;color:#2563EB">${bedenTotals[b] || 0}</td>`).join('')
      : '';
    tableFooter = `
        <tr style="background:#f1f5f9">
          <td class="foot" colspan="${footColspan}" style="font-weight:700;color:#1e293b">GENEL TOPLAM</td>
          ${bedenFootCells}
          <td class="foot num" style="font-weight:700;color:#1e293b">${toplamMiktar.toLocaleString('tr-TR')}</td>
          <td class="foot" colspan="2"></td>
          <td class="foot num" style="font-weight:700;color:#047857">${formatNumber(toplamTutar)} ${siparis.doviz}</td>
        </tr>`;
  } else {
    tableHeaders = `
          <th class="th" style="width:3%;text-align:center">#</th>
          ${imgHeader}
          <th class="th">MODEL / STOK</th>
          <th class="th">VARYANT</th>
          ${bedenHeaders}
          <th class="th num">TOP.</th>`;
    const bedenFootCells = hasBedenler
      ? allBedenler.map(b => `<td class="foot num" style="font-size:9px;font-weight:700;color:#2563EB">${bedenTotals[b] || 0}</td>`).join('')
      : '';
    tableFooter = `
        <tr style="background:#f1f5f9">
          <td class="foot" colspan="${footColspan}" style="font-weight:700;color:#1e293b">GENEL TOPLAM</td>
          ${bedenFootCells}
          <td class="foot num" style="font-weight:700;color:#1e293b">${toplamMiktar.toLocaleString('tr-TR')}</td>
        </tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#1e293b; padding:12px 16px; font-size:11px; }
    @page { size: A4 landscape; margin: 8mm 10mm 18mm 10mm; }
    table { width:100%; border-collapse:collapse; }
    .th {
      padding:7px 8px; font-size:9px; font-weight:700; color:#6b7280;
      text-transform:uppercase;
      border-bottom:2px solid #2563eb; text-align:left;
    }
    .cell { padding:5px 8px; font-size:10px; border-bottom:1px solid #eef0f3; color:#374151; }
    .num { text-align:right; }
    .foot { padding:7px 8px; font-size:10px; border-top:2px solid #cbd5e1; }
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 6px 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      color: #94a3b8;
    }
    .page-footer .copyright {
      font-weight: 600;
      color: #2563eb;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="background:#f8fafc;border:1px solid #e5e7eb;padding:14px 18px;margin-bottom:16px">
    <table style="width:100%">
      <tr>
        <td style="width:50%;vertical-align:top">
          <div style="font-size:20px;font-weight:800;color:#1e293b">${siparis.cariAdi}${siparis.musteriSube ? ` - ${siparis.musteriSube}` : ''}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:3px">${siparis.siparisKodu || '-'}${siparis.musteriSiparisKodu ? ` · Müşteri: ${siparis.musteriSiparisKodu}` : ''}</div>
          <div style="display:inline-block;margin-top:6px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;color:${durumColor};background:${durumColor}15;border:1px solid ${durumColor}30">${durumLabel}</div>
          <span style="display:inline-block;margin-left:6px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;color:${siparis.siparisTipi === 2 ? '#8B5CF6' : '#10B981'};background:${siparis.siparisTipi === 2 ? '#8B5CF615' : '#10B98115'}">${siparis.siparisTipi === 2 ? 'Satınalma' : 'Satış'}</span>
        </td>
        <td style="width:50%;text-align:right;vertical-align:top">
          <table style="width:auto;margin-left:auto">
            <tr>
              <td style="font-size:9px;color:#1e293b;font-weight:700;padding:2px 12px 2px 0">Sipariş Tarihi</td>
              <td style="font-size:11px;color:#374151;font-weight:500;padding:2px 0;text-align:right">${formatDate(siparis.tarih)}</td>
            </tr>
            <tr>
              <td style="font-size:9px;color:#1e293b;font-weight:700;padding:2px 12px 2px 0">Teslim Tarihi</td>
              <td style="font-size:11px;color:#374151;font-weight:500;padding:2px 0;text-align:right">${formatDate(siparis.teslimTarihi)}</td>
            </tr>
            <tr>
              <td style="font-size:9px;color:#1e293b;font-weight:700;padding:2px 12px 2px 0">Yazdırma Tarihi</td>
              <td style="font-size:11px;color:#374151;font-weight:500;padding:2px 0;text-align:right">${now}</td>
            </tr>
          </table>
          ${headerRightBottom}
        </td>
      </tr>
    </table>
  </div>

  <!-- Summary Cards -->
  <div style="display:flex;gap:12px;margin-bottom:16px">
    ${summaryCards}
  </div>

  <!-- Detail Table -->
  <div style="margin-bottom:12px">
    <div style="margin-bottom:6px">
      <span style="display:inline-block;width:4px;height:14px;background:#2563eb;vertical-align:middle;margin-right:6px"></span>
      <span style="font-size:13px;font-weight:700;color:#1e293b;vertical-align:middle">Sipariş Kalemleri</span>
      <span style="font-size:10px;color:#6b7280;font-weight:500;vertical-align:middle;margin-left:4px">(${detaylar.length} kalem)</span>
    </div>

    <table>
      <thead>
        <tr>
          ${tableHeaders}
        </tr>
      </thead>
      <tbody>
        ${buildDetailRows(detaylar, fiyatli, allBedenler, hasImages)}
      </tbody>
      <tfoot>
        ${tableFooter}
      </tfoot>
    </table>
  </div>

  ${siparis.aciklama ? `
  <div style="margin-top:8px;padding:8px 12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:4px;font-size:10px;color:#92400E">
    <strong>Açıklama:</strong> ${siparis.aciklama}
  </div>` : ''}

  <!-- Fixed Footer -->
  <div class="page-footer">
    <span><span class="copyright">GOLAKS</span> &copy; Polaris Dış Ticaret Ltd. Şti.</span>
    <span>${now}</span>
  </div>

</body>
</html>`;
}

export async function generateSiparisPDF(params: SiparisParams): Promise<void> {
  const html = buildHTML(params);

  const pdfOptions: any = {
    html,
    fileName: `siparis_${params.siparis.siparisKodu?.replace(/[\/\\.]/g, '_') || params.siparis.id}_${Date.now()}`,
    base64: false,
  };

  if (Platform.OS === 'ios') {
    pdfOptions.directory = 'Documents';
    pdfOptions.width = 842;  // A4 landscape
    pdfOptions.height = 595;
  }

  const file = await generatePDF(pdfOptions);

  if (!file.filePath) {
    throw new Error('PDF dosyası oluşturulamadı');
  }

  const fileUrl = `file://${file.filePath}`;

  await Share.open({
    url: fileUrl,
    type: 'application/pdf',
    title: `${params.siparis.siparisKodu} - Sipariş`,
    failOnCancel: false,
  });
}
