"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { cn } from "@/lib/utils";
import { formatDateTime, getLocalDateKey, postTaskSchema } from "@/lib/posts";

type PostTaskFormValues = z.input<typeof postTaskSchema>;

interface ManagedPost {
  id: string;
  title: string;
  description: string;
  originalUrl: string;
  thumbnailUrl: string | null;
  scheduledAt: string;
  successfulCheckins: number;
  totalEmployees: number;
}

interface DensityState {
  count: number;
  limit: number;
  reachedLimit: boolean;
  message: string | null;
}

function toDateTimeValue(dateKey: string, time: string) {
  return `${dateKey}T${time}`;
}

function getInitialDateKey() {
  return getLocalDateKey(new Date());
}

export function PostTaskAdmin() {
  const [posts, setPosts] = useState<ManagedPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Scheduled Date / Time state
  const [selectedDate, setSelectedDate] = useState(getInitialDateKey);
  const [selectedTime, setSelectedTime] = useState("09:00");

  const [density, setDensity] = useState<DensityState | null>(null);
  const [checkingDensity, setCheckingDensity] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PostTaskFormValues>({
    resolver: zodResolver(postTaskSchema),
    defaultValues: {
      title: "",
      originalUrl: "",
      thumbnailUrl: "",
      description: "",
      scheduledAt: toDateTimeValue(selectedDate, selectedTime),
    },
  });

  async function loadPosts() {
    setLoadingPosts(true);
    try {
      const response = await fetch("/api/posts", { cache: "no-store" });
      const data = await response.json();
      setPosts(data.posts ?? []);
    } finally {
      setLoadingPosts(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    setValue("scheduledAt", toDateTimeValue(selectedDate, selectedTime), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [selectedDate, selectedTime, setValue]);

  useEffect(() => {
    let active = true;

    async function checkDensity() {
      setCheckingDensity(true);
      try {
        const response = await fetch(`/api/posts/density?date=${selectedDate}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (active) {
          setDensity(data);
        }
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
  }, [selectedDate]);

  async function onSubmit(values: PostTaskFormValues) {
    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch(editingPostId ? `/api/posts/${editingPostId}` : "/api/posts", {
        method: editingPostId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        setNotice("Không thể lưu bài viết. Vui lòng kiểm tra dữ liệu và thử lại.");
        return;
      }

      setNotice(editingPostId ? "Đã cập nhật bài viết thành công." : "Đã tạo task bài viết mới thành công.");
      clearForm();
      await loadPosts();
    } finally {
      setSaving(false);
    }
  }

  function clearForm() {
    setEditingPostId(null);
    const today = getInitialDateKey();
    setSelectedDate(today);
    setSelectedTime("09:00");
    reset({
      title: "",
      originalUrl: "",
      thumbnailUrl: "",
      description: "",
      scheduledAt: toDateTimeValue(today, "09:00"),
    });
  }

  function editPost(post: ManagedPost) {
    const scheduledAt = new Date(post.scheduledAt);
    const dateKey = getLocalDateKey(scheduledAt);
    const time = `${String(scheduledAt.getHours()).padStart(2, "0")}:00`;

    setEditingPostId(post.id);
    setSelectedDate(dateKey);
    setSelectedTime(time);
    reset({
      title: post.title,
      originalUrl: post.originalUrl,
      thumbnailUrl: post.thumbnailUrl ?? "",
      description: post.description,
      scheduledAt: toDateTimeValue(dateKey, time),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deletePost(postId: string) {
    const confirmed = window.confirm("Xóa task bài viết này?");

    if (!confirmed) {
      return;
    }

    await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    await loadPosts();
  }

  // Filter posts based on search query
  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.description && post.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-gutter animate-in fade-in duration-300">
      
      {/* Form Submit & Cancel Controls */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-background">
              {editingPostId ? "Sửa Bài Viết" : "Tạo Bài Viết Mới"}
            </h2>
            <p className="text-body-md text-on-surface-variant mt-xs">Lên lịch và yêu cầu các bài share công việc cho nhân sự.</p>
          </div>
          <div className="flex gap-md">
            {editingPostId && (
              <button 
                type="button" 
                onClick={clearForm}
                className="px-xl py-md rounded-lg border border-slate-200 text-on-surface font-semibold hover:bg-surface-container-low transition-all"
              >
                Hủy sửa
              </button>
            )}
            <button 
              type="submit" 
              disabled={saving}
              className="px-xl py-md rounded-lg bg-primary text-white font-semibold shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : editingPostId ? "Lưu thay đổi" : "Xuất bản bài đăng"}
            </button>
          </div>
        </header>

        {notice && (
          <div className="mb-lg p-md bg-secondary-container/20 border border-secondary/20 text-on-secondary-container rounded-xl font-semibold">
            {notice}
          </div>
        )}

        {/* Main Form Grid (Bento Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* LEFT COLUMN: Post Content & Media */}
          <div className="lg:col-span-8 space-y-gutter">
            
            {/* Section: Post Content */}
            <section className="bg-white rounded-2xl p-lg shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-sm mb-lg">
                <span className="material-symbols-outlined text-primary">edit_note</span>
                <h3 className="font-title-lg text-title-lg text-on-background">Nội dung bài viết</h3>
              </div>
              <div className="space-y-lg">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="title">Tiêu đề bài viết</label>
                  <input 
                    {...register("title")}
                    className="w-full bg-white border border-slate-200 rounded-lg px-md py-md focus:border-primary focus:ring-3 focus:ring-primary-container/20 transition-all outline-none text-on-background" 
                    placeholder="Ví dụ: Đăng ký tham gia Q3 Town Hall Highlights" 
                    type="text"
                    id="title"
                  />
                  {errors.title?.message && (
                    <p className="mt-1 text-xs text-error font-medium">{errors.title.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="originalUrl">Link bài viết gốc Facebook</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant">link</span>
                    <input 
                      {...register("originalUrl")}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-3xl pr-md py-md focus:border-primary focus:ring-3 focus:ring-primary-container/20 transition-all outline-none text-on-background" 
                      placeholder="https://www.facebook.com/..." 
                      type="url"
                      id="originalUrl"
                    />
                  </div>
                  {errors.originalUrl?.message && (
                    <p className="mt-1 text-xs text-error font-medium">{errors.originalUrl.message}</p>
                  )}
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="description">Mô tả chi tiết / Lời nhắn từ Admin</label>
                  <textarea 
                    {...register("description")}
                    className="w-full bg-white border border-slate-200 rounded-lg px-md py-md focus:border-primary focus:ring-3 focus:ring-primary-container/20 transition-all outline-none resize-none text-on-background" 
                    placeholder="Ví dụ: Đội ngũ nhân viên like & share kèm hashtag #YourCompany..." 
                    rows={4}
                    id="description"
                  ></textarea>
                  {errors.description?.message && (
                    <p className="mt-1 text-xs text-error font-medium">{errors.description.message}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Section: Media Upload URL */}
            <section className="bg-white rounded-2xl p-lg shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-sm mb-lg">
                <span className="material-symbols-outlined text-primary">image</span>
                <h3 className="font-title-lg text-title-lg text-on-background">Thumbnail hiển thị</h3>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="thumbnailUrl">Đường dẫn ảnh Thumbnail (URL)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant">image</span>
                  <input 
                    {...register("thumbnailUrl")}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-3xl pr-md py-md focus:border-primary focus:ring-3 focus:ring-primary-container/20 transition-all outline-none text-on-background" 
                    placeholder="https://example.com/image.jpg" 
                    type="url"
                    id="thumbnailUrl"
                  />
                </div>
                {errors.thumbnailUrl?.message && (
                  <p className="mt-1 text-xs text-error font-medium">{errors.thumbnailUrl.message}</p>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Scheduling & Targeting */}
          <div className="lg:col-span-4 space-y-gutter">
            
            {/* Section: Scheduling */}
            <section className="bg-white rounded-2xl p-lg shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-sm mb-lg">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <h3 className="font-title-lg text-title-lg text-on-background">Thời gian lên lịch</h3>
              </div>

              {/* Density Check Validation Message */}
              {density?.reachedLimit ? (
                <div className="mb-lg p-md bg-error-container/20 border border-error/20 rounded-xl flex gap-md">
                  <span className="material-symbols-outlined text-error">warning</span>
                  <p className="text-label-sm text-error leading-tight font-semibold">
                    Cảnh báo: Ngày {selectedDate} đã đạt giới hạn tối đa {density.limit} bài viết đăng.
                  </p>
                </div>
              ) : (
                <div className="mb-lg p-md bg-primary-container/10 border border-primary-container/20 rounded-xl flex gap-md">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <p className="text-label-sm text-primary leading-tight font-semibold">
                    Mật độ: {checkingDensity ? "..." : `${density?.count ?? 0}/${density?.limit ?? 2} bài`} đã lên lịch vào ngày {selectedDate}.
                  </p>
                </div>
              )}

              <input type="hidden" {...register("scheduledAt")} />
              <div className="space-y-lg">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-xs">Ngày đăng</label>
                  <input 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-md py-md focus:border-primary transition-all outline-none text-on-background" 
                    type="date"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-xs">Giờ hiển thị (24h)</label>
                  <select 
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-md py-md focus:border-primary transition-all outline-none text-on-background"
                  >
                    {Array.from({ length: 24 }, (_, hour) => {
                      const value = `${String(hour).padStart(2, "0")}:00`;
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex items-center gap-sm pt-sm">
                  <input className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer" id="auto-archive" type="checkbox" defaultChecked />
                  <label className="text-label-sm text-on-surface-variant cursor-pointer" htmlFor="auto-archive">Tự động khóa sau 24h đăng</label>
                </div>
              </div>
            </section>

            {/* Section: Targeting (Visual Simulation) */}
            <section className="bg-white rounded-2xl p-lg shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-sm mb-lg">
                <span className="material-symbols-outlined text-primary">groups</span>
                <h3 className="font-title-lg text-title-lg text-on-background">Phân bổ đội ngũ</h3>
              </div>
              <div className="space-y-md">
                <p className="text-label-sm text-on-surface-variant">Chọn phòng ban/nhóm nhận bài viết công việc này.</p>
                <div className="space-y-sm">
                  <label className="flex items-center justify-between p-md border border-slate-200 rounded-xl hover:bg-surface-container-low cursor-pointer transition-colors">
                    <div className="flex items-center gap-md">
                      <span className="material-symbols-outlined text-on-surface-variant">language</span>
                      <span className="font-label-md text-label-md text-on-background">Tất cả nhân sự</span>
                    </div>
                    <input defaultChecked className="rounded text-primary focus:ring-primary h-5 w-5 cursor-pointer" type="checkbox"/>
                  </label>
                  <label className="flex items-center justify-between p-md border border-slate-200 rounded-xl hover:bg-surface-container-low cursor-pointer transition-colors opacity-50">
                    <div className="flex items-center gap-md">
                      <span className="material-symbols-outlined text-on-surface-variant">code</span>
                      <span className="font-label-md text-label-md text-on-background">Đội ngũ Tech</span>
                    </div>
                    <input disabled className="rounded text-primary focus:ring-primary h-5 w-5" type="checkbox"/>
                  </label>
                  <label className="flex items-center justify-between p-md border border-slate-200 rounded-xl hover:bg-surface-container-low cursor-pointer transition-colors opacity-50">
                    <div className="flex items-center gap-md">
                      <span className="material-symbols-outlined text-on-surface-variant">campaign</span>
                      <span className="font-label-md text-label-md text-on-background">Marketing</span>
                    </div>
                    <input disabled className="rounded text-primary focus:ring-primary h-5 w-5" type="checkbox"/>
                  </label>
                </div>
              </div>
            </section>

          </div>
        </div>
      </form>

      {/* Section: Post Management Table (Separate Card Below) */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-outline-variant/10">
        <div className="p-lg border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">list_alt</span>
            <h3 className="font-title-lg text-title-lg text-on-background">Bài viết đã lên lịch</h3>
          </div>
          <div className="flex gap-sm w-full sm:w-auto">
            <div className="relative flex-grow">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant text-sm">search</span>
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-xl pr-md py-sm bg-surface-container-lowest border border-slate-200 rounded-full text-sm outline-none focus:border-primary transition-all w-full sm:w-60 text-on-background" 
                placeholder="Tìm bài viết..." 
                type="text"
              />
            </div>
            <button 
              onClick={loadPosts} 
              disabled={loadingPosts}
              className="p-2 hover:bg-surface-container-low rounded-lg transition-colors border border-slate-200 flex items-center justify-center"
            >
              <span className={cn("material-symbols-outlined", loadingPosts && "animate-spin")}>sync</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant font-bold">Hình ảnh</th>
                <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant font-bold">Tên bài viết</th>
                <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant font-bold">Ngày đăng</th>
                <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant font-bold">Tỷ lệ check-in</th>
                <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant font-bold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingPosts ? (
                <tr>
                  <td colSpan={5} className="px-lg py-10 text-center text-on-surface-variant font-body-sm">
                    Đang tải danh sách bài viết...
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-lg py-10 text-center text-on-surface-variant font-body-sm">
                    Không tìm thấy bài viết nào được lên lịch.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-surface-container-low/50 transition-colors group">
                    <td className="px-lg py-md">
                      <div className="w-16 h-10 rounded-lg bg-slate-100 border border-outline-variant/10 overflow-hidden relative">
                        {post.thumbnailUrl ? (
                          <img className="w-full h-full object-cover" src={post.thumbnailUrl} alt="" />
                        ) : (
                          <div className="w-full h-full bg-primary/5 text-primary text-[9px] flex items-center justify-center font-bold">No Image</div>
                        )}
                      </div>
                    </td>
                    <td className="px-lg py-md max-w-xs">
                      <span className="font-title-md text-on-background group-hover:text-primary transition-colors block truncate">
                        {post.title}
                      </span>
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex flex-col">
                        <span className="text-body-sm text-on-background font-semibold">{formatDateTime(post.scheduledAt)}</span>
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      <span className="px-2.5 py-0.5 bg-secondary-container/20 text-secondary border border-secondary/20 text-xs font-bold rounded-full">
                        {post.successfulCheckins}/{post.totalEmployees} nhân viên
                      </span>
                    </td>
                    <td className="px-lg py-md text-right">
                      <div className="flex justify-end gap-sm">
                        <button 
                          onClick={() => editPost(post)}
                          className="p-1 hover:bg-primary/10 hover:text-primary rounded-full transition-all text-outline-variant hover:scale-105"
                          title="Sửa bài viết"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button 
                          onClick={() => deletePost(post.id)}
                          className="p-1 hover:bg-error/10 hover:text-error rounded-full transition-all text-outline-variant hover:scale-105"
                          title="Xóa bài viết"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
