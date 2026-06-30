import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateDailyPcBuildTasks } from '@/lib/pc-build-task-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tasks = await generateDailyPcBuildTasks(1);
        if (tasks && tasks.length > 0) {
            return NextResponse.json({ task: tasks[0] });
        }
        return NextResponse.json({ error: 'Không thể sinh đề bài từ AI.' }, { status: 500 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi khi sinh đề bài.' }, { status: 500 });
    }
}
