import bwipjs from 'bwip-js';

export async function generateBarcode(text: string, options: { scale?: number; height?: number } = {}): Promise<Buffer> {
  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text: text || ' ',
    scale: options.scale ?? 2,
    height: options.height ?? 8,
    includetext: false,
    textxalign: 'center',
  });
  return png as Buffer;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? ONES[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? twoDigits(r) : '');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const whole = Math.floor(num);
  const paise = Math.round((num - whole) * 100);
  let result = '';
  if (whole >= 10000000) {
    result += threeDigits(Math.floor(whole / 10000000)) + ' Crore ';
  }
  if (whole >= 100000) {
    result += threeDigits(Math.floor((whole / 100000) % 100) || 0) || '';
    const lakhs = Math.floor(whole / 100000) % 100;
    if (lakhs) result = result.trim() + ' Lakh ';
  }
  const thousands = Math.floor((whole / 1000) % 100);
  if (thousands) result += threeDigits(thousands) + ' Thousand ';
  const hundreds = whole % 1000;
  if (hundreds) result += threeDigits(hundreds);
  result = result.trim();
  if (paise > 0) {
    result += ' and ' + twoDigits(paise) + ' Paise';
  }
  return result;
}

export function formatINR(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDateIN(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '-';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()];
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

export function formatDateTimeIN(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '-';
  const date = formatDateIN(dt);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  return `${date} ${hh}:${mm}:${ss}.0`;
}

export function extractCity(shippingAddress: string | null | undefined): string {
  if (!shippingAddress) return '';
  const parts = shippingAddress.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || '';
}

export function extractPincode(shippingAddress: string | null | undefined, billingPin?: string | null): string {
  if (billingPin) return billingPin;
  if (!shippingAddress) return '';
  const match = shippingAddress.match(/\b(\d{6})\b/);
  return match ? match[1] : '';
}

export function aggregateContents(itemNames: string[]): string {
  return itemNames.filter(Boolean).join(', ').toUpperCase();
}

export function totalWeightInGm(items: { weight?: any }[]): number {
  return items.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
}
