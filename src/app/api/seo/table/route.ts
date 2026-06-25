import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateSeoText } from "@/lib/openai-client";
import { buildTablePrompt } from "@/lib/seo-prompts";
import { formatZodError, tableRequestSchema } from "@/lib/seo-schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Payload JSON không hợp lệ." }, { status: 400 });
    }

    const parsed = tableRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const { inputText } = parsed.data;
    const prompt = buildTablePrompt(inputText);

    const raw = await generateSeoText({
      prompt,
      maxTokens: 8000,
      temperature: 0.3,
    });

    // Làm sạch code fence ```markdown / ``` nếu model bọc kết quả.
    const markdown = raw
      .replace(/^```(?:markdown|md)?/i, "")
      .replace(/```$/, "")
      .trim();

    return NextResponse.json({ markdown });
  } catch (error: unknown) {
    console.error("SEO Table Generation Error:", error);
    const message =
      error instanceof Error ? error.message : "Đã xảy ra lỗi hệ thống khi tạo bảng thông số.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
