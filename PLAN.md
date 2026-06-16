# Teamwork Check-in System Plan

## Phase 1 — Database schema

Ba bảng cốt lõi, bao gồm các trường quan trọng hỗ trợ luồng upload ảnh và tự động check-in.

**Posts**: `id`, `title`, `url`, `thumbnail_url`, `description`, `start_at (DateTime)`, `team (Enum: ALL, TECH, SALES, MARKETING)`, `is_archived (Boolean)`

**Users**: `id`, `username`, `name`, `email`, `role (Enum: ADMIN, USER)`, `department`, `avatar_url`

**Checkins**: `id`, `user_id (FK)`, `post_id (FK)`, `image_url` (để lưu ảnh màn hình bằng Base64 hoặc Cloud URL), `exif_time (DateTime, nullable)`, `submitted_at (DateTime)`, `status (Enum: AUTO_APPROVED, PENDING, APPROVED, REJECTED)`, `reject_reason (String, nullable)`, `reviewed_by (FK -> Users)`

Trường quan trọng nhất là `exif_time` — nullable vì không phải ảnh nào cũng có EXIF, và `status` là trung tâm của toàn bộ luồng phê duyệt và kiểm duyệt (verify flow).

---

## Phase 2 — Submit flow (User side)

Phân tích cách người dùng nộp minh chứng (Submit Check-in):

1. **Auto Check-in**:
   - Nếu User sử dụng nút Auto Check-in (không cần upload ảnh), hệ thống xử lý API `/api/submissions/auto-check` để kiểm tra điều kiện thời gian (trong vòng 24h từ `start_at`).
   - Nếu hợp lệ, hệ thống tự động ghi nhận Checkin với `status: "AUTO_APPROVED"` và `image_url: "AUTO_CHECKIN"`.

2. **Manual Upload**:
   - Người dùng tải ảnh lên qua giao diện `SubmitCheckinModal`.
   - Client sử dụng thư viện `exifr` để trích xuất `DateTimeOriginal` từ ảnh.
   - Gửi file ảnh (hoặc Base64) kèm `postId` lên API `/api/submissions/manual`.
   - Hệ thống tạo (hoặc cập nhật) Checkin với `status: "PENDING"`, chờ Admin duyệt.

---

## Phase 3 — EXIF Validation & Security

Bảo mật và chống gian lận thông qua dữ liệu EXIF của ảnh chụp màn hình:

- Hệ thống Backend hiện đang lưu trữ `image_url` (trong phiên bản hiện tại là dạng Base64 giả lập để kiểm thử).
- Tương lai (khi tích hợp Cloudinary / Vercel Blob), sẽ lưu URL thực tế và có thể xử lý file từ buffer.
- `exif_time` được dùng để kiểm tra thời gian chụp thực tế của màn hình (nếu ảnh có hỗ trợ). Việc này giúp phát hiện ảnh cũ được tái sử dụng để chống gian lận.

---

## Phase 4 — Admin Queue & Moderation

Trang quản lý kiểm duyệt tại `/admin/queue`:

1. **Giao diện Quản lý Hàng đợi (Queue)**:
   - Các bài nộp ở trạng thái `PENDING` được hiển thị rõ ràng trên một lưới thẻ (Grid).
   - Mỗi thẻ bài nộp có ảnh Thumbnail, thông tin nhân sự và nút chức năng (Duyệt/Từ chối).

2. **Kiểm duyệt thủ công (Manual Review)**:
   - Admin có thể bấm "Từ chối" và cung cấp lý do (Reject Reason) như "Ảnh mờ", "Sai bài viết", v.v.
   - Dữ liệu Checkin sẽ được cập nhật sang `status: "REJECTED"` và lưu `reject_reason`.

3. **Gemini AI Vision Scan (Tích hợp AI)**:
   - Quét ảnh bằng chứng on-demand thông qua nút "AI Quét Ảnh".
   - Gọi API Route `/api/admin/ai-scan` tới model `gemini-2.5-flash-preview-09-2025`.
   - Kết quả phân tích (Valid/Invalid) sẽ giúp Admin đánh giá nhanh hơn bằng cách làm nổi bật sự bất thường (AI Flagged).

---

## Phase 5 — Reporting & Export

Thống kê và xuất báo cáo:

- API `/api/admin/export-excel` hỗ trợ xuất báo cáo định dạng Excel bằng `exceljs`.
- Báo cáo chi tiết gồm các cột: `Mã NV/Email`, `Họ tên`, `Phòng ban`, `Bài viết Share`, `Tình trạng` và `Lý do từ chối (nếu có)`.
- Thiết kế Excel chuẩn doanh nghiệp với Header tô đậm, canh lề, màu sắc thẩm mỹ.

---
**Status**: Cập nhật thành công sơ đồ luồng hệ thống theo cấu trúc dữ liệu mới nhất (đã fix toàn bộ Type Errors và đồng bộ Prisma Schema).
