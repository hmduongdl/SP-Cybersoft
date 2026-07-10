# SP-CyberSoft — Hệ thống Quản lý Nội bộ

## Tính năng chính

### Người dùng

| Tính năng | Đường dẫn | Mô tả |
|-----------|-----------|-------|
| **Dashboard** | `/dashboard` | Tổng quan check-in, task, tiến độ tháng |
| **Like & Share** | `/like-share` | Check-in bài viết Facebook — nộp ảnh màn hình, tự động duyệt qua EXIF |
| **Task Manager** | `/tasks` | Kanban/List/Calendar, gán người, filter, custom properties, ghi chú rich-text |
| **Thời gian biểu** | `/timetable` | Lịch tuần kéo thả, AI tự động tạo, đồng bộ Task Manager, xuất Excel |
| **AI Studio** | `/seo-tools` | Article Writer, Table Generator, Spec Summary |
| **Build PC** | `/build-pc` | Bài tập lắp ráp PC hàng ngày do AI sinh — nộp cấu hình, chấm điểm, xếp hạng |
| **Báo cáo cá nhân** | `/reports` | Lịch sử check-in, trạng thái duyệt |
| **AI Chat** | — | Trợ lý AI chat bubble toàn trang, RAG theo ngữ cảnh task |
| **Onboarding** | `/onboarding` | Hướng dẫn đầu tiên cho người dùng mới |

### Quản trị viên

| Tính năng | Đường dẫn | Mô tả |
|-----------|-----------|-------|
| **Duyệt bài** | `/admin/queue` | Duyệt/từ chối check-in, AI Scan ảnh, thao tác hàng loạt |
| **Duyệt Build PC** | `/admin/queue` (tab PC) | Chấm điểm bài nộp build PC |
| **Quản lý Post** | `/admin/posts` | Tạo/sửa/archive bài viết Facebook check-in |
| **Quản lý Account** | `/admin/accounts` | CRUD user, phân quyền, xác thực Facebook |
| **Analytics** | `/admin/analytics` | Thống kê hiệu suất bài viết, nhân sự, phòng ban — xuất Excel |

## Công nghệ

| Layer | Công nghệ |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Ngôn ngữ** | TypeScript |
| **Auth** | NextAuth v5 (Credentials, JWT) |
| **Database** | PostgreSQL + Prisma ORM (pgvector) |
| **Upload** | Vercel Blob |
| **UI** | Tailwind CSS, Lucide, Framer Motion, Recharts |
| **AI** | AI-Box API (DeepSeek/GPT/Claude/Gemini) |
| **Email** | Resend + Nodemailer |
| **Theme** | next-themes (system/light/dark) |

## Bắt đầu

```bash
npm install
cp .env.example .env        # Cấu hình database, auth, blob, AI key
npx prisma generate && npx prisma db push
npm run dev
```

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Secret JWT |
| `NEXTAUTH_URL` | ✅ | URL ứng dụng |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Token Vercel Blob |
| `AIBOX_API_KEY` | ✅ | API key AI-Box |
| `AIBOX_BASE_URL` | ❌ | Mặc định: `https://api.ai-box.vn/v1` |

## Vai trò

- **USER** — Dashboard, check-in, task, timetable, AI Studio, build PC
- **ADMIN** — Tất cả quyền USER + duyệt bài, quản lý posts/accounts/users, analytics, cấu hình

---
