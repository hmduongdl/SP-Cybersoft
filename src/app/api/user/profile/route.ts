import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/upload";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        gmail: true,
        department: true,
        avatar_url: true,
      },
    });

    console.log("GET Profile — Dữ liệu từ database:", {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      gmail: user?.gmail,
      department: user?.department,
      avatar_url: user?.avatar_url,
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("GET Profile Error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy thông tin cá nhân." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const department = typeof body.department === "string" ? body.department.trim() : "";
    const avatar_url = typeof body.avatar_url === "string" ? body.avatar_url.trim() : undefined;
    const gmail = typeof body.gmail === "string" ? body.gmail.trim() : undefined;

    console.log("📥 PUT — Dữ liệu nhận từ client:", {
      name,
      department,
      avatar_url,
      gmail,
    });

    if (!name || !department) {
      return NextResponse.json(
        { error: "Tên và phòng ban là bắt buộc." },
        { status: 400 }
      );
    }

    const updateData: { name: string; department: string; avatar_url?: string | null; gmail?: string | null } = {
      name,
      department,
    };

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url || null;
    }

    if (gmail !== undefined) {
      updateData.gmail = gmail || null;
    }

    const [user] = await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data: updateData,
      }),
    ]);

    console.log("Cập nhật DB thành công cho User:", {
      id: user.id,
      name: user.name,
      department: user.department,
      avatar_url: user.avatar_url,
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật thông tin." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy tệp tin ảnh." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name ? "." + file.name.split(".").pop()?.toLowerCase() : ".jpg";
    const filename = `avatar_${session.user.id}_${Date.now()}${ext}`;
    const uploadResult = await uploadImage(buffer, filename, file.type, "avatars");

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        avatar_url: uploadResult.url,
      },
    });

    return NextResponse.json({
      success: true,
      avatar_url: uploadResult.url,
      user,
    });
  } catch (error: any) {
    console.error("Upload Avatar Error:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi khi tải ảnh đại diện lên." },
      { status: 500 }
    );
  }
}
