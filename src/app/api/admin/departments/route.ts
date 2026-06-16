import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const departments = await db.department.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ departments });
  } catch (error: any) {
    console.error("GET Departments Error:", error);
    return NextResponse.json({ error: "Failed to load departments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Tên phòng ban không được để trống" }, { status: 400 });
    }

    const dept = await db.department.create({
      data: { name: name.trim() },
    });

    return NextResponse.json({ success: true, department: dept });
  } catch (error: any) {
    console.error("POST Department Error:", error);
    return NextResponse.json({ error: "Failed to create department. Trùng tên?" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await db.department.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Department Error:", error);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}
