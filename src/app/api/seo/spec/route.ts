import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildSpecSummaryPrompt } from "@/lib/seo-prompts";
import { createSeoStreamResponse } from "@/lib/seo-stream-route";
import { formatZodError, specRequestSchema } from "@/lib/seo-schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

    const parsed = specRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const { inputText } = parsed.data;
    const prompt = buildSpecSummaryPrompt(inputText);

    return createSeoStreamResponse({
      prompt,
      maxTokens: 1500,
      temperature: 0.2,
    });
  } catch (error: unknown) {
    console.error("SEO Spec Summary Error:", error);
    const message =
      error instanceof Error ? error.message : "Đã xảy ra lỗi hệ thống khi tóm tắt thông số.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
