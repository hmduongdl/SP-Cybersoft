/**
 * Gửi email test template thông báo duyệt bài thành công cho user trong database.
 *
 * Xem trước:
 *   npx tsx scripts/send-approval-success-test.ts --dry-run
 *
 * Gửi thật cho toàn bộ user active:
 *   npx tsx scripts/send-approval-success-test.ts --send --confirm-bulk
 */
import { loadEnvConfig } from "@next/env";
import { render } from "@react-email/render";
import { PrismaClient } from "@prisma/client";
import { createElement } from "react";
import { ApprovalSuccessEmail } from "../src/emails/approval-success-email";
import { buildAppUrl } from "../src/lib/app-url";
import { sendMail } from "../src/lib/mailer";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

type Args = {
  send: boolean;
  confirmBulk: boolean;
  includeInactive: boolean;
  email?: string;
  limit?: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    send: false,
    confirmBulk: false,
    includeInactive: false,
  };

  for (const arg of argv) {
    if (arg === "--send") args.send = true;
    else if (arg === "--dry-run") args.send = false;
    else if (arg === "--confirm-bulk") args.confirmBulk = true;
    else if (arg === "--include-inactive") args.includeInactive = true;
    else if (arg.startsWith("--email=")) args.email = arg.slice("--email=".length).trim();
    else if (arg.startsWith("--limit=")) args.limit = parseLimit(arg.slice("--limit=".length));
  }

  return args;
}

function parseLimit(value: string): number {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("--limit phải là số nguyên từ 1 đến 1000");
  }
  return limit;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const users = await prisma.user.findMany({
    where: {
      ...(args.email ? { email: args.email } : {}),
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
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    ...(args.limit ? { take: args.limit } : {}),
  });

  if (users.length === 0) {
    console.log("Không tìm thấy user phù hợp trong database.");
    return;
  }

  console.log(`${args.send ? "Sẽ gửi" : "Dry-run"} ${users.length} email test form duyệt bài:`);
  for (const user of users) {
    console.log(`- ${user.email} | ${user.full_name || user.name || user.username} | ${user.role} | ${user.department} | ${user.is_active ? "active" : "inactive"}`);
  }

  if (!args.send) {
    console.log("\nChưa gửi email. Thêm --send --confirm-bulk để gửi thật.");
    return;
  }

  if (users.length > 1 && !args.confirmBulk) {
    throw new Error("Đang gửi nhiều hơn 1 email. Thêm --confirm-bulk để xác nhận gửi hàng loạt.");
  }

  const subject = "[SP-Cybersoft] TEST form thông báo duyệt bài thành công";

  for (const user of users) {
    const displayName = user.full_name || user.name || user.username;
    const html = await render(
      createElement(ApprovalSuccessEmail, {
        userName: displayName,
        items: [
          {
            title: "Bài test form thông báo duyệt bài",
            itemType: "Build PC",
            reviewUrl: buildAppUrl("/build-pc"),
            analysis: "Đây là email test giao diện thông báo mới. Không phải kết quả duyệt bài thật.",
          },
          {
            title: "Bài test gom nhiều thông báo trong 5 phút",
            itemType: "Check-in Like/Share",
            reviewUrl: buildAppUrl("/reports"),
            analysis: "Mục này dùng để kiểm tra giao diện khi có nhiều bài được duyệt cùng lúc.",
          },
        ],
      })
    );

    await sendMail({ to: user.email, subject, html });
  }

  console.log(`Đã gửi xong ${users.length} email test form duyệt bài.`);
}

main()
  .catch((error) => {
    console.error("Gửi email test form duyệt bài thất bại:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
