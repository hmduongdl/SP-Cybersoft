# Design System: Light Theme Palette (SPS AI)

Hệ thống màu sắc chuẩn (Light Mode) dành cho toàn bộ ứng dụng, thay thế cho giao diện dark mode cũ. Thiết kế này tập trung vào sự tinh tế, sáng sủa, tạo cảm giác chuyên nghiệp cho một nền tảng HR doanh nghiệp.

## 1. Màu Cơ Bản (Base Colors)
- **Background (Nền chính):** `#F8FAFC` (Slate 50) - Trắng ánh xanh xám nhẹ, dịu mắt hơn trắng tinh.
- **Surface (Nền card/vùng chứa):** `#FFFFFF` (Trắng)
- **Surface Hover/Active:** `#F1F5F9` (Slate 100)

## 2. Màu Chủ Đạo (Primary Colors - Indigo/Xanh Tím)
- **Primary:** `#4F46E5` (Indigo 600) - Màu nhấn chính cho các nút bấm quan trọng.
- **Primary Hover:** `#4338CA` (Indigo 700)
- **Primary Light (Nền nhạt/Icon):** `#EEF2FF` (Indigo 50)
- **Primary Text:** `#3730A3` (Indigo 800)

## 3. Màu Phụ Trợ (Secondary Colors - Emerald/Xanh Lục cho Success/Check-in)
- **Secondary / Success:** `#10B981` (Emerald 500) - Checkin thành công, trạng thái Approved.
- **Success Light:** `#ECFDF5` (Emerald 50)
- **Success Text:** `#065F46` (Emerald 800)

## 4. Màu Cảnh Báo & Lỗi (Warning / Error)
- **Warning (Pending/Chờ duyệt):** `#F59E0B` (Amber 500)
- **Warning Light:** `#FFFBEB` (Amber 50)
- **Error (Từ chối/Xóa):** `#EF4444` (Red 500)
- **Error Light:** `#FEF2F2` (Red 50)

## 5. Màu Văn Bản (Typography)
- **Heading / Text Chính:** `#0F172A` (Slate 900) - Tương phản cao nhất.
- **Body / Mô tả:** `#475569` (Slate 600)
- **Placeholder / Vô hiệu hóa:** `#94A3B8` (Slate 400)
- **Border / Divider:** `#E2E8F0` (Slate 200)

## 6. Token Áp Dụng (Tailwind CSS)

Trong `tailwind.config.js` hoặc file `global.css`, chúng ta sẽ cấu hình lại các CSS variables:

```css
:root {
  --background: 210 40% 98%; /* #F8FAFC */
  --foreground: 222.2 84% 4.9%; /* #0F172A */

  --surface: 0 0% 100%; /* #FFFFFF */
  --surface-foreground: 222.2 84% 4.9%;

  --primary: 243 75% 59%; /* #4F46E5 */
  --primary-foreground: 210 40% 98%;

  --secondary: 160 84% 39%; /* #10B981 */
  --secondary-foreground: 210 40% 98%;

  --muted: 210 40% 96.1%; /* #F1F5F9 */
  --muted-foreground: 215.4 16.3% 46.9%; /* #475569 */

  --border: 214.3 31.8% 91.4%; /* #E2E8F0 */
  --input: 214.3 31.8% 91.4%;
  --ring: 243 75% 59%;
}
```

Các bước tiếp theo:
1. Áp dụng bảng màu này vào `globals.css` và `tailwind.config.js`.
2. Sửa lại Layout và Dashboard để dùng màu sáng, bỏ các class `dark:xxx`.
3. Sửa trang Đăng nhập thành phong cách light sáng sủa.
