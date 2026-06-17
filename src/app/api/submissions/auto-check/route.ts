import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập để thực hiện hành động này." },
        { status: 401 }
      );
    }

    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin postId." },
        { status: 400 }
      );
    }

    // 1. Tìm kiếm bài viết
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, start_at: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bài viết yêu cầu." },
        { status: 404 }
      );
    }

    // 2. Ràng buộc thời gian 24h
    const serverTime = new Date();
    const postTime = new Date(post.start_at);
    const deadline = new Date(postTime.getTime() + 24 * 60 * 60 * 1000);

    if (serverTime > deadline) {
      return NextResponse.json(
        { success: false, message: "Quá thời hạn 24 giờ quy định để tự động check-in bài viết này." },
        { status: 400 }
      );
    }

    // 3. Kiểm tra trùng lặp & Ghi nhận DB qua Prisma Transaction
    try {
      const checkin = await db.$transaction(async (tx) => {
        const existing = await tx.checkin.findFirst({
          where: {
            user_id: session.user.id,
            post_id: postId,
          },
          select: { id: true },
        });

        if (existing) {
          throw new Error("DUPLICATE_SUBMISSION");
        }

        return tx.checkin.create({
          data: {
            user_id: session.user.id,
            post_id: postId,
            status: "AUTO_APPROVED",
            image_url: "AUTO_CHECKIN",
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Tự động xác minh chia sẻ thành công.",
        data: checkin,
      });
    } catch (txError: any) {
      if (txError.message === "DUPLICATE_SUBMISSION") {
        return NextResponse.json(
          { success: false, message: "Bạn đã nộp minh chứng cho bài viết này rồi." },
          { status: 400 }
        );
      }
      throw txError;
    }

  } catch (error: any) {
    console.error("Auto check error:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi nội bộ trên máy chủ." },
      { status: 500 }
    );
  }
}
