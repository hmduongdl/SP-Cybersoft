# Teamwork Check Dashboard

> Hệ thống quản lý check-in & kiểm duyệt minh chứng chia sẻ bài viết dành cho doanh nghiệp.

## Giới thiệu

**Teamwork Check Dashboard** là ứng dụng web xây dựng trên **Next.js**, giúp doanh nghiệp quản lý quy trình check-in minh chứng chia sẻ bài viết lên mạng xã hội của nhân viên. Hệ thống hỗ trợ luồng nộp minh chứng, trích xuất EXIF ảnh để chống gian lận, kiểm duyệt thủ công & AI, cùng tính năng xuất báo cáo.

### Luồng nghiệp vụ chính

1. **Quản trị viên** tạo bài viết (Post) — mỗi bài viết là một đường dẫn cần được chia sẻ.
2. **Nhân viên** chụp ảnh màn hình sau khi chia sẻ bài viết (hoặc check-in tự động), và nộp lên hệ thống.
3. **Hệ thống** trích xuất thời gian chụp từ EXIF ảnh để phát hiện ảnh cũ bị tái sử dụng.
4. **Quản trị viên** duyệt/từ chối bài nộp qua giao diện queue, kết hợp hỗ trợ quét ảnh AI.
5. **Báo cáo** được xuất ra file Excel để phục vụ đánh giá KPI.

## Tính năng

### 👤 Người dùng
- Đăng nhập qua NextAuth (credentials)
- Xem danh sách bài viết cần check-in
- Tải ảnh màn hình lên làm minh chứng
- Check-in tự động (không cần upload ảnh) nếu trong khung giờ cho phép
- Xem lịch sử check-in & trạng thái duyệt
- Onboarding lần đầu đăng nhập

### 🛡️ Quản trị viên
- Dashboard thống kê tổng quan với biểu đồ (Recharts)
- Quản lý hàng đợi kiểm duyệt (Approve/Reject kèm lý do)
- Quét ảnh AI với Gemini Vision để hỗ trợ kiểm duyệt
- Quản lý bài viết (Posts) — CRUD
- Quản lý người dùng & tài khoản
- Quản lý phòng ban
- Xem báo cáo & xuất Excel
- Cài đặt hệ thống

### 🔒 Bảo mật & Chống gian lận
- Trích xuất EXIF (`DateTimeOriginal`) từ ảnh upload
- Kiểm tra thời gian chụp thực tế để phát hiện ảnh cũ
- Phân quyền Admin / User
- Middleware bảo vệ route

## Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Framework** | Next.js 14+ (App Router) |
| **Ngôn ngữ** | TypeScript |
| **Auth** | NextAuth v5 (Credentials) + bcryptjs |
| **Database** | PostgreSQL qua Neon SQL |
| **ORM** | Prisma |
| **Upload** | Cloudinary, Vercel Blob |
| **UI** | Tailwind CSS, shadcn/ui, Lucide Icons |
| **Form** | React Hook Form + Zod |
| **Biểu đồ** | Recharts |
| **Excel** | ExcelJS |
| **AI** | Gemini API (Vision) |
| **EXIF** | exifr |
| **Toast** | Sonner |
| **Hosting** | Vercel |

## Cài đặt

### Yêu cầu
- Node.js 18+
- PostgreSQL database (Neon SQL khuyến nghị)

### 1. Clone & cài đặt dependencies

```bash
git clone <repo-url>
cd teamwork-check-dashboard
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env.local` tại thư mục gốc:

```env
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
NEXTAUTH_SECRET="chuỗi_bảo_mật_ngẫu_nhiên"
NEXTAUTH_URL="http://localhost:3000"

# Cloudinary (upload ảnh)
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Vercel Blob (upload ảnh)
BLOB_READ_WRITE_TOKEN="..."

# Gemini AI (quét ảnh)
GEMINI_API_KEY="..."
```

### 3. Khởi tạo database

```bash
npx prisma generate
npx prisma db push
npx prisma db seed    # Tạo dữ liệu mẫu (nếu có)
```

### 4. Chạy dev server

```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000).

## Cấu trúc thư mục

```
src/
├── app/                    # Next.js App Router
│   ├── admin/              # Trang quản trị
│   │   ├── accounts/       # Quản lý tài khoản
│   │   ├── analytics/      # Thống kê & biểu đồ
│   │   ├── posts/          # Quản lý bài viết
│   │   ├── queue/          # Kiểm duyệt chờ
│   │   ├── reports/        # Báo cáo
│   │   └── settings/       # Cài đặt hệ thống
│   ├── calendar/           # Xem lịch
│   ├── dashboard/          # Dashboard người dùng
│   ├── login/              # Trang đăng nhập
│   ├── onboarding/         # Onboarding lần đầu
│   ├── posts/              # Danh sách bài viết
│   ├── tasks/              # Task check-in
│   └── api/                # API Routes
│       ├── admin/          # API admin
│       ├── auth/           # API xác thực
│       ├── checkin/        # API check-in
│       ├── export/         # API xuất báo cáo
│       ├── posts/          # API bài viết
│       ├── submissions/    # API nộp minh chứng
│       ├── user/           # API người dùng
│       └── users/          # API danh sách user
├── components/             # Shared components
│   ├── modules/            # Module components
│   ├── shared/             # Dùng chung
│   └── ui/                 # UI base (shadcn/ui)
├── lib/                    # Utilities & helpers
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript types
├── auth.config.ts          # Auth config
├── auth.ts                 # Auth setup
└── middleware.ts           # Route protection

prisma/
├── schema.prisma           # Database schema
├── seed.ts                 # Seed data
└── migrations/             # Prisma migrations
```

## Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production (kèm Prisma generate) |
| `npm run start` | Chạy production server |
| `npm run lint` | Kiểm tra lint |

## Deploy lên Vercel

1. Đẩy code lên GitHub/GitLab.
2. Tạo project mới trên [Vercel](https://vercel.com).
3. Kết nối repository.
4. Thêm các biến môi trường (giống `.env.local`) trong **Settings > Environment Variables**.
5. Deploy — mỗi lần push lên nhánh chính sẽ tự động deploy lại.

> **Lưu ý:** Không commit file `.env.local` lên Git.

## Design System

Dự án sử dụng giao diện **Light Theme** với bảng màu Indigo làm chủ đạo. Xem [COLORS.md](./COLORS.md) để biết chi tiết.

## Giấy phép

Dự án nội bộ — không public.
