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
        username_changed: true,
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
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const department = typeof body.department === "string" ? body.department.trim() : undefined;
    const username = typeof body.username === "string" ? body.username.trim() : undefined;

    console.log("📥 PUT — Dữ liệu nhận từ client:", {
      email,
      facebook_link,
      name,
      department,
      username,
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

    if (name !== undefined) {
      if (!name) return NextResponse.json({ error: "Tên là bắt buộc." }, { status: 400 });
      updateData.name = name;
    }

    if (department !== undefined) {
      updateData.department = department;
    }

    if (facebook_link !== undefined) {
      updateData.facebook_profile_url = facebook_link || null;
    }

    if (username !== undefined) {
      if (!username) return NextResponse.json({ error: "Username không được để trống." }, { status: 400 });
      if (username.includes(" ")) return NextResponse.json({ error: "Username không được chứa khoảng trắng." }, { status: 400 });
      
      const currentUser = await db.user.findUnique({ where: { id: session.user.id }, select: { username: true, username_changed: true } });
      if (currentUser?.username !== username) {
        if (currentUser?.username_changed) {
          return NextResponse.json({ error: "Bạn chỉ được đổi username 1 lần duy nhất." }, { status: 400 });
        }
        updateData.username = username;
        updateData.username_changed = true;
      }
    }

    const [user] = await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
          id: true,
          username: true,
          username_changed: true,
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
    if (error?.code === "P2002") {
      if (error?.meta?.target?.includes("username")) {
        return NextResponse.json({ error: "Username này đã có người sử dụng." }, { status: 409 });
      }
      return NextResponse.json({ error: "Email hoặc dữ liệu này đã bị trùng." }, { status: 409 });
    }
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
