import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { postTaskSchema } from '@/lib/posts';
import { auth } from '@/auth';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache';
import { mirrorThumbnail } from '@/lib/thumbnail-mirror';

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

    // Check if it's a PC Build Task editing
    const buildTask = await db.pcBuildTask.findUnique({ where: { id } });
    if (buildTask) {
        const updatedTask = await db.pcBuildTask.update({
            where: { id },
            data: {
                customer_need: body.customer_need || body.title || '',
                max_budget: Number(body.max_budget) || 0,
                requirements: body.requirements || body.description || '',
                difficulty: body.difficulty || "medium",
                deadline: body.deadline ? new Date(body.deadline) : null,
                date: body.start_at ? new Date(body.start_at) : new Date(),
            }
        });
        return NextResponse.json({ post: { ...updatedTask, task_type: 'PC_BUILD' } });
    }

    // Otherwise treat as a regular Facebook Share Post edit
    const parsed = postTaskSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, url, thumbnail_url, description, start_at, team, author } = parsed.data;

    // Auto-mirror thumbnail khi edit bài: nếu URL thay đổi → tải về và re-host
    const stableThumbnailUrl = await mirrorThumbnail(thumbnail_url, title);

    const post = await db.post.update({
        where: { id },
        data: {
            title,
            url,
            thumbnail_url: stableThumbnailUrl || null,
            description,
            start_at,
            team: (team as any) || 'ALL',
            author: author || null,
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

    // Check if it's a PC Build Task
    const buildTask = await db.pcBuildTask.findUnique({ where: { id } });
    if (buildTask) {
        // First delete dependent checkins
        await db.checkin.deleteMany({ where: { pc_task_id: id } });
        // Also clean up PcExercise that was synced from PcBuildTask
        await db.pcExercise.deleteMany({ where: { id } });
        await db.pcBuildTask.delete({ where: { id } });
    } else {
        await db.post.delete({ where: { id } });
    }

    // Revalidate cache after deleting a post
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
    revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");

    return NextResponse.json({ ok: true });
}
