import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DAILY_POST_LIMIT, getDayRange } from '@/lib/posts';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateKey = searchParams.get('date');

    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return NextResponse.json({ error: 'Ngày không hợp lệ.' }, { status: 400 });
    }

    const { start, end } = getDayRange(dateKey);
    const count = await db.post.count({
        where: {
            start_at: {
                gte: start,
                lt: end,
            },
        },
    });

    return NextResponse.json({
        count,
        limit: DAILY_POST_LIMIT,
        reachedLimit: count >= DAILY_POST_LIMIT,
        message:
            count >= DAILY_POST_LIMIT
                ? 'Cảnh báo: Ngày này đã đạt giới hạn tối đa (2 bài). Nếu tiếp tục, giao diện lịch sẽ chia chéo ô.'
                : null,
    });
}
