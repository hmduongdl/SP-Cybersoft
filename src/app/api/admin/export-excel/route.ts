import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    let postWhereClause: any = {};
    if (startDateStr || endDateStr) {
      postWhereClause.scheduledAt = {};
      if (startDateStr) {
        postWhereClause.scheduledAt.gte = new Date(`${startDateStr}T00:00:00`);
      }
      if (endDateStr) {
        postWhereClause.scheduledAt.lte = new Date(`${endDateStr}T23:59:59`);
      }
    }

    // Fetch all active users
    const users = await db.user.findMany({
      where: { role: 'USER', active: true },
      include: {
        checkins: {
          where: {
            status: { in: ['APPROVED', 'AUTO_APPROVED'] },
            post: postWhereClause // Filter checkins within date range
          },
          include: {
            post: true
          }
        }
      }
    });

    // Fetch posts within date range to compute total expected posts
    const posts = await db.post.findMany({
      where: postWhereClause
    });
    const totalExpectedPosts = posts.length;

    // Build data rows
    const departments = ["Marketing", "Tech", "HR", "Sales"];
    const exportData = users.map((u, index) => {
      const completed = u.checkins.length;
      const rate = totalExpectedPosts === 0 ? 0 : (completed / totalExpectedPosts);

      let autoCount = 0;
      let manualCount = 0;
      u.checkins.forEach(c => {
        if (c.status === 'AUTO_APPROVED') autoCount++;
        else if (c.status === 'APPROVED') manualCount++;
      });

      return {
        stt: index + 1,
        empId: `NV${u.id.substring(u.id.length - 4).toUpperCase()}`,
        name: u.name || 'Unknown',
        department: u.department || departments[index % departments.length],
        expected: totalExpectedPosts,
        completed,
        rate,
        autoCount,
        manualCount,
        note: completed === totalExpectedPosts && totalExpectedPosts > 0 
          ? "Đạt chỉ tiêu" 
          : (completed === 0 ? "Chưa hoàn thành" : "Hoàn thành một phần")
      };
    });

    // Build Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo Cáo Like Share');

    // Row 1: Large Main Title
    const titleRow = worksheet.addRow(["BÁO CÁO CÔNG VIỆC THỰC HIỆN LIKE & SHARE BÀI VIẾT"]);
    worksheet.mergeCells('A1:J1');
    titleRow.height = 40;
    
    // Navy Blue style for main title
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.getCell(1).fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: 'FF1E3A8A' } // Navy Blue
    };

    // Row 2: Subtitle with Date Range & Export Meta
    const now = new Date();
    const dateRangeStr = (startDateStr || endDateStr) 
      ? `Khoảng thời gian: ${startDateStr || 'Tất cả'} - ${endDateStr || 'Tất cả'}` 
      : 'Khoảng thời gian: Toàn bộ thời gian';
    const exportTimeStr = `Ngày xuất: ${format(now, 'dd/MM/yyyy HH:mm:ss')}`;
    
    const subtitleRow = worksheet.addRow([dateRangeStr, "", "", "", "", "", "", "", exportTimeStr, ""]);
    worksheet.mergeCells('A2:H2');
    worksheet.mergeCells('I2:J2');
    subtitleRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF475569' } };
    subtitleRow.getCell(9).font = { italic: true, size: 9, color: { argb: 'FF475569' } };
    subtitleRow.getCell(9).alignment = { horizontal: 'right' };

    // Row 3: Space Row
    worksheet.addRow([]);

    // Row 4: Table Headers
    const headers = [
      "STT", 
      "Mã Nhân Viên", 
      "Họ và Tên", 
      "Phòng Ban", 
      "Tổng số bài cần share", 
      "Số bài đã share", 
      "Tỷ lệ hoàn thành (%)", 
      "Số bài tự động duyệt (Auto Approved)", 
      "Số bài duyệt thủ công", 
      "Ghi chú"
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 28;
    
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      cell.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: 'FF1E3A8A' } // Navy Blue background
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    });

    // Row 5+: Data Rows
    exportData.forEach((row, idx) => {
      const dataRow = worksheet.addRow([
        row.stt,
        row.empId,
        row.name,
        row.department,
        row.expected,
        row.completed,
        row.rate,
        row.autoCount,
        row.manualCount,
        row.note
      ]);
      dataRow.height = 22;

      // Formatting
      dataRow.getCell(7).numFmt = '0.0%';

      // Zebra striping
      const isOdd = idx % 2 !== 0;
      dataRow.eachCell((cell, colNum) => {
        cell.font = { size: 9, color: { argb: 'FF1E293B' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        
        if (isOdd) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' } // Light slate blue zebra tint
          };
        }

        // Alignments
        if ([1, 2, 5, 6, 7, 8, 9].includes(colNum)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    // Auto-fit column widths
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      if (column.eachCell) {
        column.eachCell({ includeEmpty: true }, (cell) => {
          const val = cell.value ? cell.value.toString() : "";
          if (val.length > maxLength) {
            maxLength = val.length;
          }
        });
      }
      column.width = Math.min(Math.max(maxLength + 3, 12), 40);
    });

    // Generate output buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Filename formatting: [MM].[DD].[YYYY] - Bao Cao Cong Viec Like Share.xlsx
    const fileName = `${format(now, 'MM.dd.yyyy')} - Bao Cao Cong Viec Like Share.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });

  } catch (error: any) {
    console.error("Export Excel Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi xuất file Excel." }, { status: 500 });
  }
}
