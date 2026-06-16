import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DAILY_POST_LIMIT, getDayRange, getLocalDateKey, postTaskSchema } from '@/lib/posts';

export async function GET() {
    const [posts, totalEmployees] = await Promise.all([
        db.post.findMany({
            orderBy: { start_at: 'asc' },
            include: {
                _count: {
                    select: { checkins: true },
                },
            },
        }),
        db.user.count({
            where: {
                role: 'USER',
            },
        }),
    ]);

    return NextResponse.json({
        posts: posts.map((post) => ({
            id: post.id,
            title: post.title,
            description: post.description,
            url: post.url,
            thumbnail_url: post.thumbnail_url,
            start_at: post.start_at.toISOString(),
            successfulCheckins: post._count.checkins,
            totalEmployees,
        })),
    });
}

export async function POST(request: Request) {
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
            description: parsed.data.description,
            start_at: parsed.data.start_at ?? new Date(),
            team: (parsed.data.team as any) || 'ALL',
        },
    });

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
