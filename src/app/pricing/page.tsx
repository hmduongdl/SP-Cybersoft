"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Box, Diamond, X, Lock, Loader2, Gift } from "lucide-react";
import Link from "next/link";
import CountUp from "react-countup";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Miễn phí",
    planKey: "free",
    description: "Dùng thử các tính năng cơ bản",
    priceMonthly: "FREE",
    priceYearly: "FREE",
    priceMonthlyVal: 0,
    priceYearlyVal: 0,
    originalYearly: null,
    features: [
      { text: "AI Pop-up chat cơ bản (giới hạn lượt dùng)", included: true },
      { text: "Build PC: Phân tích tối đa 3 cấu hình", included: true },
      { text: "Duyệt kết quả submit thủ công", included: true },
      { text: "Không hỗ trợ nộp bài muộn", included: false, icon: Lock },
      { text: "AI Studio đang bị khóa", included: false, icon: Lock },
    ],
    icon: <Box className="w-5 h-5 lg:w-6 lg:h-6 text-slate-400" />,
    popular: false,
    buttonText: "Gói hiện tại",
    buttonVariant: "outline",
    color: "from-slate-500/10 to-slate-400/10",
    border: "border-slate-800",
  },
  {
    name: "PRO",
    planKey: "pro",
    description: "Phù hợp người dùng thường xuyên",
    priceMonthly: "18.000đ",
    priceYearly: "189.000đ",
    priceMonthlyVal: 18000,
    priceYearlyVal: 189000,
    originalYearly: "216.000đ",
    features: [
      { text: "15 triệu AI token / tháng", included: true },
      { text: "Build PC: Không giới hạn kết quả", included: true },
      { text: "Instant Approval — duyệt tự động", included: true },
      { text: "AI Studio: 20 lượt / tháng", included: true },
      { text: "VIP Task Manager", included: true },
      { text: "Báo cáo tuần (xuất tối đa 4 lần/tháng)", included: true },
      { text: "Company Workflow (xem + sửa tối đa 2 quy trình)", included: true },
      { text: "Tối đa 10 Workspaces", included: true },
      { text: "Nộp bài muộn tối đa 1 tiếng", included: true },
    ],
    icon: <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-purple-400" />,
    popular: true,
    buttonText: "Nâng cấp PRO",
    buttonVariant: "gradient",
    color: "from-purple-500/20 to-pink-500/20",
    border: "border-purple-500",
  },
  {
    name: "MAX",
    planKey: "max",
    description: "Dành cho người dùng chuyên sâu",
    priceMonthly: "69.000đ",
    priceYearly: "689.000đ",
    priceMonthlyVal: 69000,
    priceYearlyVal: 689000,
    originalYearly: "828.000đ",
    features: [
      { text: "50 triệu AI token / tháng", included: true },
      { text: "Build PC: Không giới hạn & trả kết quả tức thì", included: true },
      { text: "AI Studio: Không giới hạn", included: true },
      { text: "Báo cáo ngày/tuần/tháng — xuất không giới hạn", included: true },
      { text: "Company Workflow — toàn quyền quản lý", included: true },
      { text: "Trọn bộ tính năng AI nâng cao & VIP", included: true },
      { text: "Bài viết luôn được AI duyệt tự động", included: true },
      { text: "Tối đa 20 Workspaces", included: true },
      { text: "Nộp bài muộn tối đa 5 tiếng", included: true },
    ],
    icon: <Diamond className="w-5 h-5 lg:w-6 lg:h-6 text-amber-400" />,
    popular: false,
    buttonText: "Nâng cấp MAX",
    buttonVariant: "premium",
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-slate-800",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(true);
  const [isCooldown, setIsCooldown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Làm tròn về số chẵn gần nhất để hiển thị giá "hàng năm quy đổi / tháng"
  const roundToEven = (value: number) => Math.round(value / 2) * 2;

  // Kiểm tra thời gian khuyến mãi (06/07/2026 - 25/08/2026)
  const now = new Date();
  const promoStart = new Date("2026-07-06T00:00:00+07:00");
  const promoEnd = new Date("2026-08-25T23:59:59+07:00");
  const isPromoActive = now >= promoStart && now <= promoEnd;

  const handleCheckout = async (planKey: string, customCycle?: string) => {
    if (planKey === "free" || loadingPlan) return;
    setLoadingPlan(planKey === "max" && customCycle === "promo_3_1" ? "max_promo" : planKey);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: planKey, cycle: customCycle || (isYearly ? "yearly" : "monthly") }),
      });
      if (res.status === 401) {
        router.push("/login?callbackUrl=/pricing");
        return;
      }
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      // silent fail, button sẽ reset
    } finally {
      setLoadingPlan(null);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    if (isCooldown) return;
    setIsYearly(!isYearly);
    setIsCooldown(true);
    setTimeout(() => {
      setIsCooldown(false);
    }, 500); // 500ms cooldown to prevent spamming
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#0A0A0B] text-white selection:bg-purple-500/30 relative flex flex-col justify-center py-6">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-pink-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col h-full lg:justify-center">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-6 lg:mb-8 shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 py-2 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 font-manrope">
              Nâng cấp trải nghiệm của bạn
            </h1>
            <p className="text-sm sm:text-base text-slate-400 mb-5 max-w-2xl mx-auto">
              Bứt phá hiệu suất công việc cùng trợ lý AI thế hệ mới. Nâng cấp ngay để mở khóa toàn bộ đặc quyền và tính năng VIP dành riêng cho bạn.
            </p>
          </motion.div>

          {/* Billing Toggle (Claude Style) */}
          <div className="flex items-center justify-center gap-3 relative z-10 mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex bg-slate-900/60 p-1 rounded-full border border-slate-800/80"
            >
              <div className="relative flex items-center">
                {/* Option 1: Monthly */}
                <button
                  onClick={() => !isYearly ? null : handleToggle()}
                  disabled={isCooldown}
                  className={`px-5 py-1.5 rounded-full text-xs font-semibold relative transition-colors duration-200 z-10 flex items-center ${isCooldown ? 'cursor-not-allowed' : ''} ${
                    !isYearly ? "text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {!isYearly && (
                    <motion.div
                      layoutId="activePricingTab"
                      className="absolute inset-0 bg-slate-800 rounded-full -z-10 border border-slate-700"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  Hàng tháng
                </button>

                {/* Option 2: Yearly */}
                <button
                  onClick={() => isYearly ? null : handleToggle()}
                  disabled={isCooldown}
                  className={`px-5 py-1.5 rounded-full text-xs font-semibold relative transition-colors duration-200 z-10 flex items-center ${isCooldown ? 'cursor-not-allowed' : ''} ${
                    isYearly ? "text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {isYearly && (
                    <motion.div
                      layoutId="activePricingTab"
                      className="absolute inset-0 bg-slate-800 rounded-full -z-10 border border-slate-700"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  Hàng năm
                </button>
              </div>
            </motion.div>

            {/* Savings Badge outside the box */}
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="px-2 py-0.5 text-[10px] font-semibold text-purple-300 bg-purple-500/20 rounded-full border border-purple-500/30 whitespace-nowrap"
            >
              Tiết kiệm đến 20%
            </motion.span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 max-w-6xl mx-auto items-stretch w-full flex-1 min-h-0 pb-4 lg:pb-0 justify-center">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: hoveredIndex === null ? 1 : hoveredIndex === index ? 1 : 0.35,
                filter: hoveredIndex === null ? "blur(0px)" : hoveredIndex === index ? "blur(0px)" : "blur(1.5px)",
                scale: hoveredIndex === index ? 1.03 : 1,
                y: hoveredIndex === index ? -16 : (plan.popular ? -8 : 0),
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`relative rounded-3xl p-[1.5px] flex-1 flex flex-col w-full sm:w-1/3 max-w-md sm:max-w-none mx-auto overflow-hidden ${plan.popular ? 'shadow-2xl shadow-purple-500/20' : 'bg-slate-800'}`}
            >
              {plan.popular && (
                <motion.div
                  className="absolute top-[-150%] left-[-150%] w-[400%] h-[400%] bg-[conic-gradient(from_0deg,transparent_30%,#a855f7_50%,#ec4899_70%,transparent_100%)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}
              <div className="h-full bg-[#0F0F11] rounded-[22px] p-5 lg:p-6 flex flex-col relative overflow-hidden group hover:bg-[#131316] transition-colors flex-1 z-10">
                <div className={`absolute inset-0 bg-gradient-to-b ${plan.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative z-10 flex flex-col h-full flex-1">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      {plan.popular && (
                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                          Phổ biến nhất
                        </span>
                      )}
                    </div>
                    <div className="p-1.5 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10 shrink-0">
                      {plan.icon}
                    </div>
                  </div>
                  
                  <p className="text-slate-400 text-[12px] lg:text-[13px] mb-4 min-h-[36px]">
                    {plan.description}
                  </p>
                  
                  {/* Price */}
                  <div className="mb-4 flex flex-col justify-end min-h-[50px]">
                    {isYearly && plan.originalYearly && (
                      <span className="text-slate-500 line-through text-[11px] lg:text-xs font-medium mb-0.5">
                        {(() => {
                          const originalVal = parseInt(plan.originalYearly.replace(/\D/g, ""), 10);
                          return `${roundToEven(originalVal / 12).toLocaleString("vi-VN")}đ`;
                        })()} / tháng
                      </span>
                    )}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl lg:text-4xl font-extrabold text-white">
                        {plan.priceMonthly === "FREE" ? (
                          "FREE"
                        ) : !mounted ? (
                          isYearly ? `${roundToEven(plan.priceYearlyVal / 12).toLocaleString("vi-VN")}đ` : plan.priceMonthly
                        ) : (
                          <CountUp
                            end={isYearly ? roundToEven(plan.priceYearlyVal / 12) : plan.priceMonthlyVal}
                            separator="."
                            duration={0.4}
                            suffix="đ"
                          />
                        )}
                      </span>
                      {plan.priceMonthly !== "FREE" && (
                        <span className="text-slate-500 text-xs lg:text-sm font-medium">
                          / tháng
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-2.5 lg:space-y-3 mb-5 flex-1 overflow-y-auto pr-1">
                    {(plan.features as { text: string; included: boolean; icon?: React.ElementType }[]).map((feature, i) => (
                      <div key={i} className={`flex items-start gap-2 ${!feature.included ? 'opacity-50' : ''}`}>
                        <div className={`mt-0.5 p-0.5 rounded-full shrink-0 ${feature.included ? 'bg-green-500/20' : 'bg-slate-500/20'}`}>
                          {feature.included ? (
                            <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-green-400" />
                          ) : feature.icon ? (
                            <feature.icon className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-slate-400" />
                          ) : (
                            <X className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-slate-400" />
                          )}
                        </div>
                        <span className={`text-[12px] lg:text-[13px] leading-snug ${feature.included ? 'text-slate-300' : 'text-slate-400'}`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Button */}
                  <button
                    onClick={() => handleCheckout(plan.planKey)}
                    disabled={!!loadingPlan || plan.planKey === "free"}
                    className={`w-full py-2.5 lg:py-3 rounded-xl text-sm font-semibold transition-all mt-auto shrink-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed
                    ${plan.buttonVariant === 'gradient' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]' 
                      : plan.buttonVariant === 'premium'
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02]'
                      : 'bg-white/5 text-white border border-white/10 cursor-default'
                    }`}
                  >
                    {loadingPlan === plan.planKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {plan.buttonText}
                        {plan.buttonVariant === 'gradient' && <Sparkles className="w-3.5 h-3.5" />}
                        {plan.buttonVariant === 'premium' && <Diamond className="w-3.5 h-3.5" />}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Back Link */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 lg:mt-6 text-center shrink-0"
        >
          <Link href="/dashboard" className="text-xs lg:text-sm text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5">
            &larr; Quay lại Studio
          </Link>
        </motion.div>
      </div>

      {/* Floating Gift Box Promotion */}
      {isPromoActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-6 right-6 z-50 group cursor-pointer"
        >
          <div className="relative">
            {/* Wiggle & Jump looping animation directly on the raw Gift Icon */}
            <motion.div
              animate={{
                y: [0, -12, 0, -8, 0],
                rotate: [0, -12, 12, -12, 12, 0]
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                repeatDelay: 0.8,
                ease: "easeInOut"
              }}
              className="text-pink-500 hover:text-pink-400 drop-shadow-[0_0_20px_rgba(236,72,153,0.6)] filter hover:brightness-110 transition-all duration-300"
            >
              <Gift className="w-12 h-12" />
            </motion.div>
            
            {/* Premium Tooltip / Popover (Căn dọc giữa lệch xuống nhẹ với -translate-y-[35%], đảm bảo bắt cầu hover 100% ổn định) */}
            <div className="absolute right-full top-1/2 -translate-y-[35%] pr-3 w-72 opacity-0 scale-95 origin-right group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto z-50">
              <div className="p-4 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-pink-500/10 rounded-lg">
                    <Gift className="w-5 h-5 text-pink-500 shrink-0" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 uppercase tracking-wider">
                      Ưu đãi đặc biệt gói MAX
                    </h4>
                    <p className="text-xs font-semibold text-white mt-1.5 leading-relaxed">
                      Mua từ 3 tháng gói <span className="text-amber-400">MAX</span> tặng thêm ngay <span className="text-pink-400">1 tháng</span> sử dụng!
                    </p>
                    
                    {/* Buy Now Promo Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckout("max", "promo_3_1");
                      }}
                      disabled={!!loadingPlan}
                      className="w-full mt-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-pink-500/20 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingPlan === "max_promo" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Mua ngay (3 tháng)</span>
                          <span className="text-[10px] text-pink-200 line-through font-normal">276K</span>
                          <span className="text-[10px] text-amber-300 font-extrabold">189K</span>
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-slate-500 mt-3 border-t border-slate-800/80 pt-2 flex justify-between">
                      <span>Thời gian áp dụng:</span>
                      <span className="font-semibold text-slate-400">06/07 - 25/08/2026</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
