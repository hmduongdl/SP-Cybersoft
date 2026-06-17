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
        department: true,
        avatar_url: true,
        facebook_profile_url: true,
      },
    });

    console.log("GET Profile — Dữ liệu từ database:", {
      id: user?.id,
      username: user?.username,
      name: user?.name,
      email: user?.email,
      department: user?.department,
      avatar_url: user?.avatar_url,
      facebook_profile_url: user?.facebook_profile_url,
    });

    let mappedUser = null;
    if (user) {
      mappedUser = {
        ...user,
        facebook_link: user.facebook_profile_url,
      };
    }

    return NextResponse.json({ user: mappedUser });
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
    const email = typeof body.email === "string" ? body.email.trim() : undefined;
    const facebook_link = typeof body.facebook_link === "string" ? body.facebook_link.trim() : undefined;
    const avatar_url = typeof body.avatar_url === "string" ? body.avatar_url.trim() : undefined;

    console.log("📥 PUT — Dữ liệu nhận từ client:", {
      email,
      facebook_link,
      avatar_url,
    });

    const updateData: Record<string, unknown> = {};

    if (email !== undefined) {
      if (!email) {
        return NextResponse.json(
          { error: "Email là bắt buộc." },
          { status: 400 }
        );
      }
      updateData.email = email;
    }

    if (facebook_link !== undefined) {
      updateData.facebook_profile_url = facebook_link || null;
    }

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url || null;
    }

    const [user] = await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          department: true,
          avatar_url: true,
          facebook_profile_url: true,
        },
      }),
    ]);

    console.log("Cập nhật DB thành công cho User:", {
      id: user.id,
      email: user.email,
      facebook_profile_url: user.facebook_profile_url,
    });

    const mappedUser = {
      ...user,
      facebook_link: user.facebook_profile_url,
    };

    return NextResponse.json({ success: true, user: mappedUser });
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
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        department: true,
        avatar_url: true,
        facebook_profile_url: true,
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
