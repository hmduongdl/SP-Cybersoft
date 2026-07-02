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
    try {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Check if it's a PC Build Task editing
        const buildTask = await db.pcBuildTask.findUnique({ where: { id } }).catch(() => null);
        if (buildTask) {
            try {
                const updateData: Record<string, any> = {};
                // Allow partial updates (e.g. only is_archived toggle)
                if (body.is_archived !== undefined) updateData.is_archived = body.is_archived;
                if (body.customer_need !== undefined || body.title !== undefined) updateData.customer_need = body.customer_need || body.title || '';
                if (body.max_budget !== undefined) updateData.max_budget = Number(body.max_budget) || 0;
                if (body.requirements !== undefined || body.description !== undefined) updateData.requirements = body.requirements || body.description || '';
                if (body.difficulty !== undefined) updateData.difficulty = body.difficulty || "medium";
                if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null;
                if (body.start_at !== undefined) updateData.date = new Date(body.start_at);

                const updatedTask = await db.pcBuildTask.update({
                    where: { id },
                    data: updateData,
                });
                return NextResponse.json({ post: { ...updatedTask, task_type: 'PC_BUILD' } });
            } catch (err: any) {
                console.error("Failed to update PC Build Task:", err);
                return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
            }
        }

        // Handle simple field updates (e.g. is_archived toggle) without full schema validation
        if (body.is_archived !== undefined && Object.keys(body).length === 1) {
            const post = await db.post.update({
                where: { id },
                data: { is_archived: body.is_archived },
            });
            revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
            revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
            revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");
            return NextResponse.json({ post });
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

        revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
        revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");

        return NextResponse.json({ post });
    } catch (error: any) {
        console.error("PATCH /api/posts/[id] error:", error);
        return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
    }
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
