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
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, getLocalDateKey, DAILY_POST_LIMIT } from "@/lib/posts";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { toast, Toaster } from "sonner";

interface ManagedPost {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string | null;
  start_at: string;
  is_archived: boolean;
  allow_late_submit: boolean;
  team: "ALL" | "TECH" | "SALES";
  successfulCheckins: number;
  totalEmployees: number;
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

interface DensityState {
  count: number;
  limit: number;
  reachedLimit: boolean;
  message: string | null;
}

function toDateTimeValue(dateKey: string) {
  return `${dateKey}T12:00`;
}

/** Safe thumbnail with fallback when image fails to load */
function PostThumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src || "");
  const [failed, setFailed] = useState(false);

  // Reset state when src prop changes
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
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function PostTaskAdmin() {
  const [posts, setPosts] = useState<ManagedPost[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ACTIVE"); // "ACTIVE", "ARCHIVED", "ALL"

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  // Bulk Operations State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ManagedPost | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    thumbnail_url: "",
    description: "",
    date: getLocalDateKey(new Date()),
    team: "ALL" as "ALL" | "TECH" | "SALES",
    author_id: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Density Check State (for the selected date in the modal)
  const [density, setDensity] = useState<DensityState | null>(null);
  const [checkingDensity, setCheckingDensity] = useState(false);

  // Load posts
  async function loadPosts(page = 1) {
    setLoadingPosts(true);
    try {
      const response = await fetch(`/api/posts?page=${page}&limit=20`, { cache: "no-store" });
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

  // Load users (for author detection)
  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/accounts");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        toast.error("Không thể tải danh sách người dùng — chức năng phát hiện tác giả sẽ không hoạt động.");
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách người dùng:", err);
      toast.error("Mất kết nối khi tải danh sách người dùng.");
    }
  }

  useEffect(() => {
    loadPosts(1);
    loadUsers();
  }, []);

  // Run density check whenever selected date in form changes
  useEffect(() => {
    if (!isModalOpen) return;
    let active = true;

    async function checkDensity() {
      setCheckingDensity(true);
      try {
        const response = await fetch(`/api/posts/density?date=${formData.date}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (active) {
          setDensity(data);
        }
      } catch (err) {
        console.error("Lỗi kiểm tra mật độ:", err);
      } finally {
        if (active) {
          setCheckingDensity(false);
        }
      }
    }

    checkDensity();

    return () => {
      active = false;
    };
  }, [formData.date, isModalOpen]);


  // Open modal for adding
  const handleOpenAddModal = () => {
    setEditingPost(null);
    setFormData({
      title: "",
      url: "",
      thumbnail_url: "",
      description: "",
      date: getLocalDateKey(new Date()),
      team: "ALL",
      author_id: "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (post: ManagedPost) => {
    setEditingPost(post);
    const scheduledAt = new Date(post.start_at);
    const dateKey = getLocalDateKey(scheduledAt);

    setFormData({
      title: post.title,
      url: post.url,
      thumbnail_url: post.thumbnail_url ?? "",
      description: post.description,
      date: dateKey,
      team: post.team || "ALL",
      author_id: "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate form fields client-side
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (formData.title.trim().length < 10) {
      errors.title = "Tiêu đề phải có tối thiểu 10 ký tự.";
    }
    if (!formData.url.trim()) {
      errors.url = "Vui lòng nhập đường dẫn bài viết gốc.";
    } else {
      try {
        new URL(formData.url);
      } catch (e) {
        errors.url = "Link bài viết gốc phải là URL hợp lệ.";
      }
    }
    if (formData.thumbnail_url.trim()) {
      try {
        new URL(formData.thumbnail_url);
      } catch (e) {
        errors.thumbnail_url = "Link ảnh thumbnail phải là URL hợp lệ.";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form (create or edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        url: formData.url,
        thumbnail_url: formData.thumbnail_url || null,
        description: formData.description,
        start_at: toDateTimeValue(formData.date),
        team: "ALL",
      };

      const url = editingPost ? `/api/posts/${editingPost.id}` : "/api/posts";
      const method = editingPost ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Không thể lưu bài viết. Vui lòng kiểm tra lại thông tin.");
      }

      toast.success(editingPost ? "Cập nhật bài viết thành công!" : "Tạo bài viết mới thành công!");
      setIsModalOpen(false);
      loadPosts(1);
    } catch (error: any) {
      toast.error(error.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  // Delete individual post
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này và toàn bộ check-in liên quan?")) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa bài viết thất bại.");
      toast.success("Xóa bài viết thành công!");
      setSelectedIds(prev => prev.filter(id => id !== postId));
      loadPosts(1);
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi xóa bài viết.");
    }
  };

  // Toggle Archive/Active individual post via dedicated endpoint
  const handleToggleArchive = async (post: ManagedPost) => {
    try {
      const res = await fetch(`/api/posts/${post.id}/status`, { method: "PATCH" });
      if (!res.ok) throw new Error("Cập nhật trạng thái bài viết thất bại.");
      toast.success(post.is_archived ? "Đã mở khóa bài viết thành công!" : "Đã khóa bài viết thành công!");
      loadPosts(1);
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi cập nhật trạng thái.");
    }
  };

  // Bulk deletion
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} bài đăng đã chọn? Toàn bộ check-in liên quan cũng sẽ bị xóa.`)) return;

    try {
      const res = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Xóa hàng loạt thất bại.");
      toast.success(`Đã xóa thành công ${selectedIds.length} bài đăng!`);
      setSelectedIds([]);
      loadPosts(1);
    } catch (error: any) {
      toast.error(error.message || "Lỗi xóa hàng loạt.");
    }
  };

  // Bulk archive/unarchive
  const handleBulkArchive = async (archive: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          data: { is_archived: archive }
        }),
      });
      if (!res.ok) throw new Error("Cập nhật hàng loạt thất bại.");
      toast.success(archive ? `Đã khóa ${selectedIds.length} bài viết` : `Đã mở khóa ${selectedIds.length} bài viết`);
      setSelectedIds([]);
      loadPosts(1);
    } catch (error: any) {
      toast.error(error.message || "Lỗi cập nhật hàng loạt.");
    }
  };

  // Handle checking row checkboxes
  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filter posts based on UI filters
  const filteredPosts = posts.filter(post => {
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && !post.is_archived) ||
      (statusFilter === "ARCHIVED" && post.is_archived);

    return matchesStatus;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = filteredPosts.map(p => p.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = filteredPosts.map(p => p.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const isAllSelected = filteredPosts.length > 0 && filteredPosts.every(p => selectedIds.includes(p.id));

  return (
    <div className="space-y-6 pb-12 text-slate-900">
      <Toaster position="top-right" richColors duration={1500} />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Nội dung</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">Quản Lý Bài Viết</h1>
          <p className="mt-1 text-sm text-slate-600">
            Lên lịch và quản lý các bài đăng công việc cho đội ngũ nhân sự.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-white text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Thêm bài viết mới</span>
          </button>
        </div>
      </div>

      {/* Filters & Bulk Operations Card */}
      <Card className="bg-white border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          {/* Filter bar */}
          <div className="flex items-center gap-4">
            {/* Status Filter */}
            <div className="flex gap-2 items-center flex-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full max-w-xs px-3 py-2.5 bg-white border border-slate-250 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="ALL">Tất cả bài viết</option>
                <option value="ACTIVE">Đang kích hoạt (Chưa khóa)</option>
                <option value="ARCHIVED">Đã khóa</option>
              </select>

              <button
                onClick={() => loadPosts()}
                disabled={loadingPosts}
                title="Tải lại danh sách"
                className="p-2.5 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <RefreshCw className={cn("h-4.5 w-4.5", loadingPosts && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Bulk Action Bar (Visible only when items are checked) */}
          {selectedIds.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-indigo-950 text-sm font-semibold">
                <Check className="h-4.5 w-4.5 text-indigo-600" />
                <span>Đang chọn {selectedIds.length} bài viết</span>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => handleBulkArchive(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-lg shadow-sm transition-all"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Khóa hàng loạt
                </button>

                <button
                  onClick={() => handleBulkArchive(false)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg shadow-sm transition-all"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Mở khóa hàng loạt
                </button>

                <button
                  onClick={() => setSelectedIds([])}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg shadow-sm transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                  Hủy chọn
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Posts Table */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
        {loadingPosts ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Đang tải danh sách bài đăng...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-slate-900">Không tìm thấy bài viết nào</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-4 w-20">Ảnh bìa</th>
                  <th className="px-5 py-4">Bài đăng</th>
                  <th className="px-5 py-4">Ngày đăng</th>
                  <th className="px-5 py-4">Check-in</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPosts.map((post) => {
                  const isChecked = selectedIds.includes(post.id);

                  return (
                    <tr 
                      key={post.id} 
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors group",
                        isChecked && "bg-indigo-50/20"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(post.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Thumbnail */}
                      <td className="px-5 py-4">
                        <div className="w-16 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative shadow-sm">
                          <PostThumbnail src={post.thumbnail_url} alt={post.title} />
                        </div>
                      </td>

                      {/* Title */}
                      <td className="px-5 py-4 max-w-sm">
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors block truncate">
                          {post.title}
                        </span>
                      </td>

                      {/* Scheduled at */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-700">
                          {formatDateTime(post.start_at)}
                        </span>
                      </td>

                      {/* Checkin Rate */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-250">
                          {post.successfulCheckins}/{post.totalEmployees} nhân viên
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold",
                          post.is_archived ? "text-rose-600" : "text-emerald-600"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            post.is_archived ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
                          )} />
                          {post.is_archived ? "Đã khóa" : "Hoạt động"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(post)}
                            title="Sửa bài viết"
                            className="p-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-slate-600 hover:text-indigo-600 transition-all"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleToggleArchive(post)}
                            title={post.is_archived ? "Mở khóa bài viết" : "Khóa bài viết"}
                            className={cn(
                              "p-2 bg-white border rounded-lg transition-all",
                              post.is_archived
                                ? "border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
                                : "border-slate-200 text-slate-400 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-600"
                            )}
                          >
                            {post.is_archived ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </button>

                          <button
                            onClick={() => handleDeletePost(post.id)}
                            title="Xóa bài viết"
                            className="p-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-350 rounded-lg text-slate-600 hover:text-rose-600 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
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
          <div className="px-5 pb-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => loadPosts(page)}
            />
          </div>
        )}
      </Card>

      {/* FORM DIALOG MODAL (ADD / EDIT POST) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div 
            onClick={() => !saving && setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Form Card */}
          <Card className="w-full max-w-2xl bg-white border-slate-200 shadow-2xl relative z-10 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 my-8">
            <div className="px-6 py-4 border-b border-slate-150 bg-slate-50/60 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-indigo-600" />
                {editingPost ? "Sửa Task Bài Viết" : "Tạo Task Bài Viết Mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                
                {/* Form fields grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Left core details (Title, link, description) */}
                  <div className="md:col-span-7 space-y-4">
                    {/* Title */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase" htmlFor="form-title">
                        Tiêu đề bài viết
                      </label>
                      <input 
                        id="form-title"
                        type="text"
                        placeholder="Ví dụ: Đăng ký tham gia Q3 Town Hall Highlights"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        disabled={saving}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                      />
                      {formErrors.title && (
                        <p className="text-xs text-red-500 font-semibold">{formErrors.title}</p>
                      )}
                    </div>

                    {/* Facebook URL */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase" htmlFor="form-url">
                        Link bài viết gốc Facebook
                      </label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input 
                          id="form-url"
                          type="url"
                          placeholder="https://www.facebook.com/..."
                          value={formData.url}
                          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                          disabled={saving}
                          className="w-full bg-white border border-slate-250 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-xs" 
                        />
                      </div>
                      
                      {/* Author select dropdown */}
                      <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs animate-in fade-in duration-100">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="font-semibold text-slate-600">Tác giả:</span>
                          <select
                            value={formData.author_id || ""}
                            onChange={(e) => setFormData({ ...formData, author_id: e.target.value })}
                            disabled={saving}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">-- Chọn tác giả --</option>
                            <option value="songphuong_tech">Song Phương Technology</option>
                            <option value="songphuong">Song Phương</option>
                          </select>
                        </div>
                      </div>

                      {formErrors.url && (
                        <p className="text-xs text-red-500 font-semibold">{formErrors.url}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase" htmlFor="form-desc">
                        Mô tả chi tiết / Yêu cầu checkin
                      </label>
                      <textarea 
                        id="form-desc"
                        rows={4}
                        placeholder="Ví dụ: Đội ngũ like & share kèm hashtag..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        disabled={saving}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" 
                      />
                      {formErrors.description && (
                        <p className="text-xs text-red-500 font-semibold">{formErrors.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Right side config (Scheduling, Media) */}
                  <div className="md:col-span-5 space-y-4">
                    {/* Date/Time density checks */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs uppercase mb-2">
                        <CalendarIcon className="h-4 w-4 text-indigo-650" />
                        Thời gian lên lịch
                      </div>
                      
                      {checkingDensity ? (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 py-1">
                          <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                          Đang kiểm tra mật độ ngày đăng...
                        </div>
                      ) : density?.reachedLimit ? (
                        <div className="p-2 bg-red-50 border border-red-150 text-red-700 rounded-lg flex gap-1.5 items-start mb-2 leading-tight">
                          <AlertTriangle className="h-4 w-4 text-red-650 shrink-0 mt-0.5" />
                          <p className="text-[11px] font-semibold">
                            Cảnh báo: Đã đạt tối đa {density.limit} bài đăng ngày {formData.date}.
                          </p>
                        </div>
                      ) : (
                        <div className="p-2 bg-indigo-50 border border-indigo-150 text-indigo-750 rounded-lg flex gap-1.5 items-start mb-2 leading-tight">
                          <Check className="h-4 w-4 text-indigo-650 shrink-0 mt-0.5" />
                          <p className="text-[11px] font-semibold">
                            Mật độ: {density?.count ?? 0}/{density?.limit ?? DAILY_POST_LIMIT} bài đăng ngày {formData.date}.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ngày đăng</label>
                          <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            disabled={saving}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Thumbnail url */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase" htmlFor="form-thumb">
                        Thumbnail (Ảnh bìa)
                      </label>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                          id="form-thumb"
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={formData.thumbnail_url}
                          onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                          disabled={saving}
                          className="w-full bg-white border border-slate-250 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                        />
                      </div>
                      {formErrors.thumbnail_url && (
                        <p className="text-xs text-red-500 font-semibold">{formErrors.thumbnail_url}</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Form buttons */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
                >
                  Hủy bộ
                </button>
                <button
                  type="submit"
                  disabled={saving || (density?.reachedLimit && !editingPost)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4.5 w-4.5" />
                      <span>Lưu xuất bản</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
