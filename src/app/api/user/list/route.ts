import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.user.findMany({
      where: {
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar_url: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("GET User List Error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy danh sách nhân viên." },
      { status: 500 }
    );
  }
}
