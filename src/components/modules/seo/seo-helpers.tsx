"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb, Plus, Wand2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";

/** Gợi ý nhập liệu — ngôn ngữ chuyên nghiệp, không kỹ thuật thừa. */
export function SeoTips({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-primary/5 border border-primary/10 p-3.5", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-primary" />
        <p className="text-[11px] font-bold text-primary font-inter uppercase tracking-wide">
          Hướng dẫn sử dụng
        </p>
      </div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="text-[12px] text-on-surface-variant font-inter leading-relaxed flex gap-2">
            <span className="text-primary mt-[1px] shrink-0">•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type SeoTemplate = { label: string; value: string };

export function TemplateChips({
  templates,
  onPick,
  label = "Mẫu theo danh mục sản phẩm",
}: {
  templates: SeoTemplate[];
  onPick: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-on-surface-variant font-inter">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {templates.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onPick(t.value)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low text-[11px] font-semibold text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors font-inter"
          >
            <Plus className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SampleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline/30 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors font-inter"
    >
      <Wand2 className="w-3.5 h-3.5" />
      Tải dữ liệu mẫu
    </button>
  );
}

/** Trạng thái chờ AI — con trỏ nhấp nháy, không dùng skeleton. */
export function AiTypingIndicator({ label = "AI đang soạn nội dung" }: { label?: string }) {
  return (
    <div className="pt-2 border-t border-outline/20">
      <div className="rounded-xl bg-surface-container-low/80 border border-outline/15 px-4 py-5 min-h-[120px] flex items-start gap-1">
        <span className="text-sm text-on-surface-variant font-inter">{label}</span>
        <span className="inline-flex items-center h-5 gap-0.5 ml-0.5">
          <span className="w-[2px] h-4 bg-primary animate-pulse rounded-full" />
        </span>
      </div>
    </div>
  );
}

/** Hook gõ chữ nhanh — reveal theo chunk để cảm giác mượt hơn skeleton. */
export function useTypewriter(text: string, active: boolean, chunkSize = 3, intervalMs = 8) {
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!active || !text) {
      setDisplayed("");
      setIsTyping(false);
      return;
    }

    setDisplayed("");
    setIsTyping(true);
    let index = 0;

    const timer = setInterval(() => {
      index = Math.min(index + chunkSize, text.length);
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [text, active, chunkSize, intervalMs]);

  return { displayed, isTyping, isDone: active && !!text && !isTyping };
}

function BlinkingCursor() {
  return <span className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 align-middle animate-pulse rounded-full" />;
}

/** Vùng output plain text — hiển thị trực tiếp khi stream, không delay typewriter. */
export function StreamingPlain({
  text,
  isStreaming,
  className,
}: {
  text: string;
  isStreaming: boolean;
  className?: string;
}) {
  return (
    <div className={cn("text-sm text-on-surface font-inter leading-relaxed whitespace-pre-wrap", className)}>
      {text}
      {isStreaming && <BlinkingCursor />}
    </div>
  );
}

/** Vùng output Markdown — plain text khi đang stream, render Markdown khi xong. */
export function StreamingMarkdown({
  text,
  isStreaming,
  className,
}: {
  text: string;
  isStreaming: boolean;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [text, isStreaming]);

  if (!isStreaming && text) {
    return (
      <div
        ref={scrollRef}
        className={cn(
          "prose prose-sm sm:prose-base prose-slate dark:prose-invert max-w-none overflow-x-auto max-h-[480px] overflow-y-auto",
          className
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {text}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "text-sm text-on-surface font-inter leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[480px] overflow-y-auto",
        className
      )}
    >
      {text}
      {isStreaming && <BlinkingCursor />}
    </div>
  );
}

/** Vùng output plain text với hiệu ứng gõ chữ. */
export function TypewriterPlain({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { displayed, isTyping } = useTypewriter(text, !!text);

  return (
    <div className={cn("text-sm text-on-surface font-inter leading-relaxed whitespace-pre-wrap", className)}>
      {displayed}
      {isTyping && <BlinkingCursor />}
    </div>
  );
}

/** Vùng output Markdown — gõ plain trước, render Markdown khi hoàn tất. */
export function TypewriterMarkdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { displayed, isDone } = useTypewriter(text, !!text, 4, 6);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [displayed]);

  if (isDone) {
    return (
      <div
        ref={scrollRef}
        className={cn(
          "prose prose-sm sm:prose-base prose-slate dark:prose-invert max-w-none overflow-x-auto max-h-[480px] overflow-y-auto",
          className
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {text}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "text-sm text-on-surface font-inter leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[480px] overflow-y-auto",
        className
      )}
    >
      {displayed}
      <BlinkingCursor />
    </div>
  );
}

export const PRODUCT_TEMPLATES: SeoTemplate[] = [
  {
    label: "Mainboard",
    value:
      "Thương hiệu: \nModel: \nChipset: \nSocket: \nRAM (loại, số khe, bus, tối đa): \nKhe PCIe: \nM.2 & SATA: \nLAN: \nWiFi: \nCổng USB: \nKích thước: ",
  },
  {
    label: "VGA",
    value:
      "Thương hiệu: \nModel: \nDung lượng VRAM: \nBus bộ nhớ: \nXung nhịp: \nCổng xuất hình: \nNguồn yêu cầu (PSU): \nKích thước: ",
  },
  {
    label: "CPU",
    value:
      "Thương hiệu: \nModel: \nSocket: \nSố nhân / luồng: \nXung nhịp (cơ bản / boost): \nCache: \nTDP: ",
  },
  {
    label: "RAM",
    value: "Thương hiệu: \nModel: \nDung lượng: \nBus: \nLoại RAM: \nĐộ trễ (CL): ",
  },
  {
    label: "SSD / HDD",
    value:
      "Thương hiệu: \nModel: \nDung lượng: \nChuẩn giao tiếp: \nTốc độ đọc: \nTốc độ ghi: ",
  },
  {
    label: "PSU (Nguồn)",
    value:
      "Thương hiệu: \nModel: \nCông suất: \nChuẩn nguồn (ATX): \nChứng nhận 80 Plus: \nLoại cáp: ",
  },
  {
    label: "Tản nhiệt",
    value:
      "Thương hiệu: \nModel: \nSocket hỗ trợ: \nKích thước: \nQuạt: \nTốc độ (RPM): \nAirflow: \nĐộ ồn: ",
  },
  {
    label: "Màn hình",
    value:
      "Thương hiệu: \nModel: \nKích thước: \nĐộ phân giải: \nTần số quét: \nTấm nền: \nThời gian phản hồi: ",
  },
  {
    label: "Laptop",
    value:
      "Thương hiệu: \nModel: \nCPU: \nRAM: \nSSD: \nVGA: \nMàn hình: \nPin: \nTrọng lượng: ",
  },
  {
    label: "Gaming gear",
    value:
      "Thương hiệu: \nModel: \nKết nối: \nDPI / Switch: \nLayout: \nLED RGB: \nThời lượng pin: ",
  },
  {
    label: "Máy in",
    value:
      "Thương hiệu: \nModel: \nChức năng: \nTốc độ in: \nKết nối: \nĐộ phân giải: \nLoại mực: ",
  },
];

export const SAMPLE_SPEC = `Mainboard ASUS TUF Gaming B650-PLUS WIFI
Chipset AMD B650, Socket AM5
4 khe RAM DDR5, tối đa 128GB, hỗ trợ 6400MHz (OC)
2 khe PCIe 4.0 x16, 3 khe M.2 PCIe, 4 cổng SATA 6Gb/s
LAN 2.5Gb Realtek, WiFi 6, Bluetooth 5.2
USB 3.2 Gen 2x2 Type-C, nhiều cổng USB 3.2/2.0
Kích thước ATX, đèn Aura Sync RGB`;

export const SAMPLE_ARTICLE_TOPIC = `Màn hình BENQ ZOWIE XL2546X
Loại: màn hình gaming Esports chuyên FPS
Tấm nền TN 24.5 inch, độ phân giải Full HD
Tần số quét 240Hz, công nghệ giảm mờ DyAc 2
Thời gian phản hồi 0.5ms GTG
Cổng kết nối: DisplayPort 1.4, HDMI 2.0
Có tấm chắn sáng (shield), chân đế công thái học
Đối tượng: game thủ FPS, thi đấu Esports chuyên nghiệp`;

export const SAMPLE_TABLE = `Laptop gaming Acer Nitro 5 AN515-58
CPU Intel Core i7-12700H, 14 nhân 20 luồng
RAM 16GB DDR4 3200MHz, 2 khe, tối đa 32GB
Ổ cứng 512GB SSD NVMe PCIe Gen4
Màn hình 15.6 inch FHD IPS 144Hz, 100% sRGB
Card đồ họa NVIDIA RTX 3060 6GB GDDR6
Pin 90Wh, sạc nhanh; Cổng: USB-C, 3x USB-A, HDMI 2.1, LAN RJ45
Trọng lượng 2.5kg, bàn phím LED RGB 4 vùng`;
