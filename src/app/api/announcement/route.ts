import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const announcement = await db.systemAnnouncement.findFirst({
      where: { is_active: true },
    });

    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error("GET Announcement Error:", error);
    return NextResponse.json({ error: "Failed to fetch announcement" }, { status: 500 });
  }
}
