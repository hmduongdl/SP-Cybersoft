import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { postTaskSchema } from '@/lib/posts';

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
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
            originalUrl: parsed.data.originalUrl,
            thumbnailUrl: parsed.data.thumbnailUrl || null,
            description: parsed.data.description,
            scheduledAt: parsed.data.scheduledAt,
        },
    });

    return NextResponse.json({ post });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
    const { id } = await params;
    await db.post.delete({
        where: { id },
    });

    return NextResponse.json({ ok: true });
}
