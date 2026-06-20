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
      select: { id: true, start_at: true, allow_late_submit: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bài viết yêu cầu." },
        { status: 404 }
      );
    }

    // 2. Ràng buộc thời gian 24h — bỏ qua nếu Admin đã mở khóa nộp bù
    const serverTime = new Date();
    const postTime = new Date(post.start_at);
    const deadline = new Date(postTime.getTime() + 24 * 60 * 60 * 1000);

    if (serverTime > deadline && !post.allow_late_submit) {
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

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date"); // YYYY-MM-DD
    if (!dateStr) {
      return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });
    }

    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // Find checkins for posts scheduled on this day
    const checkins = await db.checkin.findMany({
      where: {
        status: { in: ["APPROVED", "AUTO_APPROVED"] },
        post: {
          start_at: {
            gte: startOfDay,
            lte: endOfDay,
          }
        }
      },
      select: {
        user: {
          select: {
            name: true,
            avatar_url: true,
          }
        }
      }
    });

    const colleagues = checkins.map(c => ({
      name: c.user.name || "Unknown",
      avatar_url: c.user.avatar_url,
    }));

    // Return unique list of colleagues
    const uniqueColleagues = Array.from(new Map(colleagues.map(item => [item.name, item])).values());

    return NextResponse.json({ colleagues: uniqueColleagues });
  } catch (error: any) {
    console.error("GET Auto-Check Submissions Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
