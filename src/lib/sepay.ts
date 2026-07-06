export const SEPAY_CONFIG = {
  BANK_ID: process.env.SEPAY_BANK_ID || "MBBank",
  ACCOUNT_NO: process.env.SEPAY_ACCOUNT_NO || "1234567890",
  ACCOUNT_NAME: process.env.SEPAY_ACCOUNT_NAME || "SP-CYBERSOFT",
  API_KEY: process.env.SEPAY_API_KEY || "sepay_secret_token_123",
};

export const PLAN_NAMES: Record<string, string> = {
  pro: "Pro",
  max: "MAX",
};

export const PLAN_PRICES: Record<string, Record<string, number>> = {
  pro: { monthly: 18000, yearly: 189000 },
  max: { monthly: 59000, yearly: 569000 },
};

/**
 * Generate VietQR image URL
 * Template can be: 'qr_only', 'compact', 'print'
 */
export function getVietQrUrl(amount: number, transferCode: string): string {
  const bankId = SEPAY_CONFIG.BANK_ID;
  const accountNo = SEPAY_CONFIG.ACCOUNT_NO;
  const accountName = encodeURIComponent(SEPAY_CONFIG.ACCOUNT_NAME);
  const info = encodeURIComponent(transferCode);
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?amount=${amount}&addInfo=${info}&accountName=${accountName}`;
}
