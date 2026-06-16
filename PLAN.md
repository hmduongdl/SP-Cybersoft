# Project Plan: Kinetic HR - Post Share Check-in System

## 1. Project Overview
Kinetic HR is a specialized web tool designed to streamline and verify employee engagement with company social media posts. The system allows administrators to schedule "Share Tasks," and provides employees with a structured interface to submit proof of their shares within a strict 24-hour window.

Verification is powered by EXIF date extraction on both client-side and server-side to guarantee authentic screenshot uploads, along with on-demand Gemini AI Vision checks.

---

## 2. Phase 1 — Database Schema

The core database consists of three relational tables managed via Prisma:

### **Posts**
- `id` (String, Primary Key)
- `title` (String)
- `url` (String)
- `thumbnail_url` (String, Nullable)
- `description` (String)
- `start_at` (DateTime) - Timestamp of scheduling
- `team` (Enum: `ALL` | `TECH` | `SALES` | `MARKETING`)
- `is_archived` (Boolean, Default: false)

### **Users**
- `id` (String, Primary Key)
- `name` (String, Nullable)
- `email` (String, Unique)
- `role` (Enum: `ADMIN` | `USER`)
- `department` (String, Nullable)
- `avatar_url` (String, Nullable)

### **Checkins**
- `id` (String, Primary Key)
- `user_id` (String, Foreign Key → Users)
- `post_id` (String, Foreign Key → Posts)
- `image_url` (String) - Screenshot reference url
- `exif_time` (DateTime, Nullable) - Extracted DateTimeOriginal from EXIF
- `submitted_at` (DateTime, Default: now)
- `status` (Enum: `AUTO_APPROVED` | `PENDING` | `APPROVED` | `REJECTED`)
- `reject_reason` (String, Nullable)
- `is_ai_flagged` (Boolean, Default: false)
- `ai_confidence` (Float, Nullable)
- `reviewed_by` (String, Nullable, Foreign Key → Users)

---

## 3. Phase 2 — Submit Flow (User Side)

The check-in submission process features a client-side stepper modal:
1. **Discovery & Task Selection**: User clicks an active post. The Submission Modal opens and calculates a countdown remaining of the 24h window since `post.start_at`.
2. **Drag & Drop Upload**: The user uploads the screenshot (formats: `.png`, `.jpg`, `.jpeg`, `.webp` < 10MB).
3. **Client-Side EXIF Parse**: The modal uses the browser-side `exifr` library to read `DateTimeOriginal` from the image's metadata.
   - If EXIF matches the 24h window, it displays a green "EXIF Hợp lệ" badge.
   - If EXIF is outside the window or missing, a warning badge is shown ("Không có EXIF" / "Quá giới hạn 24 giờ").
4. **Attestation Checkboxes**: The user must check two confirmation boxes to unlock the "Nộp bằng chứng" button.
5. **Dynamic Success States**: Shows "Đã Tự Động Duyệt" if the client expects auto-approval, or "Đang chờ Duyệt" if falling back to the admin queue.

---

## 4. Phase 3 — EXIF Server-Side Validation

The server exposes a secure endpoint at `POST /api/checkins`:
1. **Security & Validation**: Checks User session. Verifies the target `Post` exists, and the user hasn't already submitted a checkin for it.
2. **File Processing**: Stores image (using Local Upload or Cloud storage) and obtains `image_url`.
3. **Server-Side Metadata Parse**: Reads image buffer with Node `exifr`.
4. **Window Check**:
   - Compares extracted `exif_time` against `[post.start_at, post.start_at + 24 hours]`.
   - If valid: sets `status = AUTO_APPROVED`.
   - If missing EXIF or outside window: sets `status = PENDING`.
5. **Database Transaction**: Inserts `Checkin` record and returns status to the frontend client.

---

## 5. Phase 4 — Admin Moderation & AI Queue

The Admin Console contains the **Kiểm duyệt Hàng đợi** (Queue) view:
- **Filters**: Tab selector for `Chờ Duyệt (Pending)`, `Đã Tự Động Duyệt (Auto Approved)`, and `Đã Duyệt / Từ Chối (Reviewed)`. Combines with Name/Post Search and Department filters.
- **Moderation Actions**:
  - **Duyệt**: Instant 1-click status change to `APPROVED`.
  - **Từ Chối**: Displays an inline popover requiring the admin to choose or input a rejection reason (preset: *Ảnh sai nội dung*, *Ảnh bị mờ*, *Ảnh nộp trùng*), setting status to `REJECTED`.
  - **Batch Actions**: Allows selecting multiple cards to approve or reject them collectively via a single bottom-docked toolbar.
- **Gemini AI Vision Scan**:
  - Admin triggers **"AI Quét Ảnh"** on-demand for any pending check-in.
  - Call API `/api/admin/ai-scan` which forwards the base64 image data to `gemini-2.5-flash-preview-09-2025` to evaluate:
    1. Public share state (globe icon) visibility on Facebook.
    2. Shared URL matches `post.url` and title matches `post.title`.
    3. Indicators of Photoshop template manipulation.
  - Automatically updates database flags `is_ai_flagged` and `ai_confidence` and updates the Admin UI reactively.

---

## 6. Phase 5 — Corporate Reporting & Exports

- **Excel Report Generation**: API Route `/api/admin/export-excel` generates structured workbooks with `exceljs`.
- **Date Filtering**: Supports `start_date` and `end_date` parameters.
- **Format**:
  - Title: *"BÁO CÁO CÔNG VIỆC THỰC HIỆN LIKE & SHARE BÀI VIẾT TEAMWORK"* styled with navy blue background and white bold fonts.
  - Auto-fit column widths and alternating zebra row colors.
  - Standard columns: STT, Email/Employee ID, Employee Name, Department, Expected Posts, Shares Completed, Completion Rate %, Auto Approved Count, Approved Count, Rejected Count.
  - File name: `[MM].[DD].[YYYY] - Bao Cao Cong Viec Like Share.xlsx`.
