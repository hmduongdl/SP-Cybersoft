import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Use a transaction to prevent race conditions
    const user = await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id },
        select: { id: true, name: true, hope_stars: true },
      });

      if (!existing) {
        throw new Error("Không tìm thấy nhân viên.");
      }

      return tx.user.update({
        where: { id },
        data: { hope_stars: { increment: 1 } },
        select: {
          id: true,
          name: true,
          hope_stars: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Đã cộng 1 Ngôi sao hy vọng cho ${user.name}. Tổng sao hiện tại: ${user.hope_stars}.`,
      user,
    });
  } catch (error: any) {
    console.error("Add Hope Star Error:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi khi cộng sao." },
      { status: 500 }
    );
  }
}
