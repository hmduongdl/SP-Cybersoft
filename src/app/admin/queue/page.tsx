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
          avatar_url: true,
          department: true,
          facebook_link: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          thumbnail_url: true,
          start_at: true,
        },
      },
    },
    orderBy: {
      submitted_at: "desc",
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <QueueClient initialCheckins={checkins} />
    </div>
  );
}
