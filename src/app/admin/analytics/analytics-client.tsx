"use client";

import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  LineChart, Line
} from "recharts";
import {
  TrendingUp, AlertTriangle, CheckCircle, BarChart3, Users, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast, Toaster } from "sonner";

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

  const handleSendReminder = (user: any) => {
    toast.success(`Đã gửi email nhắc nhở tới ${user.name}!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Thống Kê & Hiệu Suất</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Đánh giá hiệu suất chia sẻ bài viết của toàn bộ nhân sự</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tổng bài viết tháng này</h3>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{totalPostsThisMonth}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tỷ lệ hoàn thành công ty</h3>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{companyAvg.toFixed(1)}%</p>
            {companyAvg >= 80 ? (
              <span className="text-sm text-emerald-500 font-medium flex items-center mb-1"><TrendingUp className="w-4 h-4 mr-1" /> Tốt</span>
            ) : (
              <span className="text-sm text-amber-500 font-medium flex items-center mb-1"><AlertTriangle className="w-4 h-4 mr-1" /> Cần cải thiện</span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-40 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Bài viết tương tác kém nhất</h3>
            <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <div className="space-y-2 overflow-y-auto pr-2 scrollbar-thin">
            {worstPosts.length > 0 ? worstPosts.map((post, idx) => (
              <div key={post.id} className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1 flex-1 pr-2">{idx + 1}. {post.title}</p>
                <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-md">{post.completionRate.toFixed(0)}%</span>
              </div>
            )) : (
              <p className="text-sm text-slate-400 italic">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Tỷ lệ hoàn thành theo Phòng ban</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Tỷ lệ hoàn thành']}
                />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {departmentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate < 70 ? '#ef4444' : entry.rate < 90 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Xu hướng Check-in Tuần này</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Tỷ lệ hoàn thành']}
                />
                <Line type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={4} dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* User Performance Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Chi Tiết Hiệu Suất Nhân Sự</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhân viên</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phòng ban</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Nhiệm vụ</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Hoàn thành</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Bỏ lỡ</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Tỷ lệ</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {userPerformanceList.map((user) => {
                const isRed = user.rate < 70;
                const isAmber = user.rate >= 70 && user.rate < 90;
                const isGreen = user.rate >= 90;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img src={user.image} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg">
                        {user.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-medium text-slate-600 dark:text-slate-400">
                      {user.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {user.completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-rose-500 dark:text-rose-400">
                      {user.missed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center items-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold",
                          isRed && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                          isAmber && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                          isGreen && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        )}>
                          {user.rate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {(isRed || isAmber) ? (
                        <button
                          onClick={() => handleSendReminder(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-semibold rounded-lg transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" /> Nhắc nhở
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Đạt yêu cầu</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {userPerformanceList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 italic">
                    Chưa có dữ liệu nhân sự.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
