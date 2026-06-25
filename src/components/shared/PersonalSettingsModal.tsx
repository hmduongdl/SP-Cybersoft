"use client";

import {
  X,
  User,
  Tag,
  Briefcase,
  UserPlus,
  Paintbrush,
  Moon,
  Sun,
  Loader2,
  Monitor,
  Plus,
  Trash2,
  Check,
  Settings,
  ExternalLink,
  Camera,
} from "lucide-react";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTheme } from "next-themes";
import { useUserTheme } from "@/components/shared/ThemeProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTaskStore } from "@/store/useTaskStore";
import { UserAvatar } from "./user-avatar";

interface PersonalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Tab definition ──
type TabId = "profile" | "tags" | "workspaces" | "invitations" | "appearance";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { id: "profile", label: "Hồ sơ tài khoản", icon: User },
  { id: "workspaces", label: "Không gian & Thẻ Tag", icon: Briefcase },
  { id: "appearance", label: "Giao diện hiển thị", icon: Paintbrush },
];

const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#10b981", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
];

// ──────────────────── Profile Tab ────────────────────
const ProfileTab = React.memo(function ProfileTab({ onClose }: { onClose: () => void }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session?.user) return;
    setName(session.user.name || "");
    setEmail(session.user.email || "");
  }, [session]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    async function load() {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (!active) return;
        if (res.ok) {
          const d = await res.json();
          if (d?.user) {
            setName(d.user.name ?? "");
            setUsername(d.user.username ?? "");
            setUsernameChanged(d.user.username_changed ?? false);
            setEmail(d.user.email ?? "");
            setDepartment(d.user.department ?? "");
            setFacebookLink(d.user.facebook_link ?? "");
            setAvatarUrl(d.user.avatar_url ?? null);
          }
        }
      } catch { /* ignore */ } finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh tối đa 2MB.");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload thất bại.");
      setAvatarUrl(data.url);
      if (update) await update();
      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast.success("Cập nhật ảnh đại diện thành công!");
    } catch (err: any) {
      toast.error(err.message);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword) { toast.error("Vui lòng nhập mật khẩu hiện tại."); return; }
      if (newPassword !== confirmPassword) { toast.error("Mật khẩu mới không khớp."); return; }
      if (newPassword.length < 6) { toast.error("Mật khẩu mới tối thiểu 6 ký tự."); return; }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        facebook_link: facebookLink.trim() || null,
        username: username.trim(),
        department,
      };
      if (newPassword) { payload.currentPassword = currentPassword; payload.newPassword = newPassword; }

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cập nhật thất bại.");

      if (update) await update();
      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast.success("Cập nhật thành công!");
      router.refresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const inputCls = "w-full px-3.5 py-2.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed";
  const labelCls = "text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5";

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-4 pb-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative group cursor-pointer disabled:cursor-wait shrink-0"
        >
          <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-indigo-500/10 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 bg-slate-100 dark:bg-slate-800">
            {previewUrl || avatarUrl ? (
              <img src={previewUrl || avatarUrl || ""} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserAvatar name={name || null} size="lg" className="w-full h-full" />
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </div>
        </button>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{name || "Chưa có tên"}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="space-y-1">
          <label className={labelCls}><User className="w-3.5 h-3.5" /> Họ và tên</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            disabled={saving} required className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className={labelCls}><User className="w-3.5 h-3.5" /> Tên đăng nhập</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
            disabled={saving || usernameChanged} className={inputCls} />
          {usernameChanged
            ? <p className="text-[10px] text-slate-500">Đã đổi username, không thể đổi lại.</p>
            : <p className="text-[10px] text-amber-600 font-medium">Chỉ được đổi username 1 lần duy nhất.</p>}
        </div>
        <div className="space-y-1">
          <label className={labelCls}><Briefcase className="w-3.5 h-3.5" /> Phòng ban</label>
          <select value={department} onChange={e => setDepartment(e.target.value)} className={inputCls}>
            <option value="TECH">Phòng Kỹ Thuật (TECH)</option>
            <option value="SALES">Phòng Kinh Doanh (SALES)</option>
            <option value="MARKETING">Phòng Marketing</option>
            <option value="HR">Phòng Nhân Sự</option>
            <option value="Other">Khác</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelCls}><User className="w-3.5 h-3.5" /> Email liên lạc</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={saving} required className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className={labelCls}><Tag className="w-3.5 h-3.5" /> Link Facebook cá nhân</label>
          <input type="url" value={facebookLink} onChange={e => setFacebookLink(e.target.value)}
            placeholder="https://facebook.com/username" disabled={saving} className={inputCls} />
        </div>
      </div>


      {/* Password section */}
      <div className="relative py-3">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
        <div className="relative flex justify-center"><span className="bg-surface-mid dark:bg-slate-900 px-3 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Đổi mật khẩu</span></div>
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className={labelCls}>Mật khẩu hiện tại</label>
          <div className="relative">
            <input type={showCurrentPass ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Nhập mật khẩu cũ" className={inputCls + " pr-10"} />
            <button type="button" onMouseDown={() => setShowCurrentPass(true)} onMouseUp={() => setShowCurrentPass(false)} onMouseLeave={() => setShowCurrentPass(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showCurrentPass ? <X className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={labelCls}>Mật khẩu mới</label>
            <input type={showNewPass ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Xác nhận</label>
            <input type={showConfirmPass ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onClick={onClose} disabled={saving}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all">
          Hủy
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Lưu thay đổi
        </button>
      </div>
    </form>
  );
});


// ──────────────────── Tag Management Component ────────────────────
function TagManager({ workspaceId, title, description, hideIfEmpty }: { workspaceId: string, title: string, description?: string, hideIfEmpty?: boolean }) {
  const { tags, fetchTags } = useTaskStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[8]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const loadTags = useCallback(() => {
    if (workspaceId) fetchTags(workspaceId);
  }, [workspaceId, fetchTags]);

  useEffect(() => { loadTags(); }, [loadTags]);

  const wsTags = tags.filter(t => t.workspace_id === workspaceId);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const url = editingId ? `/api/tags/${editingId}` : "/api/tags";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, workspace_id: workspaceId }),
      });
      if (!res.ok) throw new Error("Lỗi lưu thẻ");
      toast.success(editingId ? "Đã cập nhật thẻ" : "Tạo thẻ mới thành công");
      await fetchTags(workspaceId);
      router.refresh();
      setName(""); setColor(TAG_COLORS[8]); setEditingId(null); setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const startEdit = (tag: any) => { setEditingId(tag.id); setName(tag.name); setColor(tag.color || TAG_COLORS[8]); setShowForm(true); };
  const cancelEdit = () => { setEditingId(null); setName(""); setColor(TAG_COLORS[8]); setShowForm(false); };

  const handleDelete = async (tagId: string) => {
    if (!window.confirm("Cảnh báo: Bạn có chắc chắn muốn xóa thẻ này? Các công việc đang gán tag này sẽ bị gỡ bỏ nhãn!")) return;
    setDeleting(tagId);
    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi xóa thẻ");
      toast.success("Đã xóa thẻ");
      await fetchTags(workspaceId);
      router.refresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setDeleting(null); }
  };

  if (hideIfEmpty && wsTags.length === 0 && !showForm) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title} ({wsTags.length})</p>
          {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5">
            <Plus size={14} /> Thêm Tag
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreateOrUpdate} className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-4 animate-fade-in">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{editingId ? "Sửa thẻ" : "Tạo thẻ mới"}</p>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Tên thẻ</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Urgent..." disabled={loading} className="w-full px-3 h-9 bg-surface-mid dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-slate-100" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={cancelEdit} disabled={loading} className="h-9 px-4 text-sm font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition-all disabled:opacity-50">Hủy</button>
              <button type="submit" disabled={loading || !name.trim()} className="h-9 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (editingId ? <Check size={14} /> : <Plus className="w-3.5 h-3.5" />)}{editingId ? "Lưu" : "Thêm"}</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-indigo-400 dark:ring-offset-slate-900' : 'hover:scale-110'}`} style={{ backgroundColor: c }} disabled={loading} />
            ))}
          </div>
        </form>
      )}

      {wsTags.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {wsTags.map(tag => (
            <div key={tag.id} className="flex items-center justify-between px-3 py-2 bg-surface-mid dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 group hover:border-slate-200 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || '#3b82f6' }} />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{tag.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => startEdit(tag)} disabled={loading} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Paintbrush size={14} /></button>
                <button onClick={() => handleDelete(tag.id)} disabled={deleting === tag.id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">{deleting === tag.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────── Workspace Detail View ────────────────────
function WorkspaceDetailView({ workspace, onBack, onWorkspaceUpdated }: { workspace: any, onBack: () => void, onWorkspaceUpdated: () => void }) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const router = useRouter();

  const loadCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/workspaces/${workspace.id}/collaborators`);
      if (res.ok) {
        const d = await res.json();
        setCollaborators(d.collaborators || []);
      }
    } catch (e) {}
  }, [workspace.id]);

  useEffect(() => { loadCollaborators(); }, [loadCollaborators]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/workspaces/${workspace.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật");
      toast.success("Cập nhật thành công");
      onWorkspaceUpdated();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/workspaces/${workspace.id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: "MEMBER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi mời");
      toast.success("Đã mời thành công");
      setEmail("");
      loadCollaborators();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleRemoveCollab = async (userId: string) => {
    if (!window.confirm("Xóa cộng tác viên này?")) return;
    try {
      const res = await fetch(`/api/tasks/workspaces/${workspace.id}/collaborators?userId=${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi xóa");
      toast.success("Đã xóa");
      loadCollaborators();
    } catch (err: any) { toast.error(err.message); }
  };

  const updateCollabRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/tasks/workspaces/${workspace.id}/collaborators`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật quyền");
      toast.success("Đã cập nhật quyền");
      loadCollaborators();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} /></button>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Chi tiết: {workspace.name}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <form onSubmit={handleUpdate} className="space-y-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thông tin chung</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Tên workspace</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} disabled={loading} className="w-full px-3 h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Mô tả</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} disabled={loading} className="w-full px-3 h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
              </div>
              <button type="submit" disabled={loading || !name.trim() || (name === workspace.name && description === workspace.description)} className="h-9 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all w-full flex items-center justify-center disabled:opacity-50">Lưu thông tin</button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
             <TagManager workspaceId={workspace.id} title="Thẻ Tag Mặc định của Không gian" description="Chỉ áp dụng trong workspace này" />
          </div>
        </div>

        <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-6 md:pt-0 md:pl-6">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cộng tác viên</p>
          <form onSubmit={handleInvite} className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Email người được mời</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} className="w-full px-3 h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
            </div>
            <button type="submit" disabled={loading || !email.trim()} className="h-9 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">Mời</button>
          </form>

          <div className="space-y-2 mt-4">
            {collaborators.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-surface-mid dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0">
                    <UserAvatar name={c.user.name} src={c.user.avatar_url} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate dark:text-slate-200">{c.user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{c.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={c.role} onChange={(e) => updateCollabRole(c.user.id, e.target.value)} className="text-[10px] px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <option value="VIEWER">Read-only</option>
                    <option value="MEMBER">Full-write</option>
                  </select>
                  <button onClick={() => handleRemoveCollab(c.user.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
            {collaborators.length === 0 && <p className="text-xs text-slate-500 text-center py-2">Chưa có ai.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────── WorkspacesTab ────────────────────
const WorkspacesTab = React.memo(function WorkspacesTab() {
  const { data: session } = useSession();
  const { workspaces, fetchWorkspaces } = useTaskStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedWs, setSelectedWs] = useState<any | null>(null);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const ownedWorkspaces = workspaces.filter(ws => ws.owner_id === session?.user?.id);
  const customCount = ownedWorkspaces.filter(ws => !ws.is_default).length;
  const personalWorkspace = workspaces.find(ws => ws.owner_id === session?.user?.id && ws.name === "Personal");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error("Lỗi tạo workspace");
      toast.success("Tạo workspace thành công");
      await fetchWorkspaces();
      setName(""); setDescription(""); setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (wsId: string, wsName: string) => {
    if (!window.confirm(`Xóa không gian "${wsName}"?`)) return;
    try {
      await fetch(`/api/tasks/workspaces/${wsId}`, { method: "DELETE" });
      toast.success("Đã xóa");
      await fetchWorkspaces();
    } catch (err: any) { toast.error(err.message); }
  };

  if (selectedWs) {
    return <WorkspaceDetailView workspace={selectedWs} onBack={() => setSelectedWs(null)} onWorkspaceUpdated={fetchWorkspaces} />;
  }

  return (
    <div className="space-y-8">
      {/* 1. GLOBAL TAGS (Personal Workspace tags) */}
      {personalWorkspace && (
        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
          <TagManager workspaceId={personalWorkspace.id} title="Thẻ Tag Của Bạn (Global)" description="Có thể sử dụng ở bất kỳ không gian nào bạn tham gia" />
        </div>
      )}

      {/* 2. SYSTEM DEFAULT WORKSPACES */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Không gian mặc định</p>
        <div className="grid gap-2">
          {ownedWorkspaces.filter(ws => ws.is_default).map(ws => (
            <div key={ws.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold shadow-sm">
                  {ws.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{ws.name}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-slate-500 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                      Hệ thống
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Không gian mặc định không thể thay đổi hoặc xóa</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CUSTOM WORKSPACES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Không gian Tự tạo</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Đã tạo: {customCount}/5 không gian</p>
          </div>
          {!showForm && customCount < 5 && (
            <button onClick={() => setShowForm(true)} className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5">
              <Plus size={14} /> Thêm Không gian
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tên workspace..." className="w-full px-3 h-9 bg-surface-mid dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả..." className="w-full px-3 h-9 bg-surface-mid dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="h-8 px-3 text-xs bg-slate-200 rounded-lg">Hủy</button>
              <button type="submit" disabled={!name.trim()} className="h-8 px-3 text-xs bg-indigo-600 text-white rounded-lg">Tạo mới</button>
            </div>
          </form>
        )}

        <div className="grid gap-2">
          {ownedWorkspaces.filter(ws => !ws.is_default).map(ws => (
            <div key={ws.id} onClick={() => setSelectedWs(ws)} className="flex items-center justify-between px-4 py-3 bg-surface-mid dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                  {ws.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{ws.name}</p>
                  {ws.description && <p className="text-xs text-slate-500 mt-0.5">{ws.description}</p>}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(ws.id, ws.name); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {customCount === 0 && <p className="text-sm text-slate-500 text-center py-4">Chưa có không gian tự tạo.</p>}
        </div>
      </div>
    </div>
  );
});
// ──────────────────── AppearanceTab ────────────────────
const AppearanceTab = React.memo(function AppearanceTab() {
  const { theme } = useTheme();
  const { setUserTheme } = useUserTheme();

  const themes = [
    { id: "light", label: "Chế độ Sáng", icon: Sun },
    { id: "dark", label: "Chế độ Tối", icon: Moon },
    { id: "system", label: "Đồng bộ hệ thống", icon: Monitor },
  ] as const;

  return (
    <div className="space-y-6">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chế độ hiển thị</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {themes.map(t => {
          const active = theme === t.id;
          return (
            <button key={t.id} onClick={() => setUserTheme(t.id)}
              className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                active
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 bg-white dark:bg-slate-900"
              }`}>
              <t.icon className={`w-8 h-8 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
              <span className={`text-sm font-semibold ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ──────────────────── Main Modal ────────────────────
export function PersonalSettingsModal({ isOpen, onClose }: PersonalSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  useEffect(() => {
    if (!isOpen) setActiveTab("profile");
  }, [isOpen]);

  const tabTitles = useMemo<Record<string, string>>(() => ({
    profile: "Hồ sơ tài khoản",
    workspaces: "Quản lý Không gian & Thẻ Tag",
    appearance: "Giao diện hiển thị",
  }), []);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-surface-mid dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-4xl w-[calc(100vw-1.5rem)] sm:w-full h-[92vh] sm:h-[85vh] md:h-[80vh] flex flex-col md:flex-row overflow-hidden animate-fade-in mx-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Sidebar Tabs ── */}
          <div className="w-full md:w-[220px] shrink-0 bg-slate-50/80 dark:bg-slate-800/40 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cài đặt</h2>
              <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={16} />
              </button>
            </div>
            <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar py-2 px-2 gap-1 md:space-y-0.5 shrink-0">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left shrink-0 ${
                      active
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}>
                    <Icon size={18} className={active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ── Content Area ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="px-6 h-14 flex items-center border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{tabTitles[activeTab]}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className={activeTab === 'profile' ? 'block animate-fade-in' : 'hidden'}>
                <ProfileTab onClose={onClose} />
              </div>
              <div className={activeTab === 'workspaces' ? 'block animate-fade-in' : 'hidden'}>
                <WorkspacesTab />
              </div>
              <div className={activeTab === 'appearance' ? 'block animate-fade-in' : 'hidden'}>
                <AppearanceTab />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

