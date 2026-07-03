import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function convertPcSubmissionToCheckinShape(ps: any, index: number) {
  const parts = (ps.parts_answer && typeof ps.parts_answer === "object" && !Array.isArray(ps.parts_answer))
    ? ps.parts_answer as Record<string, unknown>
    : {};

  // Extract items from extracted_raw or check parts directly for component entries
  const extractedRaw = parts.extracted_raw as { items?: Array<{ category: string; name: string; price: number }> } | undefined;
  const items = extractedRaw?.items || [];

  // Build component map similar to build_data format: { [category]: { name, price } }
  const componentMap: Record<string, { name: string; price: number }> = {};
  let totalPrice = 0;
  for (const item of items) {
    if (item.category && item.name) {
      componentMap[item.category] = { name: item.name, price: item.price || 0 };
      totalPrice += item.price || 0;
    }
  }

  return {
    id: `pcsub:${ps.id}`,
    user_id: ps.user_id,
    post_id: null,
    image_url: Array.isArray(ps.image_urls)
      ? ps.image_urls.find((u: string) => u !== "excel-parsed" && !u.startsWith("cleaned::")) || null
      : null,
    submitted_at: ps.submitted_at,
    status: ps.status,
    reject_reason: ps.reject_reason,
    reviewed_at: ps.reviewed_at,
    user: ps.user,
    build_data: {
      ...componentMap,
      total_price: totalPrice,
      explanation: ps.explanation || "",
    },
    explanation: ps.explanation,
    task_type: "PC_BUILD",
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch checkins (old training path: Checkin linked to PcBuildTask)
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

    // Also fetch PcSubmission records (new practice path: PcSubmission linked to PcExercise with same id)
    const pcSubmissions = await db.pcSubmission.findMany({
      where: { exercise_id: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            department: true
          }
        },
        exercise: {
          select: { title: true, description: true, difficulty: true }
        }
      },
      orderBy: { submitted_at: "desc" }
    });

    // Merge both lists, deduplicating by user_id (prefer Checkin entries over PcSubmission)
    const existingUserIds = new Set(checkins.map(c => c.user_id));
    const convertedPcSubmissions = pcSubmissions
      .filter(ps => !existingUserIds.has(ps.user_id))
      .map((ps, i) => convertPcSubmissionToCheckinShape(ps, i));

    const mergedSubmissions = [...checkins, ...convertedPcSubmissions];

    return NextResponse.json({ checkins: mergedSubmissions });
  } catch (error: any) {
    console.error("[tasks/[id]/checkins]", error);
    return NextResponse.json({ error: error.message || "Lỗi server" }, { status: 500 });
  }
}
