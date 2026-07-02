import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DAILY_POST_LIMIT, getDayRange, getLocalDateKey, postTaskSchema } from '@/lib/posts';
import { auth } from '@/auth';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getCachedPostsApi, getCachedTotalEmployees } from '@/lib/cache';
import { mirrorThumbnail } from '@/lib/thumbnail-mirror';

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
    const status = url.searchParams.get('status') || 'ACTIVE';
    const skip = (page - 1) * limit;

    const [allPosts, allBuildTasks, totalEmployees, totalNonAdminEmployees] = await Promise.all([
        getCachedPostsApi(),
        db.pcBuildTask.findMany({
            orderBy: { date: 'desc' },
            include: {
                submissions: {
                    orderBy: { submitted_at: 'desc' },
                    include: {
                        user: { select: { role: true } }
                    }
                }
            }
        }),
        getCachedTotalEmployees(),
        db.user.count({
            where: { role: "USER", is_active: true }
        })
    ]);

    // Map regular share posts
    const mappedSharePosts = allPosts.map((post: any) => ({
        id: post.id,
        title: post.title,
        description: post.description,
        url: post.url,
        thumbnail_url: post.thumbnail_url,
        start_at: post.start_at.toISOString(),
        is_archived: post.is_archived,
        allow_late_submit: post.allow_late_submit,
        team: post.team,
        author: post.author,
        task_type: "SHARE_POST",
        successfulCheckins: post._count.checkins,
        totalEmployees,
        latestCheckinAt: post.checkins && post.checkins[0]
            ? post.checkins[0].submitted_at.toISOString()
            : null,
    }));

    // Map PC build tasks
    const mappedBuildTasks = allBuildTasks.map((task) => {
        const successfulCheckins = task.submissions.filter(
            (s) => (s.status === 'APPROVED' || s.status === 'AUTO_APPROVED') && s.user?.role === 'USER'
        ).length;
        const latestCheckinAt = task.submissions[0]?.submitted_at?.toISOString() || null;

        return {
            id: task.id,
            title: `💻 Bài tập Build PC`,
            description: task.customer_need,
            url: "",
            thumbnail_url: null,
            start_at: task.date.toISOString(),
            is_archived: task.is_archived,
            allow_late_submit: true,
            team: "ALL",
            author: "AI",
            task_type: "PC_BUILD",
            max_budget: task.max_budget,
            requirements: task.requirements,
	            difficulty: task.difficulty || "medium",
            deadline: task.deadline ? task.deadline.toISOString() : null,
            successfulCheckins,
            totalEmployees: totalNonAdminEmployees,
            latestCheckinAt,
        };
    });

    // Filter by status: ACTIVE = not archived, ARCHIVED = archived, ALL = everything
    const combinedPosts = [...mappedSharePosts, ...mappedBuildTasks];
    
    const filteredPosts = status === 'ALL'
        ? combinedPosts
        : combinedPosts.filter((post: any) =>
            status === 'ARCHIVED' ? post.is_archived : !post.is_archived
        );

    // Sort combined posts by start_at descending
    filteredPosts.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());

    const paginatedPosts = filteredPosts.slice(skip, skip + limit);
    const totalPosts = filteredPosts.length;
    const totalPages = Math.ceil(totalPosts / limit);

    return NextResponse.json({
        posts: paginatedPosts,
        total: totalPosts,
        totalPages,
        currentPage: page,
    });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // If it's a PC Build task creation, bypass the regular Share Post schema validation
    if (body.task_type === 'PC_BUILD') {
        const task = await db.pcBuildTask.create({
            data: {
                customer_need: body.customer_need || body.title || '',
                max_budget: Number(body.max_budget) || 0,
                requirements: body.requirements || body.description || '',
                difficulty: body.difficulty || "medium",
                deadline: body.deadline ? new Date(body.deadline) : null,
                date: body.start_at ? new Date(body.start_at) : new Date(),
            }
        });
        return NextResponse.json({ post: { ...task, task_type: 'PC_BUILD' } }, { status: 201 });
    }

    const parsed = postTaskSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { start, end } = getDayRange(getLocalDateKey(parsed.data.start_at ?? new Date()));

    const densityCount = await db.post.count({
        where: {
            start_at: {
                gte: start,
                lt: end,
            },
        },
    });

    const { title, url, thumbnail_url, description, start_at, team, author } = parsed.data;

    // Auto-mirror thumbnail: tải ảnh từ URL ngoài (fbcdn.net...) → nén → Vercel Blob
    const stableThumbnailUrl = await mirrorThumbnail(thumbnail_url, title);

    const post = await db.post.create({
        data: {
            title,
            url,
            thumbnail_url: stableThumbnailUrl || null,
            description: description || '',
            start_at: start_at ?? new Date(),
            team: (team as any) || 'ALL',
            author: author || null,
            is_archived: false,
            allow_late_submit: false,
        },
    });

    // Revalidate cache after creating a post
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
    revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");

    return NextResponse.json(
        {
            post,
            density: {
                count: densityCount + 1,
                limit: DAILY_POST_LIMIT,
                exceeded: densityCount + 1 > DAILY_POST_LIMIT,
            },
        },
        { status: 201 }
    );
}

// Bulk PATCH (archive/unarchive)
export async function PATCH(request: Request) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { ids, data } = body;
        if (!ids || !Array.isArray(ids) || !data) {
            return NextResponse.json({ error: 'Vui lòng cung cấp danh sách ID và dữ liệu cần cập nhật.' }, { status: 400 });
        }

        // Update both Share Posts and PC Build Tasks independently so one failure doesn't block the other
        try {
            await db.post.updateMany({
                where: { id: { in: ids } },
                data,
            });
        } catch (err) {
            console.error("Failed to update Share Posts:", err);
        }

        try {
            await db.pcBuildTask.updateMany({
                where: { id: { in: ids } },
                data,
            });
        } catch (err) {
            console.error("Failed to update PC Build Tasks:", err);
        }

        // Revalidate cache after updating
        revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
        revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");

        return NextResponse.json({ success: true, message: 'Đã cập nhật thành công.' });
    } catch (error: any) {
        console.error("PATCH /api/posts bulk error:", error);
        return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
    }
}

// Bulk DELETE
export async function DELETE(request: Request) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { ids } = body;
        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'Vui lòng cung cấp danh sách ID để xóa.' }, { status: 400 });
        }

        // Delete from both checkin and pcBuildTask / post
        await db.checkin.deleteMany({
            where: { pc_task_id: { in: ids } }
        });

        // Also clean up PcExercise records that were synced from PcBuildTask
        // (PcSubmission will cascade-delete along with PcExercise)
        await db.pcExercise.deleteMany({
            where: { id: { in: ids } }
        });

        await db.pcBuildTask.deleteMany({
            where: { id: { in: ids } }
        });

        await db.post.deleteMany({
            where: { id: { in: ids } }
        });

        // Revalidate cache after deleting posts
        revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
        revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");

        return NextResponse.json({ success: true, message: 'Đã xóa thành công.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi khi xóa.' }, { status: 500 });
    }
}
