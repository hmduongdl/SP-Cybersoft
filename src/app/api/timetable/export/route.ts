import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

// ─── Column definitions (matches timetable page) ─────────────────────────────
const DAY_COLS = [
  { key: "mon", label: "Thứ 2" },
  { key: "tue", label: "Thứ 3" },
  { key: "wed", label: "Thứ 4" },
  { key: "thu", label: "Thứ 5" },
  { key: "fri", label: "Thứ 6" },
  { key: "sat", label: "Thứ 7" },
  { key: "sun", label: "Chủ Nhật" },
];

// Total columns: #, Khung Giờ, Tên Công Việc, Ghi Chú, T2–CN = 11 cols
// Excel cols:     A  B          C               D         E–K
const TOTAL_COLS = 11; // A → K

// ─── Style tokens ─────────────────────────────────────────────────────────────
const COLOR = {
  navyBg:      "1F4E78",
  navyText:    "FFFFFF",
  morningBg:   "D6E4F7", // soft blue
  afternoonBg: "FFF3D4", // soft amber
  sectionBg:   "D9D9D9", // grey banner
  taskNameBg:  "E2EFDA", // green-tint for Tên Công Việc column
  deadlineBg:  "FFF2CC", // yellow for deadline / flagged cells
  lockedRowBg: "F5F5F5", // subtle grey for anchor rows
  borderColor: "BFBFBF",
  headerText:  "1F4E78",
  altRowBg:    "FAFAFA",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellItems(cells: { column_name: string; content: unknown }[], colKey: string): string {
  const cell = cells.find((c) => c.column_name === colKey);
  if (!cell?.content) return "";
  if (Array.isArray(cell.content)) return (cell.content as string[]).join("\n");
  return String(cell.content);
}

function isDeadlineCell(cells: { column_name: string; is_deadline: boolean }[], colKey: string): boolean {
  return cells.find((c) => c.column_name === colKey)?.is_deadline ?? false;
}

function applyBorder(
  cell: ExcelJS.Cell,
  style: ExcelJS.BorderStyle = "thin",
  color = COLOR.borderColor,
) {
  const b = { style, color: { argb: `FF${color}` } } as ExcelJS.Border;
  cell.border = { top: b, left: b, bottom: b, right: b };
}

function autoFitCols(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    if (!col) return;
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value?.toString() ?? "";
      // Handle multi-line content
      const lines = val.split("\n");
      const longest = Math.max(...lines.map((l) => l.length));
      if (longest > maxLen) maxLen = longest;
    });
    col.width = Math.min(maxLen + 4, 40); // cap at 40 chars
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Fetch rows sorted by order
  const rows = await prisma.timetableRow.findMany({
    where: { user_id: session.user.id },
    include: { cells: true },
    orderBy: { order: "asc" },
  });

  if (rows.length === 0)
    return NextResponse.json({ error: "Chưa có thời khóa biểu để xuất." }, { status: 400 });

  // 2. Build workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = "SP-CyberSoft Timetable";
  wb.created = new Date();

  const ws = wb.addWorksheet("Thời Khóa Biểu", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9, // A4
    },
    views: [{ state: "frozen", ySplit: 3 }], // freeze title + header
  });

  // ── 3. Column widths (set early so merging works) ─────────────────────────
  ws.columns = [
    { key: "order",  width: 4  }, // A: #
    { key: "time",   width: 16 }, // B: Khung Giờ
    { key: "title",  width: 28 }, // C: Tên Công Việc
    { key: "notes",  width: 22 }, // D: Ghi Chú
    { key: "mon",    width: 18 }, // E
    { key: "tue",    width: 18 }, // F
    { key: "wed",    width: 18 }, // G
    { key: "thu",    width: 18 }, // H
    { key: "fri",    width: 18 }, // I
    { key: "sat",    width: 14 }, // J
    { key: "sun",    width: 14 }, // K
  ];

  // ── ROW 1: Main title ──────────────────────────────────────────────────────
  const titleRow = ws.addRow(["THỜI KHÓA BIỂU TUẦN LÀM VIỆC"]);
  ws.mergeCells(1, 1, 1, TOTAL_COLS);
  const titleCell = ws.getCell("A1");
  titleCell.value = "THỜI KHÓA BIỂU TUẦN LÀM VIỆC";
  titleCell.font = { bold: true, size: 14, color: { argb: `FF${COLOR.navyBg}` }, name: "Calibri" };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } };
  titleRow.height = 28;

  // ── ROW 2: Column headers ──────────────────────────────────────────────────
  const headers = ["#", "Khung Giờ", "TÊN CÔNG VIỆC", "GHI CHÚ",
    "THỨ 2", "THỨ 3", "THỨ 4", "THỨ 5", "THỨ 6", "THỨ 7", "CHỦ NHẬT"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font  = { bold: true, size: 10, color: { argb: `FF${COLOR.navyText}` }, name: "Calibri" };
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.navyBg}` } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
    applyBorder(cell, "thin", "FFFFFF");
  });

  // ── ROW 3+: Data rows ──────────────────────────────────────────────────────
  let rowIndex = 3; // 1-based, we already have 2 rows above
  let morningBannerEmitted = false;
  let afternoonBannerEmitted = false;

  // Always emit morning banner before first row
  const emitBanner = (label: string, bgColor: string) => {
    rowIndex++;
    const bannerRow = ws.addRow(["", label]);
    ws.mergeCells(rowIndex, 2, rowIndex, TOTAL_COLS); // merge B → K
    bannerRow.height = 18;
    bannerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      if (colNum === 1) {
        // col A left empty but styled
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.sectionBg}` } };
        return;
      }
      cell.value = colNum === 2 ? label : null;
      cell.font  = { bold: true, size: 10, color: { argb: "FF333333" }, name: "Calibri" };
      cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.sectionBg}` } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      applyBorder(cell, "thin");
    });
  };

  // Morning banner first
  emitBanner("☀  BUỔI SÁNG  |  08:00 – 12:00", COLOR.sectionBg);
  morningBannerEmitted = true;

  for (const row of rows) {
    const isLocked = row.is_locked;

    // Afternoon banner before anchor_mid row
    if (row.row_type === "anchor_mid" && !afternoonBannerEmitted) {
      emitBanner("🌤  BUỔI CHIỀU  |  13:30 – 18:30", COLOR.sectionBg);
      afternoonBannerEmitted = true;
    }

    // Build cell values
    const notesVal = cellItems(row.cells, "notes");
    const rowValues = [
      row.order + 1,
      `${row.start_time} – ${row.end_time}`,
      row.title,
      notesVal,
      ...DAY_COLS.map((d) => cellItems(row.cells, d.key)),
    ];

    rowIndex++;
    const dataRow = ws.addRow(rowValues);
    dataRow.height = row.row_type === "break" ? 14 : 20;

    // Per-cell styling
    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const colKey = ws.columns[colNum - 1]?.key as string | undefined;
      cell.font = {
        name: "Calibri",
        size: row.row_type === "break" ? 9 : 10,
        bold: isLocked,
        italic: row.row_type === "break",
        color: { argb: row.row_type === "break" ? "FF888888" : "FF1A1A1A" },
      };
      cell.alignment = {
        vertical: "top",
        horizontal: colNum <= 2 ? "center" : "left",
        wrapText: true,
      };

      // Base row fill
      let fillColor = isLocked ? COLOR.lockedRowBg : (rowIndex % 2 === 0 ? COLOR.altRowBg : "FFFFFF");

      // "Tên Công Việc" column (C = colNum 3) → green tint
      if (colNum === 3 && !isLocked) fillColor = COLOR.taskNameBg;

      // Day columns (E–K = colNum 5–11): check is_deadline
      if (colNum >= 5 && colNum <= 11) {
        const dayKey = DAY_COLS[colNum - 5]?.key;
        if (dayKey && isDeadlineCell(row.cells, dayKey)) {
          fillColor = COLOR.deadlineBg;
          cell.font = { ...cell.font, bold: true, color: { argb: "FFCC3300" } };
        }
      }

      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${fillColor}` } };
      applyBorder(cell, isLocked ? "medium" : "thin");
    });
  }

  // ── 4. Auto-fit columns based on content ──────────────────────────────────
  autoFitCols(ws);

  // ── 5. Print settings footer ──────────────────────────────────────────────
  ws.headerFooter.oddFooter =
    `&L&"Calibri,Regular"&8Xuất từ SP-CyberSoft Timetable` +
    `&C&8Trang &P / &N` +
    `&R&8&D`;

  // ── 6. Stream as download ─────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="TKB_${dateStr}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
