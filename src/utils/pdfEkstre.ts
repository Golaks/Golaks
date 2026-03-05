import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { CariTransaction } from '../services/account.service';

interface EkstreParams {
  unvan: string;
  hesapKodu: string;
  sube?: string;
  transactions: CariTransaction[];
  baslangicTarihi?: string;
  bitisTarihi?: string;
}

interface CurrencyGroup {
  doviz: string;
  transactions: CariTransaction[];
  toplamBorc: number;
  toplamAlacak: number;
  bakiye: number;
}

function formatNumber(num: number): string {
  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function groupByCurrency(transactions: CariTransaction[]): CurrencyGroup[] {
  const groups: Record<string, CariTransaction[]> = {};
  transactions.forEach(t => {
    const d = t.doviz || 'TL';
    if (!groups[d]) groups[d] = [];
    groups[d].push(t);
  });

  return Object.entries(groups).map(([doviz, txns]) => {
    const toplamBorc = txns.reduce((sum, t) => sum + t.borc, 0);
    const toplamAlacak = txns.reduce((sum, t) => sum + t.alacak, 0);
    const bakiye = toplamBorc - toplamAlacak;
    return { doviz, transactions: txns, toplamBorc, toplamAlacak, bakiye };
  });
}

function buildTransactionRows(txns: CariTransaction[]): string {
  let runningBalance = 0;
  return txns
    .map((t, i) => {
      runningBalance += t.borc - t.alacak;
      const bg = i % 2 === 0 ? '#ffffff' : '#f7f8fb';
      const balColor = runningBalance >= 0 ? '#b91c1c' : '#047857';
      return `
      <tr style="background:${bg}">
        <td class="cell" style="color:#6b7280">${formatDate(t.tarih)}</td>
        <td class="cell" style="color:#4b5563">${t.fisNo || ''}</td>
        <td class="cell desc">${t.aciklama || t.fisTuru || ''}</td>
        <td class="cell num" style="color:#b91c1c">${t.borc > 0 ? formatNumber(t.borc) : ''}</td>
        <td class="cell num" style="color:#047857">${t.alacak > 0 ? formatNumber(t.alacak) : ''}</td>
        <td class="cell num" style="color:${balColor};font-weight:600">${formatNumber(Math.abs(runningBalance))} ${runningBalance >= 0 ? 'B' : 'A'}</td>
      </tr>`;
    })
    .join('');
}

function buildSummaryCards(groups: CurrencyGroup[]): string {
  return groups.map(g => {
    const isBorc = g.bakiye >= 0;
    const balColor = isBorc ? '#b91c1c' : '#047857';
    const balBg = isBorc ? '#fef2f2' : '#ecfdf5';
    const balBorder = isBorc ? '#fecaca' : '#a7f3d0';
    const balLabel = isBorc ? 'Borç Bakiye' : 'Alacak Bakiye';

    return `
    <div style="flex:1;min-width:200px;background:${balBg};border:1px solid ${balBorder};border-radius:10px;padding:14px 18px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">${g.doviz} ${balLabel}</div>
      <div style="font-size:20px;font-weight:800;color:${balColor};letter-spacing:-0.5px">${formatNumber(Math.abs(g.bakiye))}</div>
      <div style="margin-top:8px;display:flex;gap:16px">
        <div>
          <span style="font-size:8px;color:#9ca3af;text-transform:uppercase">Borc</span>
          <div style="font-size:11px;font-weight:600;color:#b91c1c">${formatNumber(g.toplamBorc)}</div>
        </div>
        <div>
          <span style="font-size:8px;color:#9ca3af;text-transform:uppercase">Alacak</span>
          <div style="font-size:11px;font-weight:600;color:#047857">${formatNumber(g.toplamAlacak)}</div>
        </div>
        <div>
          <span style="font-size:8px;color:#9ca3af;text-transform:uppercase">Hareket</span>
          <div style="font-size:11px;font-weight:600;color:#374151">${g.transactions.length}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function buildCurrencyTable(group: CurrencyGroup): string {
  const balColor = group.bakiye >= 0 ? '#b91c1c' : '#047857';

  return `
    <div style="margin-bottom:28px">
      <div style="margin-bottom:6px;text-align:left">
        <span style="display:inline-block;width:4px;height:14px;background:#2563eb;border-radius:2px;vertical-align:middle;margin-right:6px"></span>
        <span style="font-size:13px;font-weight:700;color:#1e293b;vertical-align:middle">${group.doviz} Hesap Hareketleri</span>
        <span style="font-size:10px;color:#9ca3af;vertical-align:middle;margin-left:4px">(${group.transactions.length} işlem)</span>
      </div>

      <table>
        <thead>
          <tr>
            <th class="th" style="width:10%">TARİH</th>
            <th class="th" style="width:16%">FİŞ NO</th>
            <th class="th" style="width:30%;text-align:left">AÇIKLAMA</th>
            <th class="th num" style="width:14%">BORÇ</th>
            <th class="th num" style="width:14%">ALACAK</th>
            <th class="th num" style="width:16%">BAKİYE</th>
          </tr>
        </thead>
        <tbody>
          ${buildTransactionRows(group.transactions)}
        </tbody>
        <tfoot>
          <tr style="background:#f1f5f9">
            <td class="foot" colspan="3" style="font-weight:700;color:#1e293b">TOPLAM</td>
            <td class="foot num" style="color:#b91c1c;font-weight:700">${formatNumber(group.toplamBorc)}</td>
            <td class="foot num" style="color:#047857;font-weight:700">${formatNumber(group.toplamAlacak)}</td>
            <td class="foot num" style="color:${balColor};font-weight:700">${formatNumber(Math.abs(group.bakiye))} ${group.bakiye >= 0 ? 'B' : 'A'}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

function buildHTML(params: EkstreParams): string {
  const groups = groupByCurrency(params.transactions);
  const now = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif; color:#1e293b; padding:28px 32px; font-size:11px; }
    @page { margin: 16mm 14mm; }
    table { width:100%; border-collapse:collapse; }
    .th {
      padding:7px 8px; font-size:9px; font-weight:700; color:#6b7280;
      text-transform:uppercase; letter-spacing:0.5px;
      border-bottom:2px solid #2563eb; text-align:left;
    }
    .cell { padding:5px 8px; font-size:10px; border-bottom:1px solid #eef0f3; color:#374151; }
    .desc { max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .num { text-align:right; font-variant-numeric:tabular-nums; }
    .foot { padding:7px 8px; font-size:10px; border-top:2px solid #cbd5e1; }
  </style>
</head>
<body>

  <!-- Header Card -->
  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:18px">
    <table style="width:100%">
      <tr>
        <td style="width:55%;vertical-align:top">
          <div style="font-size:18px;font-weight:800;color:#1e293b;letter-spacing:-0.5px">${params.unvan}</div>
          <div style="font-size:10px;color:#6b7280;margin-top:2px">${params.hesapKodu}${params.sube ? ' . ' + params.sube : ''}</div>
          <div style="font-size:10px;color:#2563eb;text-transform:uppercase;letter-spacing:2px;margin-top:4px;font-weight:700">Hesap Ekstresi</div>
        </td>
        <td style="width:45%;text-align:right;vertical-align:top">
          <table style="width:auto;margin-left:auto">
            <tr>
              <td style="font-size:9px;color:#1e293b;font-weight:700;padding:2px 10px 2px 0">Tarih</td>
              <td style="font-size:10px;color:#374151;font-weight:500;padding:2px 0;text-align:right">${now}</td>
            </tr>
            <tr>
              <td style="font-size:9px;color:#1e293b;font-weight:700;padding:2px 10px 2px 0">Başlangıç</td>
              <td style="font-size:10px;color:#374151;font-weight:500;padding:2px 0;text-align:right">${params.baslangicTarihi || '-'}</td>
            </tr>
            <tr>
              <td style="font-size:9px;color:#1e293b;font-weight:700;padding:2px 10px 2px 0">Bitiş</td>
              <td style="font-size:10px;color:#374151;font-weight:500;padding:2px 0;text-align:right">${params.bitisTarihi || '-'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>

  <!-- Transaction Tables per Currency -->
  ${groups.map(g => buildCurrencyTable(g)).join('')}

  <!-- Footer -->
  <div style="margin-top:20px;padding:12px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:10px;color:#475569;font-weight:500">1995-${new Date().getFullYear()} Polaris Dış Ticaret Ltd. Şti. / Golaks</div>
    <div style="font-size:10px;color:#475569;font-weight:600">Sayfa: 1/1</div>
  </div>

</body>
</html>`;
}

export async function generateEkstrePDF(params: EkstreParams): Promise<void> {
  const html = buildHTML(params);

  const file = await generatePDF({
    html,
    fileName: `ekstre_${params.hesapKodu.replace(/\./g, '_')}_${Date.now()}`,
    directory: 'Documents',
    base64: false,
    width: 595,
    height: 842,
  });

  if (file.filePath) {
    await Share.open({
      url: `file://${file.filePath}`,
      type: 'application/pdf',
      title: `${params.unvan} - Hesap Ekstresi`,
    });
  }
}
