/**
 * POST /api/admin/fix-thumbnails
 * Admin-only: Quét tất cả bài viết có thumbnail_url là link fbcdn.net (không ổn định),
 * tải ảnh về, nén và re-upload lên Vercel Blob, cập nhật DB.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { mirrorThumbnail, needsMirroring } from "@/lib/thumbnail-mirror";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel function timeout 60s

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lấy tất cả bài viết có thumbnail_url
  const posts = await db.post.findMany({
    where: { thumbnail_url: { not: null } },
    select: { id: true, title: true, thumbnail_url: true },
  });

  // Lọc ra những bài có URL cần mirror (fbcdn hoặc URL ngoài)
  const needFix = posts.filter((p) => needsMirroring(p.thumbnail_url));

  if (needFix.length === 0) {
    return NextResponse.json({ message: "Tất cả thumbnail đã ổn định. Không cần fix.", fixed: 0, skipped: 0 });
  }

  let fixed = 0;
  let failed = 0;
  const results: { id: string; title: string; status: string; newUrl?: string }[] = [];

  for (const post of needFix) {
    try {
      const newUrl = await mirrorThumbnail(post.thumbnail_url, post.title);

      // Chỉ update nếu URL thực sự thay đổi (tránh update vô ích)
      if (newUrl && newUrl !== post.thumbnail_url) {
        await db.post.update({
          where: { id: post.id },
          data: { thumbnail_url: newUrl },
        });
        fixed++;
        results.push({ id: post.id, title: post.title, status: "fixed", newUrl });
      } else {
        results.push({ id: post.id, title: post.title, status: "unchanged" });
      }
    } catch (err: any) {
      failed++;
      results.push({ id: post.id, title: post.title, status: `error: ${err?.message}` });
    }
  }

  // Revalidate cache sau khi fix
  if (fixed > 0) {
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
  }

  return NextResponse.json({
    message: `Hoàn tất. Đã fix ${fixed}/${needFix.length} bài, ${failed} lỗi.`,
    fixed,
    failed,
    skipped: posts.length - needFix.length,
    results,
  });
}
