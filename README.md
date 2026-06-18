# SPS AI Check-in Tool

> Hệ thống quản lý check-in & kiểm duyệt minh chứng Like & Share bài viết Facebook nội bộ.

## Giới thiệu

**SPS AI Check-in Tool** là ứng dụng web xây dựng trên **Next.js (App Router)**, giúp doanh nghiệp quản lý quy trình nhân viên Like & Share bài viết lên Facebook và nộp minh chứng. Hệ thống hỗ trợ trích xuất EXIF ảnh server-side để chống gian lận, kiểm duyệt thủ công kết hợp AI Scan (Gemini Vision), cùng tính năng xuất báo cáo Excel và trợ lý AI chat.

### Luồng nghiệp vụ chính

1. **Quản trị viên** tạo bài viết (Post) lên lịch — mỗi bài viết là một đường dẫn Facebook cần được Like & Share.
2. **Nhân viên** chụp ảnh màn hình sau khi share bài viết và nộp lên hệ thống.
3. **Hệ thống** trích xuất thời gian chụp từ EXIF ảnh server-side — nếu thời gian chụp nằm trong cửa sổ 24h so với `start_at`, bài nộp được **tự động duyệt** (AUTO_APPROVED).
4. **Quản trị viên** duyệt/từ chối bài nộp PENDING qua giao diện queue, kết hợp **AI Scan** (Gemini Vision) đọc ảnh và đối chiếu nội dung.
5. **Báo cáo** xuất file Excel với tỷ lệ hoàn thành, số bài tự động/thủ công, số bài bỏ lỡ.

## Tính năng

### Người dùng (Nhân viên)
- Đăng nhập qua NextAuth (credentials)
- Dashboard tổng quan: số bài chưa check-in, đã hoàn thành, điểm tích lũy
- Xem danh sách bài viết cần Like & Share (dạng bảng hoặc lịch — chuyển đổi linh hoạt)
- Nộp ảnh chụp màn hình — drag & drop, paste từ clipboard, hoặc chọn file
- Check-in tự động duyệt nếu EXIF ảnh hợp lệ
- Dùng **Ngôi sao hy vọng** (tối đa 3/tháng) để xoá lỗi quên check-in bài quá hạn
- Xem lịch sử check-in & trạng thái duyệt
- Onboarding lần đầu đăng nhập (điền thông tin cá nhân)
- Trợ lý AI chat hỏi đáp về nhiệm vụ, tình hình share bài

### Quản trị viên
- Dashboard thống kê tổng quan với biểu đồ (Recharts)
- **Quản lý bài viết**: CRUD, bulk archive/unarchive, kiểm tra mật độ ngày đăng
- **Kiểm duyệt hàng đợi**: Approve/Reject kèm lý do (batch hoặc single), xem ảnh zoom
- **AI Scan**: Quét ảnh check-in với Gemini Vision → đối chiếu tên + nội dung
- **Quản lý tài khoản**: Tạo/sửa/xoá user, tặng Ngôi sao hy vọng
- **Báo cáo & phân tích**: Hiệu suất phòng ban, xu hướng tuần, bảng xếp hạng nhân sự
- **Xuất Excel**: Báo cáo Like & Share chi tiết theo khoảng thời gian
- **Cấu hình hệ thống**: Quản lý phòng ban, cài đặt AI
- **OG Scraper**: Lấy thông tin meta từ URL bài viết khi tạo post

### Chống gian lận
- Trích xuất EXIF (`DateTimeOriginal`) server-side từ ảnh — **không tin kết quả client**
- Kiểm tra thời gian chụp thực tế trong cửa sổ 24h so với mốc bài viết
- Phân quyền Admin / User qua middleware
- Xoá ảnh trên Vercel Blob khi reject để tiết kiệm storage
- Transaction atomic cho các thao tác nhạy cảm (dùng sao, tạo user)

## Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Framework** | Next.js (App Router) |
| **Ngôn ngữ** | TypeScript |
| **Auth** | NextAuth v5 (beta 31) — Credentials provider, JWT |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Upload** | Vercel Blob |
| **UI** | Tailwind CSS, Lucide Icons |
| **Validation** | Zod |
| **Biểu đồ** | Recharts (BarChart, LineChart) |
| **Excel** | ExcelJS + date-fns |
| **AI Chat** | AI-Box API (DeepSeek Pro / Flash) |
| **AI Vision** | Gemini (qua AI-Box API) |
| **EXIF** | exifr (server-side) |
| **Toast** | Sonner |

## Cài đặt

### Yêu cầu
- Node.js 18+
- PostgreSQL database

### 1. Clone & cài đặt dependencies

```bash
git clone <repo-url>
cd teamwork-check-dashboard
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env` tại thư mục gốc:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"

# NextAuth
NEXTAUTH_SECRET="random-secret-string"
NEXTAUTH_URL="http://localhost:3000"

# Vercel Blob (upload ảnh check-in + avatar)
BLOB_READ_WRITE_TOKEN="..."

# AI-Box API (chat + vision scan)
AIBOX_API_KEY="..."
AIBOX_BASE_URL="https://api.ai-box.vn/v1"

# Model overrides (optional)
MODEL_DEEPSEEK_PRO="deepseek-v4-pro"
MODEL_DEEPSEEK_FLASH="deepseek-v4-flash"
MODEL_GEMINI_VISION="gemini-3-flash"
```

### 3. Khởi tạo database

```bash
npx prisma generate
npx prisma db push
npx prisma db seed    # Tạo tài khoản admin mẫu
```

### 4. Chạy dev server

```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000) — sẽ redirect đến `/login`.

## Cấu trúc thư mục

```
├── src/                       # Next.js App Router source
│   ├── app/                   # Pages, API routes, server actions
│   │   ├── actions/           # Server Actions (auth, hope stars)
│   │   ├── admin/             # Admin pages
│   │   ├── api/               # API Route Handlers
│   │   ├── dashboard/         # User dashboard
│   │   ├── login/             # Login page
│   │   ├── onboarding/        # First-time onboarding
│   │   ├── reports/           # Personal reports
│   │   └── tasks/             # Task check-in pages
│   ├── components/            # React components
│   │   ├── modules/           # Feature modules
│   │   ├── shared/            # Layout, header, sidebar
│   │   └── ui/                # UI primitives
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities, DB client, config
│   └── types/                 # TypeScript type definitions
├── prisma/                    # Database schema, migrations, seed
├── public/                    # Static assets (images, favicon)
├── scripts/                   # Utility scripts & tools
│   ├── fix_rounded.py         # Fix rounded corner styles
│   ├── replace_styles.py      # Style replacement utilities
│   └── test-action.js         # Action test script
├── docs/                      # Documentation
│   ├── PLAN.md                # Implementation plan
│   ├── RESTRUCTURE.md         # Restructure notes
│   └── COLORS.md              # Color scheme reference
├── .env                       # Environment variables
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── vercel.json                # Vercel deployment config
└── package.json               # Dependencies & scripts
```

## API Endpoints

### Người dùng

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/posts` | Danh sách bài viết (phân trang) |
| GET | `/api/posts/density?date=` | Mật độ bài viết theo ngày |
| POST | `/api/checkins` | Nộp ảnh check-in (JSON: post_id + image_url) |
| GET | `/api/checkins?post_id=` | Lịch sử check-in của user |
| POST | `/api/upload/checkin` | Upload ảnh check-in lên Vercel Blob |
| POST | `/api/upload/avatar` | Upload ảnh đại diện |
| GET | `/api/user/profile` | Xem thông tin cá nhân |
| PUT | `/api/user/profile` | Cập nhật thông tin cá nhân |
| POST | `/api/user/onboarding` | Hoàn tất onboarding |
| POST | `/api/user/change-password` | Đổi mật khẩu |
| POST | `/api/user/use-star` | Dùng Ngôi sao hy vọng |
| GET | `/api/user/quota-status` | Hạn mức AI token |
| POST | `/api/ai/chat` | Chat AI (streaming) |

### Quản trị

| Method | Path | Mô tả |
|--------|------|-------|
| GET/POST/PUT/DELETE | `/api/admin/accounts` | CRUD tài khoản người dùng |
| PATCH | `/api/admin/accounts/[id]/verify-facebook` | Xác thực Facebook |
| POST | `/api/admin/checkin/action` | Duyệt/từ chối check-in hàng loạt |
| POST | `/api/admin/ai-scan` | Quét ảnh bằng AI (Gemini Vision) |
| GET/POST | `/api/admin/settings` | Xem/cập nhật cấu hình hệ thống |
| GET/POST/DELETE | `/api/admin/departments` | Quản lý phòng ban |
| GET | `/api/admin/export-excel` | Xuất Excel (có lọc khoảng ngày) |
| GET | `/api/admin/og-scraper?url=` | Lấy OG tags từ URL |
| POST | `/api/admin/users/[id]/add-star` | Tặng Ngôi sao hy vọng |

## Database Models

- **User**: Tài khoản nhân viên/admin — username, email, password (bcrypt), role, department, avatar, facebook link, hope_stars, daily token quota
- **Post**: Bài viết cần Like & Share — title, url, thumbnail, description, start_at, team (ALL/TECH/SALES), archive/late-submit flags
- **Checkin**: Bản ghi nộp minh chứng — user_id, post_id, image_url (Vercel Blob), exif_time, status (AUTO_APPROVED/PENDING/APPROVED/REJECTED), ai_confidence, reject_reason
- **SystemSetting**: Cấu hình key-value (model AI, API key encrypt)
- **Department**: Danh sách phòng ban (name unique)

## Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production (Prisma generate + Next build) |
| `npm run start` | Chạy production server |
| `npm run lint` | Kiểm tra lint |

## Deploy lên Vercel

1. Push code lên GitHub/GitLab.
2. Tạo project mới trên [Vercel](https://vercel.com).
3. Kết nối repository.
4. Thêm biến môi trường (giống `.env`) trong **Settings > Environment Variables**.
5. Deploy — mỗi lần push nhánh chính tự động build lại.

> **Lưu ý:** Không commit `.env` lên Git.

## Biến môi trường yêu cầu khi deploy

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Secret cho JWT |
| `NEXTAUTH_URL` | ✅ | URL ứng dụng (VD: https://app.vercel.app) |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Token Vercel Blob |
| `AIBOX_API_KEY` | ✅ | API key AI-Box |
| `AIBOX_BASE_URL` | ❌ | Mặc định: https://api.ai-box.vn/v1 |

## Thiết kế

Giao diện **Light Theme** với bảng màu Indigo làm chủ đạo. Sử dụng Tailwind CSS utility classes + Lucide Icons.

---

Dự án nội bộ — Song Phương Technology.
