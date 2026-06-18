import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate') || searchParams.get('start_date');
    const endDateStr = searchParams.get('endDate') || searchParams.get('end_date');

    // Build date filter
    let postWhere: any = {};
    if (startDateStr || endDateStr) {
      postWhere.start_at = {};
      if (startDateStr) postWhere.start_at.gte = new Date(`${startDateStr}T00:00:00`);
      if (endDateStr) postWhere.start_at.lte = new Date(`${endDateStr}T23:59:59`);
    }

    // Fetch current user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, department: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch posts in date range
    const posts = await db.post.findMany({
      where: postWhere,
      orderBy: { start_at: 'asc' },
      select: { id: true, start_at: true },
    });

    // Group posts by day
    const dayMap = new Map<string, { date: Date; posts: { id: string; start_at: Date }[] }>();
    for (const post of posts) {
      const d = new Date(post.start_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!dayMap.has(key)) {
        dayMap.set(key, { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), posts: [] });
      }
      dayMap.get(key)!.posts.push(post);
    }

    const days = Array.from(dayMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    const totalPosts = posts.length;
    const postIds = posts.map((p) => p.id);

    // Fetch only this user's checkins
    const checkins = await db.checkin.findMany({
      where: {
        user_id: userId,
        post_id: { in: postIds },
        status: { in: ['APPROVED', 'AUTO_APPROVED'] },
      },
      select: {
        id: true,
        post_id: true,
        submitted_at: true,
      },
    });

    // Build postId -> checkin lookup
    const checkinByPost = new Map<string, typeof checkins[0]>();
    for (const c of checkins) {
      checkinByPost.set(c.post_id, c);
    }

    // Build cell data per day
    type CellData = { value: string; bgColor: string; fontColor: string };
    const cells: CellData[] = [];
    let oCount = 0;
    let halfCount = 0;

    for (const day of days) {
      const dayPosts = day.posts;
      const postCount = dayPosts.length;

      if (postCount === 1) {
        const post = dayPosts[0];
        const checkin = checkinByPost.get(post.id);

        if (checkin) {
          const deadline = new Date(post.start_at.getTime() + 24 * 60 * 60 * 1000);
          if (new Date(checkin.submitted_at) <= deadline) {
            cells.push({ value: 'O', bgColor: 'FFFFFFFF', fontColor: 'FF000000' });
            oCount++;
          } else {
            cells.push({ value: 'X', bgColor: 'FFFFC7CE', fontColor: 'FF9C0006' });
          }
        } else {
          cells.push({ value: 'X', bgColor: 'FFFFFFFF', fontColor: 'FF000000' });
        }
      } else {
        let onTime = 0;
        let late = 0;
        for (const post of dayPosts) {
          const checkin = checkinByPost.get(post.id);
          if (checkin) {
            const deadline = new Date(post.start_at.getTime() + 24 * 60 * 60 * 1000);
            if (new Date(checkin.submitted_at) <= deadline) {
              onTime++;
            } else {
              late++;
            }
          }
        }

        const submitted = onTime + late;
        if (submitted === postCount && late === 0) {
          cells.push({ value: 'O', bgColor: 'FFFFFFFF', fontColor: 'FF000000' });
          oCount++;
        } else if (onTime >= 1 && late === 0) {
          cells.push({ value: `${onTime}/${postCount}`, bgColor: 'FFFFFFFF', fontColor: 'FF000000' });
          halfCount++;
        } else if (submitted === 0) {
          cells.push({ value: 'X', bgColor: 'FFFFFFFF', fontColor: 'FF000000' });
        } else {
          cells.push({ value: 'X', bgColor: 'FFFFC7CE', fontColor: 'FF9C0006' });
        }
      }
    }

    const score = oCount * 1 + halfCount * 0.5;

    // ---- Build Excel workbook ----
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Báo Cáo Cá Nhân');

    const numDays = days.length;
    const lastDataCol = numDays + 1; // name + days
    const maxCol = lastDataCol + 1;  // score column

    // Column widths
    ws.getColumn(1).width = 22;
    for (let i = 0; i < numDays; i++) {
      ws.getColumn(i + 2).width = 7;
    }
    ws.getColumn(maxCol).width = 14;

    // ---- Row 1: Title ----
    ws.mergeCells(1, 1, 1, maxCol);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = 'THỐNG KÊ LIKE SHARE BÀI';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 32;

    // ---- Row 2: Header ----
    ws.getRow(2).height = 28;

    const monthLabel = startDateStr
      ? `Tháng ${new Date(startDateStr).getMonth() + 1}`
      : 'Tháng';
    const a2 = ws.getCell(2, 1);
    a2.value = monthLabel;
    a2.font = { bold: true, size: 11 };
    a2.alignment = { vertical: 'middle', horizontal: 'center' };
    a2.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

    for (let i = 0; i < numDays; i++) {
      const cell = ws.getCell(2, i + 2);
      cell.value = `${days[i].date.getDate()}`;
      cell.font = { bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: days[i].posts.length >= 2 ? 'FFFFC000' : 'FFFFFF00' },
      };
    }

    const maxCell = ws.getCell(2, maxCol);
    maxCell.value = `MAX. ${totalPosts}`;
    maxCell.font = { bold: true, size: 11 };
    maxCell.alignment = { vertical: 'middle', horizontal: 'center' };
    maxCell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

    // ---- Row 3: Data (single user) ----
    const dataRow = ws.getRow(3);
    dataRow.height = 22;

    const nameCell = ws.getCell(3, 1);
    nameCell.value = user.name || 'Unknown';
    nameCell.font = { size: 10 };
    nameCell.alignment = { vertical: 'middle', horizontal: 'left' };
    nameCell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

    for (let d = 0; d < numDays; d++) {
      const cell = ws.getCell(3, d + 2);
      const cd = cells[d];
      cell.value = cd.value;
      cell.font = { size: 10, bold: cd.value === 'O', color: { argb: cd.fontColor } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cd.bgColor } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }

    const scoreCell = ws.getCell(3, maxCol);
    scoreCell.value = score;
    scoreCell.font = { bold: true, size: 10 };
    scoreCell.alignment = { vertical: 'middle', horizontal: 'center' };
    scoreCell.numFmt = '0.0';
    scoreCell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

    // ---- Legend ----
    const legendStartRow = 6;

    ws.getCell(legendStartRow, 1).value = 'Note:';
    ws.getCell(legendStartRow, 1).font = { bold: true, size: 10 };

    const lr1 = legendStartRow + 1;
    ws.getCell(lr1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    ws.getCell(lr1, 1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    ws.getCell(lr1, 2).value = '> Cả 2 Page Đăng bài';
    ws.getCell(lr1, 2).font = { size: 10 };
    ws.mergeCells(lr1, 2, lr1, 4);

    const lr2 = lr1 + 1;
    ws.getCell(lr2, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    ws.getCell(lr2, 1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    ws.getCell(lr2, 2).value = '> Song Phương Tech';
    ws.getCell(lr2, 2).font = { size: 10 };
    ws.mergeCells(lr2, 2, lr2, 4);

    const lr3 = lr2 + 1;
    ws.getCell(lr3, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    ws.getCell(lr3, 1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    ws.getCell(lr3, 2).value = '> Share muộn hơn 24h kể từ lúc đăng bài';
    ws.getCell(lr3, 2).font = { size: 10 };
    ws.mergeCells(lr3, 2, lr3, 6);

    // ---- Output ----
    const buffer = await workbook.xlsx.writeBuffer();

    const monthPart = startDateStr
      ? `Thang ${new Date(startDateStr).getMonth() + 1}-${new Date(startDateStr).getFullYear()}`
      : 'All';
    const namePart = (user.name || 'User').replace(/\s+/g, '_');
    const fileName = `${namePart} - ${monthPart} - Bao Cao.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    console.error('Personal Export Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xuất file Excel.' }, { status: 500 });
  }
}
