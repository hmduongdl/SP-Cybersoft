# SP-CyberSoft - Hệ thống Quản lý Công việc & Check-in

> Hệ thống nội bộ Song Phương Technology — Quản lý check-in Facebook, Task Manager, Thời gian biểu, và AI Studio.

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Bắt đầu](#bắt-đầu)
- [Hướng dẫn sử dụng — Người dùng](#hướng-dẫn-sử-dụng--người-dùng)
  - [Dashboard](#1-dashboard)
  - [Like & Share (Check-in)](#2-like--share-check-in)
  - [Task Manager](#3-task-manager)
  - [Thời gian biểu](#4-thời-gian-biểu)
  - [AI Studio (SEO Tools)](#5-ai-studio-seo-tools)
  - [Báo cáo cá nhân](#6-báo-cáo-cá-nhân)
  - [AI Chat](#7-ai-chat)
- [Hướng dẫn sử dụng — Quản trị viên](#hướng-dẫn-sử-dụng--quản-trị-viên)
  - [Duyệt bài](#1-duyệt-bài)
  - [Quản lý Post](#2-quản-lý-post)
  - [Quản lý Account](#3-quản-lý-account)
  - [Reports (Analytics)](#4-reports-analytics)
  - [Cấu hình hệ thống](#5-cấu-hình-hệ-thống)
- [Cài đặt & Phát triển](#cài-đặt--phát-triển)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)

---

## Tổng quan

**SP-CyberSoft** là nền tảng quản lý công việc nội bộ, bao gồm:

| Module | Mô tả |
|--------|-------|
| **Check-in Facebook** | Nhân viên Like & Share bài viết, chụp ảnh màn hình nộp minh chứng |
| **Task Manager** | Quản lý công việc Kanban/Calendar/List, gán người phụ trách, ghi chú AI |
| **Thời gian biểu** | Lập lịch làm việc tuần trực quan, kéo thả, tự động lưu |
| **AI Studio** | Viết bài SEO, tạo bảng spec, tóm tắt nội dung bằng AI |
| **Báo cáo** | Thống kê cá nhân và Admin với biểu đồ, xuất Excel |

---

## Bắt đầu

### Đăng nhập

1. Truy cập URL ứng dụng (do Admin cung cấp)
2. Nhấn **Đăng nhập** ở góc phải
3. Nhập **tên đăng nhập** (username) hoặc **email** + **mật khẩu**
4. Nhấn **Đăng nhập**

> Lần đầu đăng nhập? Hệ thống sẽ chuyển đến màn hình dashboard. Bạn có thể cập nhật thông tin cá nhân ở phần **Cài đặt** (góc trái sidebar).

### Giao diện chính

- **Sidebar trái**: Menu điều hướng chính
- **Header trên**: Breadcrumb, thông báo
- **Khu vực trung tâm**: Nội dung chính

---

## Hướng dẫn sử dụng — Người dùng

### 1. Dashboard

**Đường dẫn:** `/dashboard`

Tổng quan tình hình công việc của bạn:

- **Bài chưa check-in**: Số bài Like & Share chưa hoàn thành
- **Đã hoàn thành**: Số bài đã nộp minh chứng
- **Tỷ lệ hoàn thành tháng**: Vòng tròn tiến độ theo tháng
- **Nhiệm vụ trọng tâm hôm nay**: Các bài viết cần check-in hoặc task sắp đến hạn
- **Check-in gần đây**: Lịch sử nộp bài gần nhất
- **Thông báo**: Banner giới thiệu tính năng mới (Thời gian biểu, AI Studio)

> 💡 Bạn có thể chọn tháng để xem số liệu của từng tháng.

### 2. Like & Share (Check-in)

**Đường dẫn:** `/like-share`

Đây là tính năng chính — quản lý các bài viết Facebook cần Like & Share.

#### Xem danh sách bài viết

- **Chế độ xem**: Chuyển đổi giữa **Danh sách** (bảng) và **Lịch** (Calendar)
- **Lọc theo tháng/tuần**: Chọn khoảng thời gian ở đầu trang
- **Trạng thái bài viết**: Thấy rõ bài nào chưa làm, đã nộp, đã duyệt

#### Nộp minh chứng (Check-in)

1. Tìm bài viết cần check-in (có đồng hồ đếm ngược thời hạn)
2. Nhấn vào bài viết → mở modal check-in
3. **Like** bài viết gốc trên Facebook
4. **Share** bài viết đó lên Facebook cá nhân (chế độ **Công khai**)
5. **Chụp ảnh màn hình** bài viết đã share (phải thấy rõ tên + nội dung)
6. Upload ảnh lên hệ thống (kéo thả, paste, hoặc chọn file)
7. Nhấn **Nộp**

#### Tự động duyệt

Hệ thống trích xuất thời gian chụp từ **EXIF** của ảnh:
- Nếu thời gian chụp trong vòng **24h** so với thời hạn bài viết → **Tự động duyệt**
- Nếu ảnh không có EXIF hoặc quá hạn → Chuyển vào hàng chờ **PENDING** chờ Admin duyệt

> ⚠️ **Lưu ý**: Chụp ảnh màn hình trực tiếp từ điện thoại (không qua ứng dụng chỉnh sửa) để giữ EXIF gốc.

### 3. Task Manager

**Đường dẫn:** `/tasks`

Công cụ quản lý công việc với nhiều chế độ xem.

#### Workspace (Không gian làm việc)

- Mỗi workspace là một nhóm công việc riêng
- Bạn có thể tạo workspace cá nhân hoặc tham gia workspace của team
- Chuyển đổi workspace ở dropdown phía trên

#### Chế độ xem

| Chế độ | Mô tả |
|--------|-------|
| **Board (Kanban)** | Kéo thả task giữa các cột TODO → IN_PROGRESS → DONE |
| **List** | Danh sách task dạng bảng, lọc theo filter |
| **Calendar** | Xem task trên lịch theo ngày |

#### Bộ lọc

- **Tất cả**: Xem mọi task
- **Việc của tôi**: Chỉ task bạn được gán
- **Hôm nay**: Task đến hạn hôm nay
- **Sắp tới**: Task chưa đến hạn

#### Thao tác với Task

1. **Tạo task**: Nhấn nút **+** → điền tiêu đề, mô tả, hạn chót, gán người
2. **Gán tag**: Tạo và gán tag màu sắc để phân loại
3. **Custom properties**: Thêm trường tuỳ chỉnh theo workspace
4. **Ghi chú (Note)**: Soạn thảo rich text — nội dung được AI embedding để hỗ trợ tìm kiếm
5. **AI Chat**: Trò chuyện với AI dựa trên nội dung task (RAG)

#### Quick Note

Ô ghi chú nhanh bên phải màn hình — viết và tự động lưu.

### 4. Thời gian biểu

**Đường dẫn:** `/timetable`

Lập lịch làm việc tuần trực quan.

#### Bắt đầu

- Lần đầu: Hệ thống hỏi một số câu hỏi (giờ làm việc, năng lượng cao nhất, công việc chính) → **tự động tạo thời gian biểu** bằng AI
- Hoặc tạo thủ công từ đầu

#### Thao tác

- **Thêm hàng mới**: Nhấn nút "Thêm hàng" → chọn loại (công việc chính, phụ, nghỉ ngơi...)
- **Sửa ô**: Click vào ô bất kỳ → nhập nội dung công việc
- **Kéo thả**: Sắp xếp lại thứ tự các hàng
- **Đồng bộ Task Manager**: Tự động đồng bộ các task từ Task Manager vào thời gian biểu
- **Xuất Excel**: Tải xuống thời gian biểu dạng `.xlsx`

> 💡 Hệ thống tự động phát hiện **trùng lịch** (overlap) và đánh dấu cảnh báo.

### 5. AI Studio (SEO Tools)

**Đường dẫn:** `/seo-tools`

Bộ công cụ viết nội dung SEO với AI.

#### Các công cụ

| Công cụ | Mô tả |
|---------|-------|
| **Article Writer** | Nhập từ khoá → AI viết bài chuẩn SEO hoàn chỉnh |
| **Table Generator** | Nhập dữ liệu thô → AI tạo bảng so sánh thông số (specs) |
| **Spec Summary** | Nhập nội dung → AI tóm tắt thành đoạn ngắn gọn |

#### Cách dùng Article Writer

1. Chọn tab **Article Writer**
2. Nhập **từ khoá chính** (VD: "dịch vụ SEO")
3. Tuỳ chọn: thêm mô tả, đối tượng mục tiêu
4. Nhấn **Generate** → AI viết bài
5. Copy nội dung hoặc chỉnh sửa trực tiếp

### 6. Báo cáo cá nhân

**Đường dẫn:** `/reports`

Xem lịch sử check-in của bạn:

- Danh sách tất cả bài đã nộp
- Trạng thái: Tự động duyệt ✅, Đang chờ ⏳, Đã duyệt ✓, Từ chối ❌
- Lý do từ chối nếu có
- Ảnh minh chứng đã nộp

### 7. AI Chat

Trợ lý AI xuất hiện dưới dạng **bubble chat** ở góc dưới phải màn hình (trên tất cả các trang trừ AI Studio).

- Hỏi về nhiệm vụ, hướng dẫn sử dụng
- Trong Task Manager: Chat có ngữ cảnh dựa trên task hiện tại (RAG)
- Nhấn vào bubble để mở/đóng

---

## Hướng dẫn sử dụng — Quản trị viên

> Các tính năng này chỉ hiển thị với tài khoản có quyền **ADMIN**.

### 1. Duyệt bài

**Đường dẫn:** `/admin/queue`

Kiểm duyệt các bài nộp check-in.

#### Giao diện

- **Tab PENDING**: Các bài chưa duyệt (cần xử lý)
- **Tab AUTO_APPROVED**: Các bài tự động duyệt
- **Tab REVIEWED**: Lịch sử đã duyệt/từ chối

#### Thao tác

1. Chọn bài cần duyệt (click vào để xem chi tiết + ảnh)
2. **Duyệt (Approve)**: Xác nhận bài nộp hợp lệ
3. **Từ chối (Reject)**: Nhập lý do từ chối
4. **Thao tác hàng loạt**: Chọn nhiều bài → Duyệt/Từ chối cùng lúc
5. **AI Scan**: Quét ảnh bằng Gemini Vision để đối chiếu nội dung

> 🔍 Click vào ảnh để xem phóng to.

### 2. Quản lý Post

**Đường dẫn:** `/admin/posts`

Tạo và quản lý bài viết Facebook cần check-in.

#### Tạo bài viết mới

1. Nhấn **Tạo bài viết**
2. Nhập:
   - **Tiêu đề** (bắt buộc)
   - **URL bài viết Facebook** (bắt buộc)
   - **Mô tả** (tuỳ chọn)
   - **Ngày đăng** — thời hạn check-in
   - **Team** — chọn phòng ban được gán (ALL, TECH, SALES, MARKETING)
3. Hệ thống tự động lấy thumbnail + OG meta từ URL
4. Nhấn **Lưu**

#### Quản lý

- **Sửa**: Click vào bài viết → chỉnh sửa thông tin
- **Archive**: Ẩn bài viết khỏi danh sách check-in của nhân viên
- **Check mật độ**: Xem số bài đã đăng trong ngày (giới hạn số bài/ngày)

### 3. Quản lý Account

**Đường dẫn:** `/admin/accounts`

Quản lý tài khoản người dùng.

#### Danh sách tài khoản

- Tìm kiếm theo tên/email
- Lọc theo role (ADMIN/USER), phòng ban, trạng thái

#### Thao tác

| Thao tác | Mô tả |
|----------|-------|
| **Tạo tài khoản** | Nhập username, email, password, chọn phòng ban và role |
| **Sửa** | Thay đổi thông tin, role, phòng ban |
| **Xoá** | Xoá tài khoản (có xác nhận) |
| **Xác thực Facebook** | Xác nhận liên kết Facebook của user |

### 4. Reports (Analytics)

**Đường dẫn:** `/admin/analytics`

Thống kê và biểu đồ toàn hệ thống.

#### Các chỉ số

- **Hiệu suất bài viết**: Tỷ lệ hoàn thành theo từng bài
- **Hiệu suất nhân sự**: Mỗi nhân viên đã hoàn thành/bỏ lỡ bao nhiêu bài
- **Xu hướng ngày**: Biểu đồ số check-in dự kiến vs thực tế theo ngày trong tuần
- **Phân tích phòng ban**: Hiệu suất theo từng phòng

> 📊 Dữ liệu có thể xuất ra **Excel** để lưu trữ.

### 5. Cấu hình hệ thống

**Đường dẫn:** `/admin/settings`

#### Phòng ban

- Thêm/Sửa/Xoá phòng ban
- User thuộc phòng ban nào sẽ thấy bài viết tương ứng

#### Workspace (Task Manager)

- Xem tất cả workspace trên hệ thống
- Xoá workspace khi không còn sử dụng

#### Cấu hình AI

- Chọn **Model AI**: GPT-4o, GPT-4 Turbo, Claude 3 Opus/Sonnet, Gemini 1.5 Pro
- Nhập **API Key** nếu cần

---

## Cài đặt & Phát triển

### Yêu cầu

- Node.js 18+
- PostgreSQL (có pgvector extension)
- Vercel Blob account (upload ảnh)
- AI-Box API key (chat + vision)

### Cài đặt local

```bash
# Clone repo
git clone <repo-url>
cd teamwork-check-dashboard

# Cài dependencies
npm install

# Tạo file .env (xem mẫu bên dưới)
cp .env.example .env

# Khởi tạo database
npx prisma generate
npx prisma db push
npx prisma db seed

# Chạy dev server
npm run dev
```

### Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Secret cho JWT |
| `NEXTAUTH_URL` | ✅ | URL ứng dụng |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Token Vercel Blob |
| `AIBOX_API_KEY` | ✅ | API key AI-Box |
| `AIBOX_BASE_URL` | ❌ | Mặc định: https://api.ai-box.vn/v1 |
| `ADMIN_USERNAME` | ❌ | Tạo admin mặc định khi login |
| `ADMIN_PASSWORD` | ❌ | Mật khẩu admin mặc định |

### Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Dev server (Next.js) |
| `npm run build` | Build production |
| `npm run start` | Chạy production server |
| `npm run lint` | Kiểm tra lint |

---

## Kiến trúc hệ thống

### Công nghệ

| Layer | Công nghệ |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Ngôn ngữ** | TypeScript |
| **Auth** | NextAuth v5 (Credentials, JWT) |
| **Database** | PostgreSQL + Prisma ORM |
| **Upload** | Vercel Blob |
| **UI** | Tailwind CSS, Lucide Icons, Framer Motion |
| **Biểu đồ** | Recharts |
| **Excel** | ExcelJS |
| **AI Chat** | AI-Box API (DeepSeek Pro / Flash) |
| **AI Vision** | Gemini (qua AI-Box API) |
| **EXIF** | exifr (server-side) |

### Role hệ thống

- **USER**: Nhân viên — truy cập dashboard, like/share, task, timetable, AI Studio
- **ADMIN**: Quản trị — tất cả quyền USER + duyệt bài, quản lý posts/accounts, analytics, settings

### Bảo mật

- Middleware kiểm tra session mọi request đến trang protected
- API routes kiểm tra quyền ADMIN cho các thao tác nhạy cảm
- EXIF trích xuất **server-side** — không tin dữ liệu từ client
- Ảnh bị từ chối được xoá khỏi Vercel Blob để tiết kiệm storage
- Transaction atomic cho thao tác nhạy cảm (tạo user, duyệt bài)

---

> Dự án nội bộ — Song Phương Technology (SP-CyberSoft)
