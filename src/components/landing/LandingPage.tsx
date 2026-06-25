"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";

import { LandingAIChat } from "./LandingAIChat";

export default function LandingPage({ userName }: { userName?: string | null }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [formState, setFormState] = useState<"idle" | "loading" | "success">("idle");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }

      const sections = ["about", "products", "contact"];
      let current = "";
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            current = section;
          }
        }
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.getElementById(targetId);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top - 80, // account for fixed header
        behavior: "smooth",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState("loading");
    setTimeout(() => {
      setFormState("success");
      e.currentTarget.reset();
      setTimeout(() => {
        setFormState("idle");
      }, 3000);
    }, 1500);
  };

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="bg-background text-on-background font-inter overflow-x-hidden">
      {/* Header */}
      <header
        id="top-nav"
        className={`fixed top-0 w-full z-50 nav-blur border-b border-outline-variant transition-all duration-300 ${
          isScrolled ? "h-14 sm:h-16 shadow-md bg-background/80 backdrop-blur-lg" : "h-16 sm:h-20 bg-background/50 backdrop-blur-sm"
        }`}
      >
        <div className="flex justify-between items-center h-full px-4 sm:px-6 max-w-7xl mx-auto">
          <a href="https://www.sp-cybersoft.com/" target="_blank" rel="noopener noreferrer">
            <img src="/spcybersoftlogo.png" alt="SP Cybersoft" className="h-9 sm:h-[52px] w-auto dark:brightness-0 dark:invert" />
          </a>
          <nav className="hidden md:flex items-center space-x-6">
            <a
              href="#about"
              onClick={(e) => handleSmoothScroll(e, "about")}
              className={`text-sm font-medium transition-all duration-300 cursor-pointer pb-1 ${
                activeSection === "about" ? "text-primary font-bold border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"
              }`}
            >
              Về Chúng Tôi
            </a>
            <a
              href="#products"
              onClick={(e) => handleSmoothScroll(e, "products")}
              className={`text-sm font-medium transition-all duration-300 cursor-pointer pb-1 ${
                activeSection === "products" ? "text-primary font-bold border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"
              }`}
            >
              Sản Phẩm
            </a>
            <a
              href="#contact"
              onClick={(e) => handleSmoothScroll(e, "contact")}
              className={`text-sm font-medium transition-all duration-300 cursor-pointer pb-1 ${
                activeSection === "contact" ? "text-primary font-bold border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"
              }`}
            >
              Liên Hệ
            </a>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
            >
              Studio
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={userName ? "/dashboard" : "/login"}
              className="bg-primary text-on-primary text-xs sm:text-sm font-bold px-4 sm:px-6 py-2 rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all truncate max-w-[140px] xs:max-w-none"
            >
              {userName ? `Xin chào, ${userName}` : "Đăng nhập"}
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden border-t border-outline-variant bg-background/95 backdrop-blur-lg"
            >
              <nav className="flex flex-col px-4 py-3 gap-1">
                {[
                  { id: "about", label: "Về Chúng Tôi" },
                  { id: "products", label: "Sản Phẩm" },
                  { id: "contact", label: "Liên Hệ" },
                ].map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => handleSmoothScroll(e, item.id)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activeSection === item.id
                        ? "bg-primary-container text-primary font-bold"
                        : "text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  Studio
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-16 sm:pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[75vh] sm:min-h-[85vh] flex items-center overflow-hidden px-4 sm:px-6">
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-background to-surface" />
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 sm:gap-20 items-center relative z-10 w-full">
            <motion.div 
              initial="hidden" 
              animate="visible" 
              variants={staggerContainer}
            >
              <motion.span variants={fadeInUp} className="text-sm font-medium text-primary tracking-widest uppercase block mb-4">
                Giải Pháp Số Cho Người Thật, Việc Thật
              </motion.span>
              <motion.h1 variants={fadeInUp} className="font-manrope font-bold text-3xl sm:text-4xl md:text-5xl text-on-background mb-4 sm:mb-6 leading-tight">
                Chúng Tôi Viết Code Để <span className="text-primary-container">Làm Cho Thế Giới Tốt Hơn</span>.
              </motion.h1>
              <motion.p variants={fadeInUp} className="text-base sm:text-lg text-on-surface-variant mb-8 sm:mb-12 max-w-lg">
                Từ những ứng dụng quản lý doanh nghiệp đến hạ tầng đám mây, chúng tôi xây dựng phần mềm thực sự hữu ích — đơn giản, đáng tin cậy và vận hành trơn tru.
              </motion.p>
              <motion.div variants={fadeInUp} className="flex flex-col xs:flex-row flex-wrap gap-3 sm:gap-6">
                <a href="#contact" onClick={(e) => handleSmoothScroll(e, "contact")} className="bg-primary text-on-primary px-8 sm:px-12 py-3.5 sm:py-4 rounded-lg text-sm font-medium hover:shadow-lg hover:-translate-y-1 transition-all text-center">
                  Bắt đầu dự án
                </a>
                <a href="#products" onClick={(e) => handleSmoothScroll(e, "products")} className="border border-primary text-primary px-8 sm:px-12 py-3.5 sm:py-4 rounded-lg text-sm font-medium hover:bg-primary-fixed transition-all cursor-pointer text-center">
                  Xem Portfolio
                </a>
              </motion.div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="hidden md:block"
            >
              <div className="relative group">
                <div className="absolute -inset-4 bg-primary-container/20 blur-2xl rounded-full group-hover:bg-primary-container/40 transition-all duration-700" />
                <img
                  className="w-full h-[500px] object-cover rounded-xl shadow-2xl relative z-10 hover:scale-[1.02] transition-transform duration-500"
                  alt="A sophisticated high-tech office environment with clean white aesthetics and deep blue accents."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA0_OYLzPDvclGZ37Dbg5gCK1h39s0Tlkmpoe0PP-BYwFFFCb5Jez3cYCALHV86Z2jA2aYvbFIZcrOzRZHXMwKsPftCz0O-VxqwMvAH2UIvDMUuW3xfKp2IRCQSoJFCKJMAPgngg0yKDn4kgsM2BW55K00Isb9x43Z-i8mzHaqwjxeeGhZGQN23PpJXBshpkWceT58P5QS07RV2h5zjPO-kLvTDgFQi_YKajnWvkp34S6SZQEXTRhThX7Eiob5e6Q8yKtp10w8HBpE"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-24 bg-surface" id="about">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 items-center">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
                className="md:col-span-5"
              >
                <motion.h2 variants={fadeInUp} className="font-manrope font-semibold text-3xl text-primary mb-6">
                  Về Chúng Tôi
                </motion.h2>
                <motion.p variants={fadeInUp} className="text-base text-on-surface-variant mb-8">
                  SP Cybersoft là nhóm lập trình viên thuộc Công Ty TNHH Đầu Tư & Phát Triển Công Nghệ Song Phương. Đam mê xây dựng các hệ thống chuyên nghiệp, mang lại giải pháp tối ưu cho doanh nghiệp.
                </motion.p>
                <motion.div variants={fadeInUp} className="space-y-6 mb-12">
                  <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-surface-container-high transition-colors">
                    <span
                      className="material-symbols-outlined text-primary-container text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                    <div>
                      <h4 className="text-base font-medium font-bold text-on-surface">
                        Làm Ít Nhưng Chắc
                      </h4>
                      <p className="text-sm text-on-surface-variant mt-1">
                        Chúng tôi không chạy theo số lượng. Mỗi dòng code đều có lý do của nó.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-surface-container-high transition-colors">
                    <span
                      className="material-symbols-outlined text-primary-container text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      lightbulb
                    </span>
                    <div>
                      <h4 className="text-base font-medium font-bold text-on-surface">
                        Công Nghệ Là Công Cụ, Không Phải Đích Đến
                      </h4>
                      <p className="text-sm text-on-surface-variant mt-1">
                        AI, Cloud, Blockchain — chúng tôi dùng công nghệ phù hợp, không phải công nghệ thịnh hành.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-surface-container-high transition-colors">
                    <span
                      className="material-symbols-outlined text-primary-container text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      public
                    </span>
                    <div>
                      <h4 className="text-base font-medium font-bold text-on-surface">
                        Chuyển Đổi Số Thực Chất
                      </h4>
                      <p className="text-sm text-on-surface-variant mt-1">
                        Đưa doanh nghiệp bạn lên Google — và xa hơn thế nữa.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="md:col-span-7 grid grid-cols-2 gap-6"
              >
                <div className="aspect-square rounded-xl overflow-hidden shadow-lg">
                  <img
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                    alt="Close-up of a high-performance server rack."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuBRBZSh9SQNjYyN4BxqX3YiHf6Ur2Q9Tapd0PTCmKq8VPCvptxj4iqSK6ppTHZAQI_ThBIA0DRxqtdfkVDpzFJ_810h5fHOFfhrgAf8afYunKKgvaLgCTMyloaN3xxlANMJt12SEFURb5E2md_G2_6eTT14dTm55ls4XAF0EHF3ZhhdJqRwfx-ww_v1IiJo03NWiV9e8LL0A5GmGi_3dVexFm2jxpVZ41spH7Po3ttNYqpUF4vYy3FGXybaeD6rnCiQTYq6ekCWc"
                  />
                </div>
                <div className="aspect-square rounded-xl overflow-hidden shadow-lg mt-12">
                  <img
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                    alt="A diverse team of young professional software developers."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAw3Q8uLVGj1G1eTMazfW9UKuuQZk7MX10Br6KYRqryKZOXSxw3bMJNTp9us1tfhGDBiaqIPzeqxJEe38Rs4tLvQm6eEl7P9mLYxU7BjN10FWNT49sTdlb_YAgYwOih_dPdRFzl2PnIuVGheU2OuUAquaqLHTCWqs71hJ7O2vw28f8YUi6bOJyzY8tcwM8kwIk_MtKWyV8D7doTwB0MlV2WIYFE0xgDduH5mcuBhDPV343tYZl8YaFoimKs0pkAwT0QeJV3jcsC9iA"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="py-24 px-6 max-w-7xl mx-auto" id="products">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-20"
          >
            <h2 className="font-manrope font-semibold text-3xl md:text-4xl text-on-background mb-4">
              Sản Phẩm & Giải Pháp
            </h2>
            <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">
              Những giải pháp được xây dựng từ trải nghiệm thực tế, không phải từ slide bán hàng.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Product 1 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
              className="md:col-span-2 bg-surface-container-lowest p-12 rounded-2xl border border-outline-variant hover:border-primary hover:shadow-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <span
                  className="material-symbols-outlined text-5xl text-primary-container mb-6 block"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  laptop_mac
                </span>
                <h3 className="font-manrope font-semibold text-3xl text-on-surface mb-4 group-hover:text-primary transition-colors">
                  Enterprise Web Solutions
                </h3>
                <p className="text-lg text-on-surface-variant mb-8 max-w-md">
                  Hệ thống quản trị doanh nghiệp (ERP, CRM) được xây dựng chắc chắn, dễ mở rộng và thực sự dùng được.
                </p>
              </div>
              <Link
                href="#"
                className="inline-flex items-center text-primary font-bold group-hover:gap-3 gap-2 transition-all"
              >
                Khám phá chi tiết <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </motion.div>
            {/* Product 2 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
              className="bg-primary p-12 rounded-2xl text-on-primary shadow-lg hover:-translate-y-2 transition-transform duration-300 flex flex-col justify-between"
            >
              <div>
                <span
                  className="material-symbols-outlined text-5xl text-tertiary-fixed mb-6 block"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  smartphone
                </span>
                <h3 className="font-manrope font-semibold text-2xl mb-4">
                  Mobile App Development
                </h3>
                <p className="text-base opacity-90 mb-8">
                  Ứng dụng di động chạy mượt trên cả iOS và Android, tập trung vào trải nghiệm người dùng thay vì cấu hình cao.
                </p>
              </div>
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-primary backdrop-blur-sm">
                  <span className="material-symbols-outlined text-sm">phone_iphone</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-primary backdrop-blur-sm">
                  <span className="material-symbols-outlined text-sm">robot_2</span>
                </div>
              </div>
            </motion.div>
            {/* Product 3 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
              className="bg-surface-container p-8 rounded-2xl border border-outline-variant hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-2xl">cloud_done</span>
              </div>
              <h4 className="text-lg font-bold mb-3">Cloud Infrastructure</h4>
              <p className="text-base text-on-surface-variant">
                Hạ tầng gọn nhẹ, chi phí hợp lý, vận hành trên AWS & Azure.
              </p>
            </motion.div>
            {/* Product 4 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
              className="bg-surface-container p-8 rounded-2xl border border-outline-variant hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-2xl">psychology</span>
              </div>
              <h4 className="text-lg font-bold mb-3">AI Integration</h4>
              <p className="text-base text-on-surface-variant">
                Tích hợp AI vào quy trình làm việc — không phải để thay người, mà để bớt việc vặt.
              </p>
            </motion.div>
            {/* Product 5 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
              className="bg-surface-container p-8 rounded-2xl border border-outline-variant hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-2xl">shield_person</span>
              </div>
              <h4 className="text-lg font-bold mb-3">Cybersecurity</h4>
              <p className="text-base text-on-surface-variant">
                Giữ an toàn cho dữ liệu của bạn trước những rủi ro trên mạng.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-24 px-6 bg-surface-container-lowest" id="contact">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-20 items-center">
              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
              >
                <motion.h2 variants={fadeInUp} className="font-manrope font-semibold text-3xl md:text-4xl text-primary mb-6">
                  Kết Nối Với Chúng Tôi
                </motion.h2>
                <motion.p variants={fadeInUp} className="text-lg text-on-surface-variant mb-12">
                  Bạn có một dự án cần bàn? Đừng ngần ngại, để lại thông tin và chúng tôi sẽ liên hệ lại trong vòng 24 giờ — hoặc sớm nhất có thể.
                </motion.p>
                <motion.div variants={fadeInUp} className="space-y-8">
                  <div className="flex items-center gap-6 p-4 rounded-xl hover:bg-surface transition-colors">
                    <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary shadow-sm">
                      <span className="material-symbols-outlined text-2xl">location_on</span>
                    </div>
                    <div>
                      <p className="text-base font-bold text-on-surface mb-1">Văn Phòng Đại Diện</p>
                      <p className="text-sm text-on-surface-variant">
                        47C Phù Đổng Thiên Vương, Phường Lâm Viên - Đà Lạt, Lâm Đồng
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 p-4 rounded-xl hover:bg-surface transition-colors">
                    <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary shadow-sm">
                      <span className="material-symbols-outlined text-2xl">call</span>
                    </div>
                    <div>
                      <p className="text-base font-bold text-on-surface mb-1">Hotline</p>
                      <p className="text-sm text-on-surface-variant">+84 911 818 016</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 p-4 rounded-xl hover:bg-surface transition-colors">
                    <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary shadow-sm">
                      <span className="material-symbols-outlined text-2xl">mail</span>
                    </div>
                    <div>
                      <p className="text-base font-bold text-on-surface mb-1">Email</p>
                      <p className="text-sm text-on-surface-variant">kinhdoanh@songphuong.vn</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-background p-10 md:p-14 rounded-3xl shadow-xl border border-outline-variant"
              >
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        Họ và Tên
                      </label>
                      <input
                        required
                        className="w-full px-6 py-4 bg-surface-container border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder="Họ và tên"
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        Email
                      </label>
                      <input
                        required
                        className="w-full px-6 py-4 bg-surface-container border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder="Email của bạn"
                        type="email"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Dịch vụ quan tâm
                    </label>
                    <select className="w-full px-6 py-4 bg-surface-container border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer">
                      <option>Phát triển Web</option>
                      <option>Ứng dụng Di động</option>
                      <option>Tư vấn Chuyển đổi số</option>
                      <option>SEO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Lời nhắn
                    </label>
                    <textarea
                      required
                      className="w-full px-6 py-4 bg-surface-container border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                      placeholder="Mô tả ngắn gọn dự án của bạn..."
                      rows={4}
                    />
                  </div>
                  <button
                    disabled={formState !== "idle"}
                    className={`w-full py-5 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                      formState === "success" 
                        ? "bg-emerald-600 text-white" 
                        : "bg-primary text-on-primary hover:bg-primary-container hover:shadow-lg"
                    }`}
                    type="submit"
                  >
                    {formState === "idle" && "Gửi Yêu Cầu"}
                    {formState === "loading" && (
                      <>
                        <span className="material-symbols-outlined animate-spin" style={{ animation: "spin 1s linear infinite" }}>progress_activity</span>
                        Đang gửi...
                      </>
                    )}
                    {formState === "success" && (
                      <>
                        <span className="material-symbols-outlined">check_circle</span>
                        Đã gửi thành công!
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Map Placeholder */}
        <div className="h-96 w-full bg-surface-container relative overflow-hidden">
          <img
            className="w-full h-full object-cover grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-1000 cursor-pointer"
            alt="A clean, minimalist stylized digital map of Ho Chi Minh City."
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYBv_B9qZ7ymDjTlrBbp3wjurv9Vn-RhuRLWrWoukkxFR0wjL3Zo0cO7cI2HitlDqPGHFptnY1KaEViGBlCgibB260cR4pgaUPRtKF9lnAeRcrcPNUDEWfIVb8ttUmkOkJnPPoAGYbItzITNuW6l_kmEAWIF346-akLsiW-eXzyR9uELF0c3WSquGfiYNsnMl2ttjuUcnA7Hm9TS7Teee67LrrOc6c1uF-N4-cvF2RAMXKNoFRadb-VvDkExLr5yLNGl2hGk7TvRE"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-highest text-on-surface py-20 w-full border-t border-outline-variant">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            <img src="/spcybersoftlogo.png" alt="SP Cybersoft" className="h-[52px] w-auto dark:brightness-0 dark:invert" />
            <p className="text-base text-on-surface-variant">
              Đối tác công nghệ đáng tin cậy cho các doanh nghiệp tại Việt Nam.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">public</span>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">alternate_email</span>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">linked_camera</span>
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-6 uppercase tracking-wider text-on-surface">
              Liên kết nhanh
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#about" onClick={(e) => handleSmoothScroll(e, "about")} className="text-base text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                  Về Chúng Tôi
                </a>
              </li>
              <li>
                <a href="#products" onClick={(e) => handleSmoothScroll(e, "products")} className="text-base text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                  Sản Phẩm
                </a>
              </li>
              <li>
                <Link href="/dashboard" className="text-base text-on-surface-variant hover:text-primary transition-colors">
                  Studio
                </Link>
              </li>
              <li>
                <a href="#contact" onClick={(e) => handleSmoothScroll(e, "contact")} className="text-base text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                  Liên Hệ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-6 uppercase tracking-wider text-on-surface">
              Dịch Vụ
            </h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-base text-on-surface-variant hover:text-primary transition-colors">Enterprise Web</a></li>
              <li><a href="#" className="text-base text-on-surface-variant hover:text-primary transition-colors">Mobile Apps</a></li>
              <li><a href="#" className="text-base text-on-surface-variant hover:text-primary transition-colors">Cloud Managed</a></li>
              <li><a href="#" className="text-base text-on-surface-variant hover:text-primary transition-colors">DevOps</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-6 uppercase tracking-wider text-on-surface">
              Pháp lý
            </h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-base text-on-surface-variant hover:text-primary transition-colors">Chính Sách Bảo Mật</a></li>
              <li><a href="#" className="text-base text-on-surface-variant hover:text-primary transition-colors">Điều Khoản Sử Dụng</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-on-surface-variant text-center md:text-left">
            © 2026 SP Cybersoft.
          </p>
          <p className="text-sm text-on-surface-variant flex items-center justify-center md:justify-end gap-1">
            Made with <span className="text-error material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span> for the Digital Age.
          </p>
        </div>
      </footer>

      {/* AI Chat */}
      <LandingAIChat />

      {/* Back to top button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 sm:bottom-8 sm:right-8 z-50 w-11 h-11 sm:w-12 sm:h-12 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:bg-primary-container hover:text-primary transition-colors focus:outline-none"
            aria-label="Back to top"
          >
            <span className="material-symbols-outlined">arrow_upward</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
