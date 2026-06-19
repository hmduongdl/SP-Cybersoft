"use client";

import React from "react";
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="bg-slate-50 text-slate-900 flex flex-col items-center justify-center min-h-screen p-4">
      <div className="flex flex-col items-center max-w-lg text-center bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100">
        <div className="mb-8 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-indigo-50 p-6 rounded-full">
            <Wrench className="w-16 h-16 text-indigo-600 animate-[spin_4s_linear_infinite]" />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-900 mb-4 tracking-tight">
          HỆ THỐNG ĐANG BẢO TRÌ
        </h1>

        <p className="text-slate-600 text-lg leading-relaxed mb-8">
          Để nâng cấp hiệu năng và mang lại trải nghiệm tốt nhất cho bạn, chúng tôi đang tiến hành cập nhật định kỳ hệ thống SPS AI. Quá trình này sẽ hoàn tất trong ít phút. Rất xin lỗi vì sự bất tiện này!
        </p>

        <div className="bg-slate-50 p-4 rounded-xl mb-8 w-full border border-slate-100">
          <p className="text-sm text-slate-500 font-medium">
            Nếu cần hỗ trợ gấp, vui lòng liên hệ Bộ phận Nhân sự (HR) hoặc IT Admin.
          </p>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Kiểm tra lại
        </button>
      </div>
    </div>
  );
}
