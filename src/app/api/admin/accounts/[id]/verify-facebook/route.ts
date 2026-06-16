import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { facebook_verified } = await request.json();

    const user = await db.user.update({
      where: { id },
      data: { facebook_verified },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Verify Facebook Error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật trạng thái xác thực Facebook." },
      { status: 500 }
    );
  }
}
