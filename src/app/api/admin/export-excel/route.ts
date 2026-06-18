import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

const getExcelColumnLetter = (colNum: number): string => {
  let temp = colNum;
  let letter = "";
  while (temp > 0) {
    let tempCol = (temp - 1) % 26;
    letter = String.fromCharCode(65 + tempCol) + letter;
    temp = Math.floor((temp - tempCol) / 26);
  }
  return letter;
};

const generateScoreFormula = (rowNum: number, startColNum: number, endColNum: number): string => {
  const startLetter = getExcelColumnLetter(startColNum);
  const endLetter = getExcelColumnLetter(endColNum);
  return `=COUNTIF(${startLetter}${rowNum}:${endLetter}${rowNum}, "X") + COUNTIF(${startLetter}${rowNum}:${endLetter}${rowNum}, "1/2")*0.5`;
};

function getShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return parts.slice(-2).join(' ');
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate') || searchParams.get('start_date');
    const endDateStr = searchParams.get('endDate') || searchParams.get('end_date');

    // Build date filter for posts
    let postWhere: any = {};
    if (startDateStr || endDateStr) {
      postWhere.start_at = {};
      if (startDateStr) postWhere.start_at.gte = new Date(`${startDateStr}T00:00:00`);
      if (endDateStr) postWhere.start_at.lte = new Date(`${endDateStr}T23:59:59`);
    }

    // Step 1: Fetch posts in date range, sorted by start_at
    const posts = await db.post.findMany({
      where: postWhere,
      orderBy: { start_at: 'asc' },
      select: { id: true, start_at: true },
    });

    // Helper: UTC+7
    const getVietnamDay = (date: Date) => {
      const d = new Date(date.getTime() + 7 * 60 * 60 * 1000);
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    };

    // Step 2: Extract unique days and group posts by day
    const dayMap = new Map<string, { date: Date; posts: { id: string; start_at: Date }[] }>();
    for (const post of posts) {
      const key = getVietnamDay(post.start_at);
      if (!dayMap.has(key)) {
        const d = new Date(post.start_at.getTime() + 7 * 60 * 60 * 1000);
        dayMap.set(key, { date: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), posts: [] });
      }
      dayMap.get(key)!.posts.push(post);
    }

    // Sorted unique days
    const days = Array.from(dayMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    const totalPosts = posts.length;

    // Build set of all post IDs for querying checkins
    const postIds = posts.map((p) => p.id);

    // Step 3: Fetch all users
    const users = await db.user.findMany({
      where: { role: { in: ['USER', 'ADMIN'] }, is_active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, department: true },
    });

    // Step 4: Fetch checkins for all these posts
    const checkins = await db.checkin.findMany({
      where: {
        post_id: { in: postIds },
      },
      select: {
        id: true,
        user_id: true,
        post_id: true,
        submitted_at: true,
        status: true,
      },
    });

    // Build lookup: userId -> Map<postId, checkin>
    const checkinByUser = new Map<string, Map<string, typeof checkins[0]>>();
    for (const c of checkins) {
      if (!checkinByUser.has(c.user_id)) {
        checkinByUser.set(c.user_id, new Map());
      }
      checkinByUser.get(c.user_id)!.set(c.post_id, c);
    }

    // Step 5: Build matrix data
    // For each user, for each day, compute display value and style
    type CellData = {
      value: string;
      bgColor: string;   // ARGB
      fontColor: string; // ARGB
    };

    const matrix: { user: typeof users[0]; cells: CellData[]; score: number }[] = [];

    for (const user of users) {
      const userCheckins = checkinByUser.get(user.id) || new Map();
      const cells: CellData[] = [];
      let oCount = 0;
      let halfCount = 0;

      for (const day of days) {
        const dayPosts = day.posts;
        const postCount = dayPosts.length;
        
        // Find approved checkins for this day's posts
        const approvedCheckins = Array.from(userCheckins.values()).filter(c => 
          dayPosts.some(p => p.id === c.post_id) && 
          (c.status === "APPROVED" || c.status === "AUTO_APPROVED" || c.status === "AUTO_VERIFIED")
        );

        if (postCount === 1) {
          const post = dayPosts[0];
          const checkin = userCheckins.get(post.id);

          if (approvedCheckins.length === 1) {
            // It's approved. Let's check if it was late
            const deadline = new Date(post.start_at.getTime() + 24 * 60 * 60 * 1000);
            const submitted = new Date(checkin!.submitted_at);
            if (submitted <= deadline) {
              cells.push({ value: 'X', bgColor: 'FFFFFFFF', fontColor: 'FF000000' });
            } else {
              cells.push({ value: 'O', bgColor: 'FFFFC7CE', fontColor: 'FF9C0006' }); // LATE
            }
          } else if (checkin && checkin.status === 'REJECTED') {
            cells.push({ value: 'O', bgColor: 'FFFFC7CE', fontColor: 'FF9C0006' }); // REJECTED -> Pink
          } else if (checkin) {
            // PENDING or other. Check if late
            const deadline = new Date(post.start_at.getTime() + 24 * 60 * 60 * 1000);
            const submitted = new Date(checkin.submitted_at);
            if (submitted > deadline) {
              cells.push({ value: 'O', bgColor: 'FFFFC7CE', fontColor: 'FF9C0006' }); // LATE
            } else {
              cells.push({ value: 'O', bgColor: 'FFFFFFFF', fontColor: 'FF000000' }); // Pending but not late yet
            }
          } else {
            cells.push({ value: 'O', bgColor: 'FFFFFFFF', fontColor: 'FF000000' }); // Not submitted
          }
        } else {
          // 2+ posts in a day
          if (approvedCheckins.length === 2) {
            cells.push({ value: 'X', bgColor: 'FFFFFFFF', fontColor: 'FF000000' });
          } else if (approvedCheckins.length === 1) {
            cells.push({ value: '1/2', bgColor: 'FFFFFFFF', fontColor: 'FF000000' });
          } else {
            // Check if any checkin is rejected or late
            const hasLateOrRejected = Array.from(userCheckins.values()).some(c => {
              if (!dayPosts.some(p => p.id === c.post_id)) return false;
              if (c.status === 'REJECTED') return true;
              const p = dayPosts.find(p => p.id === c.post_id);
              if (p && new Date(c.submitted_at).getTime() > p.start_at.getTime() + 24 * 60 * 60 * 1000) return true;
              return false;
            });
            if (hasLateOrRejected) {
              cells.push({ value: 'O', bgColor: 'FFFFC7CE', fontColor: 'FF9C0006' });
            } else {
              cells.push({ value: 'O', bgColor: 'FFFFFFFF', fontColor: 'FF000000' });
            }
          }
        }
      }

      matrix.push({ user, cells, score: 0 }); // Score is calculated via formula
    }

    // ---- Build Excel workbook ----
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Thống Kê Like Share');

    const numDays = days.length;
    const lastDataCol = numDays + 1;
    const dataStartRow = 3;
    const dataEndRow = dataStartRow + matrix.length - 1;

    // Column widths
    ws.getColumn(1).width = 22; // Name column
    for (let i = 0; i < numDays; i++) {
      ws.getColumn(i + 2).width = 7;
    }
    ws.getColumn(lastDataCol + 1).width = 14; // Score column

    // ---- Row 1: Title ----
    const titleRow = ws.addRow([]);
    ws.mergeCells(1, 1, 1, lastDataCol + 1);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = 'THỐNG KÊ LIKE SHARE BÀI';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 32;

    // ---- Row 2: Header ----
    const headerRow = ws.addRow([]);
    headerRow.height = 28;

    // A2: Month label
    const monthLabel = startDateStr
      ? `Tháng ${new Date(startDateStr).getMonth() + 1}`
      : 'Tháng';
    const a2 = ws.getCell(2, 1);
    a2.value = monthLabel;
    a2.font = { bold: true, size: 11 };
    a2.alignment = { vertical: 'middle', horizontal: 'center' };
    a2.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };

    // Day header cells (B2, C2, ...)
    for (let i = 0; i < numDays; i++) {
      const col = i + 2;
      const cell = ws.getCell(2, col);
      const dayNum = days[i].date.getDate();
      const postCount = days[i].posts.length;

      cell.value = `${dayNum}`;
      cell.font = { bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };

      if (postCount >= 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      }
    }

    // Last header: MAX
    const maxCol = lastDataCol + 1;
    const maxCell = ws.getCell(2, maxCol);
    maxCell.value = `MAX. ${totalPosts}`;
    maxCell.font = { bold: true, size: 11 };
    maxCell.alignment = { vertical: 'middle', horizontal: 'center' };
    maxCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };

    // ---- Data rows ----
    for (let r = 0; r < matrix.length; r++) {
      const rowData = matrix[r];
      const rowNum = dataStartRow + r;
      const row = ws.addRow([]);
      row.height = 22;

      // Name cell
      const nameCell = ws.getCell(rowNum, 1);
      nameCell.value = getShortName(rowData.user.name || 'Unknown');
      nameCell.font = { size: 10 };
      nameCell.alignment = { vertical: 'middle', horizontal: 'left' };
      nameCell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };

      // Day cells
      for (let d = 0; d < numDays; d++) {
        const col = d + 2;
        const cell = ws.getCell(rowNum, col);
        const cd = rowData.cells[d];

        cell.value = cd.value;
        cell.font = { size: 10, bold: cd.value === 'O', color: { argb: cd.fontColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cd.bgColor } };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
      }

      // Score cell
      const scoreCell = ws.getCell(rowNum, maxCol);
      scoreCell.value = { formula: generateScoreFormula(rowNum, 2, lastDataCol) };
      scoreCell.font = { bold: true, size: 10 };
      scoreCell.alignment = { vertical: 'middle', horizontal: 'center' };
      scoreCell.numFmt = '0.0';
      scoreCell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    }

    // ---- Legend section ----
    const legendStartRow = dataEndRow + 3;

    // "Note:" label
    const noteLabelCell = ws.getCell(legendStartRow, 1);
    noteLabelCell.value = 'Note:';
    noteLabelCell.font = { bold: true, size: 10 };

    // Legend row 1: Orange → both pages
    const lr1 = legendStartRow + 1;
    ws.getCell(lr1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    ws.getCell(lr1, 1).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    ws.getCell(lr1, 2).value = '> Cả 2 Page Đăng bài';
    ws.getCell(lr1, 2).font = { size: 10 };
    ws.mergeCells(lr1, 2, lr1, 4);

    // Legend row 2: Yellow → Song Phuong Tech
    const lr2 = lr1 + 1;
    ws.getCell(lr2, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    ws.getCell(lr2, 1).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    ws.getCell(lr2, 2).value = '> Song Phương Tech';
    ws.getCell(lr2, 2).font = { size: 10 };
    ws.mergeCells(lr2, 2, lr2, 4);

    // Legend row 3: Red → late >24h
    const lr3 = lr2 + 1;
    ws.getCell(lr3, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    ws.getCell(lr3, 1).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    ws.getCell(lr3, 2).value = '> Share muộn hơn 24h kể từ lúc đăng bài';
    ws.getCell(lr3, 2).font = { size: 10 };
    ws.mergeCells(lr3, 2, lr3, 6);

    // ---- Generate and return ----
    const buffer = await workbook.xlsx.writeBuffer();

    const monthPart = startDateStr
      ? `Thang ${new Date(startDateStr).getMonth() + 1}-${new Date(startDateStr).getFullYear()}`
      : 'All';
    const fileName = `${monthPart} - Thong Ke Like Share.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    console.error('Export Excel Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xuất file Excel.' }, { status: 500 });
  }
}
