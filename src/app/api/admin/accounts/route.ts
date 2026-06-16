import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// ─── Shared select shape ───────────────────────────────────────────────────────

const USER_SELECT = {
  id:            true,
  username:      true,
  name:          true,
  email:         true,
  role:          true,
  department:    true,
  avatar_url:    true,
  hope_stars:    true,
  used_stars_this_month: true,
  is_first_login: true,
  is_active:     true,
  facebook_profile_url: true,
} as const;

function toUserResponse(u: Record<string, any>) {
  return {
    ...u,
    is_onboarded: !u.is_first_login,
    facebook_link: u.facebook_profile_url ?? null,
  };
}

// ─── GET: List all accounts ────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.user.findMany({
      orderBy: { name: "asc" },
      select: USER_SELECT,
    });

    return NextResponse.json({ users: users.map(toUserResponse) });
  } catch (error: any) {
    console.error("GET Accounts Error:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi khi lấy danh sách tài khoản." },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new account ────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, name, email, password, role, department, avatar_url, is_active } =
      await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ email và mật khẩu." },
        { status: 400 }
      );
    }

    const trimmedEmail    = email.trim().toLowerCase();
    const trimmedUsername = (username || trimmedEmail.split("@")[0]).trim().toLowerCase();

    // Kiểm tra trùng username
    const existingByUsername = await db.user.findUnique({
      where: { username: trimmedUsername },
    });
    if (existingByUsername) {
      return NextResponse.json(
        { error: "Tên đăng nhập này đã được sử dụng." },
        { status: 409 }
      );
    }

    // Kiểm tra trùng email nếu được cung cấp
    if (email) {
      const existingByEmail = await db.user.findUnique({
        where: { email: trimmedEmail },
      });
      if (existingByEmail) {
        return NextResponse.json(
          { error: "Email này đã được sử dụng." },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        username:      trimmedUsername,
        name:          name || trimmedUsername,
        email:         trimmedEmail,
        password:      hashedPassword,
        role:          role === "ADMIN" ? "ADMIN" : "USER",
        department:    department || "Other",
        avatar_url:    avatar_url || null,
        is_first_login: true,
        is_active:     is_active !== undefined ? is_active : true,
      },
      select: USER_SELECT,
    });

    return NextResponse.json({
      success: true,
      message: "Tạo tài khoản thành công.",
      user: toUserResponse(newUser),
    });
  } catch (error: any) {
    console.error("POST Account Error:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi khi tạo tài khoản." },
      { status: 500 }
    );
  }
}

// ─── PUT: Update an account ────────────────────────────────────────────────────

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, username, name, email, role, department, avatar_url, password, is_active } =
      await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Thiếu ID tài khoản cần cập nhật." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
    }

    // Không cho tự hạ cấp ADMIN của chính mình
    if (id === session.user.id && role && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bạn không thể tự hạ cấp quyền ADMIN của chính mình." },
        { status: 400 }
      );
    }

    // Kiểm tra email không trùng với tài khoản khác
    let finalEmail = user.email;
    if (email !== undefined) {
      const trimmedEmail = email?.trim().toLowerCase() || "";
      if (trimmedEmail && trimmedEmail !== user.email?.toLowerCase()) {
        const conflict = await db.user.findUnique({ where: { email: trimmedEmail } });
        if (conflict) {
          return NextResponse.json(
            { error: "Email này đã được sử dụng bởi tài khoản khác." },
            { status: 409 }
          );
        }
      }
      finalEmail = trimmedEmail || user.email;
    }

    // Kiểm tra username không trùng với tài khoản khác
    let finalUsername = user.username;
    if (username !== undefined) {
      const trimmedUsername = username?.trim().toLowerCase() || "";
      if (trimmedUsername && trimmedUsername !== user.username?.toLowerCase()) {
        const conflict = await db.user.findUnique({ where: { username: trimmedUsername } });
        if (conflict) {
          return NextResponse.json(
            { error: "Tên đăng nhập này đã được sử dụng bởi tài khoản khác." },
            { status: 409 }
          );
        }
      }
      finalUsername = trimmedUsername || user.username;
    }

    // Xử lý mật khẩu: chỉ hash và cập nhật nếu được gửi lên và có độ dài > 0
    const hashedPassword =
      password && password.length > 0 ? await bcrypt.hash(password, 10) : undefined;

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        username:   finalUsername,
        name:       name       !== undefined ? name       : user.name,
        email:      finalEmail,
        role:       role       !== undefined ? role       : user.role,
        department: department !== undefined ? department : user.department,
        avatar_url: avatar_url !== undefined ? avatar_url : user.avatar_url,
        is_active:  is_active  !== undefined ? is_active  : user.is_active,
        ...(hashedPassword && { password: hashedPassword }),
      },
      select: USER_SELECT,
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật tài khoản thành công.",
      user: toUserResponse(updatedUser),
    });
  } catch (error: any) {
    console.error("PUT Account Error:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi khi cập nhật tài khoản." },
      { status: 500 }
    );
  }
}

// ─── DELETE: Remove an account ─────────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Thiếu tham số ID tài khoản cần xóa." },
        { status: 400 }
      );
    }

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Bạn không thể xóa tài khoản hiện tại đang đăng nhập." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Đã xóa tài khoản thành công.",
    });
  } catch (error: any) {
    console.error("DELETE Account Error:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi khi xóa tài khoản." },
      { status: 500 }
    );
  }
}
