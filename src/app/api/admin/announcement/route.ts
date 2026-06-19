import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const announcement = await db.systemAnnouncement.findFirst({
      orderBy: { updated_at: "desc" },
    });

    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error("GET Announcement Error:", error);
    return NextResponse.json({ error: "Failed to load announcement" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, content, image_url, file_url, file_name, is_active } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    if (is_active === true) {
      await db.systemAnnouncement.updateMany({
        where: { is_active: true },
        data: { is_active: false },
      });
    }

    const existing = await db.systemAnnouncement.findFirst({ orderBy: { updated_at: "desc" } });

    const announcement = existing
      ? await db.systemAnnouncement.update({
          where: { id: existing.id },
          data: { title, content, image_url, file_url, file_name, is_active: is_active ?? false },
        })
      : await db.systemAnnouncement.create({
          data: { title, content, image_url, file_url, file_name, is_active: is_active ?? false },
        });

    revalidatePath("/api/announcement");

    return NextResponse.json({ success: true, announcement });
  } catch (error: any) {
    console.error("POST Admin Announcement Error:", error);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}
