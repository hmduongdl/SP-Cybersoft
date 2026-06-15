# Teamwork Check Dashboard

## Mục đích
Dự án này là một ứng dụng Next.js kết nối với cơ sở dữ liệu Neon SQL qua Prisma và deploy lên Vercel.

## 1. Kết nối Neon SQL

### Bước 1: Tạo database trên Neon
1. Vào Neon Dashboard: https://neon.tech
2. Tạo project mới và tạo database.
3. Sao chép `Connection String` ở dạng `postgresql://...`.

### Bước 2: Cài đặt biến môi trường
Tạo file `.env.local` ở gốc dự án và thêm:

```env
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
NEXTAUTH_SECRET="một_chuỗi_bảo_mật_ngẫu_nhiên"
```

- `DATABASE_URL`: dùng cho Prisma kết nối Neon SQL.
- `NEXTAUTH_SECRET`: dùng cho NextAuth nếu dự án dùng xác thực.

### Bước 3: Cấu hình Prisma
Trong `prisma/schema.prisma`, đảm bảo phần `datasource` như sau:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Sau đó chạy:

```bash
npm install
npx prisma generate
npx prisma db pull
npx prisma migrate dev --name init
```

## 2. Deploy lên Vercel

### Bước 1: Tạo project trên Vercel
1. Đăng nhập Vercel tại https://vercel.com
2. Chọn `New Project` và kết nối repo GitHub/GitLab.
3. Chọn repository dự án `Teamwork Check`.

### Bước 2: Cấu hình build
Đặt giá trị như sau:
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: để trống

### Bước 3: Thêm Environment Variables
Trong Vercel, vào phần `Settings > Environment Variables`, thêm:

| Key | Value | Ghi chú |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Neon SQL connection string |
| `NEXTAUTH_SECRET` | `một_chuỗi_bảo_mật` | NextAuth secret |

Nếu dùng thêm biến khác như `NEXTAUTH_URL`, có thể thêm như sau:
| `NEXTAUTH_URL` | `https://your-vercel-app.vercel.app` | URL app trên Vercel |

### Bước 4: Deploy
1. Lưu các setting.
2. Deploy project từ Vercel.

## 3. Cách kết nối Neon SQL và Vercel

- Dự án trên Vercel sẽ đọc `DATABASE_URL` từ `Environment Variables`.
- `DATABASE_URL` phải trỏ đến Neon SQL database.
- Khi Vercel build và chạy server, ứng dụng Next.js sẽ dùng Prisma cấu hình trong `schema.prisma` để kết nối Neon.

## 4. Các lệnh cơ bản

```bash
npm install
npm run dev
npm run build
npm run start
```

## 5. Lưu ý

- Không commit file `.env.local` lên Git.
- Nếu cập nhật schema Prisma, chạy lại `npx prisma generate`.
- Với Vercel, mỗi lần push lên repo sẽ tự động deploy lại nếu project đã được thiết lập.
