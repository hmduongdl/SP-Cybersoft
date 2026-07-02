import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ReportsClient from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch all check-ins for the logged-in user, including related post details
  const checkins = await db.checkin.findMany({
    where: {
      user_id: userId,
    },
    include: {
      post: {
        select: {
          title: true,
          url: true,
          author: true,
        },
      },
    },
    orderBy: {
      submitted_at: "desc",
    },
  });

  // Format date fields as ISO strings for Client Component serialization compatibility
  const formattedCheckins = checkins.map((c) => ({
    id: c.id,
    postTitle: c.post?.title || "Bài viết không xác định",
    postUrl: c.post?.url || "#",
    postAuthor: c.post?.author || "Ẩn danh",
    imageUrl: c.image_url,
    submittedAt: c.submitted_at.toISOString(),
    status: c.status,
    rejectReason: c.reject_reason || "",
    aiAnalysisReason: c.ai_analysis_reason || "",
    aiConfidence: c.ai_confidence,
    aiExtractedTitle: c.ai_extracted_title || "",
    aiExtractedUsername: c.ai_extracted_username || "",
  }));

  return (
    <div className="w-full">
      <ReportsClient checkins={formattedCheckins} />
    </div>
  );
}
