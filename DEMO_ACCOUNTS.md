# 📋 Danh Sách Tài Khoản Demo — TeamSync HR

> Đây là các tài khoản được cấp sẵn để test hệ thống. **Không sử dụng cho môi trường Production.**

---

## 👤 Tài Khoản Nhân Viên Demo

| Tên đăng nhập | Mật khẩu    | Vai trò | Phòng ban  | Trạng thái    |
|---------------|-------------|---------|------------|---------------|
| `tech_user`   | `Password1` | USER    | Tech       | ✅ Hoạt động  |
| `mkt_user`    | `Password1` | USER    | Marketing  | ✅ Hoạt động  |
| `sales_user`  | `Password1` | USER    | Sales      | ✅ Hoạt động  |
| `demo_user`   | `Password1` | USER    | Other      | ✅ Hoạt động  |

---

## 🔐 Quy Tắc Tài Khoản

- **Mật khẩu mặc định:** `Password1` (bao gồm chữ hoa + số — đúng quy tắc hệ thống)
- **Đăng nhập lần đầu:** Hệ thống sẽ yêu cầu hoàn thành Onboarding (đổi mật khẩu + cập nhật hồ sơ)
- **Liên hệ HR Admin** nếu cần cấp thêm tài khoản hoặc reset mật khẩu

---

## 🚀 Cách Truy Cập

1. Mở trình duyệt và truy cập `http://localhost:3000/login`
2. Nhập **Tên đăng nhập** và **Mật khẩu** từ bảng trên
3. Hoàn tất bước Onboarding nếu là lần đầu đăng nhập

---

> **Ghi chú:** File này được commit lên Git để chia sẻ nội bộ nhóm phát triển.  
> Tài khoản Admin lưu riêng trong `ADMIN_CREDENTIALS.md` (đã được thêm vào `.gitignore`).
