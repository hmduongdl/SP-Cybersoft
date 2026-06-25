# Restructuring Guide — SPS AI Check-in Tool

> File này mô tả toàn bộ cấu trúc chương trình hiện tại, phân tích các vấn đề, và đưa ra kế hoạch tái cấu trúc. Dành cho AI (Stitch/Claude) thực hiện tái cấu trúc codebase.

---

## 1. Tổng Quan

**Tech Stack**:
- **Framework**: Next.js (App Router), TypeScript
- **Auth**: NextAuth v5 (beta 31) — Credentials provider, JWT session
- **Database**: PostgreSQL + Prisma ORM
- **File Storage**: Vercel Blob (BLOB_READ_WRITE_TOKEN)
- **UI**: Tailwind CSS + Lucide Icons + Material Symbols (Google Fonts)
- **Charts**: Recharts
- **AI**: AI-Box API (OpenAI-compatible SDK), Gemini vision model
- **Excel**: ExcelJS + date-fns
- **Validation**: Zod

**Mục đích**: Hệ thống quản lý Like & Share bài viết Facebook nội bộ, nhân viên check-in bằng ảnh chụp màn hình, Admin duyệt thủ công hoặc AI, xuất báo cáo Excel.

---

## 2. Cấu Trúc Thư Mục Chi Tiết

### 2.1 Database Schema (`prisma/schema.prisma`)

```
Model User:
  - id, username (unique), username_changed, is_first_login
  - name, full_name?, email (unique), facebook_profile_url?
  - password (hashed), role (ADMIN|USER), department
  - avatar_url?, facebook_verified, is_active
  - daily_token_limit, last_token_reset, tokens_used_today
  - Relations: checkins (UserCheckins), reviewed_checkins (AdminReviewedCheckins)

Model Post:
  - id, title, url, thumbnail_url?, description, author?
  - start_at, team (ALL|TECH|SALES|MARKETING)
  - is_archived, allow_late_submit, created_at
  - Relations: checkins[]

Model Checkin:
  - id, user_id, post_id, image_url
  - exif_time?, submitted_at
  - status (AUTO_APPROVED|PENDING|APPROVED|REJECTED)
  - reject_reason?, is_ai_flagged, ai_confidence?, reviewed_by?
  - Relations: post, user, reviewer (User/Admin)

Model SystemSetting:
  - id, key (unique), value

Model Department:
  - id, name (unique)
```

### 2.2 Thư Mục Source (`src/`)

```
src/
├── app/                          # Next.js App Router pages
│   ├── actions/                  # Server Actions
│   ├── admin/                    # Admin pages
│   ├── api/                      # API Route Handlers
│   ├── dashboard/                # User dashboard
│   ├── login/                    # Login page
│   ├── onboarding/               # First-login onboarding
│   ├── reports/                  # Personal reports
│   ├── tasks/                    # Task list (check-in page)
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Redirect to /dashboard
│   └── ...                       # error, not-found, client-layout-wrapper
├── auth.ts                       # NextAuth config (full)
├── auth.config.ts                # NextAuth config (light, for middleware)
├── components/
│   ├── modules/                  # Feature modules
│   │   ├── dashboard/            # Dashboard overview
│   │   └── tasks/                # Post list, calendar, checkin modal, admin
│   ├── shared/                   # Shared components
│   ├── ui/                       # UI primitives (button, card, pagination)
│   ├── AccountModal.tsx          # Profile editing modal
│   ├── AdminUserEditModal.tsx    # Admin edit user modal
│   ├── AIAssistant.tsx           # AI chat floating widget
│   ├── FacebookProfilePreview.tsx
│   ├── LoginForm.tsx
│   ├── OnboardingModal.tsx
│   ├── SessionProviderWrapper.tsx
│   └── SubmitCheckinModal.tsx     # Main checkin submission modal (v2)
├── hooks/
│   └── useFacebookSDK.ts         # Facebook SDK loader
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── prisma.ts                 # Re-export db as prisma
│   ├── posts.ts                  # Zod schemas + date helpers
│   ├── cache.ts                  # Database query functions (NOT real cache)
│   ├── ai-quota.ts               # Token quota management (DISABLED)
│   ├── aibox.ts                  # AI-Box OpenAI client
│   ├── upload.ts                 # Vercel Blob upload/delete
│   ├── date.ts                   # Date utilities
│   └── utils.ts                  # cn(), formatPercentage()
├── middleware.ts                 # NextAuth middleware
└── types/
    ├── index.ts                  # Legacy types (OUTDATED)
    ├── next-auth.d.ts            # Session token type extension
    ├── facebook-sdk.d.ts         # FB SDK types
    └── global.d.ts               # Global FB types
```

---

## 3. Luồng Dữ Liệu / Data Flow

### 3.1 Authentication Flow
```
Client → Middleware (auth.config.ts) → NextAuth JWT → Session Provider
  - Login: /login → credentials → authorize() → JWT token → redirect /dashboard
  - Middleware checks: login required, admin routes, onboarding status
```

### 3.2 Check-in Submission Flow (Main Path)
```
[tasks/page.tsx] (Server Component)
  → TaskListContainer (Server) — fetches posts + user stars
  → TasksPageClient (Client)
    → PostListView (Client) — table view with filters
      → SubmitCheckinModal (Client)
        → [1] User uploads image to /api/upload/checkin → Vercel Blob
        → [2] User submits via POST /api/checkins
          → Server: fetch image from CDN → parse EXIF → determine status
          → Create Checkin record → Return {status: AUTO_APPROVED|PENDING}
```

### 3.3 Admin Moderation Flow
```
[/admin/queue/page.tsx] (Server)
  → AdminQueueList (Server) — fetch all checkins, filter
  → QueueClient (Client) — grid view with approve/reject/AI scan
  
Approve/Reject: POST /api/admin/checkin/action
AI Scan:        POST /api/admin/ai-scan (Gemini reads image → judge model)
```

### 3.4 Dashboard Flow
```
[/dashboard/page.tsx] (Server)
  → DashboardContent (Server) — fetch stats via lib/cache.ts
  → DashboardOverview (Client) — display KPI cards + activity feed
```

### 3.5 Admin Post Management Flow
```
[/admin/posts] → PostTaskAdmin (Client)
  List/Create/Edit/Delete posts via:
  - GET  /api/posts
  - POST /api/posts
  - PATCH /api/posts/[id]
  - DELETE /api/posts/[id]
  - PATCH /api/posts/[id]/status (toggle archive)
  - Bulk PATCH/DELETE /api/posts
```

### 3.6 AI Chat Flow
```
AIAssistant (Client widget)
  → POST /api/ai/chat (streaming)
    → Server: fetch user context + active posts → inject into system prompt
    → Call AI-Box API with streaming
    → Record token usage after stream
```

### 3.7 Export Flow
```
[/admin/analytics] → AnalyticsContainer (Server) → AnalyticsClient (Client)
  Export: GET /api/admin/export-excel → ExcelJS workbook → Blob download
```

---

## 4. Phân Tích Vấn Đề & Tái Cấu Trúc

### 4.1 CẤP BÁCH — Lỗi Runtime và Type

| # | Vấn đề | File | Mức độ |
|---|--------|------|--------|
| 1 | **`revalidateTag` gọi với 2 tham số** — API Next.js 16 chỉ chấp nhận 1 arg. Đây là lỗi runtime. | Mọi file gọi `revalidateTag(CACHE_TAGS.XXX, "default")` | 🔴 |
| 2 | **Kiểu `CACHE_TAGS` sai** — Object nhưng dùng làm string literal. Next.js 16 `revalidateTag()` yêu cầu string. | `src/lib/cache.ts` + tất cả call sites | 🔴 |
| 3 | Import sai trong `post-task-admin.tsx`: dòng 141 dùng `img` thay vì `Image` từ Next.js | `src/components/modules/tasks/post-task-admin.tsx:141` | 🟡 |
| 4 | `layout-context.tsx` dùng Framer Motion API style không rõ nguồn (không có framer-motion trong package.json) | `src/components/shared/layout-context.tsx` | 🟡 |
| 5 | `async` callback trong `useEffect` không await | Nhiều file | 🟡 |
| 6 | `PostCheckinModal` component tồn tại nhưng được thay thế hoàn toàn bởi `SubmitCheckinModal` — dead code | `src/components/modules/tasks/post-checkin-modal.tsx` | 🟡 |
| 7 | `FormData` không có `entries()` iterator typesafe | Nhiều file | 🟢 |

### 4.2 KIẾN TRÚC — Cần Chuẩn Hóa

| # | Vấn đề | Chi tiết | Mức độ |
|---|--------|----------|--------|
| 8 | **Dead code**: PostCheckinModal (cũ) và SubmitCheckinModal (mới) cùng tồn tại. SubmitCheckinModal là bản nâng cấp. | `post-checkin-modal.tsx` vs `SubmitCheckinModal.tsx` | 🔴 |
| 9 | **Duplicate EXIF parsing**: `/api/checkin/submit` và `/api/checkins` có logic EXIF gần như giống nhau. | 2 file route handlers | 🟡 |
| 10 | **Dead code**: `AuthState` interface định nghĩa 2 lần (1 trong file actions, 1 không dùng) | `src/app/actions/auth-actions.ts` | 🟢 |
| 11 | **Dead code**: `cloudinary` trong dependencies nhưng không dùng | `package.json` | 🟢 |
| 12 | **Dead code**: `useFacebookSDK` hook + `sharePost` function không còn dùng đến. SubmitCheckinModal dùng upload ảnh, không dùng Facebook SDK nữa. | `src/hooks/useFacebookSDK.ts` | 🟡 |
| 13 | **Database n+1**: Trong hàm `getCachedPosts()`, nếu không có userId vẫn query checkins không cần thiết | `src/lib/cache.ts:54-58` | 🟡 |
| 14 | **Caching giả**: File tên là `cache.ts` nhưng không dùng cache. Ghi chú trong code nói rõ "Removed unstable_cache". Cần đổi tên và tái cấu trúc. | `src/lib/cache.ts` comment dòng 6-11 | 🔴 |
| 15 | **Quota DISABLED**: `checkAndResetQuota()` luôn return `{ allowed: true }`. Token tracking chạy nhưng quota không enforce. | `src/lib/ai-quota.ts` | 🟡 |
| 16 | **Duplicate AdminUpload avatar**: `/api/admin/upload-avatar` và handler POST trong `/api/user/profile` đều upload avatar. | 2 route files | 🟡 |
| 17 | **Duplicate update-profile**: `/api/user/profile` (PUT) và `/api/user/update-profile` (POST) làm cùng việc. | 2 route files | 🟡 |

### 4.3 UI / UX

| # | Vấn đề | File | Mức độ |
|---|--------|------|--------|
| 18 | **Inconsistent Icon System**: Vừa dùng `lucide-react` vừa dùng `material-symbols-outlined` (Google Fonts load từ CDN) | Tất cả component files | 🟡 |
| 19 | **Admin Post Form Author**: Hardcoded options "Song Phương Technology", "Song Phương" thay vì dynamic từ users | `post-task-admin.tsx:747-749` | 🟡 |
| 20 | **Analytics "Reminder" button**: `handleSendReminder` chỉ hiển thị toast, không gửi email thật. | `analytics-client.tsx` | 🟢 |
| 21 | **Dashboard announcements**: Hardcoded text trong component, không phải dynamic từ DB/model | `dashboard-overview.tsx:122-163` | 🟢 |
| 22 | **`toDateTimeValue` format**: Luôn set giờ `T12:00` — mất precision giờ | `post-task-admin.tsx:63` | 🟢 |
| 23 | **Settings page model list**: Hardcoded model names (gpt-4o, claude-3-opus) không match với AI-Box thực tế | `admin/settings/page.tsx:177-182` | 🟡 |

### 4.4 BẢO MẬT

| # | Vấn đề | File | Mức độ |
|---|--------|------|--------|
| 24 | `base64Image` trong `/api/submissions/manual` lưu base64 string trực tiếp vào DB (image_url). Có thể rất lớn, không validate. | `src/app/api/submissions/manual/route.ts:42` | 🟡 |
| 25 | Admin env var fallback (`ADMIN_USERNAME`/`ADMIN_PASSWORD`) upsert admin account mỗi lần login | `auth.ts:149-196` | 🟢 |

### 4.5 TESTING / REAL DATA NOTES

| Component | Cần Real DB | Mock Data Hiện Tại | Ghi Chú |
|-----------|-------------|-------------------|---------|
| Posts | ✅ Yes | — | Tạo từ Admin UI, lưu PostgreSQL |
| Users | ✅ Yes | — | Tạo từ Admin UI, seed script |
| Checkins | ✅ Yes | — | User nộp ảnh, lưu PostgreSQL |
| EXIF Parsing | ✅ Yes (ảnh thật) | — | Cần ảnh có EXIF thật để test logic |
| AI Scan | ✅ Yes (AI-Box API) | Mock fallback (dòng 168-174) | Fallback dùng keyword check trên URL |
| AI Chat | ✅ Yes (AI-Box API) | — | Stream real-time từ API |
| Vercel Blob | ✅ Yes (storage) | — | Cần BLOB_READ_WRITE_TOKEN |
| Facebook SDK | ❌ Không cần | — | Đã bỏ, flow mới chỉ upload ảnh |
| Dashboard Announcements | — | Hardcoded text | Cần tạo model Announcement nếu muốn dynamic |
| Reports (user) | ✅ Yes | — | Query checkins từ DB |
| Admin Queue | ✅ Yes | — | Query checkins từ DB |
| Analytics | ✅ Yes | — | Aggregation từ DB |
| Export Excel | ✅ Yes | — | Query DB + xlsx build |
| Settings | ✅ Yes | — | Query SystemSetting + Department từ DB |
| Department model | — | Không seed mặc định | DB trống, cần seed hoặc tạo từ UI |
| Star/Hope Star | ✅ Yes | — | Update balance trong transaction |

---

## 5. Đề Xuất Tái Cấu Trúc (Theo Thứ Tự Ưu Tiên)

### Phase 1: Fix Runtime Errors
1. **Sửa `revalidateTag`**: Xoá tham số thứ 2 trong tất cả calls
2. **Đổi tên `lib/cache.ts` → `lib/queries.ts`**: Vì không dùng cache thật
3. **Xoá `PostCheckinModal`** (dead code)
4. **Xoá `PostCheckinModal` import + usage** trong `post-calendar-view.tsx`

### Phase 2: Consolidate Duplicates
5. **Gộp `/api/checkin/submit` vào `/api/checkins`**: Logic EXIF giống nhau, chỉ khác upload method
6. **Gộp `/api/user/update-profile` vào `/api/user/profile`**: PUT handler đã đủ
7. **Xoá `/api/admin/upload-avatar`**: Dùng handler trong `/api/user/profile` (POST) cho cả admin
8. **Xoá `useFacebookSDK.ts` + `sharePost`**: Không còn dùng

### Phase 3: Clean Architecture
9. **Chuẩn hóa imports**: Chỉ dùng `lucide-react` (xoá Material Symbols)
10. **Cập nhật `types/index.ts`**: Xoá legacy types, thêm Prisma-generated types hoặc sync với schema
11. **Sửa `post-task-admin.tsx`**: Author list dynamic từ users API, fix `<img>` → `<Image>`
12. **Xoá `cloudinary` khỏi dependencies** (nếu không dùng)
13. **Sửa `ai-quota.ts`**: Hoặc implement quota thật, hoặc xoá hẳn

### Phase 4: Enhancements
14. **Dynamic dashboard announcements**: Tạo model Announcement hoặc dùng SystemSetting
15. **Settings page**: Cập nhật model list theo AI-Box thực tế
16. **Post form**: Cho admin chọn giờ chính xác (không fix T12:00)

---

## 6. API Route Map Đầy Đủ

```
USER ROUTES:
  POST   /api/auth/[...nextauth]     — NextAuth handler
  GET    /api/posts                   — List posts (paginated)
  POST   /api/posts                   — Create post (ADMIN only)
  PATCH  /api/posts                   — Bulk update posts (ADMIN only)
  DELETE /api/posts                   — Bulk delete posts (ADMIN only)
  GET    /api/posts/density           — Check post density by date
  PATCH  /api/posts/[id]              — Update single post (ADMIN)
  DELETE /api/posts/[id]              — Delete single post (ADMIN)
  PATCH  /api/posts/[id]/status       — Toggle archive (ADMIN)
  GET    /api/checkins                — List user's checkins
  POST   /api/checkins                — Submit checkin (upload + EXIF)
  POST   /api/checkin/submit          — DUPLICATE: Submit checkin (old)
  POST   /api/submissions/auto-check  — Facebook auto-check (deprecated? only creates AUTO_APPROVED)
  POST   /api/submissions/manual      — Manual upload (base64 — INSECURE)
  GET    /api/user/profile            — Get profile
  PUT    /api/user/profile            — Update profile
  POST   /api/user/profile            — Upload avatar (multipart)
  POST   /api/user/update-profile     — DUPLICATE: Update profile
  POST   /api/user/change-password    — Change password
  POST   /api/user/onboarding         — Complete onboarding
  GET    /api/user/quota-status       — Get token quota
  POST   /api/upload/avatar           — Upload avatar (separate endpoint)
  POST   /api/upload/checkin          — Upload checkin image to blob
  POST   /api/ai/chat                 — AI chat (streaming)
  GET    /api/export                  — Export Excel (duplicate of admin/export-excel)

ADMIN ROUTES:
  GET    /api/admin/accounts          — List users
  POST   /api/admin/accounts          — Create user
  PUT    /api/admin/accounts          — Update user
  DELETE /api/admin/accounts?id=xxx   — Delete user
  PATCH  /api/admin/accounts/[id]/verify-facebook — Toggle FB verified
  POST   /api/admin/checkin/action    — Approve/reject checkins
  POST   /api/admin/ai-scan           — AI scan checkin image
  GET    /api/admin/departments       — List departments
  POST   /api/admin/departments       — Create department
  DELETE /api/admin/departments?id=   — Delete department
  GET    /api/admin/export-excel      — Export Excel with date range
  POST   /api/admin/settings          — Update system settings
  GET    /api/admin/settings          — Get system settings
  POST   /api/admin/upload-avatar     — DUPLICATE: Upload user avatar (admin)
  GET    /api/admin/og-scraper        — Scrape OG tags from URL
```

---

## 7. Page Route Map

```
PUBLIC:
  /login                  — Login page (LoginForm)
  /                       — Redirect → /dashboard

PROTECTED (USER + ADMIN):
  /dashboard              — DashboardOverview (server → client)
  /tasks                  — TaskListContainer → TasksPageClient
  /tasks?page=N           — Paginated post list
  /reports                — Personal checkin report (reports-client)
  /onboarding             — Redirect → /dashboard (modal popup)

PROTECTED (ADMIN ONLY):
  /admin/queue            — Checkin moderation queue
  /admin/queue?tab=PENDING|AUTO_APPROVED|REVIEWED
  /admin/analytics        — Reports & charts
  /admin/posts            — CRUD post management
  /admin/accounts         — User account management
  /admin/settings         — Department + AI config
```

---

## 8. Component Hierarchy

```
RootLayout
 └── SessionProviderWrapper
      └── LayoutProvider (role state + sidebar state)
           └── ClientLayoutWrapper
                ├── SiteHeader (breadcrumbs, notifications, user dropdown, profile modal)
                ├── Sidebar (navigation, role switcher, user info)
                └── [Page Content]
                     │
                     ├── /dashboard
                     │   └── DashboardContent (Server)
                     │        └── DashboardOverview (Client)
                     │
                     ├── /tasks
                     │   └── TaskListContainer (Server)
                     │        └── TasksPageClient (Client)
                     │             ├── PostListView (table)
                     │             ├── PostCalendarView (calendar grid)
                     │             └── SubmitCheckinModal (image upload + submit)
                     │
                     ├── /reports
                     │   └── ReportsClient (Client)
                     │
                     ├── /admin/queue
                     │   └── AdminQueueList (Server)
                     │        └── QueueClient (Client)
                     │
                     ├── /admin/analytics
                     │   └── AnalyticsContainer (Server)
                     │        └── AnalyticsClient (Client)
                     │
                     ├── /admin/posts
                     │   └── PostTaskAdmin (Client)
                     │
                     ├── /admin/accounts
                     │   └── AdminAccountsPage (Client)
                     │        └── AdminUserEditModal (Client)
                     │
                     └── /admin/settings
                          └── AdminSettingsPage (Client)
                │
                └── AIAssistant (floating chat widget — global)
```

---

## 9. Lưu Ý Khi Tái Cấu Trúc

### 9.1 Giữ Nguyên (Không Thay Đổi)
- **Prisma Schema**: Cấu trúc DB hiện tại ổn định. Chỉ thêm index nếu cần.
- **Auth flow**: NextAuth v5 config giữ nguyên — chỉ sửa type errors.
- **Vercel Blob integration**: Upload/delete functions.
- **EXIF parsing logic**: Server-side only.
- **Core business logic**: 24h window, AUTO_APPROVED/PENDING determination.

### 9.2 Cần Real Database
- Tất cả route handlers dùng `db.*` trực tiếp, không mock.
- Testing cần PostgreSQL instance thật.
- Seed script (`prisma/seed.ts`) cần tạo ít nhất 1 admin + 1 user + 1 department để dev.
- **Lưu ý**: `DEPARTMENT` model có thể rỗng ban đầu — cần seed "TECH" và "SALES".

### 9.3 Cần External Services
- **Vercel Blob**: Upload ảnh checkin + avatar. Cần `BLOB_READ_WRITE_TOKEN`.
- **AI-Box API**: Chat + AI scan. Cần `AIBOX_API_KEY` + `AIBOX_BASE_URL`.
- **Facebook SDK**: KHÔNG còn dùng trong luồng mới. Flow hiện tại upload ảnh → EXIF check → auto/manual approve.

### 9.4 Các File Có Thể Xoá An Toàn
```
src/components/modules/tasks/post-checkin-modal.tsx    # Replaced by SubmitCheckinModal
src/hooks/useFacebookSDK.ts                             # No longer used
src/types/index.ts                                      # Outdated legacy types
src/app/api/checkin/submit/route.ts                     # Duplicate of POST /api/checkins
src/app/api/submissions/manual/route.ts                 # Insecure + replaced
src/app/api/user/update-profile/route.ts                 # Duplicate of PUT /api/user/profile
src/app/api/admin/upload-avatar/route.ts                 # Duplicate of POST /api/user/profile
```

---

## 10. Tổng Kết

**Tổng files**: ~100 files (TypeScript/TSX)
**Tổng API routes**: ~30 endpoints
**Tổng pages**: 10 route groups

**Estimated effort**: 
- Phase 1 (fix runtime + dead code): ~30 phút
- Phase 2 (consolidate duplicates): ~45 phút
- Phase 3 (clean architecture): ~1 giờ
- Phase 4 (enhancements): ~2 giờ

**Risks**: 
- `revalidateTag` fix cần grep toàn bộ codebase — dễ miss
- Xoá route cần kiểm tra không còn client gọi
- Gộp route cần update tất cả frontend calls
