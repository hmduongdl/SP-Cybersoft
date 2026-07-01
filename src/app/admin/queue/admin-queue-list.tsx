import { auth } from "@/auth";
import { redirect } from "next/navigation";
import QueueClient from "./queue-client";
import BuildPcQueueClient from "./build-pc-queue-client";
import { getCachedAllCheckins, getCachedAllPcBuildCheckins, getCachedAllPcSubmissions } from "@/lib/cache";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PER_PAGE = 9;

function getTabFilter(status: string, module: string): string[] {
  if (module === "build-pc") {
    if (status === "REVIEWED") return ["APPROVED", "REJECTED", "AUTO_APPROVED"];
    return ["PENDING"];
  }
  if (status === "AUTO_APPROVED") return ["AUTO_APPROVED"];
  if (status === "REVIEWED") return ["APPROVED", "REJECTED"];
  return ["PENDING"];
}

function isSubmittedPcSubmission(submission: { parts_answer: unknown }) {
  const parts = submission.parts_answer as { is_draft?: unknown } | null;
  // Include all non-draft submissions regardless of analyzing state so they never disappear
  return parts?.is_draft !== true;
}

function isSubmittedPcBuildCheckin(checkin: { build_data: unknown }) {
  const buildData = checkin.build_data as { is_draft?: unknown } | null;
  return buildData?.is_draft !== true;
}

function mapPcBuildCheckinToQueueItem(checkin: any) {
  const buildData = checkin.build_data && typeof checkin.build_data === "object" ? checkin.build_data : {};
  const pcTask = checkin.pc_task;

  return {
    id: `checkin:${checkin.id}`,
    status: checkin.status,
    submitted_at: checkin.submitted_at,
    explanation: buildData.explanation || "",
    parts_answer: buildData,
    image_urls: checkin.image_url ? [checkin.image_url] : [],
    ai_score: typeof buildData.temp_ai_score === "number" ? buildData.temp_ai_score : null,
    ai_feedback: typeof buildData.temp_ai_feedback === "string" ? buildData.temp_ai_feedback : null,
    reject_reason: checkin.reject_reason,
    user: checkin.user,
    exercise: {
      id: pcTask?.id || checkin.pc_task_id || checkin.id,
      title: pcTask?.customer_need ? `Training: ${pcTask.customer_need}` : "Bài training Build PC",
      description: pcTask?.requirements || "",
      difficulty: "training",
      requirements: {
        budget: Number(pcTask?.max_budget) || undefined,
        useCase: pcTask?.customer_need || "",
      },
      exercise_date: pcTask?.date || checkin.submitted_at,
    },
  };
}

function getExerciseTime(submission: { exercise?: { exercise_date?: Date | string | null } | null }) {
  const exerciseDate = submission.exercise?.exercise_date;
  return exerciseDate ? new Date(exerciseDate).getTime() : 0;
}

export default async function AdminQueueList(props: {
  searchParams?: Promise<{ page?: string; tab?: string; search?: string; dept?: string; module?: string }>;
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
  const module = searchParams?.module || "like-share";

  const [allCheckins, allPcSubmissions, allPcBuildCheckins] = await Promise.all([
    getCachedAllCheckins(),
    getCachedAllPcSubmissions(),
    getCachedAllPcBuildCheckins(),
  ]);

  const submittedPcSubmissions = [
    ...allPcSubmissions.filter(isSubmittedPcSubmission),
    ...allPcBuildCheckins.filter(isSubmittedPcBuildCheckin).map(mapPcBuildCheckinToQueueItem),
  ];
  const pcPendingCount = submittedPcSubmissions.filter((s) => s.status === "PENDING").length;
  const likeSharePendingCount = allCheckins.filter((c) => c.status === "PENDING").length;

  if (module === "build-pc") {
    const tabStatuses = getTabFilter(activeTab, module);
    let filtered = submittedPcSubmissions.filter((s) => tabStatuses.includes(s.status));

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.user?.name?.toLowerCase().includes(q) ||
          s.exercise?.title?.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== "ALL") {
      filtered = filtered.filter((s) => s.user?.department === deptFilter);
    }

    filtered = [...filtered].sort((a, b) => {
      const exerciseDiff = getExerciseTime(b) - getExerciseTime(a);
      if (exerciseDiff !== 0) return exerciseDiff;
      const titleDiff = (a.exercise?.title || "").localeCompare(b.exercise?.title || "", "vi");
      if (titleDiff !== 0) return titleDiff;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const reviewedCount = submittedPcSubmissions.filter(
      (s) => s.status === "APPROVED" || s.status === "REJECTED" || s.status === "AUTO_APPROVED"
    ).length;

    return (
      <div className="space-y-4">
        <ModuleSwitcher
          activeModule={module}
          likeSharePending={likeSharePendingCount}
          buildPcPending={pcPendingCount}
        />
        <BuildPcQueueClient
          initialSubmissions={paginated as any}
          currentPage={page}
          totalPages={totalPages}
          activeTab={activeTab as "PENDING" | "REVIEWED"}
          searchTerm={searchTerm}
          deptFilter={deptFilter}
          pendingCount={pcPendingCount}
          reviewedCount={reviewedCount}
        />
      </div>
    );
  }

  const tabStatuses = getTabFilter(activeTab, module);
  let filtered = allCheckins.filter((c: any) => tabStatuses.includes(c.status));

  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (c: any) =>
        c.user?.name?.toLowerCase().includes(q) ||
        c.post?.title?.toLowerCase().includes(q)
    );
  }
  if (deptFilter !== "ALL") {
    filtered = filtered.filter((c: any) => c.user?.department === deptFilter);
  }

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginatedCheckins = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pendingCount = allCheckins.filter((c: any) => c.status === "PENDING").length;
  const autoApprovedCount = allCheckins.filter((c: any) => c.status === "AUTO_APPROVED").length;
  const reviewedCount = allCheckins.filter(
    (c: any) => c.status === "APPROVED" || c.status === "REJECTED"
  ).length;

  return (
    <div className="space-y-4">
      <ModuleSwitcher
        activeModule={module}
        likeSharePending={likeSharePendingCount}
        buildPcPending={pcPendingCount}
      />
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

function ModuleSwitcher({
  activeModule,
  likeSharePending,
  buildPcPending,
}: {
  activeModule: string;
  likeSharePending: number;
  buildPcPending: number;
}) {
  const tabs = [
    { key: "like-share", label: "Like - Share", pending: likeSharePending },
    { key: "build-pc", label: "Build PC", pending: buildPcPending },
  ];

  return (
    <div className="flex gap-2 rounded-2xl border border-surface-container-high bg-surface-container-low/50 p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`/admin/queue?module=${t.key}&tab=PENDING`}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-manrope text-xs font-bold transition-all",
            activeModule === t.key
              ? "bg-surface-mid text-on-surface shadow-card"
              : "text-on-muted hover:text-on-surface"
          )}
        >
          {t.label}
          {t.pending > 0 && (
            <span className="rounded-full bg-error-bg px-1.5 py-0.5 font-inter text-[10px] font-bold text-error-text">
              {t.pending}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
