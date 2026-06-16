import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Extract OpenGraph meta tags (property="og:*" format)
    const ogTags: Record<string, string> = {};
    const ogRegex = /<meta\s+[^>]*property=["']og:(\w+)["'][^>]*content=["']([^"']*)["'][^>]*\/?>/gi;
    let match;
    while ((match = ogRegex.exec(html)) !== null) {
      ogTags[match[1]] = match[2];
    }

    // Also try reversed attribute order: content="..." property="og:*"
    const altOgRegex = /<meta\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:(\w+)["'][^>]*\/?>/gi;
    while ((match = altOgRegex.exec(html)) !== null) {
      if (!ogTags[match[2]]) {
        ogTags[match[2]] = match[1];
      }
    }

    // Fallback to <title> if og:title is missing
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1] : null;

    return NextResponse.json({
      url,
      ogTitle: ogTags.title || pageTitle || null,
      ogImage: ogTags.image || null,
      ogDescription: ogTags.description || null,
    });
  } catch (error: any) {
    console.error("OG Scraper error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to scrape URL" },
      { status: 500 }
    );
  }
}
