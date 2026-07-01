import * as XLSX from "xlsx";

export interface PcBuildExcelItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface PcBuildExcelExtraction {
  items: PcBuildExcelItem[];
  total_amount: number;
  currency: "VND";
}

type CellValue = string | number | boolean | Date | null | undefined;

const NAME_HEADERS = ["ten san pham", "ten hang", "san pham", "linh kien", "mo ta", "hang hoa"];
const QUANTITY_HEADERS = ["so luong", "sl", "qty", "quantity"];
const PRICE_HEADERS = ["don gia", "gia ban", "unit price", "price"];
const TOTAL_HEADERS = ["thanh tien", "tong tien", "amount", "total"];

function normalizeText(value: CellValue): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function cellText(value: CellValue): string {
  return String(value ?? "").trim();
}

function parseNumber(value: CellValue): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const text = cellText(value);
  if (!text) return 0;

  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

function findHeaderIndex(row: CellValue[], headers: string[]): number {
  return row.findIndex((cell) => {
    const normalized = normalizeText(cell);
    return headers.some((header) => normalized.includes(header));
  });
}

function extractWithHeaders(rows: CellValue[][]): PcBuildExcelExtraction | null {
  const headerRowIndex = rows.findIndex((row) => {
    const hasNameHeader = findHeaderIndex(row, NAME_HEADERS) >= 0;
    const hasValueHeader =
      findHeaderIndex(row, QUANTITY_HEADERS) >= 0 ||
      findHeaderIndex(row, PRICE_HEADERS) >= 0 ||
      findHeaderIndex(row, TOTAL_HEADERS) >= 0;

    return hasNameHeader && hasValueHeader;
  });
  if (headerRowIndex < 0) return null;

  const headerRow = rows[headerRowIndex];
  const nameIndex = findHeaderIndex(headerRow, NAME_HEADERS);
  const quantityIndex = findHeaderIndex(headerRow, QUANTITY_HEADERS);
  const priceIndex = findHeaderIndex(headerRow, PRICE_HEADERS);
  const totalIndex = findHeaderIndex(headerRow, TOTAL_HEADERS);

  if (nameIndex < 0) return null;

  const items: PcBuildExcelItem[] = [];
  let totalAmount = 0;

  for (const row of rows.slice(headerRowIndex + 1)) {
    const name = cellText(row[nameIndex]);
    if (!name || name.length < 3 || !/[a-zA-ZÀ-ỹ]/.test(name)) continue;

    const quantity = quantityIndex >= 0 ? parseNumber(row[quantityIndex]) || 1 : 1;
    const price = priceIndex >= 0 ? parseNumber(row[priceIndex]) : 0;
    const rowTotal = totalIndex >= 0 ? parseNumber(row[totalIndex]) : 0;
    const resolvedPrice = price || (quantity > 0 && rowTotal ? Math.round(rowTotal / quantity) : 0);
    const resolvedTotal = rowTotal || resolvedPrice * quantity;

    if (resolvedPrice > 0) {
      items.push({ name, quantity, price: resolvedPrice, total: resolvedTotal });
      totalAmount += resolvedTotal;
    }
  }

  return items.length > 0 ? { items, total_amount: totalAmount, currency: "VND" } : null;
}

function extractWithFallback(rows: CellValue[][]): PcBuildExcelExtraction | null {
  const items: PcBuildExcelItem[] = [];
  let totalAmount = 0;

  for (const row of rows) {
    if (!row || row.length < 2) continue;

    const values = row.map(cellText);
    const name = values.find((value) => value.length > 3 && /[a-zA-ZÀ-ỹ]/.test(value)) || "";
    if (!name) continue;

    const numbers = row.map(parseNumber).filter((number) => number > 0);
    const price = numbers.filter((number) => number >= 50000).sort((a, b) => b - a)[0] || 0;
    const quantity = numbers.find((number) => number >= 1 && number <= 20) || 1;

    if (price > 0) {
      const total = price * quantity;
      items.push({ name, quantity, price, total });
      totalAmount += total;
    }
  }

  return items.length > 0 ? { items, total_amount: totalAmount, currency: "VND" } : null;
}

export async function parsePcBuildExcelFile(file: File): Promise<PcBuildExcelExtraction | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: false });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) return null;

    const rows = XLSX.utils.sheet_to_json<CellValue[]>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });

    return extractWithHeaders(rows) || extractWithFallback(rows);
  } catch (err) {
    console.error("[parsePcBuildExcelFile] Failed:", err);
    return null;
  }
}
