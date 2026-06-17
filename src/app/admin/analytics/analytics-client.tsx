"use client";

import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  LineChart, Line
} from "recharts";
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

      {/* Breadcrumbs */}
      <nav className="flex gap-2 text-label-sm text-outline text-xs">
        <span>Dashboard</span>
        <span>/</span>
        <span className="text-primary font-semibold">Reports & Analytics</span>
      </nav>

      {/* KPI Cards Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        {/* Card 1: Total Posts */}
        <div className="bg-white p-lg rounded-2xl card-shadow flex items-center justify-between group hover:translate-y-[-2px] transition-transform duration-300 border border-outline-variant/10">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider text-xs">Tổng bài viết tháng này</p>
            <h3 className="font-headline-lg text-headline-lg text-primary">{totalPostsThisMonth}</h3>
            <p className="font-label-sm text-label-sm text-secondary flex items-center gap-1 mt-2 text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              +12% so với tháng trước
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">post_add</span>
          </div>
        </div>

        {/* Card 2: Company Completion */}
        <div className="bg-white p-lg rounded-2xl card-shadow flex items-center justify-between group hover:translate-y-[-2px] transition-transform duration-300 border border-outline-variant/10">
          <div className="flex-grow pr-2">
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider text-xs">Tỷ lệ hoàn thành công ty</p>
            <h3 className="font-headline-lg text-headline-lg text-on-surface">{companyAvg.toFixed(1)}%</h3>
            <div className="w-full bg-surface-container-high h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: `${companyAvg}%` }}></div>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
            <span className="material-symbols-outlined text-3xl">verified</span>
          </div>
        </div>

        {/* Card 3: Pending Users */}
        <div className="bg-error-container p-lg rounded-2xl card-shadow flex items-center justify-between group hover:translate-y-[-2px] transition-transform duration-300 border border-outline-variant/10">
          <div>
            <p className="font-label-sm text-label-sm text-on-error-container mb-1 uppercase tracking-wider text-xs">Nhân sự chưa đạt chỉ tiêu</p>
            <h3 className="font-headline-lg text-headline-lg text-on-error-container">{pendingUsersCount}</h3>
            <p className="font-label-sm text-label-sm text-on-error-container/80 flex items-center gap-1 mt-2 text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              Cần gửi thông báo nhắc nhở
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-on-error flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-3xl">group_off</span>
          </div>
        </div>
      </section>

      {/* Charts Section (Bento Style) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Department Completion Chart */}
        <div className="bg-white p-lg rounded-2xl card-shadow border border-outline-variant/10">
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} domain={[0, 100]} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: any) => [`${value}%`, 'Tỷ lệ hoàn thành']}
                />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {departmentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate < 70 ? '#ba1a1a' : entry.rate < 90 ? '#7e3000' : '#006c49'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Engagement Trends */}
        <div className="bg-white p-lg rounded-2xl card-shadow border border-outline-variant/10 overflow-hidden">
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} domain={[0, 100]} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: any) => [`${value}%`, 'Tỷ lệ check-in']}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#3525cd" 
                  strokeWidth={4} 
                  dot={{ r: 5, fill: '#3525cd', strokeWidth: 2, stroke: '#fff' }} 
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
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-secondary">
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
              <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Từ ngày</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col flex-1">
              <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Đến ngày</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button 
            onClick={handleExportExcel}
            className="bg-[#1D6F42] hover:bg-[#155331] text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-md shadow-[#1D6F42]/10"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Xuất Báo Cáo Excel
          </button>
        </div>
      </section>


      {/* User Completion Table */}
      <section className="bg-white rounded-2xl card-shadow border border-outline-variant/10 overflow-hidden">
        <div className="p-lg border-b border-outline-variant/10 flex justify-between items-center">
          <h4 className="font-title-lg text-title-lg text-on-surface font-bold">Chi tiết hiệu suất nhân sự</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-lg py-md font-label-md text-on-surface-variant font-bold">Thành viên</th>
                <th className="px-lg py-md font-label-md text-on-surface-variant font-bold">Bộ phận</th>
                <th className="px-lg py-md font-label-md text-on-surface-variant font-bold text-center">Nhiệm vụ</th>
                <th className="px-lg py-md font-label-md text-on-surface-variant font-bold text-center">Hoàn thành</th>
                <th className="px-lg py-md font-label-md text-on-surface-variant font-bold text-center">Bỏ lỡ</th>
                <th className="px-lg py-md font-label-md text-on-surface-variant font-bold text-center">Tỷ lệ</th>
                <th className="px-lg py-md font-label-md text-on-surface-variant font-bold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paginatedEmployees.map((user) => {
                const isRed = user.rate < 70;
                const isAmber = user.rate >= 70 && user.rate < 90;
                
                let rateBadgeClass = "bg-emerald-50 text-emerald-700";
                if (isRed) {
                  rateBadgeClass = "bg-rose-50 text-rose-700";
                } else if (isAmber) {
                  rateBadgeClass = "bg-amber-50 text-amber-700";
                }

                return (
                  <tr key={user.id} className={cn("hover:bg-surface-container/30 transition-colors", isRed && "bg-rose-50/10")}>
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} size="md" />
                        <div>
                          <p className="font-title-md text-on-surface font-semibold">{user.name}</p>
                          <p className="font-label-sm text-outline text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-lg py-md font-body-sm text-on-surface-variant">{user.department}</td>
                    <td className="px-lg py-md font-body-sm text-on-surface text-center">{user.total}</td>
                    <td className="px-lg py-md font-body-sm text-emerald-600 font-bold text-center">{user.completed}</td>
                    <td className="px-lg py-md font-body-sm text-rose-600 font-bold text-center">{user.missed}</td>
                    <td className="px-lg py-md text-center">
                      <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", rateBadgeClass)}>
                        {user.rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-lg py-md text-right">
                      {(isRed || isAmber) ? (
                        <button 
                          onClick={() => handleSendReminder(user)}
                          className="text-error font-bold hover:underline font-label-md text-xs flex items-center gap-1 ml-auto"
                        >
                          <span className="material-symbols-outlined text-[16px]">campaign</span>
                          Nhắc nhở
                        </button>
                      ) : (
                        <span className="text-outline-variant text-xs italic">Đạt chỉ tiêu</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {totalEmployees === 0 && (
                <tr>
                  <td colSpan={7} className="px-lg py-10 text-center text-on-surface-variant italic font-body-sm">
                    Chưa có nhân sự nào trong hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {totalEmployees > itemsPerPage && (
          <div className="p-lg bg-surface-container-low flex justify-between items-center border-t border-outline-variant/10">
            <p className="font-label-sm text-outline text-xs">
              Hiển thị {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalEmployees)} trên {totalEmployees} nhân viên
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-outline-variant rounded-lg hover:bg-white disabled:opacity-50 flex items-center justify-center transition-all bg-white"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-outline-variant rounded-lg hover:bg-white disabled:opacity-50 flex items-center justify-center transition-all bg-white"
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
