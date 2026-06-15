import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DAILY_POST_LIMIT, getDayRange, getLocalDateKey, postTaskSchema } from '@/lib/posts';

export async function GET() {
    const [posts, totalEmployees] = await Promise.all([
        db.post.findMany({
            orderBy: { scheduledAt: 'asc' },
            include: {
                _count: {
                    select: { checkins: true },
                },
            },
        }),
        db.user.count({
            where: {
                active: true,
                role: 'USER',
            },
        }),
    ]);

    return NextResponse.json({
        posts: posts.map((post) => ({
            id: post.id,
            title: post.title,
            description: post.description,
            originalUrl: post.originalUrl,
            thumbnailUrl: post.thumbnailUrl,
            scheduledAt: post.scheduledAt.toISOString(),
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

    const { start, end } = getDayRange(getLocalDateKey(parsed.data.scheduledAt));

    const densityCount = await db.post.count({
        where: {
            scheduledAt: {
                gte: start,
                lt: end,
            },
        },
    });

    const post = await db.post.create({
        data: {
            title: parsed.data.title,
            originalUrl: parsed.data.originalUrl,
            thumbnailUrl: parsed.data.thumbnailUrl || null,
            description: parsed.data.description,
            scheduledAt: parsed.data.scheduledAt,
            team: parsed.data.team || null,
            start_at: parsed.data.start_at || new Date(),
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

