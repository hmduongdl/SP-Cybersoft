import {
  PC_BUILD_REVIEW_FEW_SHOTS,
  buildStrictPcBuildReviewRules,
  formatPsuGuidelines,
  formatSocketCompatibilityRules,
  PC_BUILD_HARDWARE_CATALOG,
} from "@/lib/pc-build-hardware-config";

export const PC_BUILD_JSON_OUTPUT_SCHEMA = `
{
  "matched_parts": {
    "cpu": { "name": "...", "price": 0 },
    "mainboard": { "name": "...", "price": 0 },
    "ram": { "name": "...", "price": 0 },
    "vga": { "name": "...", "price": 0 },
    "ssd": { "name": "...", "price": 0 },
    "psu": { "name": "...", "price": 0 },
    "case": { "name": "...", "price": 0 },
    "cooler_fan": { "name": "...", "price": 0 },
    "monitor": { "name": "...", "price": 0 },
    "keyboard_mouse": { "name": "...", "price": 0 },
    "headphone": { "name": "...", "price": 0 },
    "desk_chair": { "name": "...", "price": 0 },
    "total_price": 0
  },
  "isApproved": false,
  "reason": "Lý do ngắn gọn bằng tiếng Việt",
  "checks": {
    "socket": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "display_output": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "ram": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "power": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "case": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "requirement_fit": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "budget": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "peripherals": { "status": "PASS" | "FAIL" | "WARN", "message": "..." }
  }
}`.trim();

type BuildCompatibilityPromptInput = {
  expectedNeed: string;
  expectedBudget: number;
  expectedReqs: string;
  approvedBudgetLimitText: string;
  /** Raw OCR items JSON — null khi dùng fast-path đọc ảnh trực tiếp */
  rawItems: Record<string, unknown> | null;
};

function formatBudgetText(expectedBudget: number): string {
  return expectedBudget > 0 ? `${expectedBudget.toLocaleString("vi-VN")} VNĐ` : "Không giới hạn";
}

function buildSharedCompatibilityRules(): string {
  const coolerSockets = PC_BUILD_HARDWARE_CATALOG.coolerBracketSockets.join(", ");
  return `
QUY TẮC KIỂM TRA TƯƠNG THÍCH:
1. Socket (CPU & Mainboard):
${formatSocketCompatibilityRules()}
2. Display Output:
   - Không có VGA rời → CPU bắt buộc có iGPU. Intel đuôi F/KF không có iGPU; AMD Ryzen AM4 đa số không có iGPU trừ G/GE; Ryzen 7500F không có iGPU; Ryzen AM5 phổ thông thường có iGPU cơ bản.
   - Có VGA rời hợp lệ → display_output PASS; không nhắc iGPU.
3. RAM: DDR4/DDR5 phải đúng loại mainboard.
4. Power (PSU):
${formatPsuGuidelines()}
5. Case: Mini/ITX có thể không vừa main ATX; mid/full tower thường vừa ATX/mATX/ITX.
6. Cooler (mềm): Nếu có cooler_fan, kiểm tra bracket hỗ trợ socket CPU (${coolerSockets}...). PASS nếu model nêu rõ; WARN nếu thiếu thông tin — không dùng để đánh rớt bài.
7. Requirement Fit: Kiểm tra trước ngân sách — đúng nhu cầu, ràng buộc CPU/RAM/SSD/VGA/phụ kiện của đề bài.
8. Peripherals: Nếu đề không ghi rõ không yêu cầu, thiếu tản aftermarket, màn hình, bàn phím/chuột → WARN hoặc FAIL; CPU box có tản stock thì không báo thiếu cooler.
9. Budget: PASS nếu tổng giá <= ngân sách. WARN nếu > ngân sách nhưng <= ngân sách + 2%. FAIL nếu vượt ngân sách + 2%.
10. isApproved=true chỉ khi: requirement_fit không FAIL, display_output không FAIL, total_price <= ngân sách + 2% VÀ không FAIL kỹ thuật (socket/ram/power/case). Budget WARN vẫn có thể isApproved=true.
11. QUY TẮC NHẤT QUÁN: isApproved=true → reason giải thích vì sao ĐẠT. isApproved=false → reason nêu lý do từ chối. Không mâu thuẫn.
`.trim();
}

/**
 * Prompt duy nhất cho chấm cấu hình PC — dùng cho cả OCR-items và fast-path vision.
 * rawItems=null → thêm hướng dẫn OCR; rawItems có giá trị → nhúng JSON linh kiện thô.
 */
export function buildCompatibilityPrompt(input: BuildCompatibilityPromptInput): string {
  const { expectedNeed, expectedBudget, expectedReqs, approvedBudgetLimitText, rawItems } = input;
  const isVisionMode = rawItems === null;

  const intro = isVisionMode
    ? `Bạn là hệ thống chuyên gia duyệt cấu hình PC của SP-CyberSoft.
Hãy đọc ảnh báo giá, bóc tách linh kiện, phân loại vào danh mục chuẩn, tính tổng giá và kiểm tra tương thích với đề bài.

CHIẾN LƯỢC OCR BẮT BUỘC:
1. Đọc bảng báo giá theo từng dòng từ trên xuống dưới.
2. Chỉ lấy dòng hàng hóa/linh kiện có tên sản phẩm và giá tiền; bỏ header, hotline, địa chỉ, logo.
3. Giữ nguyên mã sản phẩm quan trọng (CPU, mainboard, RAM, VGA, SSD, PSU, case).
4. Giá trả về số nguyên VND; không tự bịa mã không thấy trong ảnh.`
    : `Bạn là hệ thống chuyên gia tự động hóa phân loại và duyệt cấu hình PC của SP-CyberSoft.
Phân tích danh sách linh kiện thô từ OCR, phân loại vào danh mục chuẩn, tính tổng giá và kiểm tra tương thích theo đề bài.`;

  const rawItemsBlock = isVisionMode
    ? `- Nếu danh mục không có trong báo giá, trả về { "name": "", "price": 0 }.
- total_price là tổng tiền thực tế các linh kiện.`
    : `LINH KIỆN THÔ:
${JSON.stringify(rawItems, null, 2)}`;

  return `
${intro}

DỮ LIỆU ĐỀ BÀI:
- Nhu cầu khách hàng: "${expectedNeed}"
- Ngân sách tối đa: ${formatBudgetText(expectedBudget)}
- Giới hạn được phép duyệt (ngân sách + 2%): ${approvedBudgetLimitText}
- Yêu cầu cấu hình khác: "${expectedReqs}"

DANH MỤC CHUẨN:
cpu, mainboard, ram, vga, ssd, psu, case, cooler_fan, monitor, keyboard_mouse, headphone, desk_chair.
Nếu thiếu danh mục, trả về { "name": "", "price": 0 }.

${rawItemsBlock}

${buildSharedCompatibilityRules()}

${PC_BUILD_REVIEW_FEW_SHOTS}

${buildStrictPcBuildReviewRules()}

BẮT BUỘC chỉ trả về JSON:
${PC_BUILD_JSON_OUTPUT_SCHEMA}
`.trim();
}
