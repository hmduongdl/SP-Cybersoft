import { auth } from "@/auth";
import { redirect } from "next/navigation";
import QueueClient from "./queue-client";
import { getCachedAllCheckins } from "@/lib/cache";

const CHECKINS_PER_PAGE = 9;

function getTabFilter(status: string): string[] {
  if (status === "AUTO_APPROVED") return ["AUTO_APPROVED"];
  if (status === "REVIEWED") return ["APPROVED", "REJECTED"];
  return ["PENDING"]; // default tab
}

export default async function AdminQueueList(props: {
  searchParams?: Promise<{ page?: string; tab?: string; search?: string; dept?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const activeTab = searchParams?.tab || "PENDING";
  const searchTerm = searchParams?.search || "";
  const deptFilter = searchParams?.dept || "ALL";

  const allCheckins = await getCachedAllCheckins();

  // Apply tab filter (status-based)
  const tabStatuses = getTabFilter(activeTab);
  let filtered = allCheckins.filter((c: any) => tabStatuses.includes(c.status));

  // Apply search filter (server-side for initial data)
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter((c: any) =>
      c.user?.name?.toLowerCase().includes(q) ||
      c.post?.title?.toLowerCase().includes(q)
    );
  }

  // Apply department filter
  if (deptFilter !== "ALL") {
    filtered = filtered.filter((c: any) => c.user?.department === deptFilter);
  }

  // Paginate
  const totalFiltered = filtered.length;
  const totalPages = Math.ceil(totalFiltered / CHECKINS_PER_PAGE);
  const skip = (page - 1) * CHECKINS_PER_PAGE;
  const paginatedCheckins = filtered.slice(skip, skip + CHECKINS_PER_PAGE);

  // Compute counts for the cards
  const pendingCount = allCheckins.filter((c: any) => c.status === "PENDING").length;
  const autoApprovedCount = allCheckins.filter((c: any) => c.status === "AUTO_APPROVED").length;
  const reviewedCount = allCheckins.filter((c: any) => c.status === "APPROVED" || c.status === "REJECTED").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <QueueClient
        initialCheckins={paginatedCheckins}
        currentPage={page}
        totalPages={totalPages}
        activeTab={activeTab as "PENDING" | "AUTO_APPROVED" | "REVIEWED"}
        searchTerm={searchTerm}
        deptFilter={deptFilter}
        pendingCount={pendingCount}
        autoApprovedCount={autoApprovedCount}
        reviewedCount={reviewedCount}
      />
    </div>
  );
}
