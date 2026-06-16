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
  full_name:     true,
  email:         true,
  role:          true,
  department:    true,
  avatar_url:    true,
  is_first_login: true,
} as const;

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

    return NextResponse.json({ users });
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

    const { username, name, email, password, role, department, avatar_url } =
      await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ tên đăng nhập và mật khẩu." },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail    = email?.trim().toLowerCase() ?? `${trimmedUsername}@noreply.local`;

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
        is_first_login: true, // Admin tạo → nhân viên phải onboarding khi đăng nhập lần đầu
      },
      select: USER_SELECT,
    });

    return NextResponse.json({
      success: true,
      message: "Tạo tài khoản thành công.",
      user: newUser,
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

    const { id, username, name, email, password, role, department, avatar_url } =
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

    const updateData: Record<string, unknown> = {
      name:       name       !== undefined ? name       : user.name,
      department: department !== undefined ? department : user.department,
      avatar_url: avatar_url !== undefined ? avatar_url : user.avatar_url,
      role:       role       !== undefined ? role       : user.role,
    };

    // Cập nhật username nếu thay đổi
    if (username && username.trim() !== user.username) {
      const trimmedUsername = username.trim().toLowerCase();
      const conflict = await db.user.findUnique({ where: { username: trimmedUsername } });
      if (conflict) {
        return NextResponse.json(
          { error: "Tên đăng nhập này đã được sử dụng bởi tài khoản khác." },
          { status: 409 }
        );
      }
      updateData.username = trimmedUsername;
    }

    // Cập nhật email nếu thay đổi
    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail !== user.email) {
        const emailConflict = await db.user.findUnique({ where: { email: trimmedEmail } });
        if (emailConflict) {
          return NextResponse.json(
            { error: "Email này đã được sử dụng bởi tài khoản khác." },
            { status: 409 }
          );
        }
        updateData.email = trimmedEmail;
      }
    }

    // Đổi mật khẩu nếu được cung cấp
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật tài khoản thành công.",
      user: updatedUser,
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
