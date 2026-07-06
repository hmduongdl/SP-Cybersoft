import PayOS from "@payos/node";

/**
 * Singleton PayOS client — khởi tạo một lần, dùng nhiều nơi.
 * Đọc key từ env, throw ngay lúc import nếu thiếu để dễ debug.
 */
if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
  throw new Error(
    "Thiếu biến môi trường PayOS: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY"
  );
}

export const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID!,
  process.env.PAYOS_API_KEY!,
  process.env.PAYOS_CHECKSUM_KEY!
);

/** Tên hiển thị cho từng gói */
export const PLAN_NAMES: Record<string, string> = {
  pro: "Pro",
  max: "MAX",
};

/** Giá VNĐ của từng gói (hàng tháng) */
export const PLAN_PRICES: Record<string, Record<string, number>> = {
  pro:  { monthly: 18000, yearly: 189000 },
  max:  { monthly: 59000, yearly: 569000 },
};
