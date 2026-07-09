/**
 * Danh mục phần cứng PC Build — cập nhật theo quý.
 *
 * Trạng thái mid-2026:
 * - Desktop Intel: Core Ultra 200 (Arrow Lake), socket LGA 1851
 * - Core Ultra 300 (Panther Lake, CES 2026): chỉ laptop/mini PC — không có bản desktop
 * - RTX 50-series (5060–5090): dòng chủ lực, đã ra mắt
 *
 * FUTURE (chưa đưa vào rule duyệt):
 * - Nova Lake-S desktop dự kiến socket LGA 1954, cuối 2026 hoặc 2027.
 *   Khi hàng về, cập nhật socketPlatforms và few-shot — không tự suy tương thích B860.
 */

export type SocketPlatform = {
  socket: string;
  cpus: string[];
  chipsets: string[];
  warnConfuseWith?: string;
};

export const PC_BUILD_HARDWARE_CATALOG = {
  lastUpdated: "2026-Q2",
  socketPlatforms: [
    {
      socket: "LGA 1851",
      cpus: [
        "Intel Core Ultra 200-series (Arrow Lake)",
        "Ultra 5/7/9 2xx (VD: 225F, 245K, 265K, 285K)",
      ],
      chipsets: ["B860", "B850", "H810", "Z890", "W880", "Q870"],
      warnConfuseWith: "B760 (LGA 1700) — B860 là LGA 1851, không phải LGA 1700",
    },
    {
      socket: "LGA 1700",
      cpus: ["Intel Core gen 12/13/14 (i3/i5/i7/i9)"],
      chipsets: ["H610", "B660", "B760", "Z690", "Z790"],
    },
    {
      socket: "LGA 1200",
      cpus: ["Intel Core gen 10/11"],
      chipsets: ["H410", "H510", "B460", "B560", "Z490", "Z590"],
    },
    {
      socket: "AM4",
      cpus: ["AMD Ryzen 1000–5000"],
      chipsets: ["A320", "B450", "B550", "X570"],
    },
    {
      socket: "AM5",
      cpus: ["AMD Ryzen 7000–9000"],
      chipsets: ["A620", "B650", "X670"],
    },
  ] satisfies SocketPlatform[],
  releasedProducts: {
    nvidia: [
      "RTX 5060",
      "RTX 5060 Ti",
      "RTX 5070",
      "RTX 5070 Ti",
      "RTX 5080",
      "RTX 5090",
    ],
    intelDesktop: ["Core Ultra 200-series (Arrow Lake)"],
    intelLaptopOnly: ["Core Ultra 300-series (Panther Lake)", "Core Series 3"],
    amd: ["Ryzen 9000-series"],
  },
  psuMinWatts: [
    { gpus: ["RTX 3050", "RTX 4060"], minW: 450 },
    { gpus: ["RTX 3060", "RTX 4060 Ti", "RTX 5060", "RTX 5060 Ti"], minW: 550 },
    { gpus: ["RTX 3070", "RTX 4070", "RTX 5070"], minW: 650 },
    { gpus: ["RTX 3080", "RTX 4080", "RTX 4090", "RTX 5080", "RTX 5090"], minW: 750 },
  ],
  coolerBracketSockets: ["LGA 1851", "LGA 1700", "LGA 1200", "AM4", "AM5"],
} as const;

export const PC_BUILD_REVIEW_FEW_SHOTS = `
VÍ DỤ CHẤM ĐÚNG (few-shot — bám theo các quy tắc trên):
1. Core Ultra 5 225F + Asus PRIME B860M-K + RTX 5060 Ti → socket PASS (cùng LGA 1851), display_output PASS (có VGA rời), isApproved=true nếu đề bài và ngân sách OK.
2. i5-12400F + B760M → socket PASS (cùng LGA 1700). i5-12400F + B860M → socket FAIL (LGA 1700 vs LGA 1851).
3. Ryzen 5 5600 + GT 710, không có cooler_fan riêng → display_output PASS (có VGA), peripherals PASS (CPU box có tản stock nếu đề không bắt tản aftermarket).
4. RTX 5060 Ti trên báo giá → coi là sản phẩm thật, KHÔNG FAIL vì "chưa ra mắt".
5. OCR đọc "Core Ultra 300" / "Core Series 3" / "Panther Lake" trên báo giá desktop → requirement_fit WARN (có thể lỗi OCR/nhầm SKU laptop; desktop hiện tại là Ultra 200-series LGA 1851), KHÔNG mặc định PASS.
`.trim();

const LGA1851_CHIPSET_PATTERN = /(b860|b850|h810|z890|w880|q870|lga\s*1851)/;
const ARROW_LAKE_CPU_PATTERN =
  /(core\s*ultra|arrow\s*lake|ultra\s*[579]\s*2\d{2}|225f|235|245k|265k|285k)/;
const PANTHER_LAKE_MISREAD_PATTERN =
  /(core\s*ultra\s*3|ultra\s*3\s*3\d{2}|core\s*series\s*3|panther\s*lake)/;

export function formatSocketCompatibilityRules(): string {
  const lines = PC_BUILD_HARDWARE_CATALOG.socketPlatforms.map((platform) => {
    const chipsets = platform.chipsets.join("/");
    const cpus = platform.cpus.join(", ");
    const confuse = platform.warnConfuseWith ? ` — KHÔNG nhầm với ${platform.warnConfuseWith}` : "";
    return `- ${platform.socket}: CPU ${cpus} ↔ chipset ${chipsets}${confuse}`;
  });
  return lines.join("\n");
}

export function formatPsuGuidelines(): string {
  return PC_BUILD_HARDWARE_CATALOG.psuMinWatts
    .map((entry) => `- ${entry.gpus.join("/")}: tối thiểu ${entry.minW}W (cộng dư an toàn 100W–150W).`)
    .join("\n");
}

export function formatReleasedProductsList(): string {
  const { nvidia, intelDesktop, amd } = PC_BUILD_HARDWARE_CATALOG.releasedProducts;
  return [
    `NVIDIA GeForce ${nvidia.join(", ")}`,
    `Intel desktop: ${intelDesktop.join(", ")}`,
    `AMD: ${amd.join(", ")}`,
  ].join("; ");
}

export function formatLaptopOnlyCpuWarning(): string {
  const names = PC_BUILD_HARDWARE_CATALOG.releasedProducts.intelLaptopOnly.join(", ");
  return `+ ${names} chỉ dành cho laptop/mini PC (CES 2026), KHÔNG có bản desktop. Nếu OCR đọc tên này trên báo giá desktop → requirement_fit WARN (có thể nhầm SKU), không mặc định PASS.`;
}

export function buildStrictPcBuildReviewRules(): string {
  return `
QUY TẮC CHẤM ĐIỂM NGHIÊM KHẮC:
- Sai hoặc thiếu bất kỳ ràng buộc bắt buộc nào của đề bài thì requirement_fit phải FAIL, isApproved=false, điểm phải thấp.
- Không được duyệt nương tay vì cấu hình "có vẻ dùng được"; phải bám sát đúng nhu cầu, ngân sách và yêu cầu tối thiểu.
- Thiếu tản nhiệt rời, LCD/màn hình, bàn phím hoặc chuột đều là lỗi cần ghi nhận nếu đề không nói rõ là không yêu cầu.
- Bài có lỗi kỹ thuật nghiêm trọng như sai socket, RAM sai chuẩn, nguồn thiếu, không xuất hình phải bị từ chối và đánh giá rất thấp.
- Hạn chế tối đa điểm 100. Chỉ cho 100 khi cấu hình đáp ứng rất sát đề, tất cả check PASS, tổng giá không vượt ngân sách gốc và không có cảnh báo đáng kể.
- Không tiết lộ thang điểm, hệ số phạt, công thức chấm hoặc số điểm bị trừ trong reason/feedback; chỉ nêu lỗi cụ thể và cách sửa.
- KIẾN THỨC SẢN PHẨM & BÁO GIÁ (BẮT BUỘC):
  + Linh kiện có trong báo giá/OCR phải được coi là sản phẩm thật, đang bán tại cửa hàng. TUYỆT ĐỐI KHÔNG FAIL/WARN vì "chưa ra mắt", "chưa phát hành", "chưa có trên thị trường".
  + Các dòng đã ra mắt (${PC_BUILD_HARDWARE_CATALOG.lastUpdated}): ${formatReleasedProductsList()}.
  + requirement_fit chỉ FAIL khi cấu hình không đáp ứng yêu cầu đề bài thực tế — KHÔNG FAIL chỉ vì model AI cũ cho rằng linh kiện chưa tồn tại.
${formatLaptopOnlyCpuWarning()}
- LOGIC NHẤT QUÁN (BẮT BUỘC):
  + Nếu đã có VGA rời (GT710, GT1030, GTX, RTX...): display_output PHẢI PASS. TUYỆT ĐỐI KHÔNG FAIL/WARN vì CPU không có iGPU; không nhắc iGPU trong reason khi đã có VGA.
  + GT710/GT1030 là VGA rời hợp lệ cho máy văn phòng. Chỉ WARN (không FAIL) nếu đề yêu cầu gaming/đồ họa nặng mà VGA quá yếu — không dùng lý do "card cũ/không tối ưu" để từ chối máy văn phòng cơ bản.
  + CPU retail/boxed (Ryzen, Core i...) thường kèm tản stock trong hộp. KHÔNG báo "thiếu tản nhiệt rời" nếu đề không bắt buộc tản aftermarket/AIO và cooler_fan trống.
  + cooler_fan chỉ dành cho tản aftermarket hoặc quạt case bổ sung — không thay thế tản stock đi kèm CPU.
  + reason, requirement_fit và checks phải khớp nhau: không được reason nêu lỗi xuất hình/iGPU khi display_output=PASS.
- SOCKET & CHIPSET (cập nhật ${PC_BUILD_HARDWARE_CATALOG.lastUpdated}):
${formatSocketCompatibilityRules()}
  + Chỉ FAIL socket khi thực sự lệch socket (VD: Core Ultra + B760, hoặc i5-12400 + B860).
`.trim();
}

export function normalizeHardwareMatch(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function isArrowLakeCpu(cpuName: string): boolean {
  return ARROW_LAKE_CPU_PATTERN.test(normalizeHardwareMatch(cpuName));
}

export function isLga1851Board(mbName: string): boolean {
  return LGA1851_CHIPSET_PATTERN.test(normalizeHardwareMatch(mbName));
}

export function isKnownArrowLakePair(cpuName: string, mbName: string): boolean {
  return isArrowLakeCpu(cpuName) && isLga1851Board(mbName);
}

/** Panther Lake / Core Ultra 300 on a desktop quote is likely OCR misread of laptop SKU. */
export function isPantherLakeDesktopMisread(cpuName: string): boolean {
  return PANTHER_LAKE_MISREAD_PATTERN.test(normalizeHardwareMatch(cpuName));
}
