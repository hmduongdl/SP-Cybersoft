import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// 1. GET: Fetch all user accounts
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        department: true,
        avatar: true,
        createdAt: true,
      },
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

// 2. POST: Create a new account
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, password, role, department, avatar, active } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ email và mật khẩu." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email này đã được sử dụng." },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        name: name || null,
        email: trimmedEmail,
        passwordHash,
        role: role === "ADMIN" ? "ADMIN" : "USER",
        department: department || null,
        avatar: avatar || null,
        active: active !== false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        department: true,
        avatar: true,
        createdAt: true,
      },
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

// 3. PUT: Update an account
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, email, password, role, department, avatar, active } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin định danh tài khoản (ID)." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
    }

    // Prevent deactivating own account
    if (id === session.user.id && active === false) {
      return NextResponse.json(
        { error: "Bạn không thể tự vô hiệu hóa tài khoản của chính mình." },
        { status: 400 }
      );
    }

    // Prevent changing own role away from ADMIN
    if (id === session.user.id && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bạn không thể tự hạ cấp quyền ADMIN của chính mình." },
        { status: 400 }
      );
    }

    const updateData: any = {
      name: name !== undefined ? name : user.name,
      department: department !== undefined ? department : user.department,
      avatar: avatar !== undefined ? avatar : user.avatar,
      role: role !== undefined ? role : user.role,
      active: active !== undefined ? active : user.active,
    };

    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail !== user.email) {
        // Verify unique email
        const emailExists = await db.user.findUnique({
          where: { email: trimmedEmail },
        });
        if (emailExists) {
          return NextResponse.json(
            { error: "Email này đã được sử dụng bởi một tài khoản khác." },
            { status: 400 }
          );
        }
        updateData.email = trimmedEmail;
      }
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        department: true,
        avatar: true,
        createdAt: true,
      },
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

// 4. DELETE: Delete an account
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
        { error: "Bạn không thể xóa tài khoản hiện tại bạn đang đăng nhập." },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
    }

    // Delete user
    await db.user.delete({
      where: { id },
    });

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
