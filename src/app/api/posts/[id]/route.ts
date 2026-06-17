import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { postTaskSchema } from '@/lib/posts';
import { auth } from '@/auth';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache';

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = postTaskSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const post = await db.post.update({
        where: { id },
        data: {
            title: parsed.data.title,
            url: parsed.data.url,
            thumbnail_url: parsed.data.thumbnail_url || null,
            description: parsed.data.description,
            start_at: parsed.data.start_at,
            team: (parsed.data.team as any) || 'ALL',
            author_name: (body as any).author_name ?? undefined,
            author_id: (body as any).author_id ?? undefined,
        },
    });

    // Revalidate cache after updating a post
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
    revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");

    return NextResponse.json({ post });
}

export async function DELETE(request: Request, { params }: RouteContext) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await db.post.delete({
        where: { id },
    });

    // Revalidate cache after deleting a post
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
    revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");

    return NextResponse.json({ ok: true });
}
