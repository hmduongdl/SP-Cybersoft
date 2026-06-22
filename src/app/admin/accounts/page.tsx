"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Lock,
  Users,
  ShieldCheck,
  UserX,
  AlertTriangle,
  Mail,
  Briefcase,
  Loader2,
  RefreshCw,
  UserCheck,
  UserPlus,
  User,
  Star
} from "lucide-react";
import { useLayout } from "@/components/shared/layout-context";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { toast, Toaster } from "sonner";
import { AdminUserEditModal } from "@/components/AdminUserEditModal";
import { UserAvatar } from "@/components/shared/user-avatar";

interface UserAccount {
  id: string;
  username: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER";
  department: string | null;
  avatar_url: string | null;
  hope_stars: number;
  used_stars_this_month: number;
  is_active: boolean;
}

export default function AdminAccountsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    role: "USER" as "ADMIN" | "USER",
    department: "TECH",
    avatar_url: "",
    is_active: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load accounts
  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const usersRes = await fetch("/api/admin/accounts");
      const data = await usersRes.json();
      if (!usersRes.ok) {
        throw new Error(data.error || "Không thể tải danh sách tài khoản.");
      }
      setUsers(data.users || []);
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi lấy dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === "ADMIN") {
      fetchAccounts();
    }
  }, [role]);

  // Open modal for creating new user
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      name: "",
      email: "",
      password: "",
      role: "USER",
      department: "TECH",
      avatar_url: "",
      is_active: true,
    });
    setShowFormModal(true);
  };

  // Open modal for editing user
  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setShowFormModal(false);
  };

  // Submit create form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Vui lòng nhập Email.");
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error("Vui lòng nhập mật khẩu cho tài khoản mới.");
      return;
    }

    try {
      setIsSubmitting(true);
      const url = "/api/admin/accounts";
      const method = editingUser ? "PUT" : "POST";

      const payload: any = {
        ...formData,
        id: editingUser?.id
      };

      if (editingUser && !formData.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gửi yêu cầu thất bại.");
      }

      toast.success(data.message || "Thao tác thành công!");
      setShowFormModal(false);
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi lưu tài khoản.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete user account
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/accounts?id=${deletingUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể xóa tài khoản này.");
      }

      toast.success(data.message || "Xóa tài khoản thành công!");
      setDeletingUser(null);
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi xóa tài khoản.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && user.is_active) ||
      (statusFilter === "INACTIVE" && !user.is_active);

    const matchesDept = deptFilter === "ALL" || user.department === deptFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesDept;
  });

  // Access check
  if (role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <header className="pb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-on-surface-variant font-medium">Cấu hình</p>
          <h1 className="mt-3 text-3xl font-semibold text-on-surface font-manrope">Quản Lý Account</h1>
        </header>

        <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-red-200 bg-red-50/50">
          <div className="h-16 w-16 rounded-full bg-surface-bright border border-red-200 flex items-center justify-center text-red-500 mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold text-on-surface mb-2 font-manrope">Quyền truy cập bị từ chối</h2>
          <p className="text-sm text-on-surface-variant max-w-sm">
            Trang này chỉ dành cho tài khoản có vai trò Quản trị viên (Admin). Vui lòng chuyển Chế độ giả lập ở góc dưới bên trái của Sidebar thành "Admin" để xem nội dung.
          </p>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === "ADMIN").length;
  const userCount = users.filter(u => u.role === "USER").length;
  const inactiveCount = users.filter(u => !u.is_active).length;

  // Department labels
  const deptLabel = (dept: string | null) => {
    if (dept === "TECH") return "Phòng Kỹ Thuật";
    if (dept === "SALES") return "Phòng Kinh Doanh";
    return dept || "Chưa xác định";
  };

  const deptBadgeClass = (dept: string | null) => {
    if (dept === "TECH") return "bg-blue-50 text-blue-700 border-blue-200";
    if (dept === "SALES") return "bg-pink-50 text-pink-700 border-pink-200";
    return "bg-surface-container text-on-surface-variant";
  };

  return (
    <div className="space-y-6 pb-12 text-on-surface">
      <Toaster position="top-right" richColors duration={1500} />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6">
        <div>
          <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-2">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-primary font-semibold">Quản lý thành viên</span>
          </nav>
          <h1 className="font-manrope font-bold text-headline-lg text-on-surface">Quản lý thành viên</h1>
          <p className="mt-1 text-sm text-on-surface-variant font-inter">
            Quản lý nhân sự, phòng ban và Ngôi sao hy vọng.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-750 font-semibold text-white text-sm transition-all"
          >
            <UserPlus className="h-4.5 w-4.5" />
            <span>Thêm tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card className="bg-surface-bright p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant font-semibold uppercase">Tổng nhân sự</p>
            <h4 className="text-2xl font-bold text-on-surface mt-2">{totalCount}</h4>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
        </Card>

        {/* Admins */}
        <Card className="bg-surface-bright p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant font-semibold uppercase">Quản trị viên</p>
            <h4 className="text-2xl font-bold text-indigo-600 mt-2">{adminCount}</h4>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </Card>

        {/* Normal Users */}
        <Card className="bg-surface-bright p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant font-semibold uppercase">Thành viên (User)</p>
            <h4 className="text-2xl font-bold text-on-surface mt-2">{userCount}</h4>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <UserCheck className="h-6 w-6" />
          </div>
        </Card>

        {/* Inactive */}
        <Card className="bg-surface-bright p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant font-semibold uppercase">Tài khoản bị khóa</p>
            <h4 className="text-2xl font-bold text-rose-600 mt-2">{inactiveCount}</h4>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <UserX className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Filters & Search section */}
      <Card className="bg-surface-bright p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative md:col-span-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm thành viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface-bright border-none rounded-xl text-sm text-on-surface placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Role filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-bright border-none rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="ALL">Tất cả Vai trò (Role)</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>

          {/* Department filter */}
          <div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-bright border-none rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="ALL">Tất cả Phòng ban</option>
              <option value="TECH">Phòng Kỹ Thuật (TECH)</option>
              <option value="SALES">Phòng Kinh Doanh (SALES)</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex gap-2 items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-bright border-none rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Đã khóa</option>
            </select>

            <button
              onClick={fetchAccounts}
              title="Tải lại danh sách"
              className="p-2.5 rounded-xl hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-all duration-150"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* Main Accounts Table */}
      <Card className="bg-surface-bright overflow-hidden">
        {isLoading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-on-surface-variant gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Đang tải danh sách tài khoản...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-on-surface-variant p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-3">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-on-surface">Không tìm thấy tài khoản nào</p>
            <p className="text-sm text-on-surface-variant mt-1 max-w-xs">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-none bg-surface-container-low text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Phòng ban</th>
                  <th className="px-6 py-4 text-center">Ngôi sao hy vọng</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-sm">
                {filteredUsers.map((user) => {
                  const isSelf = session?.user?.email === user.email;

                  return (
                    <tr key={user.id} className="hover:bg-surface-container-low/50 transition-all duration-150">
                      {/* Name & Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.name || user.username || user.email} src={user.avatar_url} size="sm" />
                          <div>
                            <span className="font-semibold text-on-surface flex items-center gap-1.5">
                              {user.name || "Chưa đặt tên"}
                              {user.role === "ADMIN" && (
                                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full font-semibold">
                                  ADMIN
                                </span>
                              )}
                              {isSelf && (
                                <span className="text-[10px] bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded-full">
                                  Bạn
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-on-surface-variant block mt-0.5 font-mono">
                              @{user.username} &bull; {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${deptBadgeClass(user.department)}`}>
                          <Briefcase className="h-3 w-3" />
                          {deptLabel(user.department)}
                        </span>
                      </td>

                      {/* Hope Stars */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                          <Star className={`h-4 w-4 ${user.hope_stars > 0 ? "text-amber-500 fill-amber-400" : "text-amber-300"}`} />
                          <span className="font-bold text-amber-800 text-sm">{user.hope_stars}</span>
                          <span className="text-[10px] text-amber-600 ml-1">
                            (đã dùng {user.used_stars_this_month}/3)
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          user.is_active ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            user.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                          }`} />
                          {user.is_active ? "Đang hoạt động" : "Đã khóa"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            title="Sửa tài khoản"
                            className="p-2 bg-surface-bright hover:bg-indigo-50 rounded-xl text-on-surface-variant hover:text-indigo-600 transition-all"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => setDeletingUser(user)}
                            disabled={isSelf}
                            title={isSelf ? "Bạn không thể xóa chính mình" : "Xóa tài khoản"}
                            className={`p-2 rounded-xl transition-all ${
                              isSelf
                                ? "bg-surface-container-low text-on-surface-variant cursor-not-allowed"
                                : "bg-surface-bright hover:bg-rose-50 hover:border-rose-350 text-on-surface-variant hover:text-rose-600"
                            }`}
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
      </Card>

      {/* MODAL: CREATE ACCOUNT */}
      {showFormModal && !editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => !isSubmitting && setShowFormModal(false)}
            className="absolute inset-0 bg-black/40"
          />

          {/* Form Card */}
          <Card className="w-full max-w-lg bg-surface-bright shadow-[0_32px_64px_rgba(19,27,46,0.12)] relative z-10 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-surface-container-low/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 font-manrope">
                <User className="h-5 w-5 text-indigo-600" />
                Thêm Tài Khoản Mới
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                disabled={isSubmitting}
                className="text-on-surface-variant hover:text-on-surface transition-all duration-150"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-on-surface tracking-wide uppercase flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-on-surface-variant" />
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface placeholder-slate-400 disabled:opacity-50 disabled:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-on-surface tracking-wide uppercase">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-on-surface tracking-wide uppercase">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu tài khoản"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-on-surface tracking-wide uppercase">
                    Phòng ban
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="TECH">Phòng Kỹ Thuật (TECH)</option>
                    <option value="SALES">Phòng Kinh Doanh (SALES)</option>
                  </select>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-on-surface tracking-wide uppercase">
                    Vai trò (Role)
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as "ADMIN" | "USER" })}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="USER">USER (Nhân viên)</option>
                    <option value="ADMIN">ADMIN (Quản trị)</option>
                  </select>
                </div>

                {/* Active Status */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      disabled={isSubmitting}
                      className="mt-1 w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500/30 bg-surface-bright transition-all cursor-pointer disabled:opacity-50"
                    />
                    <div>
                      <span className="text-sm font-semibold text-on-surface">Cho phép hoạt động</span>
                      <p className="text-xs text-on-surface-variant mt-0.5">Tài khoản có thể đăng nhập vào hệ thống khi được bật</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 bg-surface-container-low/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl hover:bg-surface-container text-on-surface text-sm font-semibold transition-all duration-150"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4.5 w-4.5" />
                      <span>Tạo tài khoản</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ADMIN EDIT USER MODAL */}
      {editingUser && (
        <AdminUserEditModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={fetchAccounts}
        />
      )}

      {/* CONFIRMATION MODAL: DELETE USER */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmitting && setDeletingUser(null)}
            className="absolute inset-0 bg-black/40"
          />

          <Card className="w-full max-w-md bg-surface-bright shadow-[0_32px_64px_rgba(19,27,46,0.12)] relative z-10 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="px-6 py-5 bg-surface-container-low/50 flex items-center gap-3 text-red-650">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-on-surface font-manrope">Xác nhận xóa tài khoản</h3>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm text-on-surface">
                Bạn có chắc chắn muốn xóa tài khoản của <strong className="text-on-surface">{deletingUser.name || deletingUser.username || deletingUser.email}</strong>?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-relaxed">
                <strong>Chú ý:</strong> Hành động này không thể hoàn tác. Việc xóa tài khoản này đồng thời sẽ xóa bỏ tất cả dữ liệu liên quan như các lượt check-in của nhân viên này trên hệ thống.
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-container-low/50 flex justify-end gap-3">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl hover:bg-surface-container text-on-surface text-sm font-semibold transition-all duration-150"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4.5 w-4.5" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
