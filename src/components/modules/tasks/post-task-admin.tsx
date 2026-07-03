"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  RefreshCw,
  Link as LinkIcon,
  Image as ImageIcon,
  Calendar as CalendarIcon,
  Loader2,
  Lock,
  Unlock,
  AlertTriangle,
  FileText,
  FileEdit,
  User,
  Cpu,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDateTimeWithTime, getLocalDateKey, DAILY_POST_LIMIT } from "@/lib/posts";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { toast, Toaster } from "sonner";
import { MonthWeekFilter } from "@/components/shared/month-week-filter";
import { useMonthWeekFilter, isInRange } from "@/hooks/use-month-week-filter";
import { formatVND } from "@/lib/pc-kho";
import { getAvatarUrl } from "@/lib/avatar";

interface ManagedPost {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string | null;
  start_at: string;
  is_archived: boolean;
  allow_late_submit: boolean;
  team: "ALL" | "TECH" | "SALES" | "MARKETING";
  author: string | null;
  successfulCheckins: number;
  totalEmployees: number;
  latestCheckinAt: string | null;
  // PC Build extensions
  task_type?: "SHARE_POST" | "PC_BUILD";
  max_budget?: number;
  requirements?: string;
  difficulty?: string;
  deadline?: string | null;
}

interface UserAccount {
  id: string;
  username: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER";
  is_active: boolean;
  department: string | null;
  avatar_url: string | null;
  facebook_profile_url?: string | null;
  facebook_verified?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING: { label: "Chờ duyệt", icon: <Clock className="h-3.5 w-3.5" />, className: "text-amber-700 bg-amber-50" },
  APPROVED: { label: "Đã duyệt", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-emerald-700 bg-emerald-50" },
  REJECTED: { label: "Từ chối", icon: <XCircle className="h-3.5 w-3.5" />, className: "text-rose-700 bg-rose-50" },
  AUTO_APPROVED: { label: "Tự duyệt", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-emerald-700 bg-emerald-50" },
};

const CATEGORY_LABELS: Record<string, string> = {
  cpu: "Bộ vi xử lý (CPU)",
  mainboard: "Bo mạch chủ (Mainboard)",
  ram: "Bộ nhớ trong (RAM)",
  vga: "Card đồ họa (VGA)",
  ssd: "Ổ cứng (SSD/HDD)",
  psu: "Nguồn máy tính (PSU)",
  case: "Vỏ máy tính (Case)",
  cooler_fan: "Tản nhiệt & Quạt (Cooling)",
  monitor: "Màn hình (Monitor)",
  keyboard_mouse: "Bàn phím & Chuột",
  headphone: "Tai nghe (Headphone)",
  desk_chair: "Bàn ghế (Furniture)",
};

function toDateTimeValue(dateKey: string) {
  return `${dateKey}T12:00`;
}

function PostThumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src || "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImgSrc(src || "");
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
        <ImageIcon className="h-5 w-5 text-indigo-400" />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function PostTaskAdmin() {
  const [adminTab, setAdminTab] = useState<"share_post" | "pc_build">("share_post");
  const [posts, setPosts] = useState<ManagedPost[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ACTIVE", "ARCHIVED", "ALL"

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  // Filters by MonthWeek
  const monthFilter = useMonthWeekFilter();

  // Bulk Operations State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ManagedPost | null>(null);

  // Submissions Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDrawerTask, setSelectedDrawerTask] = useState<ManagedPost | null>(null);
  const [drawerSubmissions, setDrawerSubmissions] = useState<any[]>([]);
  const [loadingDrawerSubmissions, setLoadingDrawerSubmissions] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingBuildData, setViewingBuildData] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    task_type: "SHARE_POST" as "SHARE_POST" | "PC_BUILD",
    title: "",
    url: "",
    thumbnail_url: "",
    description: "",
    date: getLocalDateKey(new Date()),
    team: "TECH" as "TECH" | "SALES" | "MARKETING",
    author_id: "",
    // PC Build specific
    customer_need: "",
    max_budget: "",
    requirements: "",
    deadline: "",
    difficulty: "medium",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generatingAi, setGeneratingAi] = useState(false);

  const handleGenerateAiTask = async () => {
    setGeneratingAi(true);
    try {
      const res = await fetch("/api/admin/tasks/generate-pc-build", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gặp lỗi khi gọi AI.");

      if (data.task) {
        setFormData((prev) => ({
          ...prev,
          customer_need: data.task.customer_need,
          max_budget: String(data.task.max_budget),
          requirements: data.task.requirements,
        }));
        toast.success("Sinh đề bằng AI thành công!");
      }
    } catch (error: any) {
      toast.error(error.message || "Không sinh được đề bài.");
    } finally {
      setGeneratingAi(false);
    }
  };

  async function loadPosts(page = 1, status?: string) {
    setLoadingPosts(true);
    try {
      const s = status ?? statusFilter;
      const response = await fetch(`/api/posts?page=${page}&limit=20&status=${s}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Không thể tải danh sách bài viết.");
      const data = await response.json();
      setPosts(data.posts ?? []);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
      setTotalPosts(data.total || 0);
    } catch (error: any) {
      toast.error(error.message || "Lỗi tải danh sách bài viết.");
    } finally {
      setLoadingPosts(false);
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/accounts");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadPosts(1, statusFilter);
    loadUsers();
  }, []);

  useEffect(() => {
    loadPosts(1, statusFilter);
  }, [statusFilter]);

  // Load Submissions inside Drawer
  const fetchDrawerSubmissions = async (taskId: string) => {
    setLoadingDrawerSubmissions(true);
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}/checkins`);
      if (res.ok) {
        const data = await res.json();
        setDrawerSubmissions(data.checkins || []);
      }
    } catch {
      toast.error("Không tải được danh sách bài nộp.");
    } finally {
      setLoadingDrawerSubmissions(false);
    }
  };

  const handleOpenSubmissionsDrawer = (post: ManagedPost) => {
    setSelectedDrawerTask(post);
    setDrawerSubmissions([]);
    setIsDrawerOpen(true);
    setRejectingId(null);
    setRejectReason("");
    fetchDrawerSubmissions(post.id);
  };

  const handleCheckinAction = async (id: string, action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }

    try {
      const res = await fetch("/api/admin/checkin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkinIds: [id],
          action,
          rejectReason: action === "REJECT" ? rejectReason.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(action === "APPROVE" ? "Đã duyệt bài nộp!" : "Đã từ chối bài nộp.");
      setRejectingId(null);
      setRejectReason("");
      if (selectedDrawerTask) {
        fetchDrawerSubmissions(selectedDrawerTask.id);
        loadPosts(currentPage);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi xử lý.");
    }
  };

  const handleOpenAddModal = () => {
    setEditingPost(null);
    setFormData({
      task_type: adminTab === "pc_build" ? "PC_BUILD" : "SHARE_POST",
      title: "",
      url: "",
      thumbnail_url: "",
      description: "",
      date: getLocalDateKey(new Date()),
      team: "TECH",
      author_id: "",
      customer_need: "",
      max_budget: "",
      requirements: "",
      deadline: "",
      difficulty: "medium",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post: ManagedPost) => {
    setEditingPost(post);
    const scheduledAt = new Date(post.start_at);
    const dateKey = getLocalDateKey(scheduledAt);

    setFormData({
      task_type: post.task_type || "SHARE_POST",
      title: post.title || "",
      url: post.url || "",
      thumbnail_url: post.thumbnail_url ?? "",
      description: post.description || "",
      date: dateKey,
      team: post.team === "ALL" ? "TECH" : (post.team || "TECH"),
      author_id: post.author || "",
      customer_need: post.task_type === "PC_BUILD" ? post.description : "",
      max_budget: post.max_budget ? String(post.max_budget) : "",
      requirements: post.requirements || "",
      deadline: post.deadline ? getLocalDateKey(new Date(post.deadline)) : "",
      difficulty: (post as any).difficulty || "medium",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (formData.task_type === "PC_BUILD") {
      if (!formData.customer_need.trim()) {
        errors.customer_need = "Vui lòng nhập nhu cầu khách hàng.";
      }
      const budget = Number(formData.max_budget);
      if (!formData.max_budget || isNaN(budget) || budget <= 0) {
        errors.max_budget = "Ngân sách tối đa phải là số lớn hơn 0.";
      }
    } else {
      if (formData.title.trim().length < 10) {
        errors.title = "Tiêu đề phải có tối thiểu 10 ký tự.";
      }
      if (!formData.url.trim()) {
        errors.url = "Vui lòng nhập link bài viết gốc.";
      } else {
        try {
          new URL(formData.url);
        } catch {
          errors.url = "Link bài viết gốc phải là URL hợp lệ.";
        }
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        task_type: formData.task_type,
        start_at: toDateTimeValue(formData.date),
      };

      if (formData.task_type === "PC_BUILD") {
        payload.customer_need = formData.customer_need.trim();
        payload.max_budget = Number(formData.max_budget);
        payload.requirements = formData.requirements.trim();
        payload.difficulty = formData.difficulty || "medium";
        payload.deadline = `${formData.date}T23:59:59`;
      } else {
        payload.title = formData.title.trim();
        payload.url = formData.url.trim();
        payload.thumbnail_url = formData.thumbnail_url.trim() || null;
        payload.description = formData.description.trim();
        payload.team = formData.team;
        payload.author = formData.author_id || null;
      }

      const url = editingPost ? `/api/posts/${editingPost.id}` : "/api/posts";
      const method = editingPost ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gặp lỗi khi lưu task.");
      }

      toast.success(editingPost ? "Đã sửa bài viết thành công." : "Tạo bài viết mới thành công.");
      setIsModalOpen(false);
      loadPosts(currentPage);
    } catch (error: any) {
      toast.error(error.message || "Lỗi lưu dữ liệu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không? Hành động này cũng sẽ xóa toàn bộ lịch sử check-in liên quan.")) return;
    try {
      const res = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        toast.success("Đã xóa bài viết thành công.");
        loadPosts(currentPage);
      } else {
        const err = await res.json();
        throw new Error(err.error || "Xóa thất bại.");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa bài viết.");
    }
  };

  const handleToggleArchive = async (post: ManagedPost) => {
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: !post.is_archived }),
      });
      if (res.ok) {
        toast.success(post.is_archived ? "Đã mở khóa." : "Đã khóa.");
        loadPosts(currentPage);
      } else {
        const err = await res.json();
        throw new Error(err.error || "Cập nhật thất bại.");
      }
    } catch (err: any) {
      toast.error(err.message || "Không cập nhật được trạng thái.");
    }
  };

  const handleBulkArchive = async (archive: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          data: { is_archived: archive },
        }),
      });
      if (res.ok) {
        toast.success(archive ? `Đã khóa ${selectedIds.length} mục.` : `Đã mở khóa ${selectedIds.length} mục.`);
        setSelectedIds([]);
        loadPosts(currentPage);
      } else {
        const err = await res.json();
        throw new Error(err.error || "Thao tác thất bại.");
      }
    } catch (err: any) {
      toast.error(err.message || "Không cập nhật được.");
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredPosts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 1. Filter by active tab (SHARE_POST vs. PC_BUILD)
  const postsOfTab = posts.filter(post => 
    adminTab === "pc_build" ? post.task_type === "PC_BUILD" : post.task_type !== "PC_BUILD"
  );

  // 2. Filter by MonthWeek
  const filteredPosts = postsOfTab.filter(post => {
    return isInRange(post.start_at, monthFilter.effectiveRange);
  });
  const showThumbnailColumn = adminTab !== "pc_build";

  return (
    <div className="animate-in fade-in duration-200">
      <Toaster position="top-right" richColors />

      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-manrope text-xl font-bold text-on-surface">Quản lý Task & Bài Tập</h1>
          <p className="font-inter text-xs text-on-muted">Quản trị các bài tập Build PC và nhiệm vụ Like-Share Facebook</p>
        </div>
        <Button onClick={handleOpenAddModal} className="gradient-primary text-on-primary">
          <Plus className="h-4 w-4" />
          {adminTab === "pc_build" ? "Thêm Bài Tập PC" : "Thêm Task Like-Share"}
        </Button>
      </div>

      {/* View switcher tabs */}
      <div className="flex gap-1.5 rounded-2xl bg-surface-mid p-1 shadow-sm max-w-sm mb-6">
        <button
          onClick={() => setAdminTab("share_post")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 font-manrope text-xs font-bold transition-all cursor-pointer",
            adminTab === "share_post"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-muted hover:text-on-surface"
          )}
        >
          <FileText className="h-4 w-4" />
          Like-Share Facebook
        </button>
        <button
          onClick={() => setAdminTab("pc_build")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 font-manrope text-xs font-bold transition-all cursor-pointer",
            adminTab === "pc_build"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-muted hover:text-on-surface"
          )}
        >
          <Cpu className="h-4 w-4" />
          Bài tập Build PC
        </button>
      </div>

      {/* Date & status filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-surface-container-high bg-surface-mid px-6 py-4 mb-6">
        <MonthWeekFilter filter={monthFilter} />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-surface-container-high bg-surface-container-low px-3 py-1.5 text-xs text-on-surface focus:outline-none"
          >
            <option value="ALL">Tất cả</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="ARCHIVED">Đã khóa</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-xs font-bold text-indigo-700 flex-1">
            Đã chọn <span className="bg-indigo-100 px-2 py-0.5 rounded-lg">{selectedIds.length}</span> mục
          </span>
          <button
            onClick={() => handleBulkArchive(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 border-none hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            Khoá tất cả
          </button>
          <button
            onClick={() => handleBulkArchive(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 border-none hover:bg-emerald-500/20 transition-all cursor-pointer"
          >
            <Unlock className="h-3.5 w-3.5" />
            Mở khoá tất cả
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="p-1.5 rounded-lg text-on-muted hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
            title="Bỏ chọn"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Table list */}
      <div className="bg-surface-mid border border-surface-container-high rounded-3xl overflow-hidden shadow-ambient">
        {loadingPosts ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-on-muted">Đang tải danh sách...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 text-center text-sm text-on-muted">
            {adminTab === "pc_build" ? "Chưa có bài tập Build PC nào." : "Chưa có task Like-Share Facebook nào."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-mid/60 text-xs font-bold text-on-surface uppercase font-manrope">
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredPosts.length && filteredPosts.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-outline-variant/10 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    />
                  </th>
                  {showThumbnailColumn && <th className="px-6 py-4 w-16">Ảnh</th>}
                  <th className="px-6 py-4">
                    {adminTab === "pc_build" ? "Nhu cầu của khách" : "Tiêu đề bài đăng Facebook"}
                  </th>
                  <th className="px-6 py-4 w-44">DEADLINE</th>
                  <th className="px-6 py-4 w-32 text-center">Đã duyệt</th>
                  <th className="px-6 py-4 w-28">Trạng thái</th>
                  <th className="px-6 py-4 text-right w-36">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low bg-surface-container-lowest font-inter text-xs">
                {filteredPosts.map((post) => {
                  const isChecked = selectedIds.includes(post.id);
                  const isPcBuild = post.task_type === "PC_BUILD";
                  return (
                    <tr
                      key={post.id}
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors",
                        isChecked && "bg-indigo-50/20"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(post.id)}
                          className="rounded border-outline-variant/10 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {showThumbnailColumn && (
                        <td className="px-6 py-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center overflow-hidden shadow-sm">
                            <PostThumbnail src={post.thumbnail_url} alt={post.title} />
                          </div>
                        </td>
                      )}

                      {/* Title & description */}
                      <td className="px-6 py-4 max-w-sm">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-on-surface block truncate">
                            {isPcBuild ? `💻 Bài tập: ${post.description}` : post.title}
                          </span>
                          <span className="text-[10px] text-on-muted block line-clamp-1">
                            {isPcBuild
                              ? `Ngân sách: ${formatVND(post.max_budget || 0)} • Yêu cầu: ${post.requirements || "Không có"}`
                              : post.description || "Không có mô tả"}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-medium text-on-surface-variant block">
                            {formatDateTime(post.start_at)}
                          </span>
                          {isPcBuild ? (
                            // PC Build: deadline always = end of start day
                            <span className="text-[10px] font-bold text-rose-600 block">
                              Hạn: cuối ngày {formatDateTime(post.start_at)}
                            </span>
                          ) : post.deadline ? (
                            <span className="text-[10px] font-bold text-rose-600 block">
                              Hạn: {formatDateTime(post.deadline)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Checkin rate / View submissions */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenSubmissionsDrawer(post)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 border-none font-inter hover:bg-emerald-500/20 transition-all cursor-pointer"
                        >
                          {post.successfulCheckins}/{post.totalEmployees} nhân sự
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border-none font-inter",
                          post.is_archived ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-700"
                        )}>
                          {post.is_archived ? "Đã khóa" : "Hoạt động"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenSubmissionsDrawer(post)}
                            title="Duyệt bài nộp"
                            className="p-1.5 bg-surface-container-lowest hover:bg-emerald-50 hover:text-emerald-600 border border-surface-container rounded-lg text-on-surface-variant transition-all cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(post)}
                            title="Sửa"
                            className="p-1.5 bg-surface-container-lowest hover:bg-indigo-50 hover:text-indigo-600 border border-surface-container rounded-lg text-on-surface-variant transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleArchive(post)}
                            title={post.is_archived ? "Mở khóa" : "Khóa"}
                            className="p-1.5 bg-surface-container-lowest border border-surface-container rounded-lg text-on-surface-variant transition-all cursor-pointer"
                          >
                            {post.is_archived ? <Unlock className="h-3.5 w-3.5 text-rose-500" /> : <Lock className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            title="Xóa"
                            className="p-1.5 bg-surface-container-lowest hover:bg-rose-50 hover:text-rose-600 border border-surface-container rounded-lg text-on-surface-variant transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loadingPosts && filteredPosts.length > 0 && (
          <div className="px-6 py-4 border-t border-surface-container">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => loadPosts(page)}
            />
          </div>
        )}
      </div>

      {/* CREATE/EDIT FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl bg-surface-container-lowest rounded-3xl border border-surface-container shadow-2xl relative z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-surface-container flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                {formData.task_type === "PC_BUILD" ? <Cpu className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-indigo-600" />}
                {editingPost 
                  ? (formData.task_type === "PC_BUILD" ? "Sửa Bài Tập Build PC" : "Sửa Task Like-Share")
                  : (formData.task_type === "PC_BUILD" ? "Tạo Bài Tập Build PC Mới" : "Tạo Task Like-Share Mới")
                }
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="w-8 h-8 rounded-full hover:bg-surface-container-low text-on-muted hover:text-on-surface flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                {formData.task_type === "PC_BUILD" ? (
                  // PC BUILD FORM FIELDS
                  <div className="space-y-4">
                    {/* AI Generator Button */}
                    <div className="flex items-center justify-between border-b border-surface-container pb-3 mb-2">
                      <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Bài Tập Build PC</span>
                      <button
                        type="button"
                        onClick={handleGenerateAiTask}
                        disabled={generatingAi || saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border-none hover:bg-primary/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {generatingAi ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Đang tạo đề bằng AI...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            Tạo đề bằng AI
                          </>
                        )}
                      </button>
                    </div>

                    {/* Customer Need */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-on-surface uppercase" htmlFor="pc-need">
                        Mô tả đề bài
                      </label>
                      <input
                        id="pc-need"
                        type="text"
                        placeholder="Ví dụ: Ráp dàn máy chơi game và vẽ CAD nhẹ nhàng..."
                        value={formData.customer_need}
                        onChange={(e) => setFormData({ ...formData, customer_need: e.target.value })}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl focus:bg-surface-container-lowest focus:border-primary transition-all text-xs text-on-surface"
                      />
                      {formErrors.customer_need && (
                        <p className="text-[10px] text-error-text font-semibold">{formErrors.customer_need}</p>
                      )}
                    </div>

                    {/* Max Budget */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-on-surface uppercase" htmlFor="pc-budget">
                        Ngân sách
                      </label>
                      <div className="relative rounded-xl">
                        <input
                          id="pc-budget"
                          type="text"
                          placeholder="Ví dụ: 20.000.000"
                          value={formData.max_budget ? Number(formData.max_budget).toLocaleString("vi-VN") : ""}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            setFormData({ ...formData, max_budget: raw });
                          }}
                          disabled={saving}
                          className="w-full pl-4 pr-12 py-2 bg-surface-container-low border border-surface-container-high rounded-xl focus:bg-surface-container-lowest focus:border-primary transition-all text-xs text-on-surface font-semibold"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-muted select-none">
                          VNĐ
                        </span>
                      </div>
                      {formErrors.max_budget && (
                        <p className="text-[10px] text-error-text font-semibold">{formErrors.max_budget}</p>
                      )}
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-on-surface uppercase" htmlFor="pc-difficulty">
                        Độ khó
                      </label>
                      <select
                        id="pc-difficulty"
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl focus:bg-surface-container-lowest focus:border-primary transition-all text-xs text-on-surface"
                      >
                        <option value="easy">Dễ</option>
                        <option value="medium">Trung bình</option>
                        <option value="hard">Khó</option>
                      </select>
                    </div>

                    {/* Requirements */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-on-surface uppercase" htmlFor="pc-reqs">
                        Ghi chú ràng buộc
                      </label>
                      <textarea
                        id="pc-reqs"
                        rows={4}
                        placeholder="Ví dụ: Dùng CPU Intel Core i5 thế hệ 13 trở lên, RAM DDR5..."
                        value={formData.requirements}
                        onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl focus:bg-surface-container-lowest focus:border-primary transition-all text-xs text-on-surface resize-none"
                      />
                    </div>

                    {/* Date - Ngày ra bài (deadline = cuối ngày đó) */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-on-surface uppercase">
                        Ngày ra bài
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs text-on-surface"
                      />
                      <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        Deadline sẽ tự động là cuối ngày ra bài (23:59:59)
                      </p>
                    </div>
                  </div>
                ) : (
                  // SHARE POST FORM FIELDS
                  <div className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-on-surface uppercase" htmlFor="form-title">
                        Tiêu đề bài đăng
                      </label>
                      <input
                        id="form-title"
                        type="text"
                        placeholder="Nhập tiêu đề task Like-Share..."
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl focus:bg-surface-container-lowest focus:border-primary transition-all text-xs text-on-surface"
                      />
                      {formErrors.title && (
                        <p className="text-[10px] text-error-text font-semibold">{formErrors.title}</p>
                      )}
                    </div>

                    {/* Facebook URL */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-on-surface uppercase" htmlFor="form-url">
                        Link bài đăng gốc Facebook
                      </label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-on-muted h-3.5 w-3.5" />
                        <input
                          id="form-url"
                          type="url"
                          placeholder="https://www.facebook.com/..."
                          value={formData.url}
                          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                          disabled={saving}
                          className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl focus:bg-surface-container-lowest focus:border-primary transition-all text-xs text-on-surface"
                        />
                      </div>
                      {formErrors.url && (
                        <p className="text-[10px] text-error-text font-semibold">{formErrors.url}</p>
                      )}
                    </div>

                    {/* Thumbnail URL */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-on-surface uppercase" htmlFor="form-thumbnail">
                        Link ảnh đại diện
                      </label>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-on-muted h-3.5 w-3.5" />
                        <input
                          id="form-thumbnail"
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={formData.thumbnail_url}
                          onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                          disabled={saving}
                          className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl focus:bg-surface-container-lowest focus:border-primary transition-all text-xs text-on-surface"
                        />
                      </div>
                      {formErrors.thumbnail_url && (
                        <p className="text-[10px] text-error-text font-semibold">{formErrors.thumbnail_url}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-on-surface uppercase" htmlFor="form-desc">
                        Mô tả yêu cầu
                      </label>
                      <textarea
                        id="form-desc"
                        rows={3}
                        placeholder="Nội dung mô tả nhiệm vụ Like-Share..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl focus:bg-surface-container-lowest focus:border-primary transition-all text-xs text-on-surface resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Date */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-on-surface uppercase">
                          Ngày lên sóng
                        </label>
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          disabled={saving}
                          className="w-full px-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs text-on-surface"
                        />
                      </div>

                      {/* Author */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-on-surface uppercase">
                          Tác giả
                        </label>
                        <select
                          value={formData.author_id}
                          onChange={(e) => setFormData({ ...formData, author_id: e.target.value })}
                          disabled={saving}
                          className="w-full px-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs text-on-surface focus:outline-none"
                        >
                          <option value="">Không có</option>
                          <option value="Song Phương Tech">Song Phương Tech</option>
                          <option value="Song Phương">Song Phương</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-surface-container bg-surface-mid/30 px-6 py-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                  Hủy
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editingPost ? "Lưu thay đổi" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* SUBMISSIONS LIST DRAWER */}
      {isDrawerOpen && selectedDrawerTask && (
        <div className="fixed inset-0 z-50 flex justify-end backdrop-blur-sm bg-black/60 animate-in fade-in duration-200">
          <div onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 z-0" />
          
          <div className="relative z-10 w-full max-w-2xl bg-surface-container-lowest shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-5 border-b border-surface-container flex items-center justify-between bg-surface-mid/20">
              <div>
                <h3 className="font-manrope text-base font-bold text-on-surface flex items-center gap-2">
                  {selectedDrawerTask.task_type === "PC_BUILD" ? <Cpu className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-indigo-600" />}
                  {selectedDrawerTask.task_type === "PC_BUILD" ? "Duyệt Bài Nộp Build PC" : "Lịch Sử Nộp Bài Share"}
                </h3>
                <p className="text-xs text-on-muted mt-0.5 line-clamp-1">{selectedDrawerTask.description}</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container-low text-on-muted hover:text-on-surface flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDrawerSubmissions ? (
                <div className="flex flex-col items-center justify-center py-24 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-on-muted">Đang tải danh sách bài nộp...</p>
                </div>
              ) : drawerSubmissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-on-muted space-y-2 border-2 border-dashed border-surface-container-high rounded-3xl">
                  <Clock className="h-10 w-10 text-outline" />
                  <p className="text-sm font-semibold">Chưa có bài nộp nào</p>
                  <p className="text-xs text-center px-4">Khi nhân viên hoàn thành và nộp báo giá, bài làm sẽ xuất hiện ở đây để duyệt.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {drawerSubmissions.map((chk) => {
                    const st = STATUS_CONFIG[chk.status] || STATUS_CONFIG.PENDING;
                    const isBuildTask = selectedDrawerTask.task_type === "PC_BUILD";
                    return (
                      <div key={chk.id} className="rounded-2xl border border-surface-container-high p-4 space-y-4 bg-surface-mid/20 hover:border-primary/20 transition-all">
                        {/* Submitter Info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase overflow-hidden">
                              <img src={getAvatarUrl(chk.user?.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-xs text-on-surface">{chk.user?.name || "Nhân viên"}</h4>
                              <p className="text-[10px] text-on-muted">{chk.user?.department || "—"} • {new Date(chk.submitted_at).toLocaleString()}</p>
                            </div>
                          </div>
                          
                          <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold", st.className)}>
                            {st.icon}
                            {st.label}
                          </span>
                        </div>

                        {/* Submission Content */}
                        {isBuildTask ? (
                          <div className="space-y-3">
                            {chk.image_url && (
                              <div className="relative w-36 h-24 rounded-lg border border-surface-container bg-black/5 overflow-hidden group cursor-pointer" onClick={() => setViewingBuildData(chk)}>
                                <img src={chk.image_url} alt="Báo giá" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}

                            {/* Components summary table */}
                            <div className="rounded-xl border border-surface-container bg-surface-container-lowest/60 p-3 text-[10px] space-y-1">
                              <div className="flex justify-between items-center border-b border-surface-container pb-1 mb-1 font-bold text-on-surface">
                                <span>Cấu hình linh kiện đề xuất:</span>
                                <span className="text-primary">{formatVND(Number(chk.build_data?.total_price?.price || chk.build_data?.total_price || 0))}</span>
                              </div>
                              {Object.entries(chk.build_data || {})
                                .filter(([k, v]) => k !== "total_price" && k !== "use_auto_total" && v && (v as any).name)
                                .map(([k, v]) => (
                                  <div key={k} className="flex justify-between">
                                    <span className="text-on-muted w-24 shrink-0 font-semibold">{CATEGORY_LABELS[k] || k}:</span>
                                    <span className="text-on-surface truncate flex-1 pr-2 text-left">{(v as any).name}</span>
                                    <span className="text-on-surface font-bold">{(v as any).price > 0 ? formatVND((v as any).price) : "-"}</span>
                                  </div>
                                ))}
                            </div>

                            {chk.explanation && (
                              <div className="text-xs italic text-on-surface-variant font-inter bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                                &ldquo;{chk.explanation}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {chk.image_url && (
                              <div className="relative w-48 h-32 rounded-lg border border-surface-container bg-black/5 overflow-hidden group cursor-pointer" onClick={() => window.open(chk.image_url, "_blank")}>
                                <img src={chk.image_url} alt="Screenshot" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        {chk.status === "PENDING" && (
                          <div className="pt-2 flex flex-col gap-2">
                            {rejectingId === chk.id ? (
                              <div className="space-y-2 border border-rose-100 bg-rose-50/20 p-3 rounded-xl">
                                <label className="block text-[10px] font-bold text-rose-700 uppercase">Lý do từ chối</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Nhập lý do từ chối..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="flex-1 px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-xs focus:outline-none focus:border-rose-500"
                                  />
                                  <Button onClick={() => handleCheckinAction(chk.id, "REJECT")} className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3">
                                    Xác nhận
                                  </Button>
                                  <Button variant="outline" onClick={() => setRejectingId(null)} className="text-xs px-2.5">
                                    Hủy
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  onClick={() => handleCheckinAction(chk.id, "APPROVE")}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-3 flex items-center gap-1 shrink-0"
                                >
                                  <Check className="h-3.5 w-3.5" /> Duyệt đạt
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setRejectingId(chk.id);
                                    setRejectReason("");
                                  }}
                                  className="text-rose-600 border-rose-100 hover:bg-rose-50 text-xs py-1.5 px-3 flex items-center gap-1 shrink-0"
                                >
                                  <X className="h-3.5 w-3.5" /> Từ chối
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {chk.status === "REJECTED" && chk.reject_reason && (
                          <p className="text-[10px] text-rose-600 font-bold bg-rose-50/30 p-2 rounded-lg border border-rose-100/50">
                            Lý do hủy duyệt: {chk.reject_reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL QUOTE LIGHTBOX OVERLAY */}
      {viewingBuildData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-zoom-out" onClick={() => setViewingBuildData(null)} />
          <div className="relative z-10 max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-white flex flex-col md:flex-row shadow-2xl">
            <div className="flex-1 bg-black flex items-center justify-center p-2 min-h-[300px]">
              <img src={viewingBuildData.image_url} alt="Báo giá đầy đủ" className="max-w-full max-h-[75vh] object-contain" />
            </div>
            <div className="w-full md:w-80 p-5 bg-white flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Chi tiết cấu hình đề xuất</h4>
                    <p className="text-[10px] text-slate-500">{new Date(viewingBuildData.submitted_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => setViewingBuildData(null)} className="p-1 hover:bg-slate-100 rounded-full">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-900 border-b pb-1">
                    <span>Tổng tiền:</span>
                    <span className="text-indigo-600">{formatVND(Number(viewingBuildData.build_data?.total_price?.price || viewingBuildData.build_data?.total_price || 0))}</span>
                  </div>
                  <div className="divide-y max-h-[40vh] overflow-y-auto pr-1">
                    {Object.entries(viewingBuildData.build_data || {})
                      .filter(([k, v]) => k !== "total_price" && k !== "use_auto_total" && v && (v as any).name)
                      .map(([k, v]) => (
                        <div key={k} className="py-2 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">{CATEGORY_LABELS[k] || k}</span>
                          <span className="text-slate-800 font-semibold block leading-tight">{(v as any).name}</span>
                          <span className="text-indigo-600 font-bold block text-[10px]">{(v as any).price > 0 ? formatVND((v as any).price) : "-"}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t mt-4 flex gap-2">
                <Button className="flex-1 text-xs py-1.5" onClick={() => { handleCheckinAction(viewingBuildData.id, "APPROVE"); setViewingBuildData(null); }}>
                  Duyệt đạt
                </Button>
                <Button variant="outline" className="flex-1 text-xs py-1.5 text-rose-600 border-rose-100 hover:bg-rose-50" onClick={() => { setRejectingId(viewingBuildData.id); setRejectReason(""); setViewingBuildData(null); }}>
                  Từ chối
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Button fallback component
function Button({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 font-manrope text-xs font-bold cursor-pointer transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5",
        props.variant === "outline"
          ? "border border-surface-container text-on-surface hover:bg-surface-container-low bg-surface-container-lowest"
          : "gradient-primary text-on-primary hover:opacity-95",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
