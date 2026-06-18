import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch users and their checkins
    const users = await db.user.findMany({
      where: { role: { in: ['USER', 'ADMIN'] }, is_active: true },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        checkins: {
          where: {
            status: { in: ['APPROVED', 'AUTO_APPROVED'] }
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Determine the total expected posts (posts that have passed their 24h deadline)
    const allPosts = await db.post.findMany({
      select: { id: true, start_at: true },
    });
    const now = new Date();
    const totalExpectedPosts = allPosts.filter(p => {
      const deadline = new Date(p.start_at.getTime() + 24 * 60 * 60 * 1000);
      return now > deadline;
    }).length;

    // Build data rows
    let rowIndex = 0;
    const exportData = users.map((u) => {
      const completed = u.checkins.length;
      const missed = Math.max(0, totalExpectedPosts - completed);
      const rate = totalExpectedPosts === 0 ? 0 : (completed / totalExpectedPosts);

      let autoCount = 0;
      let manualCount = 0;
      u.checkins.forEach(s => {
        if (s.status === 'AUTO_APPROVED') autoCount++;
        else if (s.status === 'APPROVED') manualCount++;
      });
      const mainMethod = u.checkins.length === 0 ? "Chưa tham gia" : (autoCount >= manualCount ? "Tự Động" : "Thủ Công");

      rowIndex++;

      return {
        stt: rowIndex,
        empId: `NV${u.id.substring(u.id.length - 4).toUpperCase()}`,
        name: u.name || 'Unknown',
        department: u.department || "Không",
        rate: rate,
        completed,
        missed,
        mainMethod
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo Cáo Hiệu Suất');

    // Row 1: Main Title
    const titleRow = worksheet.addRow(["BÁO CÁO HIỆU SUẤT TRUYỀN THÔNG NỘI BỘ (LIKE & SHARE FACEBOOK)"]);
    worksheet.mergeCells('A1:H1');
    titleRow.height = 40;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Dark slate blue

    // Row 2: Subtitle / Metadata
    const exportTimeStr = `Thời gian xuất: ${format(now, 'dd/MM/yyyy HH:mm:ss')}`;
    const exporterStr = `Người xuất: ${session.user.name || session.user.email || 'Admin'}`;
    const subtitleRow = worksheet.addRow([exportTimeStr, "", "", "", "", "", exporterStr, ""]);
    worksheet.mergeCells('A2:F2');
    worksheet.mergeCells('G2:H2');
    subtitleRow.getCell(1).font = { italic: true, color: { argb: 'FF475569' } };
    subtitleRow.getCell(7).font = { italic: true, color: { argb: 'FF475569' } };
    subtitleRow.getCell(7).alignment = { horizontal: 'right' };

    // Row 3: Empty spacing
    worksheet.addRow([]);

    // Row 4: Headers
    const headers = ["STT", "Mã Nhân Viên", "Họ và Tên", "Phòng Ban", "Tỷ Lệ Hoàn Thành (%)", "Số Bài Đã Share", "Số Bài Bỏ Lỡ", "Phương Thức Chủ Đạo"];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF334155' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Enable Auto-Filter on Row 4
    worksheet.autoFilter = 'A4:H4';

    // Data Rows
    exportData.forEach((row, index) => {
      const dataRow = worksheet.addRow([
        row.stt,
        row.empId,
        row.name,
        row.department,
        row.rate,
        row.completed,
        row.missed,
        row.mainMethod
      ]);

      // Format Percentage
      dataRow.getCell(5).numFmt = '0.0%';

      // Zebra Striping
      if (index % 2 !== 0) {
        dataRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      }

      // Cell formatting
      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
        // Center alignment for STT, Code, Numbers, and Rate
        if ([1, 2, 5, 6, 7].includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    // Auto-fit Column Widths
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      if (column.eachCell) {
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
      }
      // Add padding to max length
      column.width = Math.min(Math.max(maxLength + 2, 15), 50);
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Setup dynamic filename
    const fileName = `${format(now, 'MM.dd.yyyy')} - Báo Cáo Công Việc Like Share.xlsx`;

    // Return response as Blob stream
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });

  } catch (error: any) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
