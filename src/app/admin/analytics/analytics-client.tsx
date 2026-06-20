"use client";

import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  LineChart, Line
} from "recharts";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { toast, Toaster } from "sonner";
import { UserAvatar } from "@/components/shared/user-avatar";

type Props = {
  totalPostsThisMonth: number;
  companyAvg: number;
  worstPosts: any[];
  departmentChartData: any[];
  trendChartData: any[];
  userPerformanceList: any[];
};

export default function AnalyticsClient({
  totalPostsThisMonth,
  companyAvg,
  worstPosts,
  departmentChartData,
  trendChartData,
  userPerformanceList
}: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleSendReminder = (user: any) => {
    toast.success(`Đã gửi email nhắc nhở thành công tới ${user.name}!`);
  };

  const handleExportExcel = async () => {
    try {
      toast.loading("Đang xuất file Excel...", { id: "excel-export" });
      
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      
      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(`/api/admin/export-excel${query}`);
      if (!response.ok) throw new Error("Xuất báo cáo thất bại");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const date = new Date();
      const formattedDate = `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}.${date.getFullYear()}`;
      a.download = `${formattedDate} - Bao Cao Cong Viec Like Share.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Tải báo cáo Excel thành công!", { id: "excel-export" });
    } catch (e: any) {
      toast.error(e.message || "Có lỗi xảy ra khi xuất báo cáo", { id: "excel-export" });
    }
  };

  // Pagination calculations
  const totalEmployees = userPerformanceList.length;
  const totalPages = Math.ceil(totalEmployees / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = userPerformanceList.slice(startIndex, startIndex + itemsPerPage);

  const pendingUsersCount = userPerformanceList.filter(u => u.rate < 90).length;

  return (
    <div className="w-full h-auto space-y-6 animate-in fade-in duration-300">
      <Toaster position="top-right" richColors duration={1500} />

      {/* Page Header */}
      <div>
        <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-2">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-primary font-semibold">Báo cáo & Phân tích</span>
        </nav>
        <h1 className="font-manrope font-bold text-headline-lg text-on-surface">Báo cáo & Phân tích</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-inter">
          Theo dõi hiệu suất check-in và thống kê hoạt động của toàn công ty.
        </p>
      </div>

      {/* KPI Cards Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {/* Card 1: Total Posts */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]">post_add</span>
            </div>
            <span className="inline-flex items-center px-3 py-1 bg-secondary-container text-on-secondary-container text-[12px] font-bold rounded-full uppercase tracking-wider">
              +12% Tháng này
            </span>
          </div>
          <div className="mt-6">
            <p className="font-inter text-[12px] font-semibold tracking-widest uppercase text-on-surface-variant/70">
              Tổng Bài Viết Tháng Này
            </p>
            <p className="font-manrope text-[40px] font-bold text-on-surface leading-tight">
              {String(totalPostsThisMonth).padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Card 2: Company Completion */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[20px]">verified</span>
            </div>
            <span className="inline-flex items-center px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant text-[12px] font-bold rounded-full uppercase tracking-wider">
              Đạt chỉ tiêu
            </span>
          </div>
          <div className="mt-6">
            <p className="font-inter text-[12px] font-semibold tracking-widest uppercase text-on-surface-variant/70 mb-2">
              Tỷ Lệ Hoàn Thành Công Ty
            </p>
            <p className="font-manrope text-[40px] font-bold text-on-surface leading-tight">
              {companyAvg.toFixed(1)}%
            </p>
            <div className="w-full bg-surface-container-high h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${companyAvg}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Users */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-error text-[20px]">group_off</span>
            </div>
            <span className="inline-flex items-center px-3 py-1 bg-error-container text-error text-[12px] font-bold rounded-full uppercase tracking-wider">
              Cần Nhắc Nhở
            </span>
          </div>
          <div className="mt-6">
            <p className="font-inter text-[12px] font-semibold tracking-widest uppercase text-on-surface-variant/70">
              Nhân Sự Chưa Đạt Chỉ Tiêu
            </p>
            <p className="font-manrope text-[40px] font-bold text-error leading-tight">
              {String(pendingUsersCount).padStart(2, "0")}
            </p>
          </div>
        </div>
      </section>

      {/* Charts Section (Bento Style) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Department Completion Chart */}
        <div className="bg-surface-mid dark:bg-[#131b2e] p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-xl">
            <div>
              <h4 className="font-title-lg text-title-lg text-on-surface font-bold">Hiệu suất phòng ban</h4>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Tỷ lệ hoàn thành thực tế theo nhóm</p>
            </div>
            <button className="p-2 hover:bg-surface-container rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
            </button>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={0}>
              <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0066ff" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#0050cb" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={isDark ? "#334155" : "rgba(19, 27, 46, 0.03)"} strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#44495a', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-inter)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#44495a', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-inter)' }} domain={[0, 100]} />
                <RechartsTooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    background: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 32px 64px rgba(19, 27, 46, 0.12)',
                    padding: '12px 16px',
                  }}
                  itemStyle={{
                    color: isDark ? '#e2e8f0' : '#131b2e',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                  labelStyle={{
                    color: isDark ? '#94a3b8' : '#44495a',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '11px',
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
                  formatter={(value: any) => [`${value}%`, 'Tỷ lệ hoàn thành']}
                />
                <Bar dataKey="rate" fill="url(#colorRate)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Engagement Trends */}
        <div className="bg-surface-mid dark:bg-[#131b2e] p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center mb-xl">
            <div>
              <h4 className="font-title-lg text-title-lg text-on-surface font-bold">Xu hướng Check-in tuần</h4>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Thống kê tỷ lệ thành công theo các ngày</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] text-outline font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span> Tỉ lệ
              </span>
            </div>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={0}>
              <LineChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0050cb" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#0066ff" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={isDark ? "#334155" : "rgba(19, 27, 46, 0.03)"} strokeDasharray="3 3" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#44495a', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-inter)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#44495a', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-inter)' }} domain={[0, 100]} />
                <RechartsTooltip
                  cursor={{ fill: 'transparent', stroke: isDark ? '#334155' : 'rgba(19, 27, 46, 0.03)', strokeWidth: 2 }}
                  contentStyle={{
                    background: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 32px 64px rgba(19, 27, 46, 0.12)',
                    padding: '12px 16px',
                  }}
                  itemStyle={{
                    color: isDark ? '#e2e8f0' : '#131b2e',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                  labelStyle={{
                    color: isDark ? '#94a3b8' : '#44495a',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '11px',
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
                  formatter={(value: any) => [`${value}%`, 'Tỷ lệ check-in']}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="url(#colorLine)" 
                  strokeWidth={4} 
                  dot={{ r: 5, fill: '#0050cb', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 7 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Export Section */}
      <section className="bg-surface-container-highest/20 p-lg rounded-2xl border border-primary/10 flex flex-col lg:flex-row justify-between items-center gap-lg">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 bg-surface-mid rounded-xl border border-slate-100 shadow-ambient flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-3xl">description</span>
          </div>
          <div>
            <h4 className="font-title-md text-title-md text-on-surface font-bold">Dữ liệu báo cáo sẵn sàng</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Tải báo cáo chi tiết hiệu suất check-in của nhân viên định dạng Excel chuyên nghiệp.
            </p>
          </div>
        </div>

        {/* Date Filters & Export button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <div className="flex flex-col flex-1">
              <label className="text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wider font-inter">Từ ngày</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 text-xs rounded-full bg-surface-container-low border-none text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all font-inter"
              />
            </div>
            <div className="flex flex-col flex-1">
              <label className="text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wider font-inter">Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 text-xs rounded-full bg-surface-container-low border-none text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all font-inter"
              />
            </div>
          </div>
          <button 
            onClick={handleExportExcel}
            className="bg-surface-container-high hover:bg-surface-container-highest text-primary px-5 py-2.5 rounded-[10px] text-xs font-bold font-inter flex items-center justify-center gap-2 transition-all duration-150 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Xuất Báo Cáo Excel
          </button>
        </div>
      </section>

      {/* User Completion Table */}
      <section className="bg-surface-mid dark:bg-[#131b2e] rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-none flex justify-between items-center">
          <h4 className="font-manrope font-bold text-lg text-on-surface">Chi tiết hiệu suất nhân sự</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 font-inter text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.05em]">
              <tr>
                <th className="px-6 py-4 font-semibold">Thành viên</th>
                <th className="px-6 py-4 font-semibold">Bộ phận</th>
                <th className="px-6 py-4 font-semibold text-center">Nhiệm vụ</th>
                <th className="px-6 py-4 font-semibold text-center">Hoàn thành</th>
                <th className="px-6 py-4 font-semibold text-center">Bỏ lỡ</th>
                <th className="px-6 py-4 font-semibold text-center">Tỷ lệ</th>
                <th className="px-6 py-4 font-semibold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y-0 text-sm">
              {paginatedEmployees.map((user) => {
                const isRed = user.rate < 70;
                const isAmber = user.rate >= 70 && user.rate < 90;
                
                let rateBadgeClass = "bg-emerald-500/10 text-emerald-700 border-none";
                if (isRed) {
                  rateBadgeClass = "bg-rose-500/10 text-rose-600 border-none";
                } else if (isAmber) {
                  rateBadgeClass = "bg-amber-500/10 text-amber-700 border-none";
                }

                return (
                  <tr 
                    key={user.id} 
                    className={cn(
                      "hover:bg-slate-50 dark:hover:bg-slate-800/50 even:bg-slate-50/40 dark:even:bg-slate-800/30 transition-all duration-150 group",
                      isRed && "bg-rose-500/[0.02]"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} size="md" />
                        <div>
                          <p className="font-inter text-sm font-semibold text-on-surface">{user.name}</p>
                          <p className="font-inter text-xs text-on-surface-variant">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-inter text-sm text-on-surface-variant font-medium">{user.department}</td>
                    <td className="px-6 py-4 font-inter text-sm text-on-surface text-center font-medium">{user.total}</td>
                    <td className="px-6 py-4 font-inter text-sm text-emerald-600 font-bold text-center">{user.completed}</td>
                    <td className="px-6 py-4 font-inter text-sm text-rose-600 font-bold text-center">{user.missed}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold font-inter", rateBadgeClass)}>
                        {user.rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(isRed || isAmber) ? (
                        <button 
                          onClick={() => handleSendReminder(user)}
                          className="text-error font-bold hover:underline font-inter text-xs flex items-center gap-1 ml-auto"
                        >
                          <span className="material-symbols-outlined text-[16px]">campaign</span>
                          Nhắc nhở
                        </button>
                      ) : (
                        <span className="text-outline-variant text-xs italic font-inter">Đạt chỉ tiêu</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {totalEmployees === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-on-surface-variant italic font-inter text-sm bg-surface-container-lowest">
                    Chưa có nhân sự nào trong hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {totalEmployees > itemsPerPage && (
          <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center border-none">
            <p className="font-inter text-xs text-on-surface-variant">
              Hiển thị {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalEmployees)} trên {totalEmployees} nhân viên
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-surface-container-high disabled:opacity-50 flex items-center justify-center transition-all bg-surface-container-lowest text-on-surface shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-surface-container-high disabled:opacity-50 flex items-center justify-center transition-all bg-surface-container-lowest text-on-surface shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
