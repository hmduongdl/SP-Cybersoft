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

    // 1. Kiểm tra tài khoản đã liên kết Facebook chưa
    const fbAccount = await db.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "facebook",
      },
    });

    if (!fbAccount) {
      return NextResponse.json(
        { success: false, message: "Vui lòng liên kết tài khoản Facebook trước khi sử dụng tính năng auto check-in." },
        { status: 400 }
      );
    }

    // 2. Tìm kiếm bài viết
    const post = await db.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bài viết yêu cầu." },
        { status: 404 }
      );
    }

    // 3. Ràng buộc thời gian 24h
    const serverTime = new Date();
    const postTime = new Date(post.scheduledAt);
    const deadline = new Date(postTime.getTime() + 24 * 60 * 60 * 1000);

    if (serverTime > deadline) {
      return NextResponse.json(
        { success: false, message: "Quá thời hạn 24 giờ quy định để tự động check-in bài viết này." },
        { status: 400 }
      );
    }

    // 4. Kiểm tra trùng lặp & Ghi nhận DB qua Prisma Transaction
    try {
      const checkin = await db.$transaction(async (tx) => {
        const existing = await tx.checkin.findUnique({
          where: {
            userId_postId: {
              userId: session.user.id,
              postId: postId,
            },
          },
        });

        if (existing) {
          throw new Error("DUPLICATE_SUBMISSION");
        }

        return tx.checkin.create({
          data: {
            userId: session.user.id,
            postId: postId,
            status: "AUTO_APPROVED",
            evidenceType: "AUTO_FB",
            evidenceUrl: "FACEBOOK_AUTO_CHECK",
            image_url: "FACEBOOK_AUTO_CHECK",
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
