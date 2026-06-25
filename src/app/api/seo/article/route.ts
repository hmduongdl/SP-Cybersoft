import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateSeoText } from "@/lib/openai-client";
import { buildArticlePrompt } from "@/lib/seo-prompts";
import { articleRequestSchema, formatZodError } from "@/lib/seo-schemas";

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

    const parsed = articleRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const { topic, tone } = parsed.data;
    const prompt = buildArticlePrompt(topic, tone);

    const content = await generateSeoText({
      prompt,
      maxTokens: 8000,
    });

    return NextResponse.json({ content });
  } catch (error: unknown) {
    console.error("SEO Article Generation Error:", error);
    const message =
      error instanceof Error ? error.message : "Đã xảy ra lỗi hệ thống khi viết bài SEO.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
