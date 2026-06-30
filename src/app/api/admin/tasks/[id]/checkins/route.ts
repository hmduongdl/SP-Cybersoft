import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const checkins = await db.checkin.findMany({
      where: {
        OR: [
          { post_id: id },
          { pc_task_id: id }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            department: true
          }
        }
      },
      orderBy: { submitted_at: "desc" }
    });

    return NextResponse.json({ checkins });
  } catch (error: any) {
    console.error("[tasks/[id]/checkins]", error);
    return NextResponse.json({ error: error.message || "Lỗi server" }, { status: 500 });
  }
}
