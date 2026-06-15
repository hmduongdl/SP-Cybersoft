import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import QueueClient from "./queue-client";

export const dynamic = "force-dynamic";

export default async function AdminQueuePage() {
  // 1. Authenticate & Authorize Admin
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  // 2. Fetch all checkins with User and Post metadata
  const checkins = await db.checkin.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          avatar: true,
          department: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          scheduledAt: true,
          start_at: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <QueueClient initialCheckins={checkins} />
    </div>
  );
}
