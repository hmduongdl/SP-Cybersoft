import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache';

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

export async function PATCH(_request: Request, { params }: RouteContext) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const post = await db.post.findUnique({
        where: { id },
        select: { is_archived: true },
    });

    if (!post) {
        return NextResponse.json({ error: 'Bài viết không tồn tại.' }, { status: 404 });
    }

    const updated = await db.post.update({
        where: { id },
        data: {
            is_archived: !post.is_archived,
            allow_late_submit: post.is_archived,
        },
    });

    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
    revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");

    return NextResponse.json({ post: updated });
}
