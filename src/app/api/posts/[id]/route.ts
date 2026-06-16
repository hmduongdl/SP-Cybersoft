import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { postTaskSchema } from '@/lib/posts';
import { auth } from '@/auth';

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
        },
    });

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

    return NextResponse.json({ ok: true });
}
