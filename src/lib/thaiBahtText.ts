/**
 * Thai Baht Text Converter
 * Converts numeric amounts into formal Thai Baht reading for official payslips and receipts.
 * Example: 25450 -> "สองหมื่นห้าพันสี่ร้อยห้าสิบบาทถ้วน"
 */

const THAI_NUMBERS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_DIGIT_PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertGroup(nStr: string): string {
  let result = '';
  const len = nStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(nStr.charAt(i), 10);
    const place = len - i - 1;

    if (digit !== 0) {
      if (place === 1 && digit === 1) {
        // 'สิบ' instead of 'หนึ่งสิบ'
        result += 'สิบ';
      } else if (place === 1 && digit === 2) {
        // 'ยี่สิบ'
        result += 'ยี่สิบ';
      } else if (place === 0 && digit === 1 && len > 1 && parseInt(nStr.charAt(len - 2), 10) !== 0) {
        // 'เอ็ด'
        result += 'เอ็ด';
      } else {
        result += THAI_NUMBERS[digit] + THAI_DIGIT_PLACES[place];
      }
    }
  }

  return result;
}

export function numberToThaiBahtText(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const parts = fixed.split('.');
  
  let integerPart = parts[0];
  const satangPart = parts[1];

  let bahtText = '';

  // Process millions if greater than 1,000,000
  if (integerPart.length > 6) {
    const millions = integerPart.substring(0, integerPart.length - 6);
    integerPart = integerPart.substring(integerPart.length - 6);
    bahtText += convertGroup(millions) + 'ล้าน';
  }

  bahtText += convertGroup(integerPart);

  if (bahtText === '') {
    bahtText = 'ศูนย์';
  }

  bahtText += 'บาท';

  const satangNum = parseInt(satangPart, 10);
  if (satangNum === 0) {
    bahtText += 'ถ้วน';
  } else {
    bahtText += convertGroup(satangPart) + 'สตางค์';
  }

  return (isNegative ? 'ลบ' : '') + bahtText;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
