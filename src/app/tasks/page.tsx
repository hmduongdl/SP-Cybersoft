import { PostTaskAdmin } from '@/components/modules/tasks/post-task-admin';

export default function TasksPage() {
    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Quản trị bài viết</p>
                    <h1 className="mt-3 text-3xl font-semibold text-white">Tạo và quản lý task share</h1>
                </div>
            </header>

            <PostTaskAdmin />
        </div>
    );
}
