/**
 * Gửi email chào mừng dựa trên bảng User trong database.
 *
 * Xem trước:
 *   npm run email:db-welcome -- --dry-run
 *   npm run email:db-welcome -- --email user@example.com
 *
 * Gửi thật:
 *   npm run email:db-welcome -- --email user@example.com --send
 *   npm run email:db-welcome -- --role USER --limit 10 --send --confirm-bulk
 */
import { loadEnvConfig } from "@next/env";
import { PrismaClient, UserRole } from "@prisma/client";
import { buildNotificationEmail } from "../src/lib/email-template";
import { sendMail } from "../src/lib/mailer";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

type Args = {
  send: boolean;
  confirmBulk: boolean;
  includeInactive: boolean;
  email?: string;
  id?: string;
  role?: UserRole;
  department?: string;
  verified?: boolean;
  limit: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    send: false,
    confirmBulk: false,
    includeInactive: false,
    limit: 20,
  };

  for (const arg of argv) {
    if (arg === "--send") args.send = true;
    else if (arg === "--dry-run") args.send = false;
    else if (arg === "--confirm-bulk") args.confirmBulk = true;
    else if (arg === "--include-inactive") args.includeInactive = true;
    else if (arg.startsWith("--email=")) args.email = arg.slice("--email=".length);
    else if (arg.startsWith("--id=")) args.id = arg.slice("--id=".length);
    else if (arg.startsWith("--role=")) args.role = parseRole(arg.slice("--role=".length));
    else if (arg.startsWith("--department=")) args.department = arg.slice("--department=".length);
    else if (arg.startsWith("--verified=")) args.verified = parseBoolean(arg.slice("--verified=".length));
    else if (arg.startsWith("--limit=")) args.limit = parseLimit(arg.slice("--limit=".length));
  }

  return args;
}

function parseRole(value: string): UserRole {
  const normalized = value.toUpperCase();
  if (normalized !== "USER" && normalized !== "ADMIN") {
    throw new Error("--role chỉ nhận USER hoặc ADMIN");
  }
  return normalized;
}

function parseBoolean(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("--verified chỉ nhận true hoặc false");
}

function parseLimit(value: string): number {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("--limit phải là số nguyên từ 1 đến 500");
  }
  return limit;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const users = await prisma.user.findMany({
    where: {
      ...(args.id ? { id: args.id } : {}),
      ...(args.email ? { email: args.email } : {}),
      ...(args.role ? { role: args.role } : {}),
      ...(args.department ? { department: args.department } : {}),
      ...(typeof args.verified === "boolean" ? { is_verified: args.verified } : {}),
      ...(args.includeInactive ? {} : { is_active: true }),
      email: { not: "" },
    },
    select: {
      id: true,
      email: true,
      name: true,
      full_name: true,
      username: true,
      role: true,
      department: true,
      is_active: true,
      is_verified: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    take: args.limit,
  });

  if (users.length === 0) {
    console.log("Không tìm thấy user phù hợp trong database.");
    return;
  }

  console.log(`${args.send ? "Sẽ gửi" : "Dry-run"} ${users.length} email chào mừng:`);
  for (const user of users) {
    console.log(`- ${user.email} | ${user.full_name || user.name} | ${user.role} | ${user.department}`);
  }

  if (!args.send) {
    console.log("\nChưa gửi email. Thêm --send để gửi thật.");
    return;
  }

  if (users.length > 1 && !args.confirmBulk) {
    throw new Error("Đang gửi nhiều hơn 1 email. Thêm --confirm-bulk để xác nhận gửi hàng loạt.");
  }

  for (const user of users) {
    const displayName = user.full_name || user.name || user.username;
    const subject = "Chào mừng bạn đến với SP-Cybersoft!";
    const message =
      `Xin chào ${displayName},\n\n` +
      "Chào mừng bạn đã tham gia hệ thống SP-Cybersoft. " +
      "Chúng tôi rất vui khi có bạn đồng hành cùng đội ngũ.\n\n" +
      "Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.\n\n" +
      "Chúc bạn một ngày làm việc hiệu quả!";

    const html = await buildNotificationEmail(subject, message);
    await sendMail({ to: user.email, subject, html });
  }

  console.log(`Đã gửi xong ${users.length} email chào mừng.`);
}

main()
  .catch((error) => {
    console.error("Gửi email từ database thất bại:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
