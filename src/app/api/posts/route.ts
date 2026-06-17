import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DAILY_POST_LIMIT, getDayRange, getLocalDateKey, postTaskSchema } from '@/lib/posts';
import { auth } from '@/auth';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getCachedPostsApi, getCachedTotalEmployees } from '@/lib/cache';

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
    const skip = (page - 1) * limit;

    const [allPosts, totalEmployees] = await Promise.all([
        getCachedPostsApi(),
        getCachedTotalEmployees(),
    ]);

    const paginatedPosts = allPosts.slice(skip, skip + limit);
    const totalPosts = allPosts.length;
    const totalPages = Math.ceil(totalPosts / limit);

    return NextResponse.json({
        posts: paginatedPosts.map((post) => ({
            id: post.id,
            title: post.title,
            description: post.description,
            url: post.url,
            thumbnail_url: post.thumbnail_url,
            start_at: post.start_at.toISOString(),
            is_archived: post.is_archived,
            allow_late_submit: post.allow_late_submit,
            author_name: post.author_name,
            team: post.team,
            successfulCheckins: post._count.checkins,
            totalEmployees,
        })),
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

    const post = await db.post.create({
        data: {
            title: parsed.data.title,
            url: parsed.data.url,
            thumbnail_url: parsed.data.thumbnail_url || null,
            description: parsed.data.description || '',
            start_at: parsed.data.start_at ?? new Date(),
            team: (parsed.data.team as any) || 'ALL',
            is_archived: false,
            allow_late_submit: false,
            author_name: (body as any).author_name || null,
            author_id: (body as any).author_id || null,
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

        await db.post.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        // Revalidate cache after deleting posts
        revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
        revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");

        return NextResponse.json({ success: true, message: 'Đã xóa các bài đăng thành công.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi khi xóa bài đăng.' }, { status: 500 });
    }
}

// Bulk PATCH / EDIT
export async function PATCH(request: Request) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { ids, data } = body;
        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'Vui lòng cung cấp danh sách ID.' }, { status: 400 });
        }

        const updateData: Record<string, any> = {};
        if (data.is_archived !== undefined) {
            updateData.is_archived = data.is_archived;
            updateData.allow_late_submit = !data.is_archived;
        }
        if (data.team !== undefined) {
            updateData.team = data.team;
        }
        if (data.author_name !== undefined) {
            updateData.author_name = data.author_name;
        }
        if (data.author_id !== undefined) {
            updateData.author_id = data.author_id;
        }

        await db.post.updateMany({
            where: {
                id: { in: ids }
            },
            data: updateData
        });

        // Revalidate cache after updating posts
        revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
        revalidateTag(CACHE_TAGS.ADMIN_ANALYTICS, "default");

        return NextResponse.json({ success: true, message: 'Đã cập nhật các bài đăng thành công.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi khi cập nhật bài đăng.' }, { status: 500 });
    }
}
